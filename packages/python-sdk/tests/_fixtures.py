import json
import re
from uuid import UUID

import httpx

PROJECT = "e1b30eb0-a0a9-4460-a866-c10f86862bd8"
NEXT_PROJECT = "f1b30eb0-a0a9-4460-a866-c10f86862bd8"
THREAD = "33d9e132-d26d-4df9-92b0-5877cb1f3265"
NEXT_THREAD = "43d9e132-d26d-4df9-92b0-5877cb1f3265"
MEDIA = "f5b0126a-a68b-4895-bb43-d558b9ca1126"
PARTICIPANT = "d24021e7-9869-476f-8ef1-d8be8af13767"
MESSAGE_ID = "6053d372-e5f6-4c54-8048-cb05f1f0852b"
CLIENT_ID = "25ea1819-d592-4827-8d21-39c412465832"
MEMBERSHIP_ID = "a5b0126a-a68b-4895-bb43-d558b9ca1126"
ALICE_ID = "ci_11111111111111111111111111111111"
BOB_ID = "ci_22222222222222222222222222222222"
NOW = "2026-09-25T12:00:00Z"
PROJECT_KEY = "pk_" + "a" * 64
SESSION_TOKEN = "st_" + "b" * 64
ADMIN_TOKEN = "adm_" + "c" * 64


def thread(sequence="0", *, thread_id=THREAD, state="active"):
    return {
        "id": thread_id,
        "title": "Team",
        "owner": ALICE_ID,
        "state": state,
        "historyOnJoin": "all_existing",
        "historyAfterLeave": "previously_visible",
        "historyAfterRemove": "revoke",
        "lastSequence": sequence,
    }


def member(identity_id=BOB_ID, *, state="invited", role="member"):
    return {
        "membershipId": MEMBERSHIP_ID,
        "identityId": identity_id,
        "role": role,
        "state": state,
        "joinedSequence": "12" if state == "active" else None,
        "exitedSequence": None,
    }


def message(sequence=1, *, thread_id=THREAD):
    return {
        "id": MESSAGE_ID,
        "threadId": thread_id,
        "sequence": str(sequence),
        "sender": ALICE_ID,
        "clientMessageId": CLIENT_ID,
        "body": "hello",
        "props": {"ticket": {"number": 42}, "tags": ["chat"]},
        "createdAt": NOW,
    }


def thread_event(sequence=1, *, kind="message.created", thread_id=THREAD, with_message=True):
    return {
        "eventId": str(UUID(int=sequence)),
        "threadId": thread_id,
        "sequence": str(sequence),
        "kind": kind,
        "actor": ALICE_ID,
        "message": message(sequence, thread_id=thread_id) if with_message else None,
        "identityId": None if with_message else BOB_ID,
        "callId": None if with_message else MEDIA,
        "createdAt": NOW,
    }


def media(kind="call", *, state="requested"):
    return {
        "id": MEDIA,
        "projectId": PROJECT,
        "threadId": THREAD if kind == "call" else None,
        "mode": "audio" if kind == "call" else None,
        "kind": kind,
        "owner": ALICE_ID,
        "title": "Support",
        "audience": "members" if kind == "call" else "project",
        "state": state,
    }


def call_details(call_id=MEDIA, *, role="viewer"):
    return {
        "id": call_id,
        "projectId": PROJECT,
        "threadId": THREAD,
        "mode": "audio",
        "owner": ALICE_ID,
        "title": "Support",
        "role": role,
    }


def incoming(call_id=MEDIA, sequence=1):
    return {
        "call": call_details(call_id),
        "sequence": str(sequence),
        "invitedAt": NOW,
    }


def call_event(call_id=MEDIA, sequence=1, *, kind="call.ringing", with_call=True):
    return {
        "eventId": str(UUID(int=sequence)),
        "sequence": str(sequence),
        "kind": kind,
        "callId": call_id,
        "identityId": BOB_ID,
        "call": call_details(call_id) if with_call else None,
        "createdAt": NOW,
    }


def ok(field, value):
    return httpx.Response(200, json={"data": {field: value}})


def operation(request, names):
    assert request.method == "POST"
    assert request.url.path == "/graphql"
    payload = json.loads(request.content)
    query = payload["query"]
    matches = [
        name for name in names
        if re.search(r"\{" + re.escape(name) + r"(?=[({}])", query)
    ]
    assert len(matches) == 1, query
    assert isinstance(payload["variables"], dict)
    return matches[0], payload["variables"], query
