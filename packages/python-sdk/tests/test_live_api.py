"""Opt-in SDK check against separately provided GraphQL services."""

import os
import unittest
from unittest.mock import patch
from uuid import uuid4

from convohop import APIError, ManagementClient, ServerProjectClient, UserClient


def _local_origins():
    api = os.environ.get("COMMS_API_URL")
    management = os.environ.get("COMMS_MANAGEMENT_URL")
    if not api or not management:
        raise RuntimeError(
            "Set COMMS_API_URL and COMMS_MANAGEMENT_URL to run live API tests"
        )
    return api, management


class LocalOriginTests(unittest.TestCase):
    def test_requires_explicit_origins(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(RuntimeError, "COMMS_API_URL"):
                _local_origins()
        with patch.dict(os.environ, {"COMMS_API_URL": "http://127.0.0.1:25000"}, clear=True):
            with self.assertRaisesRegex(RuntimeError, "COMMS_MANAGEMENT_URL"):
                _local_origins()
        with patch.dict(os.environ, {
            "COMMS_API_URL": "http://127.0.0.1:25000",
            "COMMS_MANAGEMENT_URL": "http://127.0.0.1:25001",
        }, clear=True):
            self.assertEqual(_local_origins(),
                             ("http://127.0.0.1:25000", "http://127.0.0.1:25001"))


@unittest.skipUnless(
    os.environ.get("COMMS_LIVE_ADMIN_TOKEN"),
    "set COMMS_LIVE_ADMIN_TOKEN to exercise the local APIs",
)
class LiveAPITests(unittest.IsolatedAsyncioTestCase):
    async def test_live_thread_props_and_call_feed(self):
        admin_token = os.environ["COMMS_LIVE_ADMIN_TOKEN"]
        api_url, management_url = _local_origins()
        async with ManagementClient(management_url, admin_token) as management:
            project = await management.create_project("Python live " + uuid4().hex[:8])
            try:
                async with ServerProjectClient(api_url, project.project_key) as server:
                    alice_id = (await server.create_identity(uuid4())).id
                    bob_id = (await server.create_identity(uuid4())).id
                    outsider_id = (await server.create_identity(uuid4())).id
                    alice_token = await server.issue_identity_token(alice_id)
                    bob_token = await server.issue_identity_token(bob_id)
                    outsider_token = await server.issue_identity_token(outsider_id)
                async with UserClient(api_url, alice_token.token) as alice, \
                           UserClient(api_url, bob_token.token) as bob, \
                           UserClient(api_url, outsider_token.token) as outsider:
                    thread = await alice.create_thread(
                        "Python live thread", members=[bob_id]
                    )
                    with self.assertRaises(APIError) as denied:
                        await bob.thread(thread.id)
                    self.assertEqual(denied.exception.code, "NOT_FOUND")
                    await bob.accept_thread_invitation(thread.id)

                    message_id = uuid4()
                    message = await alice.send_message(
                        thread.id, "Hello", client_message_id=message_id,
                        props={"source": "python-sdk", "priority": 3},
                    )
                    retried = await alice.send_message(
                        thread.id, "Hello", client_message_id=message_id,
                        props={"priority": 3, "source": "python-sdk"},
                    )
                    self.assertEqual(retried.id, message.id)
                    history = await bob.thread_messages(thread.id)
                    self.assertEqual(len(history.items), 1)
                    self.assertEqual(history.items[0].props["source"], "python-sdk")

                    before = await bob.incoming_calls()
                    call = await alice.create_call(
                        thread.id, "Python incoming call", "audio",
                        publishers=[bob_id],
                    )
                    try:
                        started = await alice.start_media(call.id)
                        self.assertEqual(started.state, "live")
                        invitations = await bob.incoming_calls()
                        self.assertEqual(len(invitations.items), 1)
                        self.assertEqual(invitations.items[0].call.thread_id, thread.id)
                        self.assertEqual(invitations.items[0].call.mode, "audio")
                        self.assertEqual((await outsider.incoming_calls()).items, ())

                        ringing = await bob.call_events(after=before.cursor)
                        self.assertTrue(any(
                            event.kind == "call.ringing" and event.call_id == call.id
                            for event in ringing.items
                        ))
                        await bob.decline_call(call.id)
                        await bob.decline_call(call.id)
                        declined = await bob.call_events(after=ringing.next_after)
                        self.assertEqual(
                            len([event for event in declined.items
                                 if event.kind == "call.declined"
                                 and event.call_id == call.id and event.call is None]),
                            1,
                        )
                        self.assertTrue(any(
                            event.kind == "call.declined"
                            and event.call_id == call.id
                            and event.identity_id == bob_id
                            and event.call is not None
                            for event in (await alice.call_events()).items
                        ))
                    finally:
                        await alice.stop_media(call.id)

                    await bob.revoke_session()
                    with self.assertRaises(APIError) as revoked:
                        await bob.thread(thread.id)
                    self.assertEqual(revoked.exception.code, "UNAUTHENTICATED")
                    await outsider.revoke_session()
                    await alice.revoke_session()
            finally:
                await management.suspend_project(project.id)


if __name__ == "__main__":
    unittest.main()
