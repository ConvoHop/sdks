package com.convohop.android.core

import com.convohop.android.generated.CurrentSessionReply
import com.convohop.android.generated.Session

/** Checks a session record beyond its shape: a round-tripping expiry and a nonzero revision. */
internal fun sessionMetadata(value: Session): Session {
    val expiresAt = timestamp(value.expiresAt)
    val revision = parseCounter(value.sessionRevision)
    if (Timestamps.format(timestampMillis(expiresAt)) != expiresAt || revision == "0") {
        protocolError("Invalid session expiry or revision")
    }
    parseId(value.sessionId)
    parseId(value.principalId)
    parseId(value.deviceId)
    parseId(value.incarnation)
    return value
}

/** The session's expiry in epoch milliseconds, truncated to the whole second the authority enforces. */
internal fun sessionExpiry(value: Session): Long = Math.floorDiv(timestampMillis(value.expiresAt), 1000L) * 1000L

/** The session in [proof], which must be active and unexpired both locally and at the authority's time. */
internal fun currentSession(proof: CurrentSessionReply, now: Long): Session {
    val value = sessionMetadata(proof.result)
    if (proof.status != "ok" || value.status != "active" || sessionExpiry(value) <= now ||
        sessionExpiry(value) <= timestampMillis(timestamp(proof.serverTime))
    ) {
        protocolError("Expected current live session authority evidence")
    }
    return value
}

internal fun sameSession(left: Session, right: Session): Boolean =
    left.sessionId == right.sessionId && left.principalId == right.principalId &&
        left.deviceId == right.deviceId && left.incarnation == right.incarnation
