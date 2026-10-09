/** The parts of a WHATWG `URL` the SDKs read. */
export interface PlatformURL {
  readonly href: string; readonly origin: string; readonly protocol: string; readonly username: string; readonly password: string;
  readonly host: string; readonly hostname: string; readonly port: string; readonly pathname: string; readonly search: string;
  readonly hash: string;
}
/** A WHATWG URL constructor, such as the global `URL` or a polyfill's. */
export type PlatformURLConstructor = new (url: string, base?: string) => PlatformURL;
// Method syntax keeps event parameters bivariant, so DOM and React Native sockets both fit.
type Handler<E> = { bivarianceHack(event: E): void }["bivarianceHack"];
/** The parts of a `WebSocket` the client uses. */
export interface PlatformWebSocket {
  onopen: Handler<unknown> | null;
  onmessage: Handler<{ readonly data: unknown }> | null;
  onerror: Handler<unknown> | null;
  onclose: Handler<{ readonly code: number }> | null;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}
export type PlatformWebSocketConstructor = new (url: string, protocols?: string | string[]) => PlatformWebSocket;
/** Network reachability. */
export interface Connectivity {
  /** Whether the device may reach the network. Report `true` when it isn't known. */
  readonly online: boolean;
  /** Calls `listener` when reachability changes, until the returned function is called. */
  subscribe(listener: (online: boolean) => void): () => void;
}
export type LifecycleState = "active" | "background";
/** Whether the app is in the foreground. */
export interface Lifecycle {
  readonly state: LifecycleState;
  /** Calls `listener` when the state changes, until the returned function is called. */
  subscribe(listener: (state: LifecycleState) => void): () => void;
}
/**
 * Runtime services for runtimes that lack a browser global, such as React Native. Every field is optional and
 * falls back to the global of the same name, looked up when it is used. The transport uses `randomUUID`, `sha256`
 * and `URL`; `@convohop/client` also uses `WebSocket`, `connectivity` and `lifecycle`.
 */
export interface ConvoHopPlatform {
  /** A new random UUID in canonical lowercase form. Default: `crypto.randomUUID()`. */
  randomUUID?: () => string;
  /** The 32-byte SHA-256 digest of `data`. Default: `crypto.subtle.digest("SHA-256", data)`. */
  sha256?: (data: Uint8Array) => Promise<Uint8Array>;
  /** A WHATWG URL constructor. Default: the global `URL`. The SDK checks it before first use and refuses one that doesn't conform. */
  URL?: PlatformURLConstructor;
  /** Opens the realtime connection. Default: the global `WebSocket`. */
  WebSocket?: PlatformWebSocketConstructor;
  /**
   * Network reachability. The outbox waits while offline. Coming online starts a waiting outbox entry and realtime
   * reconnection at once. Default in browsers: `navigator.onLine` and `online`/`offline` events; elsewhere always online.
   */
  connectivity?: Connectivity;
  /**
   * Foreground state. Returning to `active` starts waiting realtime reconnection, due outbox entries and due session
   * renewal at once. It never changes retry budgets, request IDs or payloads. Default in browsers: page visibility.
   */
  lifecycle?: Lifecycle;
}

function subscribable(value: unknown): boolean {
  return value !== null && typeof value === "object" && typeof (value as { subscribe?: unknown }).subscribe === "function";
}
/** Checks a `platform` option's shape. Returns a frozen copy. */
export function validatePlatform(value: unknown): Readonly<ConvoHopPlatform> {
  if (value === undefined) return Object.freeze({});
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError("platform must be an object");
  const platform = value as ConvoHopPlatform;
  for (const key of ["randomUUID", "sha256", "URL", "WebSocket"] as const)
    if (platform[key] !== undefined && typeof platform[key] !== "function") throw new TypeError(`platform.${key} must be a function`);
  for (const key of ["connectivity", "lifecycle"] as const)
    if (platform[key] !== undefined && !subscribable(platform[key])) throw new TypeError(`platform.${key} must have a subscribe function`);
  const copy: ConvoHopPlatform = {};
  if (platform.randomUUID) copy.randomUUID = platform.randomUUID;
  if (platform.sha256) copy.sha256 = platform.sha256;
  if (platform.URL) copy.URL = platform.URL;
  if (platform.WebSocket) copy.WebSocket = platform.WebSocket;
  if (platform.connectivity) copy.connectivity = platform.connectivity;
  if (platform.lifecycle) copy.lifecycle = platform.lifecycle;
  return Object.freeze(copy);
}

type Globals = {
  crypto?: { randomUUID?: () => string; subtle?: { digest?: (algorithm: string, data: Uint8Array) => Promise<ArrayBuffer> } };
  URL?: PlatformURLConstructor;
};
const globals = globalThis as unknown as Globals;

/** A new request or subscription ID: a canonical lowercase nonzero UUID from the platform. */
export function randomUUID(platform?: ConvoHopPlatform): string {
  const generate = platform?.randomUUID ?? globals.crypto?.randomUUID?.bind(globals.crypto);
  if (typeof generate !== "function") throw new TypeError("This runtime has no crypto.randomUUID; pass platform.randomUUID");
  const id: unknown = generate();
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id) ||
      id === "00000000-0000-0000-0000-000000000000") throw new TypeError("randomUUID must return a canonical lowercase UUID");
  return id;
}

function throws(work: () => unknown): boolean {
  try { work(); return false; } catch { return true; }
}
const conformingURL = new WeakMap<object, boolean>();
// A partial URL implementation could misread an origin, so the SDK refuses one before it decides where credentials go.
function conforms(Url: PlatformURLConstructor): boolean {
  try {
    const a = new Url("HTTPS://User:Pa%20ss@Example.COM:8443/a/../b?q=1#frag");
    const b = new Url("http://[::1]:80/");
    const c = new Url("rtc-edge?x", "wss://media.example.test/base/");
    return a.protocol === "https:" && a.username === "User" && a.password === "Pa%20ss" && a.hostname === "example.com" &&
      a.host === "example.com:8443" && a.port === "8443" && a.pathname === "/b" && a.search === "?q=1" && a.hash === "#frag" &&
      a.origin === "https://example.com:8443" && a.href === "https://User:Pa%20ss@example.com:8443/b?q=1#frag" &&
      b.hostname === "[::1]" && b.host === "[::1]" && b.port === "" && b.pathname === "/" && b.origin === "http://[::1]" &&
      c.protocol === "wss:" && c.host === "media.example.test" && c.pathname === "/base/rtc-edge" && c.search === "?x" && c.hash === "" &&
      // Chromium percent-encodes a space in a host rather than refusing it, so refusal is checked with an out-of-range port.
      throws(() => new Url("media.example.test")) && throws(() => new Url("https://example.com:65536/"));
  } catch { return false; }
}
/**
 * Parses with the platform's URL constructor, after checking once that it conforms. Invalid input throws a TypeError
 * with the `invalid` message; a missing or nonconforming constructor throws its own TypeError.
 */
export function parseURL(value: string, platform?: ConvoHopPlatform, invalid = "Invalid URL"): PlatformURL {
  const Url = platform?.URL ?? globals.URL;
  if (typeof Url !== "function") throw new TypeError("This runtime has no URL; pass platform.URL");
  let ok = conformingURL.get(Url);
  if (ok === undefined) { ok = conforms(Url); conformingURL.set(Url, ok); }
  if (!ok) throw new TypeError("This runtime's URL is not WHATWG-conformant; pass a conforming platform.URL");
  try { return new Url(value); } catch { throw new TypeError(invalid); }
}

/** UTF-8 bytes, with lone surrogates encoded as U+FFFD like `TextEncoder`. */
export function utf8(text: string): Uint8Array {
  if (typeof TextEncoder === "function") return new TextEncoder().encode(text);
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const low = text.charCodeAt(i + 1);
      if (low >= 0xdc00 && low <= 0xdfff) { code = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00); i++; }
    }
    if (code >= 0xd800 && code <= 0xdfff) code = 0xfffd;
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | code >> 6, 0x80 | code & 0x3f);
    else if (code < 0x10000) bytes.push(0xe0 | code >> 12, 0x80 | code >> 6 & 0x3f, 0x80 | code & 0x3f);
    else bytes.push(0xf0 | code >> 18, 0x80 | code >> 12 & 0x3f, 0x80 | code >> 6 & 0x3f, 0x80 | code & 0x3f);
  }
  return new Uint8Array(bytes);
}
export function hex(bytes: Uint8Array): string {
  return [...bytes].map(n => n.toString(16).padStart(2, "0")).join("");
}
const knownDigests = new WeakMap<object, Promise<boolean>>();
async function digest(hash: (data: Uint8Array) => Promise<Uint8Array | ArrayBuffer>, data: Uint8Array): Promise<Uint8Array> {
  const value: unknown = await hash(data);
  const bytes = value instanceof ArrayBuffer ? new Uint8Array(value) : value;
  if (!(bytes instanceof Uint8Array) || bytes.byteLength !== 32) throw new TypeError("sha256 must resolve to 32 bytes");
  return bytes;
}
/** SHA-256 with the platform's digest. A supplied digest must first reproduce a known answer. */
export async function sha256(data: Uint8Array, platform?: ConvoHopPlatform): Promise<Uint8Array> {
  const supplied = platform?.sha256;
  if (supplied) {
    let ok = knownDigests.get(supplied);
    if (!ok) {
      // SHA-256("abc") from FIPS 180-2.
      ok = digest(supplied, new Uint8Array([0x61, 0x62, 0x63])).then(
        bytes => hex(bytes) === "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", () => false);
      knownDigests.set(supplied, ok);
    }
    if (!await ok) throw new TypeError("platform.sha256 does not compute SHA-256");
    return digest(supplied, data);
  }
  const subtle = globals.crypto?.subtle;
  if (typeof subtle?.digest !== "function") throw new TypeError("This runtime has no crypto.subtle.digest; pass platform.sha256");
  return digest(bytes => subtle.digest!("SHA-256", bytes), data);
}

/**
 * An abort signal that fires after `ms`, or no signal where the runtime can't abort. Call `clear` once the work it
 * bounds has finished.
 */
export function deadline(ms: number): { signal: AbortSignal | undefined; clear: () => void } {
  const Signal = (globalThis as { AbortSignal?: { timeout?: (ms: number) => AbortSignal } }).AbortSignal;
  if (typeof Signal?.timeout === "function") return { signal: Signal.timeout(ms), clear: () => undefined };
  if (typeof AbortController !== "function") return { signal: undefined, clear: () => undefined };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}
