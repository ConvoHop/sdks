// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
/** What the schema says about one error code. */
export interface ErrorCodeDefinition {
  /** `server`, `sdk` or `both`. */
  readonly origin: "server" | "sdk" | "both";
  /** The HTTP-equivalent status, when the code has one. */
  readonly status?: number;
  /** Whether a later attempt with the same requestId may succeed. */
  readonly retryable: boolean;
}
/** Every error code the schema lists, keyed by code. The set is open: handle codes it does not list. */
export const errorCodes: Readonly<Record<string, ErrorCodeDefinition>> = {
  /** The cursor is too old. */
  CURSOR_EXPIRED: { origin: "server", status: 410, retryable: false },
  /** The request is malformed. */
  INVALID_REQUEST: { origin: "both", status: 400, retryable: false },
  /** The resource does not exist. */
  NOT_FOUND: { origin: "server", status: 404, retryable: false },
  /** The transport failed after sending. */
  TRANSPORT_UNKNOWN: { origin: "sdk", retryable: true },
  /** Temporarily unavailable. */
  UNAVAILABLE: { origin: "server", status: 503, retryable: true },
};
