package com.convohop.android.push

/** RFC 3339 date-times without java.time, which needs Android API 26. */
internal object PushTime {
    /** The push contract's timestamp: a date that exists, uppercase `T`, `Z` or an offset, and no second 60. */
    private val TIMESTAMP = Regex(
        "^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|" +
            "02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)" +
            "-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?(?:Z|[+-](?:[01][0-9]|2[0-3]):[0-5][0-9])$",
    )
    private val PARTS =
        Regex("^(\\d{4})-(\\d\\d)-(\\d\\d)T(\\d\\d):(\\d\\d):(\\d\\d)(?:\\.(\\d{1,9}))?(?:Z|([+-])(\\d\\d):(\\d\\d))$")
    private const val DAY_MS = 86_400_000L

    /** Epoch milliseconds of a push contract timestamp, truncating sub-millisecond digits, or null. */
    fun parse(text: String): Long? {
        if (!TIMESTAMP.matches(text)) return null
        val g = PARTS.matchEntire(text)?.groupValues ?: return null
        val millis = if (g[7].isEmpty()) 0L else g[7].padEnd(3, '0').substring(0, 3).toLong()
        val local = daysFromCivil(g[1].toLong(), g[2].toInt(), g[3].toInt()) * DAY_MS +
            g[4].toLong() * 3_600_000L + g[5].toLong() * 60_000L + g[6].toLong() * 1000L + millis
        if (g[8].isEmpty()) return local
        val offset = (g[9].toLong() * 60L + g[10].toLong()) * 60_000L
        return if (g[8] == "+") local - offset else local + offset
    }

    // Howard Hinnant's days_from_civil for the proleptic Gregorian calendar.
    private fun daysFromCivil(y: Long, m: Int, d: Int): Long {
        val year = if (m <= 2) y - 1 else y
        val era = Math.floorDiv(year, 400L)
        val yoe = year - era * 400
        val mp = (m + 9) % 12
        val doy = (153L * mp + 2) / 5 + d - 1
        val doe = yoe * 365 + yoe / 4 - yoe / 100 + doy
        return era * 146_097 + doe - 719_468
    }
}
