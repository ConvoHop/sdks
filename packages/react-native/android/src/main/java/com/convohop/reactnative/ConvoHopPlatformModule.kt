package com.convohop.reactnative

import android.util.Base64
import com.facebook.react.bridge.ReactApplicationContext
import java.security.SecureRandom

/** What `@convohop/react-native` needs from Android that Hermes lacks: cryptographically secure random bytes. */
internal class ConvoHopPlatformModule(context: ReactApplicationContext) : NativeConvoHopPlatformSpec(context) {
    private val random = SecureRandom()

    /** [length] (1–65536) random bytes as Base64. */
    override fun getRandomBytes(length: Double): String {
        val count = length.toInt()
        require(count.toDouble() == length && count in 1..MAX_RANDOM_BYTES) { "length must be an integer from 1 to $MAX_RANDOM_BYTES" }
        val bytes = ByteArray(count)
        random.nextBytes(bytes)
        return Base64.encodeToString(bytes, Base64.NO_WRAP)
    }

    private companion object {
        const val MAX_RANDOM_BYTES = 65536
    }
}
