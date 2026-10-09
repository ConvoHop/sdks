package com.convohop.android.push

import java.time.OffsetDateTime
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

internal class PushTimeTest {
    @Test
    fun matchesJavaTimeForContractTimestamps() {
        val valid = listOf(
            "2026-10-10T12:00:00Z", "2026-10-10T11:59:55Z", "1970-01-01T00:00:00Z", "1969-12-31T23:59:59.999Z",
            "1969-12-31T23:59:59.9995Z", "2024-02-29T00:00:00Z", "2000-02-29T23:59:59Z", "0000-02-29T00:00:00Z",
            "0001-01-01T00:00:00Z", "9999-12-31T23:59:59.9Z", "2026-10-10T14:00:00.123456789+02:00",
            "2026-10-10T09:30:00-02:30", "2026-12-31T23:59:59+18:00", "2026-01-01T00:00:00-18:00", "2026-10-10T12:00:00-00:00",
        )
        for (text in valid) {
            assertEquals(text, OffsetDateTime.parse(text).toInstant().toEpochMilli(), PushTime.parse(text))
        }
    }

    @Test
    fun acceptsOffsetsBeyondJavaTime() {
        // RFC 3339 allows offsets up to 23:59; java.time stops at 18:00.
        assertEquals(epoch("2026-10-10T00:00:00Z"), PushTime.parse("2026-10-10T23:59:00+23:59"))
        assertEquals(epoch("2026-10-10T23:59:00Z"), PushTime.parse("2026-10-10T00:00:00-23:59"))
    }

    @Test
    fun truncatesSubMillisecondDigits() {
        assertEquals(epoch("2026-10-10T12:00:00Z") + 123, PushTime.parse("2026-10-10T12:00:00.123999999Z"))
        assertEquals(epoch("2026-10-10T12:00:00Z") + 500, PushTime.parse("2026-10-10T12:00:00.5Z"))
    }

    @Test
    fun rejectsTimestampsOutsideTheContract() {
        val invalid = listOf(
            "2026-02-30T00:00:00Z", "2100-02-29T00:00:00Z", "1900-02-29T00:00:00Z", "2026-04-31T00:00:00Z",
            "2026-13-01T00:00:00Z", "2026-00-01T00:00:00Z", "2026-01-00T00:00:00Z", "2026-10-10t12:00:00Z",
            "2026-10-10T12:00:00z", "2026-10-10T23:59:60Z", "2026-10-10T24:00:00Z", "2026-10-10T12:60:00Z",
            "2026-10-10T12:00:00.1234567890Z", "2026-10-10T12:00:00.Z", "2026-10-10T12:00:00", "2026-10-10 12:00:00Z",
            "2026-10-10T12:00:00+24:00", "2026-10-10T12:00:00+0200", "2026-10-10T12:00:00+02:60", "+2026-10-10T12:00:00Z",
            "26-10-10T12:00:00Z", "2026-10-10T12:00Z", "", " 2026-10-10T12:00:00Z", "2026-10-10T12:00:00Z ",
            "2026-10-10T12:00:00-00:00x", "２０２６-10-10T12:00:00Z",
        )
        for (text in invalid) {
            assertNull(text, PushTime.parse(text))
        }
    }

    private fun epoch(text: String): Long = OffsetDateTime.parse(text).toInstant().toEpochMilli()
}
