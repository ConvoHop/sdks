package dev.instantrelay.android.core

import java.util.UUID

/** The clock, identifiers and randomness the SDK uses. Tests replace it; apps normally keep [System]. */
public interface RelayEnvironment {
    /** Wall-clock time in epoch milliseconds. */
    public fun now(): Long

    /** A new random lowercase UUID. */
    public fun uuid(): String

    /** A uniformly distributed value in [0, 1), used for reconnect jitter. */
    public fun random(): Double

    public companion object {
        /** The device clock, `java.util.UUID` and `Math.random`. */
        @JvmField
        public val System: RelayEnvironment = object : RelayEnvironment {
            override fun now(): Long = java.lang.System.currentTimeMillis()

            override fun uuid(): String = UUID.randomUUID().toString()

            override fun random(): Double = Math.random()
        }
    }
}
