package com.convohop.android.push

/**
 * This device's FCM registration, in the mode your app uses FCM in: a
 * registration [Token] by default, or an [InstallationId] when your manifest
 * turns on registration by Firebase Installation ID (see [ConvoHopFirebase]).
 * Your backend stores it for the signed-in user and hands it to ConvoHop's
 * push delivery; ConvoHop never stores registrations itself.
 */
public sealed class PushRegistration {
    /** The push service: always `fcm`. */
    public val kind: String get() = "fcm"

    /** `kind` plus `token` or `fid`: the registration as the other ConvoHop SDKs give it to your backend. */
    public abstract fun toMap(): Map<String, String>

    /** [toMap] as JSON: `{"kind":"fcm","token":"…"}` or `{"kind":"fcm","fid":"…"}`. */
    public fun toJson(): String = PushJson.write(toMap())

    /** An FCM registration token, from `FirebaseMessaging.getToken()` or `onNewToken`. */
    public class Token(public val token: String) : PushRegistration() {
        init {
            require(token.isNotBlank()) { "An FCM registration token must not be blank" }
        }

        override fun toMap(): Map<String, String> = mapOf("kind" to kind, "token" to token)

        override fun equals(other: Any?): Boolean = other is Token && other.token == token

        override fun hashCode(): Int = token.hashCode()

        override fun toString(): String = "PushRegistration.Token(token=${redact(token)})"
    }

    /** A Firebase Installation ID that FCM registered, from `FirebaseMessaging.register()` or `onRegistered`. */
    public class InstallationId(public val fid: String) : PushRegistration() {
        init {
            require(fid.isNotBlank()) { "A Firebase Installation ID must not be blank" }
        }

        override fun toMap(): Map<String, String> = mapOf("kind" to kind, "fid" to fid)

        override fun equals(other: Any?): Boolean = other is InstallationId && other.fid == fid

        override fun hashCode(): Int = fid.hashCode()

        override fun toString(): String = "PushRegistration.InstallationId(fid=${redact(fid)})"
    }

    private companion object {
        /** Enough of [value] to tell registrations apart in logs, but not to address the device. */
        fun redact(value: String): String = "…" + value.takeLast(4)
    }
}
