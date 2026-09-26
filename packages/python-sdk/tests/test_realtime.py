import asyncio
import json
import unittest

import httpx
from websockets.asyncio.server import serve

from _fixtures import THREAD, SESSION_TOKEN, ok, operation, thread_event
from convohop import APIError, ProtocolError, RequestTimeout, UserClient


async def subscribe(socket, field="threadEvents"):
    assert socket.request.path == "/graphql"
    assert socket.subprotocol == "graphql-transport-ws"
    first = json.loads(await asyncio.wait_for(socket.recv(), 1))
    assert first == {"type": "connection_init", "payload": {"token": SESSION_TOKEN}}
    assert SESSION_TOKEN not in socket.request.path
    await socket.send(json.dumps({"type": "connection_ack"}))
    frame = json.loads(await asyncio.wait_for(socket.recv(), 1))
    assert frame["type"] == "subscribe"
    assert frame["id"] == "1"
    assert field in frame["payload"]["query"]
    if field == "threadEvents":
        assert frame["payload"]["variables"]["threadId"] == THREAD
        assert "message{" in frame["payload"]["query"]
    return frame["payload"]["variables"]["after"]


async def next_event(socket, value, field="threadEvents"):
    await socket.send(json.dumps({
        "id": "1", "type": "next", "payload": {"data": {field: value}},
    }))


class RealtimeTests(unittest.IsolatedAsyncioTestCase):
    async def test_graphql_ping_before_and_after_connection_ack(self):
        async def handler(socket):
            first = json.loads(await socket.recv())
            self.assertEqual(first, {
                "type": "connection_init", "payload": {"token": SESSION_TOKEN},
            })
            await socket.send(json.dumps({"type": "ping", "payload": {"nonce": "before"}}))
            self.assertEqual(json.loads(await socket.recv()), {
                "type": "pong", "payload": {"nonce": "before"},
            })
            await socket.send(json.dumps({"type": "connection_ack"}))
            self.assertEqual(json.loads(await socket.recv())["type"], "subscribe")
            await socket.send(json.dumps({"type": "ping", "payload": {"nonce": "after"}}))
            self.assertEqual(json.loads(await socket.recv()), {
                "type": "pong", "payload": {"nonce": "after"},
            })
            await next_event(socket, thread_event(1))
            await socket.wait_closed()

        async with serve(
            handler, "127.0.0.1", 0, subprotocols=["graphql-transport-ws"]
        ) as server:
            base = f"http://127.0.0.1:{server.sockets[0].getsockname()[1]}"
            async with UserClient(base, SESSION_TOKEN) as user:
                async with user.subscribe_thread_events(THREAD, max_retries=0) as subscription:
                    item = await asyncio.wait_for(subscription.__anext__(), 2)
                    self.assertEqual(item.sequence, 1)

    async def test_first_frame_auth_acknowledged_cursor_and_reconnect(self):
        paths, replay = [], []

        def handler(request):
            field, variables, _ = operation(request, ("threadEvents",))
            replay.append(variables["after"])
            self.assertEqual(request.headers["authorization"], f"Bearer {SESSION_TOKEN}")
            return ok(field, {
                "items": [], "nextAfter": variables["after"],
                "cursor": variables["after"], "hasMore": False,
            })

        async def websocket_handler(socket):
            paths.append(socket.request.path)
            after = await subscribe(socket)
            if len(paths) == 1:
                self.assertEqual(after, "0")
                await next_event(socket, thread_event(1))
                await socket.close()
            else:
                self.assertEqual(after, "1")
                await next_event(socket, thread_event(1))
                await next_event(socket, thread_event(2))
                await socket.wait_closed()

        async with serve(
            websocket_handler, "127.0.0.1", 0, subprotocols=["graphql-transport-ws"]
        ) as server:
            base = f"http://127.0.0.1:{server.sockets[0].getsockname()[1]}"
            async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http:
                async with UserClient(base, SESSION_TOKEN, http_client=http) as user:
                    async with user.subscribe_thread_events(
                        THREAD, reconnect_delay=0.01, max_retries=2
                    ) as subscription:
                        first = await asyncio.wait_for(subscription.__anext__(), 2)
                        self.assertEqual(first.sequence, 1)
                        self.assertEqual(first.message.body, "hello")
                        self.assertEqual(subscription.after, 0)
                        second = await asyncio.wait_for(subscription.__anext__(), 2)
                        self.assertEqual(second.sequence, 2)
                        self.assertEqual(subscription.after, 1)
        self.assertEqual(paths, ["/graphql", "/graphql"])
        self.assertEqual(replay, ["1"])

    async def test_thread_replay_handles_sparse_and_empty_graphql_pages(self):
        socket_cursors, replay = [], []

        def handler(request):
            field, variables, _ = operation(request, ("threadEvents",))
            after = variables["after"]
            replay.append(after)
            self.assertEqual(variables["limit"], 100)
            if after == "100":
                return ok(field, {
                    "items": [], "nextAfter": "120", "cursor": "1000", "hasMore": True,
                })
            if after == "120":
                return ok(field, {
                    "items": [thread_event(150)], "nextAfter": "200",
                    "cursor": "1000", "hasMore": True,
                })
            self.assertEqual(after, "200")
            return ok(field, {
                "items": [thread_event(900)], "nextAfter": "900",
                "cursor": "1000", "hasMore": False,
            })

        async def websocket_handler(socket):
            after = await subscribe(socket)
            socket_cursors.append(after)
            if len(socket_cursors) == 1:
                self.assertEqual(after, "0")
                await next_event(socket, thread_event(5))
                await next_event(socket, thread_event(100))
                await socket.close()
            else:
                self.assertEqual(after, "900")
                await next_event(socket, thread_event(900))
                await next_event(socket, thread_event(1000))
                await socket.wait_closed()

        async with serve(
            websocket_handler, "127.0.0.1", 0, subprotocols=["graphql-transport-ws"]
        ) as server:
            base = f"http://127.0.0.1:{server.sockets[0].getsockname()[1]}"
            async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http:
                async with UserClient(base, SESSION_TOKEN, http_client=http) as user:
                    async with user.subscribe_thread_events(
                        THREAD, reconnect_delay=0.01, max_retries=2
                    ) as subscription:
                        first = await asyncio.wait_for(subscription.__anext__(), 2)
                        second = await asyncio.wait_for(subscription.__anext__(), 2)
                        self.assertEqual((first.sequence, second.sequence), (5, 100))
                        self.assertEqual(replay, [])
                        values = [
                            (await asyncio.wait_for(subscription.__anext__(), 2)).sequence
                            for _ in range(3)
                        ]
                        self.assertEqual(values, [150, 900, 1000])
                        self.assertEqual(subscription.after, 900)
        self.assertEqual(socket_cursors, ["0", "900"])
        self.assertEqual(replay, ["100", "120", "200"])

    async def test_graphql_errors_and_auth_close_are_terminal(self):
        attempts = []

        async def denied(socket):
            attempts.append(socket.request.path)
            await subscribe(socket)
            await socket.send(json.dumps({
                "id": "1", "type": "error", "payload": [{
                    "message": "membership removed", "extensions": {"code": "NOT_FOUND"},
                }],
            }))
            await socket.wait_closed()

        async with serve(
            denied, "127.0.0.1", 0, subprotocols=["graphql-transport-ws"]
        ) as server:
            base = f"http://127.0.0.1:{server.sockets[0].getsockname()[1]}"
            async with UserClient(base, SESSION_TOKEN) as user:
                async with user.subscribe_thread_events(THREAD, reconnect_delay=0) as subscription:
                    with self.assertRaises(APIError) as caught:
                        await asyncio.wait_for(subscription.__anext__(), 2)
                    self.assertEqual((caught.exception.code, caught.exception.status_code), ("NOT_FOUND", None))
        self.assertEqual(len(attempts), 1)

        async def partial_error(socket):
            await subscribe(socket)
            await socket.send(json.dumps({
                "id": "1", "type": "next",
                "payload": {
                    "data": {"threadEvents": thread_event(1)},
                    "errors": [{
                        "message": "revoked",
                        "extensions": {"code": "FORBIDDEN"},
                    }],
                },
            }))
            await socket.wait_closed()

        async with serve(
            partial_error, "127.0.0.1", 0, subprotocols=["graphql-transport-ws"]
        ) as server:
            base = f"http://127.0.0.1:{server.sockets[0].getsockname()[1]}"
            async with UserClient(base, SESSION_TOKEN) as user:
                async with user.subscribe_thread_events(THREAD) as subscription:
                    with self.assertRaises(APIError) as caught:
                        await asyncio.wait_for(subscription.__anext__(), 2)
                    self.assertEqual(caught.exception.code, "FORBIDDEN")

        async def invalid_token(socket):
            await socket.recv()
            await socket.close(code=4401, reason="authentication required")

        async with serve(
            invalid_token, "127.0.0.1", 0, subprotocols=["graphql-transport-ws"]
        ) as server:
            base = f"http://127.0.0.1:{server.sockets[0].getsockname()[1]}"
            async with UserClient(base, SESSION_TOKEN) as user:
                async with user.subscribe_thread_events(THREAD) as subscription:
                    with self.assertRaises(APIError) as caught:
                        await asyncio.wait_for(subscription.__anext__(), 2)
                    self.assertEqual(caught.exception.code, "UNAUTHENTICATED")

        async def wrong_payload(socket):
            await subscribe(socket)
            await next_event(socket, thread_event(1), field="wrongField")
            await socket.wait_closed()

        async with serve(
            wrong_payload, "127.0.0.1", 0, subprotocols=["graphql-transport-ws"]
        ) as server:
            base = f"http://127.0.0.1:{server.sockets[0].getsockname()[1]}"
            async with UserClient(base, SESSION_TOKEN) as user:
                async with user.subscribe_thread_events(THREAD) as subscription:
                    with self.assertRaises(ProtocolError):
                        await asyncio.wait_for(subscription.__anext__(), 2)

    async def test_timeout_cancellation_close_and_concurrent_reads(self):
        async def slow(socket):
            await socket.recv()
            await socket.wait_closed()

        async with serve(
            slow, "127.0.0.1", 0, subprotocols=["graphql-transport-ws"]
        ) as server:
            base = f"http://127.0.0.1:{server.sockets[0].getsockname()[1]}"
            async with UserClient(base, SESSION_TOKEN, timeout=0.05) as user:
                async with user.subscribe_thread_events(THREAD, max_retries=0) as subscription:
                    with self.assertRaises(RequestTimeout):
                        await asyncio.wait_for(subscription.__anext__(), 2)

        connected, closed = asyncio.Event(), asyncio.Event()

        async def waiting(socket):
            await subscribe(socket)
            connected.set()
            await socket.wait_closed()
            closed.set()

        async with serve(
            waiting, "127.0.0.1", 0, subprotocols=["graphql-transport-ws"]
        ) as server:
            base = f"http://127.0.0.1:{server.sockets[0].getsockname()[1]}"
            async with UserClient(base, SESSION_TOKEN) as user:
                subscription = user.subscribe_thread_events(THREAD)
                reading = asyncio.create_task(subscription.__anext__())
                await asyncio.wait_for(connected.wait(), 2)
                with self.assertRaisesRegex(RuntimeError, "concurrently"):
                    await subscription.__anext__()
                reading.cancel()
                with self.assertRaises(asyncio.CancelledError):
                    await reading
                await asyncio.wait_for(closed.wait(), 2)
                with self.assertRaises(StopAsyncIteration):
                    await subscription.__anext__()

        connected, closed = asyncio.Event(), asyncio.Event()

        async def waiting_for_close(socket):
            await subscribe(socket)
            connected.set()
            await socket.wait_closed()
            closed.set()

        async with serve(
            waiting_for_close, "127.0.0.1", 0, subprotocols=["graphql-transport-ws"]
        ) as server:
            base = f"http://127.0.0.1:{server.sockets[0].getsockname()[1]}"
            async with UserClient(base, SESSION_TOKEN) as user:
                subscription = user.subscribe_thread_events(THREAD)
                reading = asyncio.create_task(subscription.__anext__())
                await asyncio.wait_for(connected.wait(), 2)
                await user.aclose()
                with self.assertRaises(asyncio.CancelledError):
                    await reading
                await asyncio.wait_for(closed.wait(), 2)
