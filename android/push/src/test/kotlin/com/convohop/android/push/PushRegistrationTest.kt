package com.convohop.android.push

import com.convohop.android.push.Fixtures.FID
import com.convohop.android.push.Fixtures.TOKEN
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertThrows
import org.junit.Test

/** The registration the push module reports, in each of FCM's modes. */
internal class PushRegistrationTest {
    @Test
    fun describesATokenAsTheOtherSdksDo() {
        val token = PushRegistration.Token(TOKEN)
        assertEquals("fcm", token.kind)
        assertEquals(mapOf("kind" to "fcm", "token" to TOKEN), token.toMap())
        assertEquals("{\"kind\":\"fcm\",\"token\":\"$TOKEN\"}", token.toJson())
        assertEquals(token.toMap(), PushJson.parse(token.toJson()))
    }

    @Test
    fun describesAnInstallationIdAsTheOtherSdksDo() {
        val fid = PushRegistration.InstallationId(FID)
        assertEquals("fcm", fid.kind)
        assertEquals(mapOf("kind" to "fcm", "fid" to FID), fid.toMap())
        assertEquals("{\"kind\":\"fcm\",\"fid\":\"$FID\"}", fid.toJson())
        assertEquals(fid.toMap(), PushJson.parse(fid.toJson()))
    }

    @Test
    fun comparesByModeAndValue() {
        assertEquals(PushRegistration.Token(TOKEN), PushRegistration.Token(TOKEN))
        assertEquals(PushRegistration.Token(TOKEN).hashCode(), PushRegistration.Token(TOKEN).hashCode())
        assertEquals(PushRegistration.InstallationId(FID), PushRegistration.InstallationId(FID))
        assertNotEquals(PushRegistration.Token(TOKEN), PushRegistration.Token(TOKEN.reversed()))
        // The same text is a different registration in the other mode.
        assertNotEquals(PushRegistration.Token(FID), PushRegistration.InstallationId(FID))
        assertNotEquals(PushRegistration.InstallationId(FID), PushRegistration.Token(FID))
    }

    @Test
    fun keepsValuesOutOfLogs() {
        val token = PushRegistration.Token(TOKEN).toString()
        val fid = PushRegistration.InstallationId(FID).toString()
        assertEquals("PushRegistration.Token(token=…${TOKEN.takeLast(4)})", token)
        assertEquals("PushRegistration.InstallationId(fid=…${FID.takeLast(4)})", fid)
        assertFalse(token, token.contains(TOKEN.take(8)))
        assertFalse(fid, fid.contains(FID.take(8)))
    }

    @Test
    fun rejectsBlankValues() {
        for (blank in listOf("", " ", "\n")) {
            assertThrows(IllegalArgumentException::class.java) { PushRegistration.Token(blank) }
            assertThrows(IllegalArgumentException::class.java) { PushRegistration.InstallationId(blank) }
        }
    }
}
