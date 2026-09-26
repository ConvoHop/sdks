import { ApiError, isRecord, requireCursor, requireSessionToken } from "./graphql.js";
import type { BrowserSocket, Sequence, SocketFactory } from "./types.js";

export interface SubscriptionOptions<T> {
  after?: Sequence;
  onEvent: (event: T) => void | Promise<void>;
  onError: (error: Error) => void;
  onReady?: () => void | Promise<void>;
  signal?: AbortSignal;
}

export class GraphQLSubscription<T extends { sequence: Sequence }> {
  readonly #url: string;
  #token: string;
  readonly #query: string;
  readonly #field: string;
  readonly #parse: (value: unknown) => T;
  readonly #variables: Record<string, unknown>;
  readonly #factory: SocketFactory;
  readonly #options: SubscriptionOptions<T>;
  readonly #abort: () => void;
  readonly #onClose: (() => void) | undefined;
  #socket: BrowserSocket | undefined;
  #processing: Promise<void> = Promise.resolve();
  #timer: ReturnType<typeof setTimeout> | undefined;
  #pending = 0;
  #attempt = 0;
  #stopped = false;
  #tokenRevision = 0;
  #cursor: Sequence;

  constructor(
    origin: string,
    token: string,
    query: string,
    field: string,
    parse: (value: unknown) => T,
    factory: SocketFactory,
    options: SubscriptionOptions<T>,
    variables: Record<string, unknown> = {},
    onClose?: () => void,
  ) {
    this.#url = `${origin.replace(/^http/, "ws")}/graphql`;
    this.#token = token;
    this.#query = query;
    this.#field = field;
    this.#parse = parse;
    this.#variables = variables;
    this.#factory = factory;
    this.#options = options;
    this.#onClose = onClose;
    this.#cursor = options.after ?? "0";
    requireCursor(this.#cursor);
    this.#abort = () => this.close();
    options.signal?.addEventListener("abort", this.#abort, { once: true });
  }

  get after(): Sequence {
    return this.#cursor;
  }

  start(): void {
    if (this.#options.signal?.aborted) this.close();
    else this.#connect();
  }

  updateToken(token: string): void {
    requireSessionToken(token);
    if (this.#token === token) return;
    this.#token = token;
    if (this.#stopped) return;
    const revision = ++this.#tokenRevision;
    if (this.#timer !== undefined) clearTimeout(this.#timer);
    this.#timer = undefined;
    const socket = this.#socket;
    this.#socket = undefined;
    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      socket.close();
    }
    this.#processing = this.#processing.then(() => {
      if (!this.#stopped && revision === this.#tokenRevision) this.#connect();
    });
  }

  close(): void {
    if (this.#stopped) return;
    this.#stopped = true;
    this.#options.signal?.removeEventListener("abort", this.#abort);
    if (this.#timer !== undefined) clearTimeout(this.#timer);
    if (this.#socket?.readyState === 1) {
      this.#socket.send(JSON.stringify({ id: "1", type: "complete" }));
    }
    this.#socket?.close();
    this.#socket = undefined;
    this.#onClose?.();
  }

  #fail(error: Error): void {
    if (this.#stopped) return;
    this.close();
    this.#options.onError(error);
  }

  #reconnect(): void {
    if (this.#stopped) return;
    const delay = Math.min(500 * 2 ** Math.min(this.#attempt++, 5), 8000);
    this.#timer = setTimeout(() => this.#connect(), delay);
  }

  #connect(): void {
    if (this.#stopped) return;
    let socket: BrowserSocket;
    try {
      socket = this.#factory(this.#url, "graphql-transport-ws");
    } catch (error) {
      this.#options.onError(error instanceof Error ? error : new Error(String(error)));
      this.#reconnect();
      return;
    }
    this.#socket = socket;
    socket.onopen = () => socket.send(JSON.stringify({
      type: "connection_init",
      payload: { token: this.#token },
    }));
    socket.onmessage = ({ data }) => {
      if (typeof data !== "string") {
        this.#fail(new Error("Expected a GraphQL JSON text frame"));
        return;
      }
      if (++this.#pending > 128) {
        this.#fail(new Error("Realtime consumer is too slow; resume from the last acknowledged cursor"));
        return;
      }
      this.#processing = this.#processing
        .then(async () => { if (!this.#stopped) await this.#accept(socket, data); })
        .catch((error: unknown) => this.#fail(error instanceof Error ? error : new Error(String(error))))
        .finally(() => { this.#pending--; });
    };
    socket.onerror = () => {
      if (this.#socket === socket && !this.#stopped) socket.close();
    };
    socket.onclose = (event) => {
      if (this.#stopped || this.#socket !== socket) return;
      this.#socket = undefined;
      this.#processing = this.#processing.then(() => {
        if (this.#stopped) return;
        if (event.code === 4401 || event.code === 4403) {
          this.#fail(new ApiError(0, event.code === 4401 ? "UNAUTHENTICATED" : "FORBIDDEN",
            "GraphQL subscription authorization failed"));
          return;
        }
        if (event.code === 4400 || event.code === 4408) {
          this.#fail(new Error("GraphQL subscription protocol rejected the connection"));
          return;
        }
        this.#options.onError(new Error("Realtime disconnected; reconnecting from the last acknowledged cursor"));
        this.#reconnect();
      });
    };
  }

  async #accept(socket: BrowserSocket, text: string): Promise<void> {
    const frame: unknown = JSON.parse(text);
    if (!isRecord(frame) || typeof frame.type !== "string") {
      throw new Error("Invalid GraphQL subscription frame");
    }
    if (this.#socket !== socket && frame.type !== "next") return;
    if (frame.type === "connection_ack") {
      if (this.#socket !== socket) return;
      socket.send(JSON.stringify({
        id: "1",
        type: "subscribe",
        payload: {
          query: this.#query,
          variables: { ...this.#variables, after: this.#cursor },
        },
      }));
      this.#attempt = 0;
      await this.#options.onReady?.();
      return;
    }
    if (frame.type === "ping") {
      if (this.#socket === socket) socket.send(JSON.stringify({ type: "pong" }));
      return;
    }
    if (frame.type === "pong") return;
    if (frame.type === "error" || frame.type === "next") {
      const payload = frame.payload;
      const issues = frame.type === "error" ? payload : isRecord(payload) ? payload.errors : undefined;
      if (Array.isArray(issues) && issues.length > 0) {
        const issue = issues[0];
        if (!isRecord(issue) || !isRecord(issue.extensions) ||
            typeof issue.extensions.code !== "string" || typeof issue.message !== "string") {
          throw new Error("GraphQL returned an untyped subscription error");
        }
        throw new ApiError(0, issue.extensions.code, issue.message);
      }
      if (frame.type === "error") throw new Error("GraphQL subscription returned an invalid error");
      if (frame.id !== "1" || !isRecord(payload) || !isRecord(payload.data)) {
        throw new Error("GraphQL subscription returned invalid data");
      }
      const event = this.#parse(payload.data[this.#field]);
      requireCursor(event.sequence);
      if (BigInt(event.sequence) <= BigInt(this.#cursor)) return;
      await this.#options.onEvent(event);
      this.#cursor = event.sequence;
      return;
    }
    if (frame.type === "complete" && frame.id === "1") {
      throw new Error("GraphQL subscription ended; subscribe again from the last acknowledged cursor");
    }
    throw new Error("Unexpected GraphQL subscription frame");
  }
}
