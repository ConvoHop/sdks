package com.convohop.android.core

/** One authority POST. Implementations must not follow redirects or cache. */
public class HttpRequest(
    public val url: String,
    public val headers: Map<String, String>,
    public val body: String,
    /** The whole exchange, including reading the body, must finish within this time. */
    public val timeoutMillis: Long,
    /** Stop reading once the body is longer than this; [HttpResponse.text] then returns null. */
    public val maxResponseBytes: Long,
)

/** An authority response. */
public interface HttpResponse {
    public val status: Int

    /** All values of the header [name], matched case-insensitively and joined with ", ", or null. */
    public fun header(name: String): String?

    /**
     * The body decoded as UTF-8, or null when it exceeded [HttpRequest.maxResponseBytes].
     * Throws when the body could not be read completely.
     */
    public suspend fun text(): String?
}

/**
 * Sends authority requests. [post] throws when no response arrived, which
 * the SDK reports as an unknown outcome rather than a rejection. A redirect
 * must be reported as a failure, never followed.
 */
public fun interface HttpEngine {
    public suspend fun post(request: HttpRequest): HttpResponse
}
