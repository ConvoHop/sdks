package com.convohop.reactnative

import com.convohop.android.push.AudioRoute
import com.convohop.android.push.CallEndReason
import com.convohop.android.push.CallState
import com.convohop.android.push.PushResult
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/** The values the JavaScript side of `@convohop/react-native` accepts, and their mapping from the push SDK's. */
internal object Contract {
    // Promise rejection codes. A failed FCM registration rejects with FCM's own code when it has one.
    const val E_NOT_CONFIGURED = "E_NOT_CONFIGURED"
    const val E_INVALID_ARGUMENT = "E_INVALID_ARGUMENT"
    const val E_STORAGE = "E_STORAGE"
    const val E_NO_ACTIVITY = "E_NO_ACTIVITY"
    const val E_FIREBASE_NOT_INITIALIZED = "E_FIREBASE_NOT_INITIALIZED"
    const val E_REGISTRATION = "E_REGISTRATION"
    const val E_PUSH_HANDLER = "E_PUSH_HANDLER"
    const val E_CALL_NOT_FOUND = "E_CALL_NOT_FOUND"
    const val E_CALL_STATE = "E_CALL_STATE"
    const val E_AUDIO_ROUTE = "E_AUDIO_ROUTE"
    const val E_UNSUPPORTED = "E_UNSUPPORTED"

    private val UUID = Regex("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
    private const val NIL_UUID = "00000000-0000-0000-0000-000000000000"
    private val IDENTIFIER = Regex("^[A-Za-z][A-Za-z0-9_]{0,63}$")

    // FCM reports failures as upper-case codes such as SERVICE_NOT_AVAILABLE.
    private val FCM_ERROR = Regex("^[A-Z][A-Z_]{0,63}$")

    /** A lowercase, non-nil UUID. */
    fun isId(value: String?): Boolean = value != null && UUID.matches(value) && value != NIL_UUID

    /** An ASCII letter followed by up to 63 ASCII letters, digits or `_`. */
    fun isIdentifier(value: String?): Boolean = value != null && IDENTIFIER.matches(value)

    fun result(result: PushResult): String = when (result) {
        PushResult.NOT_CONVOHOP -> "notConvoHop"
        PushResult.INVALID -> "invalid"
        PushResult.IGNORED -> "ignored"
        PushResult.MESSAGE -> "message"
        PushResult.RINGING -> "ringing"
        PushResult.STOPPED -> "stopped"
        PushResult.MISSED -> "missed"
    }

    /** An answered call is `connecting` until JavaScript reports its media connected. */
    fun state(state: CallState, connected: Boolean): String = when (state) {
        CallState.RINGING -> "ringing"
        CallState.ACTIVE -> if (connected) "active" else "connecting"
        CallState.HELD -> "held"
        CallState.ENDED -> "ended"
    }

    fun endReason(reason: CallEndReason): String = when (reason) {
        CallEndReason.REJECTED -> "rejected"
        CallEndReason.HUNG_UP -> "hungUp"
        CallEndReason.MISSED -> "missed"
        CallEndReason.ANSWERED_ELSEWHERE -> "answeredElsewhere"
        CallEndReason.DECLINED_ELSEWHERE -> "declinedElsewhere"
        CallEndReason.STOPPED -> "stopped"
        CallEndReason.EXPIRED -> "expired"
        CallEndReason.FAILED -> "failed"
    }

    fun route(route: AudioRoute): String = when (route) {
        AudioRoute.EARPIECE -> "earpiece"
        AudioRoute.SPEAKER -> "speaker"
        AudioRoute.BLUETOOTH -> "bluetooth"
        AudioRoute.WIRED_HEADSET -> "wiredHeadset"
        AudioRoute.STREAMING -> "streaming"
        AudioRoute.UNKNOWN -> "unknown"
    }

    /** The route JavaScript can ask for, or null. */
    fun settableRoute(name: String): AudioRoute? = when (name) {
        "earpiece" -> AudioRoute.EARPIECE
        "speaker" -> AudioRoute.SPEAKER
        "bluetooth" -> AudioRoute.BLUETOOTH
        "wiredHeadset" -> AudioRoute.WIRED_HEADSET
        "streaming" -> AudioRoute.STREAMING
        else -> null
    }

    /** [epochMillis] as an RFC 3339 UTC timestamp with milliseconds. */
    fun timestamp(epochMillis: Long): String =
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.ROOT).apply { timeZone = TimeZone.getTimeZone("UTC") }.format(Date(epochMillis))

    /**
     * The FCM error code in [error]'s cause chain, such as SERVICE_NOT_AVAILABLE, or null. Only a code is reported, so
     * an error message can't carry a token or other detail into JavaScript.
     */
    fun fcmErrorCode(error: Throwable?): String? {
        var cause = error
        var depth = 0
        while (cause != null && depth < 8) {
            val message = cause.message
            if (message != null && FCM_ERROR.matches(message)) return message
            cause = cause.cause
            depth++
        }
        return null
    }
}
