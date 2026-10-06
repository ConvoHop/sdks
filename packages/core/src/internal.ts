/**
 * Implementation surface shared by `@convohop/client` and `@convohop/server`.
 * Not public API: no semver guarantee; it may change in any release.
 * @packageDocumentation
 * @internal
 */
export {
  canonical, currentSession, eventPage, fingerprint, origin, route, sameSession, sessionExpiry, sessionMetadata, timestamp,
} from "./protocol.js";
export { authenticatedTransport } from "./transport.js";
export type { TransportAuthentication } from "./transport.js";
export { operationKey, operationPayload, v1GraphqlRequest, validateOperationPayload, validateOutput } from "./graphql.js";
export type { CommunicationOperation } from "./graphql.js";
export { v1OutputShapes } from "./generated/v1-operations.js";
export type { V1Operation, V1OutputShape } from "./generated/v1-operations.js";
