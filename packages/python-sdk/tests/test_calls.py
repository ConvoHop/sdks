import asyncio
import json
import unittest

import httpx
from websockets.asyncio.server import serve

from _fixtures import (
    THREAD,
    SESSION_TOKEN,
    call_event,
    incoming,
    ok,
    operation,
)
from threadwave import APIError, ProtocolError, UserClient
from test_realtime import next_event, subscribe

CALL_A = "1582f4ba-813e-4d05-a754-c7503638091a"
CALL_B = "4c782013-dfa4-4f49-9186-b822150b5874"
CALL_C = "a69ab02b-f35a-42c0-ab35-597bf5429bca"
CALL_D = "b8a9c452-aeb1-41ec-9824-0797a2f4ef9a"


class IncomingCallTests(unittest.IsolatedAsyncioTestCase):
    async def test_snapshot_handoff_merges_pages_and_nullable_sparse_events(self):
        requested, socket_cursors = [], []

        def handler(request):
            field, variables, _ = operation(request, ("incomingCalls", "declineCall"))
            requested.append((field, variables))
            self.assertEqual(request.headers["authorization"], f"Bearer {SESSION_TOKEN}")
            if field == "declineCall":
                self.assertEqual(variables, {"id": CALL_D})
                return ok(field, True)
            self.assertEqual(variables["limit"], 2)
            if variables["after"] == "0":
                return ok(field, {
                    "items": [incoming(CALL_A, 3), incoming(CALL_B, 8)],
                    "nextAfter": "9", "hasMore": True, "cursor": "10",
                })
            self.assertEqual(variables["after"], "9")
            return ok(field, {
                "items": [incoming(CALL_A, 14), incoming(CALL_C, 18)],
                "nextAfter": "18", "hasMore": False, "cursor": "20",
            })

        async def websocket_handler(socket):
            after = await subscribe(socket, field="callEvents")
            socket_cursors.append(after)
            self.assertEqual(after, "10")
            for payload in (
                call_event(CALL_A, 14),
                call_event(CALL_B, 21, kind="call.accepted"),
                call_event(CALL_D, 25),
                call_event(CALL_D, 29, kind="call.declined", with_call=False),
                call_event(CALL_C, 40, kind="call.revoked", with_call=False),
            ):
                await next_event(socket, payload, field="callEvents")
            await socket.wait_closed()

        async with serve(
            websocket_handler, "127.0.0.1", 0, subprotocols=["graphql-transport-ws"]
        ) as server:
            base = f"http://127.0.0.1:{server.sockets[0].getsockname()[1]}"
            async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http:
                async with UserClient(base, SESSION_TOKEN, http_client=http) as user:
                    feed = await user.incoming_call_feed(limit=2, max_retries=0)
                    self.assertEqual(feed.cursor, 10)
                    self.assertEqual(
                        [(item.call.id, item.sequence) for item in feed.items],
                        [(CALL_B, 8), (CALL_A, 14), (CALL_C, 18)],
                    )
                    self.assertEqual((feed.items[0].call.thread_id, feed.items[0].call.mode), (
                        THREAD, "audio",
                    ))
                    async with feed:
                        accepted = await asyncio.wait_for(feed.__anext__(), 2)
                        self.assertEqual((accepted.kind, accepted.sequence), ("call.accepted", 21))
                        self.assertEqual(feed.after, 14)
                        self.assertEqual([item.call.id for item in feed.items], [CALL_A, CALL_C])
                        ringing = await asyncio.wait_for(feed.__anext__(), 2)
                        self.assertEqual(ringing.call_id, CALL_D)
                        self.assertEqual([item.call.id for item in feed.items], [CALL_A, CALL_C, CALL_D])
                        await user.decline_call(CALL_D)
                        await user.decline_call(CALL_D)
                        declined = await asyncio.wait_for(feed.__anext__(), 2)
                        self.assertIsNone(declined.call)
                        self.assertEqual([item.call.id for item in feed.items], [CALL_A, CALL_C])
                        revoked = await asyncio.wait_for(feed.__anext__(), 2)
                        self.assertIsNone(revoked.call)
                        self.assertEqual([item.call.id for item in feed.items], [CALL_A])
        self.assertEqual(socket_cursors, ["10"])
        self.assertEqual(
            [field for field, _ in requested],
            ["incomingCalls", "incomingCalls", "declineCall", "declineCall"],
        )

    async def test_call_replay_is_sparse_and_uses_graphql_only_after_disconnect(self):
        socket_cursors, replay_requests = [], []

        def handler(request):
            field, variables, _ = operation(request, ("callEvents",))
            replay_requests.append(variables["after"])
            self.assertEqual(variables["limit"], 100)
            self.assertEqual(request.headers["authorization"], f"Bearer {SESSION_TOKEN}")
            if variables["after"] == "100":
                return ok(field, {"items": [], "nextAfter": "120", "hasMore": True})
            if variables["after"] == "120":
                return ok(field, {
                    "items": [call_event(CALL_C, 150, kind="call.ended")],
                    "nextAfter": "200", "hasMore": True,
                })
            self.assertEqual(variables["after"], "200")
            return ok(field, {
                "items": [call_event(CALL_D, 900, kind="call.revoked", with_call=False)],
                "nextAfter": "900", "hasMore": False,
            })

        async def websocket_handler(socket):
            after = await subscribe(socket, field="callEvents")
            socket_cursors.append(after)
            if len(socket_cursors) == 1:
                self.assertEqual(after, "0")
                await next_event(socket, call_event(CALL_A, 5), field="callEvents")
                await next_event(socket, call_event(CALL_B, 100), field="callEvents")
                await socket.close()
            else:
                self.assertEqual(after, "900")
                await next_event(
                    socket, call_event(CALL_D, 900, kind="call.revoked", with_call=False),
                    field="callEvents",
                )
                await next_event(socket, call_event(CALL_D, 1000), field="callEvents")
                await socket.wait_closed()

        async with serve(
            websocket_handler, "127.0.0.1", 0, subprotocols=["graphql-transport-ws"]
        ) as server:
            base = f"http://127.0.0.1:{server.sockets[0].getsockname()[1]}"
            async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http:
                async with UserClient(base, SESSION_TOKEN, http_client=http) as user:
                    async with user.subscribe_call_events(
                        reconnect_delay=0.01, max_retries=2
                    ) as subscription:
                        first = await asyncio.wait_for(subscription.__anext__(), 2)
                        second = await asyncio.wait_for(subscription.__anext__(), 2)
                        self.assertEqual((first.sequence, second.sequence), (5, 100))
                        self.assertEqual(replay_requests, [])
                        recovered = await asyncio.wait_for(subscription.__anext__(), 2)
                        later = await asyncio.wait_for(subscription.__anext__(), 2)
                        live = await asyncio.wait_for(subscription.__anext__(), 2)
                        self.assertEqual(
                            [recovered.sequence, later.sequence, live.sequence],
                            [150, 900, 1000],
                        )
                        self.assertIsNone(later.call)
                        self.assertEqual(subscription.after, 900)
        self.assertEqual(socket_cursors, ["0", "900"])
        self.assertEqual(replay_requests, ["100", "120", "200"])

    async def test_empty_snapshot_pages_big_cursors_and_nullable_details(self):
        big = 2**53 + 1
        cursors = []

        def handler(request):
            field, variables, _ = operation(request, ("incomingCalls", "callEvents"))
            after = variables["after"]
            cursors.append((field, after))
            self.assertEqual(variables["limit"], 1)
            if field == "callEvents":
                return ok(field, {
                    "items": [call_event(CALL_A, big, kind="call.ringing", with_call=False)],
                    "nextAfter": str(big + 5), "hasMore": False,
                })
            if after == "0":
                return ok(field, {
                    "items": [], "nextAfter": "5", "hasMore": True, "cursor": "7",
                })
            self.assertEqual(after, "5")
            return ok(field, {
                "items": [incoming(CALL_A, 9)], "nextAfter": "9",
                "hasMore": False, "cursor": "10",
            })

        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http:
            async with UserClient("http://localhost:8080", SESSION_TOKEN, http_client=http) as user:
                snapshot = await user.incoming_call_snapshot(limit=1)
                self.assertEqual(snapshot.cursor, 7)
                self.assertEqual(snapshot.items[0].call.id, CALL_A)
                page = await user.call_events(after=big - 1, limit=1)
                self.assertEqual((page.items[0].sequence, page.next_after), (big, big + 5))
                self.assertIsNone(page.items[0].call)
                with self.assertRaises(ValueError):
                    await user.call_events(after=-1)
                with self.assertRaises(ValueError):
                    await user.incoming_calls(limit=101)
                with self.assertRaises(ValueError):
                    user.subscribe_call_events(after=True)
        self.assertEqual(cursors, [
            ("incomingCalls", "0"), ("incomingCalls", "5"),
            ("callEvents", str(big - 1)),
        ])

    async def test_invalid_call_pages_and_http_auth_errors(self):
        invalid_pages = (
            {"items": [], "nextAfter": "0", "hasMore": True, "cursor": "0"},
            {"items": [incoming(CALL_A, 1)] * 2, "nextAfter": "1", "hasMore": False, "cursor": "2"},
            {"items": [], "nextAfter": "0", "hasMore": "false", "cursor": "0"},
            {"items": [{"call": None, "sequence": "1", "invitedAt": "2026-09-25T12:00:00Z"}],
             "nextAfter": "1", "hasMore": False, "cursor": "1"},
            {"items": [incoming(CALL_A, 1)], "nextAfter": 1, "hasMore": False, "cursor": "2"},
        )
        for page in invalid_pages:
            async with httpx.AsyncClient(
                transport=httpx.MockTransport(lambda request: ok("incomingCalls", page))
            ) as http:
                async with UserClient("http://localhost:8080", SESSION_TOKEN, http_client=http) as user:
                    with self.subTest(page=page), self.assertRaises(ProtocolError):
                        await user.incoming_calls(limit=1)

        wrong_id = call_event(CALL_A, 1)
        wrong_id["call"]["id"] = CALL_B
        missing_call = call_event(CALL_A, 1)
        del missing_call["call"]
        for value in (wrong_id, missing_call):
            async with httpx.AsyncClient(
                transport=httpx.MockTransport(
                    lambda request: ok("callEvents", {
                        "items": [value], "nextAfter": "1", "hasMore": False,
                    })
                )
            ) as http:
                async with UserClient("http://localhost:8080", SESSION_TOKEN, http_client=http) as user:
                    with self.assertRaises(ProtocolError):
                        await user.call_events()

        def unauthorized(request):
            return httpx.Response(401, json={
                "error": {"code": "unauthenticated", "message": "expired token"},
            })

        async with httpx.AsyncClient(transport=httpx.MockTransport(unauthorized)) as http:
            async with UserClient("http://localhost:8080", SESSION_TOKEN, http_client=http) as user:
                with self.assertRaises(APIError) as caught:
                    await user.incoming_call_snapshot()
                self.assertEqual(caught.exception.code, "unauthenticated")

    async def test_call_graphql_subscription_errors_are_not_suppressed(self):
        async def handler(socket):
            await subscribe(socket, field="callEvents")
            await socket.send(json.dumps({
                "id": "1", "type": "next",
                "payload": {"errors": [{
                    "message": "call membership revoked",
                    "extensions": {"code": "FORBIDDEN"},
                }]},
            }))
            await socket.wait_closed()

        async with serve(
            handler, "127.0.0.1", 0, subprotocols=["graphql-transport-ws"]
        ) as server:
            base = f"http://127.0.0.1:{server.sockets[0].getsockname()[1]}"
            async with UserClient(base, SESSION_TOKEN) as user:
                async with user.subscribe_call_events(max_retries=0) as subscription:
                    with self.assertRaises(APIError) as caught:
                        await asyncio.wait_for(subscription.__anext__(), 2)
                    self.assertEqual(caught.exception.code, "FORBIDDEN")
