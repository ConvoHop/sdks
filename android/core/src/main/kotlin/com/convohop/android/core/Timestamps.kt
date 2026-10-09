package com.convohop.android.core

import java.util.Locale

/**
 * UTC timestamps without java.time, which needs Android API 26.
 *
 * The protocol sends `YYYY-MM-DDTHH:MM:SS.mmmZ`; push payloads may use any
 * RFC 3339 date-time. Impossible calendar values are rejected rather than
 * rolled over.
 */
public object Timestamps {
    private val MILLIS = Regex("^(\\d{4})-(\\d\\d)-(\\d\\d)T(\\d\\d):(\\d\\d):(\\d\\d)\\.(\\d{3})Z$")
    private val RFC3339 =
        Regex("^(\\d{4})-(\\d\\d)-(\\d\\d)[Tt](\\d\\d):(\\d\\d):(\\d\\d)(\\.(\\d{1,9}))?([Zz]|([+-])(\\d\\d):(\\d\\d))$")
    private const val DAY_MS = 86_400_000L

    /** Epoch milliseconds of a protocol timestamp (`YYYY-MM-DDTHH:MM:SS.mmmZ`), or null when it is not one. */
    public fun parseMillis(text: String): Long? {
        val match = MILLIS.matchEntire(text) ?: return null
        val g = match.groupValues
        return epoch(g[1].toInt(), g[2].toInt(), g[3].toInt(), g[4].toInt(), g[5].toInt(), g[6].toInt(), g[7].toInt())
    }

    /** Epoch milliseconds of an RFC 3339 date-time, truncating sub-millisecond digits, or null. */
    public fun parseRfc3339(text: String): Long? {
        val match = RFC3339.matchEntire(text) ?: return null
        val g = match.groupValues
        val millis = if (g[8].isEmpty()) 0 else g[8].padEnd(3, '0').substring(0, 3).toInt()
        val local = epoch(g[1].toInt(), g[2].toInt(), g[3].toInt(), g[4].toInt(), g[5].toInt(), g[6].toInt(), millis)
            ?: return null
        if (g[10].isEmpty()) return local
        val hours = g[11].toInt()
        val minutes = g[12].toInt()
        if (hours > 23 || minutes > 59) return null
        val offset = (hours * 60L + minutes) * 60_000L
        return if (g[10] == "+") local - offset else local + offset
    }

    /** Formats epoch milliseconds as a protocol timestamp. Years outside 0000-9999 are rejected. */
    public fun format(epochMillis: Long): String {
        val days = Math.floorDiv(epochMillis, DAY_MS)
        val ofDay = Math.floorMod(epochMillis, DAY_MS)
        val (year, month, day) = civil(days)
        require(year in 0..9999) { "Timestamp year is outside 0000-9999" }
        val hour = ofDay / 3_600_000
        val minute = ofDay / 60_000 % 60
        val second = ofDay / 1000 % 60
        val millis = ofDay % 1000
        return String.format(
            Locale.ROOT, "%04d-%02d-%02dT%02d:%02d:%02d.%03dZ", year, month, day, hour, minute, second, millis,
        )
    }

    private fun epoch(year: Int, month: Int, day: Int, hour: Int, minute: Int, second: Int, millis: Int): Long? {
        if (month !in 1..12 || day < 1 || day > daysInMonth(year, month) || hour > 23 || minute > 59 || second > 59) {
            return null
        }
        return daysFromCivil(year.toLong(), month, day) * DAY_MS + hour * 3_600_000L + minute * 60_000L +
            second * 1000L + millis
    }

    private fun daysInMonth(year: Int, month: Int): Int = when (month) {
        2 -> if (year % 4 == 0 && (year % 100 != 0 || year % 400 == 0)) 29 else 28
        4, 6, 9, 11 -> 30
        else -> 31
    }

    // Howard Hinnant's days_from_civil and civil_from_days for the proleptic Gregorian calendar.
    private fun daysFromCivil(y: Long, m: Int, d: Int): Long {
        val year = if (m <= 2) y - 1 else y
        val era = Math.floorDiv(year, 400L)
        val yoe = year - era * 400
        val mp = (m + 9) % 12
        val doy = (153L * mp + 2) / 5 + d - 1
        val doe = yoe * 365 + yoe / 4 - yoe / 100 + doy
        return era * 146_097 + doe - 719_468
    }

    private fun civil(days: Long): Triple<Long, Int, Int> {
        val z = days + 719_468
        val era = Math.floorDiv(z, 146_097L)
        val doe = z - era * 146_097
        val yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365
        val doy = doe - (365 * yoe + yoe / 4 - yoe / 100)
        val mp = (5 * doy + 2) / 153
        val day = (doy - (153 * mp + 2) / 5 + 1).toInt()
        val month = (if (mp < 10) mp + 3 else mp - 9).toInt()
        val year = yoe + era * 400 + if (month <= 2) 1 else 0
        return Triple(year, month, day)
    }
}
