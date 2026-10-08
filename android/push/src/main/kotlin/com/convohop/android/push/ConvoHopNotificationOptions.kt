package com.convohop.android.push

import android.content.Context
import android.content.Intent

/** Decides whether this device accepts pushes for a recipient, for example only the signed-in user. */
public fun interface RecipientFilter {
    public fun accepts(recipientId: String): Boolean
}

/** Builds the activity intent for a call, or null for the default: your launch activity. */
public fun interface CallIntentFactory {
    public fun create(context: Context, call: CallInfo): Intent?
}

/** Builds the activity intent for a message or missed call, or null for the default: your launch activity. */
public fun interface ConversationIntentFactory {
    public fun create(context: Context, notification: PushNotification): Intent?
}

/** Text for a message notification. */
public class MessageContent(public val title: String?, public val body: String?)

/**
 * Fetches a message's text on the device, with the user's own session, when
 * the push carries none: previews are off unless the project opts in. It runs
 * on the thread that handles the push and may block briefly; it is skipped on
 * the main thread. Return null to show the generic text.
 */
public fun interface MessageContentProvider {
    public fun content(message: PushNotification.Message): MessageContent?
}

/** How [ConvoHopNotifications] presents pushes. Set it in `Application.onCreate`, before pushes arrive. */
public class ConvoHopNotificationOptions {
    /** The small icon of every notification. 0 uses the app icon, which Android may show as a plain square. */
    public var smallIcon: Int = 0

    /** The notifications' accent color, or null for the system default. */
    public var color: Int? = null

    /** Post message notifications. Turn this off to show them yourself from [ConvoHopNotificationListener.onMessage]. */
    public var showMessages: Boolean = true

    /** Post a missed-call notification when a ring ends unanswered. */
    public var showMissedCalls: Boolean = true

    /** Ring through a self-managed `ConnectionService` on Android 8.0 and later. Without it, calls are notifications only. */
    public var useTelecom: Boolean = true

    /** Which recipients this device accepts. Null accepts all; reject users who signed out. */
    public var recipientFilter: RecipientFilter? = null

    /** The incoming-call screen, shown full screen over the lock screen when allowed and when the user taps the call. */
    public var incomingCallIntent: CallIntentFactory? = null

    /** Opens after the user answers from the notification. */
    public var answeredCallIntent: CallIntentFactory? = null

    /** Opens when the user taps a message or missed-call notification. */
    public var conversationIntent: ConversationIntentFactory? = null

    /** Fetches message text when a push carries none. */
    public var messageContent: MessageContentProvider? = null

    /** Where delivery state persists; null uses shared preferences. It never holds message text or tokens. */
    public var ledgerStore: PushLedgerStore? = null
}
