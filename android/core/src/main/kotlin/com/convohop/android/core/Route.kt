package com.convohop.android.core

import kotlinx.serialization.json.JsonElement
import java.net.URI
import java.net.URISyntaxException

/** A signed project route: where one incarnation's communication requests and realtime socket go. */
public data class ProjectRoute(
    val projectId: String,
    val incarnation: String,
    val servingEpoch: String,
    val communicationBase: String,
    val wssUrl: String,
    val expiresAt: String,
    val signature: String,
)

internal fun route(value: JsonElement?): ProjectRoute {
    val v = value.protocolObject()
    return ProjectRoute(
        projectId = parseId(v["projectId"]),
        incarnation = parseId(v["incarnation"]),
        servingEpoch = parseCounter(v["servingEpoch"]),
        communicationBase = v["communicationBase"].protocolString(),
        wssUrl = v["wssUrl"].protocolString(),
        expiresAt = timestamp(v["expiresAt"]),
        signature = v["signature"].protocolString(),
    )
}

/**
 * The parts of an absolute hierarchical URL the SDK checks. Hosts and
 * schemes are lowercased and default ports dropped. Anything java.net.URI
 * cannot parse as a server authority is rejected, which is stricter than a
 * browser's URL parser.
 */
internal class ProtocolUrl private constructor(
    val scheme: String,
    val hostname: String,
    /** The explicit non-default port, or -1. */
    val port: Int,
    val path: String,
    val hasCredentials: Boolean,
    val hasSearch: Boolean,
    val hasHash: Boolean,
) {
    /** The hostname plus any non-default port. */
    val host: String get() = if (port == -1) hostname else "$hostname:$port"

    val origin: String get() = "$scheme://$host"

    companion object {
        private val DEFAULT_PORTS = mapOf("http" to 80, "https" to 443, "ws" to 80, "wss" to 443)

        fun parse(value: String): ProtocolUrl {
            val uri = try {
                URI(value)
            } catch (_: URISyntaxException) {
                protocolError("Invalid URL")
            }
            if (uri.isOpaque) protocolError("Invalid URL")
            val scheme = uri.scheme?.lowercase() ?: protocolError("Invalid URL")
            val hostname = uri.host?.lowercase()?.takeIf { it.isNotEmpty() } ?: protocolError("Invalid URL")
            val rawPort = uri.port
            if (rawPort > 65_535) protocolError("Invalid URL")
            val port = if (rawPort == -1 || DEFAULT_PORTS[scheme] == rawPort) -1 else rawPort
            return ProtocolUrl(
                scheme = scheme,
                hostname = hostname,
                port = port,
                path = uri.rawPath.orEmpty().ifEmpty { "/" },
                hasCredentials = !uri.rawUserInfo.isNullOrEmpty(),
                hasSearch = !uri.rawQuery.isNullOrEmpty(),
                hasHash = !uri.rawFragment.isNullOrEmpty(),
            )
        }
    }
}

private val LOOPBACK_HOSTS = setOf("127.0.0.1", "localhost", "[::1]")

/** The origin of an HTTPS base URL, or of a loopback HTTP one for local development. */
internal fun origin(value: String): String {
    val url = ProtocolUrl.parse(value)
    if (url.hasCredentials || url.hasSearch || url.hasHash || url.path != "/" ||
        (url.scheme != "https" && !(url.scheme == "http" && url.hostname in LOOPBACK_HOSTS))
    ) {
        protocolError("Use an HTTPS origin, or explicit loopback HTTP for local development")
    }
    return url.origin
}
