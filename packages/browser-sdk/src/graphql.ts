export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class TransportError extends Error {
  constructor() {
    super("GraphQL request failed (network error or timeout)");
    this.name = "TransportError";
  }
}

export class InvalidResponseError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "InvalidResponseError";
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cursor = /^(?:0|[1-9][0-9]*)$/;

export function requireUuid(value: string, name: string): void {
  if (typeof value !== "string" || !uuid.test(value)) {
    throw new TypeError(`${name} must be a UUID`);
  }
}

export function isIdentityId(value: unknown): value is string {
  return typeof value === "string" && /^ci_[0-9a-f]{32}$/.test(value) &&
    value !== "ci_00000000000000000000000000000000";
}

export function requireIdentityId(value: string): void {
  if (!isIdentityId(value)) {
    throw new TypeError("identityId must be a service-issued ci_ identifier");
  }
}

export function requireCursor(value: string): void {
  if (typeof value !== "string" || !cursor.test(value) || BigInt(value) > 9223372036854775807n) {
    throw new RangeError("after must be a nonnegative decimal i64 string");
  }
}

export function requireLimit(limit: number): void {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new RangeError("limit must be an integer from 1 to 100");
  }
}

function requireToken(token: string, kind: "st" | "pk" | "adm"): void {
  if (typeof token !== "string" || !new RegExp(`^${kind}_[0-9a-fA-F]{64}$`).test(token)) {
    throw new TypeError(`token must be a valid ${kind}_ credential`);
  }
}

export function requireSessionToken(token: string): void {
  requireToken(token, "st");
}

export interface GraphQLHttpOptions {
  baseUrl: string;
  token: string;
  kind: "st" | "pk" | "adm";
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export class GraphQLHttp {
  readonly origin: string;
  readonly fetcher: typeof fetch;
  #token: string;
  readonly #kind: "st" | "pk" | "adm";
  readonly #timeoutMs: number;

  constructor(options: GraphQLHttpOptions) {
    const { baseUrl, token, kind } = options;
    if (typeof baseUrl !== "string" || /[\u0000-\u0020\u007f]/u.test(baseUrl)) {
      throw new TypeError("baseUrl must be an HTTP(S) service origin");
    }
    let url: URL;
    try {
      url = new URL(baseUrl);
    } catch {
      throw new TypeError("baseUrl must be an HTTP(S) service origin");
    }
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username || url.password || url.pathname !== "/" ||
      !/^https?:\/\/[^/?#\\@]+\/?$/i.test(baseUrl)
    ) {
      throw new TypeError("baseUrl must be an HTTP(S) origin without a path, credentials, query or fragment");
    }
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (kind === "adm" && !loopback) throw new TypeError("Management API requires a loopback address");
    if (!loopback && url.protocol !== "https:") {
      throw new TypeError("remote Communication API requires HTTPS");
    }
    requireToken(token, kind);
    if (options.fetch !== undefined && typeof options.fetch !== "function") {
      throw new TypeError("fetch must be a function");
    }
    const timeoutMs = options.timeoutMs ?? 30_000;
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 600_000) {
      throw new RangeError("timeoutMs must be an integer from 1 to 600000");
    }
    this.origin = url.origin;
    this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.#token = token;
    this.#kind = kind;
    this.#timeoutMs = timeoutMs;
  }

  updateToken(token: string): void {
    requireToken(token, this.#kind);
    this.#token = token;
  }

  assetRequest(path: string): { url: string; headers: { Authorization: string } } {
    return {
      url: new URL(path, `${this.origin}/`).toString(),
      headers: { Authorization: `Bearer ${this.#token}` },
    };
  }

  async execute(query: string, variables: Record<string, unknown>, field: string): Promise<unknown> {
    const body = JSON.stringify({ query, variables });
    let response: Response;
    try {
      response = await this.fetcher(`${this.origin}/graphql`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.#token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body,
        credentials: "omit",
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(this.#timeoutMs),
      });
    } catch {
      throw new TransportError();
    }
    if (response.status >= 300 && response.status < 400) {
      throw new InvalidResponseError(response.status, "GraphQL redirects are not allowed");
    }
    let text: string;
    try {
      text = await response.text();
    } catch {
      throw new TransportError();
    }
    let payload: unknown;
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      throw new InvalidResponseError(response.status, "GraphQL returned invalid JSON");
    }
    if (!response.ok) {
      if (
        !isRecord(payload) || !isRecord(payload.error) ||
        typeof payload.error.code !== "string" ||
        typeof payload.error.message !== "string"
      ) {
        throw new InvalidResponseError(response.status, "GraphQL returned an invalid HTTP error");
      }
      throw new ApiError(response.status, payload.error.code, payload.error.message);
    }
    if (response.status !== 200 || !isRecord(payload)) {
      throw new InvalidResponseError(response.status, "GraphQL returned an invalid response");
    }
    if (Array.isArray(payload.errors) && payload.errors.length > 0) {
      const issue = payload.errors[0];
      if (
        !isRecord(issue) || typeof issue.message !== "string" ||
        !isRecord(issue.extensions) || typeof issue.extensions.code !== "string"
      ) {
        throw new InvalidResponseError(200, "GraphQL returned an untyped error");
      }
      throw new ApiError(200, issue.extensions.code, issue.message);
    }
    if (!isRecord(payload.data) || !(field in payload.data) || payload.data[field] === null) {
      throw new InvalidResponseError(200, `GraphQL returned no ${field} result`);
    }
    return payload.data[field];
  }
}
