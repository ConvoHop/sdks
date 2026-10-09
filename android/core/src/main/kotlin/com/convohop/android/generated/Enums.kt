// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.android.generated

import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive

public enum class LiveConnectionMode {
    INITIAL,
    RECONNECT,
    ;

    /** The GraphQL value. */
    public fun toJson(): JsonPrimitive = JsonPrimitive(name)

    public companion object {
        /** Decodes [element], throwing [ShapeException] for values this SDK does not know. */
        public fun fromJson(element: JsonElement, path: String = "LiveConnectionMode"): LiveConnectionMode {
            val raw = element.asString(path)
            return entries.firstOrNull { it.name == raw } ?: throw ShapeException(path, "is not a known LiveConnectionMode value")
        }
    }
}

public enum class LiveCutoffEvidence {
    NATIVE_FENCE,
    MONOTONIC_BOOT_RETIREMENT,
    NO_GRANTS_ISSUED,
    ;

    /** The GraphQL value. */
    public fun toJson(): JsonPrimitive = JsonPrimitive(name)

    public companion object {
        /** Decodes [element], throwing [ShapeException] for values this SDK does not know. */
        public fun fromJson(element: JsonElement, path: String = "LiveCutoffEvidence"): LiveCutoffEvidence {
            val raw = element.asString(path)
            return entries.firstOrNull { it.name == raw } ?: throw ShapeException(path, "is not a known LiveCutoffEvidence value")
        }
    }
}

public enum class LiveCutoffScopeKind {
    PARTICIPATION,
    GENERATION,
    ;

    /** The GraphQL value. */
    public fun toJson(): JsonPrimitive = JsonPrimitive(name)

    public companion object {
        /** Decodes [element], throwing [ShapeException] for values this SDK does not know. */
        public fun fromJson(element: JsonElement, path: String = "LiveCutoffScopeKind"): LiveCutoffScopeKind {
            val raw = element.asString(path)
            return entries.firstOrNull { it.name == raw } ?: throw ShapeException(path, "is not a known LiveCutoffScopeKind value")
        }
    }
}

public enum class LiveCutoffState {
    PENDING,
    ENFORCED,
    UNKNOWN,
    ;

    /** The GraphQL value. */
    public fun toJson(): JsonPrimitive = JsonPrimitive(name)

    public companion object {
        /** Decodes [element], throwing [ShapeException] for values this SDK does not know. */
        public fun fromJson(element: JsonElement, path: String = "LiveCutoffState"): LiveCutoffState {
            val raw = element.asString(path)
            return entries.firstOrNull { it.name == raw } ?: throw ShapeException(path, "is not a known LiveCutoffState value")
        }
    }
}

public enum class LiveErrorCode {
    LIVE_SESSION_EXISTS,
    LIVE_SESSION_CLOSED,
    LIVE_SESSION_INTERRUPTED,
    LIVE_SESSION_CAPACITY,
    LIVE_ALERT_LIMIT,
    JOINED_ELSEWHERE,
    PARTICIPATION_DRAINING,
    PARTICIPATION_MISMATCH,
    GENERATION_CONFLICT,
    MEDIA_NOT_READY,
    CREDENTIAL_REFRESH_REQUIRED,
    LIVE_START_CANCELLED,
    LIVE_PREPARATION_FAILED,
    ;

    /** The GraphQL value. */
    public fun toJson(): JsonPrimitive = JsonPrimitive(name)

    public companion object {
        /** Decodes [element], throwing [ShapeException] for values this SDK does not know. */
        public fun fromJson(element: JsonElement, path: String = "LiveErrorCode"): LiveErrorCode {
            val raw = element.asString(path)
            return entries.firstOrNull { it.name == raw } ?: throw ShapeException(path, "is not a known LiveErrorCode value")
        }
    }
}

public enum class LiveMediaProfile {
    AUDIO_ONLY,
    AUDIO_VIDEO,
    ;

    /** The GraphQL value. */
    public fun toJson(): JsonPrimitive = JsonPrimitive(name)

    public companion object {
        /** Decodes [element], throwing [ShapeException] for values this SDK does not know. */
        public fun fromJson(element: JsonElement, path: String = "LiveMediaProfile"): LiveMediaProfile {
            val raw = element.asString(path)
            return entries.firstOrNull { it.name == raw } ?: throw ShapeException(path, "is not a known LiveMediaProfile value")
        }
    }
}

public enum class LiveOperationKind {
    START,
    END,
    ;

    /** The GraphQL value. */
    public fun toJson(): JsonPrimitive = JsonPrimitive(name)

    public companion object {
        /** Decodes [element], throwing [ShapeException] for values this SDK does not know. */
        public fun fromJson(element: JsonElement, path: String = "LiveOperationKind"): LiveOperationKind {
            val raw = element.asString(path)
            return entries.firstOrNull { it.name == raw } ?: throw ShapeException(path, "is not a known LiveOperationKind value")
        }
    }
}

public enum class LiveOperationState {
    RUNNING,
    COMPLETED,
    FAILED,
    ;

    /** The GraphQL value. */
    public fun toJson(): JsonPrimitive = JsonPrimitive(name)

    public companion object {
        /** Decodes [element], throwing [ShapeException] for values this SDK does not know. */
        public fun fromJson(element: JsonElement, path: String = "LiveOperationState"): LiveOperationState {
            val raw = element.asString(path)
            return entries.firstOrNull { it.name == raw } ?: throw ShapeException(path, "is not a known LiveOperationState value")
        }
    }
}

public enum class LiveParticipationState {
    JOINED,
    CONNECTING,
    CONNECTED,
    DISCONNECTED,
    LEAVING,
    LEFT,
    ;

    /** The GraphQL value. */
    public fun toJson(): JsonPrimitive = JsonPrimitive(name)

    public companion object {
        /** Decodes [element], throwing [ShapeException] for values this SDK does not know. */
        public fun fromJson(element: JsonElement, path: String = "LiveParticipationState"): LiveParticipationState {
            val raw = element.asString(path)
            return entries.firstOrNull { it.name == raw } ?: throw ShapeException(path, "is not a known LiveParticipationState value")
        }
    }
}

public enum class LiveRole {
    PUBLISHER,
    VIEWER,
    ;

    /** The GraphQL value. */
    public fun toJson(): JsonPrimitive = JsonPrimitive(name)

    public companion object {
        /** Decodes [element], throwing [ShapeException] for values this SDK does not know. */
        public fun fromJson(element: JsonElement, path: String = "LiveRole"): LiveRole {
            val raw = element.asString(path)
            return entries.firstOrNull { it.name == raw } ?: throw ShapeException(path, "is not a known LiveRole value")
        }
    }
}

public enum class LiveSessionKind {
    INTERACTIVE,
    BROADCAST,
    ;

    /** The GraphQL value. */
    public fun toJson(): JsonPrimitive = JsonPrimitive(name)

    public companion object {
        /** Decodes [element], throwing [ShapeException] for values this SDK does not know. */
        public fun fromJson(element: JsonElement, path: String = "LiveSessionKind"): LiveSessionKind {
            val raw = element.asString(path)
            return entries.firstOrNull { it.name == raw } ?: throw ShapeException(path, "is not a known LiveSessionKind value")
        }
    }
}

public enum class LiveSessionState {
    PREPARING,
    READY,
    ACTIVE,
    DRAINING,
    ENDED,
    FAILED,
    ;

    /** The GraphQL value. */
    public fun toJson(): JsonPrimitive = JsonPrimitive(name)

    public companion object {
        /** Decodes [element], throwing [ShapeException] for values this SDK does not know. */
        public fun fromJson(element: JsonElement, path: String = "LiveSessionState"): LiveSessionState {
            val raw = element.asString(path)
            return entries.firstOrNull { it.name == raw } ?: throw ShapeException(path, "is not a known LiveSessionState value")
        }
    }
}
