package com.convohop.android.core

import kotlinx.coroutines.suspendCancellableCoroutine
import okhttp3.Call
import okhttp3.Callback
import okhttp3.Headers
import okhttp3.MediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import okhttp3.Response
import okio.BufferedSink
import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

private val REDIRECT_STATUSES = setOf(301, 302, 303, 307, 308)

/**
 * [HttpEngine] on OkHttp. Redirects, cookies and caches are disabled on the
 * client it uses, and the body is read on OkHttp's dispatcher within the
 * request's timeout so a slow body can't outlive it.
 *
 * Every body is one-shot, so OkHttp never resends a request it has started
 * to send: not after a dropped response on a pooled connection, a 408 or a
 * 503 asking for an immediate retry. The mutation ledger owns every retry
 * and its budget. A failed connect, before anything is sent, still falls back
 * to the host's other addresses.
 */
public class OkHttpEngine(client: OkHttpClient = OkHttpClient()) : HttpEngine {
    private val client: OkHttpClient = client.newBuilder()
        .followRedirects(false)
        .followSslRedirects(false)
        .cache(null)
        .cookieJar(okhttp3.CookieJar.NO_COOKIES)
        .build()

    override suspend fun post(request: HttpRequest): HttpResponse = suspendCancellableCoroutine { continuation ->
        val builder = Request.Builder().url(request.url).post(OneShotBody(request.body.toByteArray(Charsets.UTF_8)))
        for ((name, value) in request.headers) builder.header(name, value)
        val call = client.newCall(builder.build())
        call.timeout().timeout(request.timeoutMillis, TimeUnit.MILLISECONDS)
        continuation.invokeOnCancellation { call.cancel() }
        call.enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                continuation.resumeWithException(e)
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    if (it.code in REDIRECT_STATUSES) {
                        continuation.resumeWithException(IOException("Authority redirects are refused"))
                        return
                    }
                    val body = try {
                        Result.success(readBounded(it, request.maxResponseBytes))
                    } catch (e: IOException) {
                        Result.failure(e)
                    }
                    continuation.resume(BufferedResponse(it.code, it.headers, body))
                }
            }
        })
    }

    private fun readBounded(response: Response, maxBytes: Long): String? {
        val source = (response.body ?: throw IOException("Missing response body")).source()
        if (source.request(maxBytes + 1)) return null
        return source.buffer.readUtf8()
    }

    private class OneShotBody(private val bytes: ByteArray) : RequestBody() {
        override fun contentType(): MediaType? = null

        override fun contentLength(): Long = bytes.size.toLong()

        override fun isOneShot(): Boolean = true

        override fun writeTo(sink: BufferedSink) {
            sink.write(bytes)
        }
    }

    private class BufferedResponse(
        override val status: Int,
        private val headers: Headers,
        private val body: Result<String?>,
    ) : HttpResponse {
        override fun header(name: String): String? = headers.values(name).takeIf { it.isNotEmpty() }?.joinToString(", ")

        override suspend fun text(): String? = body.getOrThrow()
    }
}
