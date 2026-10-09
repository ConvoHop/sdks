package com.convohop.reactnative

import android.content.Context
import android.content.Intent
import com.convohop.android.push.ConversationIntentFactory
import com.convohop.android.push.PushNotification
import java.security.MessageDigest
import java.security.SecureRandom
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * Signs the notification a ConvoHop notification's intent carries, so JavaScript only hears of notifications this app
 * posted: the launcher activity is exported, and any app can start it with extras of its choosing.
 */
internal class IntentSigner(loadKey: () -> ByteArray) {
    private val key: ByteArray by lazy(loadKey)

    fun sign(payload: String): String = hex(mac(payload))

    fun verify(payload: String, signature: String): Boolean =
        MessageDigest.isEqual(sign(payload).toByteArray(Charsets.US_ASCII), signature.toByteArray(Charsets.US_ASCII))

    private fun mac(payload: String): ByteArray {
        val mac = Mac.getInstance(ALGORITHM)
        mac.init(SecretKeySpec(key, ALGORITHM))
        return mac.doFinal((DOMAIN + payload).toByteArray(Charsets.UTF_8))
    }

    companion object {
        private const val ALGORITHM = "HmacSHA256"
        private const val DOMAIN = "convohop.opened\u0000"
        private const val FILE = "com.convohop.reactnative.intents"
        private const val KEY = "key"
        private const val KEY_BYTES = 32

        /** A signer with a key kept in the app's private preferences, made the first time it signs or verifies. */
        fun stored(context: Context): IntentSigner {
            val app = context.applicationContext
            return IntentSigner {
                val preferences = app.getSharedPreferences(FILE, Context.MODE_PRIVATE)
                unhex(preferences.getString(KEY, null))?.takeIf { it.size == KEY_BYTES } ?: ByteArray(KEY_BYTES).also { key ->
                    SecureRandom().nextBytes(key)
                    // If it can't be saved, intents signed with it verify only in this process.
                    preferences.edit().putString(KEY, hex(key)).commit()
                }
            }
        }

        fun hex(bytes: ByteArray): String {
            val out = StringBuilder(bytes.size * 2)
            for (byte in bytes) {
                val value = byte.toInt() and 0xFF
                out.append(DIGITS[value shr 4]).append(DIGITS[value and 0xF])
            }
            return out.toString()
        }

        fun unhex(text: String?): ByteArray? {
            if (text == null || text.length % 2 != 0) return null
            val bytes = ByteArray(text.length / 2)
            for (index in bytes.indices) {
                val high = DIGITS.indexOf(text[index * 2])
                val low = DIGITS.indexOf(text[index * 2 + 1])
                if (high < 0 || low < 0) return null
                bytes[index] = (high shl 4 or low).toByte()
            }
            return bytes
        }

        private const val DIGITS = "0123456789abcdef"
    }
}

/**
 * The push SDK's conversation intent factory while React Native is in use. It adds the notification, signed, to the
 * intent of [app]'s factory, or to the launch intent, so the push module can hand it to JavaScript when the user opens
 * the notification.
 */
internal class SignedConversationIntent(
    private val app: ConversationIntentFactory?,
    private val signer: IntentSigner,
) : ConversationIntentFactory {
    override fun create(context: Context, notification: PushNotification): Intent? {
        val intent = app?.create(context, notification)
            ?: context.packageManager.getLaunchIntentForPackage(context.packageName)?.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
            ?: return null
        val payload = PushPayloads.event(notification)
        return intent.putExtra(EXTRA_PAYLOAD, payload).putExtra(EXTRA_SIGNATURE, signer.sign(payload))
    }

    companion object {
        const val EXTRA_PAYLOAD = "com.convohop.reactnative.extra.PAYLOAD"
        const val EXTRA_SIGNATURE = "com.convohop.reactnative.extra.SIGNATURE"
    }
}
