package com.convohop.reactnative

import android.content.Context
import com.convohop.android.push.RecipientFilter

/** The user whose ConvoHop pushes this device accepts: lowercase, non-nil UUIDs. */
internal data class Recipient(val projectId: String, val recipientId: String) {
    /** Both IDs in one value, so a reader never sees one user's project with another's ID. */
    fun encode(): String = "$projectId $recipientId"

    companion object {
        /** The recipient [encode] stored, or null for anything else. */
        fun decode(value: String?): Recipient? {
            val ids = value?.split(' ') ?: return null
            if (ids.size != 2 || !Contract.isId(ids[0]) || !Contract.isId(ids[1])) return null
            return Recipient(ids[0], ids[1])
        }
    }
}

/**
 * Keeps the [Recipient] on the device, in preferences of its own, so the push handler can read it before React Native
 * starts. It holds the two IDs and no credential.
 */
internal class RecipientStore(context: Context) {
    private val preferences = context.getSharedPreferences(FILE, Context.MODE_PRIVATE)

    fun get(): Recipient? = Recipient.decode(preferences.getString(KEY, null))

    /** Stores [recipient], or nobody for null. False if it couldn't be written. */
    fun set(recipient: Recipient?): Boolean {
        val editor = preferences.edit()
        if (recipient == null) editor.remove(KEY) else editor.putString(KEY, recipient.encode())
        return editor.commit()
    }

    private companion object {
        const val FILE = "com.convohop.reactnative.recipient"
        const val KEY = "recipient"
    }
}

/**
 * The push SDK's recipient filter while React Native is in use: it accepts a push only for the stored [recipient], and
 * only if [app]'s own filter accepts it too. Until JavaScript stores a recipient, and after it clears it, it accepts
 * nothing.
 */
internal class RecipientGate(private val recipient: () -> Recipient?, private val app: RecipientFilter?) : RecipientFilter {
    override fun accepts(recipientId: String): Boolean =
        recipient()?.recipientId == recipientId && app?.accepts(recipientId) != false
}
