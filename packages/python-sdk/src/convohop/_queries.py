"""GraphQL selections shared by HTTP operations and realtime subscriptions."""

THREAD = "id title owner state historyOnJoin historyAfterLeave historyAfterRemove lastSequence"
MEMBER = "membershipId identityId role state joinedSequence exitedSequence"
MESSAGE = "id threadId sequence sender clientMessageId body props createdAt"
EVENT = f"eventId threadId sequence kind actor identityId callId createdAt message{{{MESSAGE}}}"
MEDIA = "id projectId threadId mode kind owner title audience state"
MEDIA_MEMBER = "identityId role"
PARTICIPANT = "id identityId role issuedAt expiresAt revokedAt connected"
JOIN = "participantId serverUrl token expiresAt"
CALL = "id projectId threadId mode owner title role"
INCOMING = f"sequence invitedAt call{{{CALL}}}"
CALL_EVENT = f"eventId sequence kind callId identityId createdAt call{{{CALL}}}"


def operation(
    kind: str,
    field: str,
    declarations: str = "",
    arguments: str = "",
    selection: str = "",
) -> str:
    variables = f"({declarations})" if declarations else ""
    parameters = f"({arguments})" if arguments else ""
    fields = f"{{{selection}}}" if selection else ""
    return f"{kind}{variables}{{{field}{parameters}{fields}}}"
