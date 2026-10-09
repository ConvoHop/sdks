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
                listener.onError(t)
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
}
