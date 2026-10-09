package com.convohop.reactnative

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class IntentSignerTest {
    private val key = ByteArray(32) { it.toByte() }
    private val payload = "{\"eventId\":\"x\",\"title\":\"Zo\u00EB \uD83D\uDC4B\"}"

    // HMAC-SHA256 under key 00 01 … 1f of "convohop.opened\u0000" + payload, in UTF-8, computed with Node's crypto.
    private val signature = "15762484399403e8bb8d215aad145a016956e76bed9a0d0a86883f1d2acadf02"

    @Test
    fun signsTheDomainAndPayloadWithHmacSha256() {
        assertEquals(signature, IntentSigner { key }.sign(payload))
    }

    @Test
    fun verifiesOnlyItsOwnSignatureOfThatPayload() {
        val signer = IntentSigner { key }

        assertTrue(signer.verify(payload, signature))
        assertFalse(signer.verify("$payload ", signature))
        assertFalse(signer.verify(payload, signature.dropLast(1) + "3"))
        assertFalse(signer.verify(payload, signature.uppercase()))
        assertFalse(signer.verify(payload, signature.dropLast(2)))
        assertFalse(signer.verify(payload, ""))
        assertFalse(IntentSigner { ByteArray(32) }.verify(payload, signature))
    }

    @Test
    fun loadsItsKeyOnceWhenFirstUsed() {
        var loads = 0
        val signer = IntentSigner { loads++; key }

        assertEquals(0, loads)
        signer.sign("a")
        signer.verify("b", signer.sign("b"))
        assertEquals(1, loads)
    }

    @Test
    fun writesAndReadsLowercaseHex() {
        val hex = "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f"

        assertEquals(hex, IntentSigner.hex(key))
        assertArrayEquals(key, IntentSigner.unhex(hex))
        assertEquals("ff80", IntentSigner.hex(byteArrayOf(-1, -128)))
        assertArrayEquals(ByteArray(0), IntentSigner.unhex(""))
    }

    @Test
    fun readsNothingButHex() {
        for (text in listOf(null, "0", "abc", "0g", "AB", "0x00", " 00", "00\n")) {
            assertNull(text, IntentSigner.unhex(text))
        }
    }
}
