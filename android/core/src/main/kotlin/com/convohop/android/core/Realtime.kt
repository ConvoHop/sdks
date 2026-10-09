package com.convohop.android.core

import okhttp3.CookieJar
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString
import java.io.IOException

/** Receives one realtime socket's events, in order, on any thread. */
public interface RealtimeListener {
    public fun onOpen()

    /** A text frame; null for a binary frame, which the protocol never sends. */
    public fun onMessage(text: String?)

    /**
     * The connection failed; [onClose] follows. When the service answered the upgrade with an HTTP response
     * instead of switching protocols, [error] is a [RealtimeUpgradeRefusedException].
     */
    public fun onError(error: Throwable)

    /** The socket closed with [code]; no events follow. */
    public fun onClose(code: Int, reason: String)
}

/** A connected or connecting realtime socket. */
public interface RealtimeSocket {
    /** Queues a text frame; false when the socket is closing or closed. */
    public fun send(text: String): Boolean

    public fun close(code: Int, reason: String)
}

/**
 * Opens realtime sockets. A connector must offer exactly [subprotocol] and
 * fail the connection unless the server selects it.
 */
public fun interface RealtimeConnector {
    public fun connect(url: String, subprotocol: String, listener: RealtimeListener): RealtimeSocket
}

/**
 * The service refused the realtime upgrade with an HTTP response, such as a
 * 429 `application/problem+json`. A [RealtimeConnector] that can read the
 * response passes this to [RealtimeListener.onError], so the stream classifies
 * the response like any other HTTP response: it reconnects, no sooner than the
 * response's delay, or stops and reports the problem.
 */
public class RealtimeUpgradeRefusedException(
    /** The HTTP status of the response. */
    public val status: Int,
    /** The response's `Retry-After` header, if any. */
    public val retryAfter: String?,
    /** The response body, or as much as was read; null when it couldn't be read. One over 65,536 characters isn't parsed. */
    public val body: String?,
) : IOException("Realtime upgrade refused with HTTP status $status")

/** [RealtimeConnector] on OkHttp's WebSocket client, with redirects and cookies disabled. */
public class OkHttpRealtimeConnector(client: OkHttpClient = OkHttpClient()) : RealtimeConnector {
    private val client: OkHttpClient = client.newBuilder()
        .followRedirects(false)
        .followSslRedirects(false)
        .cookieJar(CookieJar.NO_COOKIES)
        .build()

    override fun connect(url: String, subprotocol: String, listener: RealtimeListener): RealtimeSocket {
        val request = Request.Builder().url(url).header("Sec-WebSocket-Protocol", subprotocol).build()
        val socket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                if (response.header("Sec-WebSocket-Protocol") != subprotocol) {
                    webSocket.cancel()
                    listener.onError(IOException("Realtime subprotocol was not negotiated"))
                    listener.onClose(1006, "")
                    return
                }
                listener.onOpen()
            }

            override fun onMessage(webSocket: WebSocket, text: String) = listener.onMessage(text)

            override fun onMessage(webSocket: WebSocket, bytes: ByteString) = listener.onMessage(null)

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                webSocket.close(1000, null)
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) = listener.onClose(code, reason)

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                listener.onError(if (response == null || response.code == 101) t else refused(response))
                listener.onClose(1006, "")
            }
        })
        return object : RealtimeSocket {
            override fun send(text: String): Boolean = socket.send(text)

            override fun close(code: Int, reason: String) {
                socket.close(code, reason)
            }
        }
    }

    /**
     * OkHttp closes [response] once the failure is delivered, so its body is read here, up to one character past the
     * bound. JSON is UTF-8, which takes at most 3 bytes a character, so a body within the bound is read whole.
     */
    private fun refused(response: Response): RealtimeUpgradeRefusedException {
        val body = try {
            response.peekBody(3L * (MAX_UPGRADE_BODY_CHARS + 1)).string().take(MAX_UPGRADE_BODY_CHARS + 1)
        } catch (_: Exception) {
            null
        }
        return RealtimeUpgradeRefusedException(response.code, response.header("Retry-After"), body)
    }
}
