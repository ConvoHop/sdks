import { ConvoHopProblem, parseObject, type CommandOptions, type ConvoHopPlatform } from "@convohop/core";
import { parseURL } from "@convohop/core/internal";
import type { LiveConnection, LiveConnectionAttempt, LiveConnectionGrant, LiveConnector } from "./live.js";

/** The parts of a participation that admit one native connection. */
export interface AdmissionSource {
  readonly participationId: string;
  connectionGrant(options: CommandOptions): Promise<{ requestId: string; mode: LiveConnectionAttempt["mode"]; grant: LiveConnectionGrant }>;
  connectionAttempted(): void | Promise<void>;
}

const loopback = ["127.0.0.1", "localhost", "[::1]"];
/**
 * Checks where the single-use `connectToken` may be sent before anything is sent. Returns the media server URL.
 * Only the ConvoHop media server accepts the token; it admits at most one new connection with it.
 */
function nativeTarget(grant: LiveConnectionGrant, platform: ConvoHopPlatform | undefined): { url: string; token: string } {
  const url = parseURL(typeof grant.livekitUrl === "string" ? grant.livekitUrl : "", platform, "Invalid media origin");
  if (url.search || url.hash || url.username || url.password ||
      (url.protocol !== "wss:" && !(url.protocol === "ws:" && loopback.includes(url.hostname))))
    throw new TypeError("Invalid media origin");
  if (!(Date.parse(grant.leaseExpiresAt) > Date.now())) throw new Error("Fresh media credentials are required");
  if (typeof grant.connectToken !== "string" || !grant.connectToken) throw new TypeError("Missing media connect token");
  return { url: grant.livekitUrl, token: grant.connectToken };
}

/**
 * Admits one native connection: obtains a participation-bound grant, checks where its token may go, records the
 * attempt durably, and only then calls `connector`, once. A failed connector leaves the admission's outcome unknown.
 */
export async function admitConnection<C extends LiveConnection>(source: AdmissionSource, options: CommandOptions,
  connector: LiveConnector<C>, platform: ConvoHopPlatform | undefined): Promise<C> {
  const { requestId, mode, grant } = await source.connectionGrant(options);
  if (mode !== "INITIAL" && mode !== "RECONNECT") throw new TypeError("Unknown credential mode");
  const ticket = parseObject(grant.admissionTicket), lease = parseObject(grant.forwardingLease);
  if (ticket.participationId !== source.participationId || lease.participationId !== source.participationId)
    throw new TypeError("Native proof is not participation-bound");
  const target = nativeTarget(grant, platform);
  // The durable marker precedes the only connection attempt; an uncertain admission is later resolved, never reused.
  await source.connectionAttempted();
  let connection: C;
  try {
    connection = await connector(Object.freeze({ requestId, mode, url: target.url, token: target.token, leaseExpiresAt: grant.leaseExpiresAt }));
  } catch {
    // The failure is not attached: native SDK errors can carry the token-bearing signaling URL.
    throw new ConvoHopProblem("MEDIA_CONNECT_FAILED", requestId, "unknown", 0,
      "Native connection failed. The participation reservation remains; resolve and retry connect, or explicitly leave.");
  }
  const invalid = new TypeError("connector must resolve to a connection with connected and disconnect()");
  if (connection === null || typeof connection !== "object" || typeof connection.disconnect !== "function") throw invalid;
  if (typeof connection.connected !== "boolean") {
    // Without `connected`, a later attempt couldn't tell that this one is open.
    try { await connection.disconnect(); } catch { /* the connector's result is already unusable */ }
    throw invalid;
  }
  return connection;
}
