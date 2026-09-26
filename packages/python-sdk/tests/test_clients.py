import asyncio
import unittest
from datetime import timezone
from uuid import UUID

import httpx

from _fixtures import (
    ADMIN_TOKEN,
    ALICE_ID,
    BOB_ID,
    CLIENT_ID,
    MEMBERSHIP_ID,
    MEDIA,
    MESSAGE_ID,
    NEXT_PROJECT,
    NOW,
    PARTICIPANT,
    PROJECT,
    PROJECT_KEY,
    THREAD,
    SESSION_TOKEN,
    media,
    member,
    message,
    ok,
    operation,
    thread,
    thread_event,
)
from convohop import (
    APIError,
    ManagementClient,
    ProtocolError,
    RequestTimeout,
    ServerProjectClient,
    UserClient,
)


class ClientTests(unittest.IsolatedAsyncioTestCase):
    async def test_credentials_management_and_server_only_identity_issuance(self):
        seen = []

        def handler(request):
            names = ("createProject", "projects", "suspendProject", "createIdentity", "issueIdentityToken")
            field, variables, query = operation(request, names)
            seen.append((field, variables, request.url.path))
            self.assertNotIn("pk_", str(request.url))
            self.assertNotIn("adm_", str(request.url))
            self.assertEqual(request.headers["content-type"], "application/json")
            if field == "createIdentity":
                self.assertEqual(variables, {"requestId": CLIENT_ID})
                return ok(field, {"id": ALICE_ID})
            if field == "issueIdentityToken":
                self.assertEqual(request.headers["authorization"], f"Bearer {PROJECT_KEY}")
                self.assertEqual(variables, {"identityId": ALICE_ID})
                self.assertIn("token expiresAt", query)
                return ok(field, {"token": SESSION_TOKEN, "expiresAt": NOW})
            self.assertEqual(request.headers["authorization"], f"Bearer {ADMIN_TOKEN}")
            if field == "createProject":
                self.assertEqual(variables, {"name": "My project"})
                return ok(field, {"id": PROJECT, "projectKey": PROJECT_KEY})
            if field == "projects":
                self.assertEqual(variables["limit"], 2)
                identifier = NEXT_PROJECT if variables["after"] else PROJECT
                return ok(
                    field,
                    {
                        "items": [{
                            "id": identifier,
                            "name": "My project",
                            "status": "provisioning" if variables["after"] else "active",
                        }],
                        "nextAfter": identifier,
                    },
                )
            self.assertEqual(variables, {"id": PROJECT})
            return ok(field, True)

        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http:
            async with ManagementClient(
                "http://127.0.0.1:8081", ADMIN_TOKEN, http_client=http
            ) as management:
                created = await management.create_project("My project")
                self.assertEqual((created.id, created.project_key), (PROJECT, PROJECT_KEY))
                self.assertNotIn(PROJECT_KEY, repr(created))
                page = await management.projects(limit=2)
                self.assertEqual((page.items[0].status, page.next_after), ("active", PROJECT))
                second = await management.projects(after=UUID(PROJECT), limit=2)
                self.assertEqual(second.next_after, NEXT_PROJECT)
                await management.suspend_project(PROJECT)
            async with ServerProjectClient(
                "http://localhost:8080", PROJECT_KEY, http_client=http
            ) as server:
                identity = await server.create_identity(UUID(CLIENT_ID))
                self.assertEqual(identity.id, ALICE_ID)
                token = await server.issue_identity_token(identity.id)
                self.assertEqual(token.token, SESSION_TOKEN)
                self.assertEqual(token.expires_at.tzinfo, timezone.utc)
                self.assertNotIn(SESSION_TOKEN, repr(token))
                self.assertFalse(hasattr(server, "create_project"))
                self.assertFalse(hasattr(server, "thread"))
                with self.assertRaisesRegex(ValueError, "request ID"):
                    await server.create_identity("not-a-uuid")
                with self.assertRaisesRegex(ValueError, "identity_id"):
                    await server.issue_identity_token("alice")
        self.assertEqual([field for field, _, _ in seen], [
            "createProject", "projects", "projects", "suspendProject",
            "createIdentity", "issueIdentityToken",
        ])
        self.assertTrue(all(path == "/graphql" for _, _, path in seen))

        with self.assertRaisesRegex(ValueError, "st_"):
            UserClient("http://localhost:8080", PROJECT_KEY)
        with self.assertRaisesRegex(ValueError, "pk_"):
            ServerProjectClient("http://localhost:8080", ADMIN_TOKEN)
        with self.assertRaisesRegex(ValueError, "adm_"):
            ManagementClient("http://localhost:8081", PROJECT_KEY)
        for bad in (
            "http://example.com",
            "http://localhost.evil.example",
            "https://alice:password@example.com",
            "https://example.com/?token=x",
            "http://localhost:8080?",
            "https://example.com#",
            "ftp://localhost",
        ):
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                UserClient(bad, SESSION_TOKEN)
        async with UserClient("https://example.com/api", SESSION_TOKEN) as user:
            self.assertEqual(user._url("graphql"), "https://example.com/api/graphql")

    async def test_thread_membership_history_props_and_sparse_timeline_pages(self):
        seen = []
        big = 2**53 + 1

        def handler(request):
            names = (
                "createThread", "thread", "threads", "threadInvitations", "threadMembers",
                "threadMessages", "threadEvents", "sendMessage", "inviteThreadMember",
                "acceptThreadInvitation", "leaveThread", "removeThreadMember",
                "changeThreadRole", "transferThreadOwner", "archiveThread", "reopenThread",
            )
            field, variables, query = operation(request, names)
            seen.append((field, variables))
            self.assertEqual(request.headers["authorization"], f"Bearer {SESSION_TOKEN}")
            self.assertNotIn(SESSION_TOKEN, str(request.url))
            if field == "createThread":
                self.assertEqual(variables, {
                    "title": "Team", "members": [BOB_ID], "onJoin": "all_existing",
                    "afterLeave": "previously_visible", "afterRemove": "revoke",
                })
                return ok(field, thread(str(big)))
            if field == "thread":
                self.assertEqual(variables, {"id": THREAD})
                return ok(field, thread(str(big)))
            if field == "threads":
                self.assertEqual(variables, {"after": None, "limit": 2})
                return ok(field, {"items": [thread(str(big))], "nextAfter": THREAD})
            if field == "threadInvitations":
                return ok(field, [thread()])
            if field == "threadMembers":
                return ok(field, [member(state="active")])
            if field == "threadMessages":
                self.assertEqual(variables["after"], "0")
                self.assertIn("hasMore", query)
                return ok(field, {
                    "items": [message(big)], "nextAfter": str(big + 5),
                    "cursor": str(big + 20), "hasMore": True,
                })
            if field == "threadEvents":
                if variables["after"] == "0":
                    return ok(field, {
                        "items": [thread_event(big, kind="member.invited", with_message=False)],
                        "nextAfter": str(big + 11),
                        "cursor": str(big + 20), "hasMore": True,
                    })
                self.assertEqual(variables["after"], str(big + 11))
                return ok(field, {
                    "items": [], "nextAfter": str(big + 20),
                    "cursor": str(big + 20), "hasMore": False,
                })
            if field == "sendMessage":
                self.assertEqual(variables, {
                    "threadId": THREAD, "clientMessageId": CLIENT_ID, "body": "hello",
                    "props": {"ticket": {"number": 42}, "tags": ["chat"]},
                })
                self.assertIn("$props:JSON", query)
                return ok(field, message())
            if field == "inviteThreadMember":
                self.assertEqual(variables["role"], "viewer")
                return ok(field, member(role="viewer"))
            if field == "acceptThreadInvitation":
                return ok(field, member(state="active"))
            if field == "changeThreadRole":
                self.assertEqual(variables["role"], "moderator")
                return ok(field, member(role="moderator", state="active"))
            if field == "transferThreadOwner":
                updated = thread()
                updated["owner"] = BOB_ID
                return ok(field, updated)
            if field == "archiveThread":
                return ok(field, thread(state="archived"))
            if field == "reopenThread":
                return ok(field, thread())
            self.assertIn(field, ("leaveThread", "removeThreadMember"))
            return ok(field, True)

        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http:
            async with UserClient("http://localhost:8080", SESSION_TOKEN, http_client=http) as user:
                created = await user.create_thread(
                    "Team", [BOB_ID],
                    history_on_join="all_existing",
                    history_after_leave="previously_visible",
                )
                self.assertEqual(created.last_sequence, big)
                self.assertEqual(created.history_after_remove, "revoke")
                self.assertEqual((await user.thread(UUID(THREAD))).id, THREAD)
                listing = await user.threads(limit=2)
                self.assertEqual((listing.next_after, listing.items[0].id), (THREAD, THREAD))
                self.assertEqual((await user.thread_invitations())[0].id, THREAD)
                self.assertEqual((await user.thread_members(THREAD))[0].joined_sequence, 12)
                history = await user.thread_messages(THREAD, limit=2)
                self.assertEqual((history.items[0].sequence, history.next_after), (big, big + 5))
                self.assertEqual(history.cursor, big + 20)
                self.assertEqual(history.items[0].props["ticket"], {"number": 42})
                first = await user.thread_events(THREAD, limit=2)
                self.assertEqual(first.items[0].kind, "member.invited")
                self.assertIsNone(first.items[0].message)
                self.assertEqual((first.items[0].identity_id, first.items[0].call_id), (BOB_ID, MEDIA))
                self.assertEqual(first.next_after, big + 11)
                empty = await user.thread_events(THREAD, after=first.next_after, limit=2)
                self.assertEqual(empty.items, ())
                self.assertEqual(empty.next_after, big + 20)
                sent = await user.send_message(
                    THREAD, "hello", client_message_id=UUID(CLIENT_ID),
                    props={"ticket": {"number": 42}, "tags": ["chat"]},
                )
                retry = await user.send_message(
                    THREAD, "hello", client_message_id=CLIENT_ID,
                    props={"tags": ["chat"], "ticket": {"number": 42}},
                )
                self.assertEqual(sent, retry)
                self.assertEqual(sent.id, MESSAGE_ID)
                invited = await user.invite_thread_member(THREAD, BOB_ID, "viewer")
                self.assertEqual((invited.membership_id, invited.state), (MEMBERSHIP_ID, "invited"))
                self.assertEqual((await user.accept_thread_invitation(THREAD)).state, "active")
                self.assertEqual((await user.change_thread_role(THREAD, BOB_ID, "moderator")).role, "moderator")
                self.assertEqual((await user.transfer_thread_owner(THREAD, BOB_ID)).owner, BOB_ID)
                self.assertEqual((await user.archive_thread(THREAD)).state, "archived")
                self.assertEqual((await user.reopen_thread(THREAD)).state, "active")
                await user.remove_thread_member(THREAD, BOB_ID)
                await user.leave_thread(THREAD)
        self.assertEqual(len(seen), 18)
        self.assertTrue(all("threadId" in variables for field, variables in seen if field in (
            "threadMessages", "threadEvents", "sendMessage", "inviteThreadMember",
            "acceptThreadInvitation", "changeThreadRole", "transferThreadOwner",
            "archiveThread", "reopenThread", "leaveThread", "removeThreadMember",
        )))

    async def test_media_calls_broadcasts_roster_grants_and_native_hls(self):
        seen = []

        def handler(request):
            names = (
                "createCall", "createBroadcast", "mediaSession", "startMedia", "stopMedia",
                "mediaMembers", "setMediaMember", "removeMediaMember", "mediaParticipants",
                "joinMedia", "declineCall", "removeMediaParticipant", "muteMediaParticipant",
            )
            field, variables, query = operation(request, names)
            seen.append((field, variables))
            self.assertEqual(request.headers["authorization"], f"Bearer {SESSION_TOKEN}")
            if field in (
                "createCall", "createBroadcast", "mediaSession", "startMedia", "stopMedia"
            ):
                self.assertIn("threadId mode", query)
            if field == "createCall":
                self.assertEqual(variables, {
                    "threadId": THREAD, "title": "Support", "mode": "audio", "publishers": [BOB_ID],
                })
                return ok(field, media())
            if field == "createBroadcast":
                self.assertEqual(variables, {
                    "title": "Town hall", "publishers": [BOB_ID], "audience": "project",
                })
                return ok(field, media("broadcast"))
            if field == "mediaSession":
                return ok(field, media())
            if field == "startMedia":
                return ok(field, media("broadcast", state="starting"))
            if field == "stopMedia":
                return ok(field, media(state="ended"))
            if field == "mediaMembers":
                return ok(field, [{"identityId": BOB_ID, "role": "publisher"}])
            if field == "mediaParticipants":
                return ok(field, [{
                    "id": PARTICIPANT, "identityId": BOB_ID, "role": "publisher",
                    "issuedAt": NOW, "expiresAt": NOW, "revokedAt": None,
                    "connected": False,
                }])
            if field == "joinMedia":
                expected = PARTICIPANT if sum(name == "joinMedia" for name, _ in seen) == 2 else None
                self.assertEqual(variables["renewParticipantId"], expected)
                return ok(field, {
                    "participantId": PARTICIPANT, "serverUrl": "ws://127.0.0.1:7880",
                    "token": "short-lived-livekit-grant", "expiresAt": NOW,
                })
            if field == "muteMediaParticipant":
                self.assertEqual(variables["trackSid"], "TR_123")
                self.assertIs(variables["muted"], True)
            return ok(field, True)

        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http:
            async with UserClient("http://localhost:8080", SESSION_TOKEN, http_client=http) as user:
                call = await user.create_call(THREAD, "Support", "audio", [BOB_ID])
                self.assertEqual((call.thread_id, call.mode), (THREAD, "audio"))
                broadcast = await user.create_broadcast(
                    "Town hall", [BOB_ID], audience="project"
                )
                self.assertIsNone(broadcast.thread_id)
                self.assertIsNone(broadcast.mode)
                self.assertEqual((await user.media_session(MEDIA)).project_id, PROJECT)
                self.assertEqual((await user.start_media(MEDIA)).state, "starting")
                grant = await user.join_media(MEDIA)
                self.assertEqual(grant.token, "short-lived-livekit-grant")
                self.assertNotIn(grant.token, repr(grant))
                await user.join_media(MEDIA, renew_participant_id=PARTICIPANT)
                self.assertEqual((await user.media_members(MEDIA))[0].role, "publisher")
                await user.set_media_member(MEDIA, BOB_ID, "viewer")
                await user.remove_media_member(MEDIA, BOB_ID)
                self.assertFalse((await user.media_participants(MEDIA))[0].connected)
                await user.mute_media_participant(MEDIA, PARTICIPANT, "TR_123", True)
                await user.remove_media_participant(MEDIA, PARTICIPANT)
                await user.decline_call(MEDIA)
                self.assertEqual((await user.stop_media(MEDIA)).state, "ended")

                master = user.playback_request(MEDIA)
                variant = master.for_asset("variant_hi/playlist.m3u8")
                segment = variant.for_asset("segment_000001.ts")
                low = user.playback_request(MEDIA, "variant_lo/segment_000000.ts")
                for asset in (master, variant, segment, low):
                    self.assertEqual(asset.headers["Authorization"], f"Bearer {SESSION_TOKEN}")
                    self.assertNotIn(SESSION_TOKEN, asset.url)
                    self.assertNotIn(SESSION_TOKEN, repr(asset))
                self.assertEqual(
                    segment.url,
                    f"http://localhost:8080/media/{MEDIA}/hls/variant_hi/segment_000001.ts",
                )
                for invalid in (
                    "https://example.com/steal.ts", "//example.com/steal.ts",
                    "../variant_lo/playlist.m3u8", "variant_hi/segment_000001.ts?token=x",
                    "%2e%2e/playlist.m3u8", "variant_bad/playlist.m3u8",
                ):
                    with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                        master.for_asset(invalid)
        self.assertEqual(len(seen), 14)
        self.assertTrue(all(field != "getMedia" for field, _ in seen))

    async def test_graphql_errors_non_200_auth_invalid_data_and_inputs(self):
        responses = (
            (
                httpx.Response(200, json={
                    "data": {"thread": thread()},
                    "errors": [{
                        "message": "membership removed",
                        "extensions": {"code": "FORBIDDEN"},
                    }],
                }),
                APIError,
                ("FORBIDDEN", 200),
            ),
            (
                httpx.Response(401, json={
                    "error": {"code": "unauthenticated", "message": "expired token"}
                }),
                APIError,
                ("unauthenticated", 401),
            ),
            (
                httpx.Response(403, json={
                    "errors": [{"message": "denied", "extensions": {"code": "FORBIDDEN"}}]
                }),
                APIError,
                ("FORBIDDEN", 403),
            ),
            (httpx.Response(302, headers={"location": "https://elsewhere.example/"}), ProtocolError, None),
            (httpx.Response(500, text="not JSON"), ProtocolError, None),
            (httpx.Response(200, text="{"), ProtocolError, None),
            (httpx.Response(200, json={"data": {}}), ProtocolError, None),
            (httpx.Response(200, json={"data": {"thread": {**thread(), "lastSequence": 5}}}), ProtocolError, None),
            (
                httpx.Response(200, json={
                    "data": {"thread": {**thread(), "lastSequence": "9" * 5000}}
                }),
                ProtocolError,
                None,
            ),
        )
        for response, error_type, expected in responses:
            requested = []

            def handler(request):
                requested.append(request)
                return response

            async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http:
                async with UserClient("http://localhost:8080", SESSION_TOKEN, http_client=http) as user:
                    with self.subTest(response=response.status_code, payload=response.text):
                        with self.assertRaises(error_type) as caught:
                            await user.thread(THREAD)
                        if expected is not None:
                            self.assertEqual(
                                (caught.exception.code, caught.exception.status_code), expected
                            )
            self.assertEqual(len(requested), 1)

        async with httpx.AsyncClient(
            transport=httpx.MockTransport(lambda request: ok("revokeSession", False))
        ) as http:
            async with UserClient("http://localhost:8080", SESSION_TOKEN, http_client=http) as user:
                with self.assertRaises(ProtocolError):
                    await user.revoke_session()

        async with UserClient("http://localhost:8080", SESSION_TOKEN) as user:
            with self.assertRaises(ValueError):
                await user.send_message("..", "hello")
            with self.assertRaises(ValueError):
                await user.send_message(THREAD, "é" * 16385)
            with self.assertRaises(ValueError):
                await user.send_message(THREAD, "hello", props={"bad": float("nan")})
            with self.assertRaises(ValueError):
                await user.send_message(THREAD, "hello", props=["not an object"])
            with self.assertRaises(ValueError):
                await user.thread_messages(THREAD, after=True)
            with self.assertRaises(ValueError):
                await user.thread_events(THREAD, limit=101)
            with self.assertRaises(ValueError):
                await user.invite_thread_member(THREAD, "..")
            with self.assertRaises(ValueError):
                await user.create_thread("\n")
            with self.assertRaises(ValueError):
                await user.create_thread("Team", history_on_join="other")
            with self.assertRaises(ValueError):
                await user.create_call(THREAD, "Title", "other")
            with self.assertRaises(ValueError):
                await user.set_media_member(MEDIA, BOB_ID, "owner")
            with self.assertRaises(ValueError):
                await user.join_media(MEDIA, renew_participant_id="not-a-uuid")
            with self.assertRaises(ValueError):
                user.playback_request("..")
            with self.assertRaises(ValueError):
                user.subscribe_thread_events(THREAD, after=-1)
            with self.assertRaises(ValueError):
                user.subscribe_call_events(max_retries=-1)

        def timed_out(request):
            raise httpx.ReadTimeout("slow", request=request)

        async with httpx.AsyncClient(transport=httpx.MockTransport(timed_out)) as http:
            async with UserClient("http://localhost:8080", SESSION_TOKEN, http_client=http) as user:
                with self.assertRaises(RequestTimeout):
                    await user.thread(THREAD)

        entered = asyncio.Event()

        async def waits_forever(request):
            entered.set()
            await asyncio.Future()

        async with httpx.AsyncClient(transport=httpx.MockTransport(waits_forever)) as http:
            async with UserClient("http://localhost:8080", SESSION_TOKEN, http_client=http) as user:
                task = asyncio.create_task(user.thread(THREAD))
                await asyncio.wait_for(entered.wait(), 1)
                task.cancel()
                with self.assertRaises(asyncio.CancelledError):
                    await task
