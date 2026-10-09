/**
 * Implementation surface shared by `@convohop/client` and `@convohop/server`.
 * Not public API: no semver guarantee; it may change in any release.
 * @packageDocumentation
 * @internal
 */
export {
  canonical, currentSession, eventPage, jsonClone, origin, route, sameSession, sessionExpiry, sessionMetadata, timestamp,
} from "./protocol.js";
export { parseURL, randomUUID, validatePlatform } from "./platform.js";
export { authenticatedTransport } from "./transport.js";
export type { TransportAuthentication } from "./transport.js";
export { validateOutput } from "./graphql.js";
