import { ConvoHopProblem, parseId } from "@convohop/core";
import type { ConvoHopClient } from "./client.js";
import { asError } from "./util.js";

export interface TypingIndicatorOptions {
  /** The shortest time between typing signals while the user keeps typing, in milliseconds. Default 3000. */
  intervalMs?: number;
  /** How long after the last input the user stops typing, in milliseconds. Default 5000. */
  idleMs?: number;
  /**
   * Whether to send signals. Pass `capabilities().features?.typing === true` to skip projects without typing.
   * Default true.
   */
  enabled?: boolean;
  onError?: (error: Error) => void;
}
function duration(value: number | undefined, fallback: number, name: string): number {
  const result = value ?? fallback;
  if (!Number.isSafeInteger(result) || result <= 0) throw new RangeError(name + " must be a positive safe integer");
  return result;
}

/**
 * Sends throttled typing signals for one conversation while the user types. Signals are ephemeral: a lost signal
 * isn't retried, and other members' typing isn't delivered to this client. The indicator turns itself off when the
 * project doesn't support typing.
 */
export class TypingIndicator {
  readonly client: ConvoHopClient;
  readonly conversationId: string;
  readonly #interval: number;
  readonly #idle: number;
  readonly #onError: ((error: Error) => void) | undefined;
  #enabled: boolean;
  #disposed = false;
  #active = false;
  #lastSignal = 0;
  #idleTimer: ReturnType<typeof setTimeout> | undefined;
  constructor(client: ConvoHopClient, conversationId: string, options: TypingIndicatorOptions = {}) {
    this.client = client; this.conversationId = parseId(conversationId);
    this.#interval = duration(options.intervalMs, 3000, "intervalMs");
    this.#idle = duration(options.idleMs, 5000, "idleMs");
    this.#enabled = options.enabled ?? true; this.#onError = options.onError;
  }
  get enabled(): boolean { return this.#enabled && !this.#disposed; }
  set enabled(value: boolean) {
    if (!value) this.stop();
    this.#enabled = value;
  }
  /** Whether the user counts as typing. */
  get active(): boolean { return this.#active; }
  /** Call on every edit to the draft. Signals typing at most once per `intervalMs`. */
  input(): void {
    if (!this.enabled) return;
    const now = Date.now();
    if (!this.#active || now - this.#lastSignal >= this.#interval) {
      this.#active = true; this.#lastSignal = now;
      this.#signal(true);
    }
    if (this.#idleTimer !== undefined) clearTimeout(this.#idleTimer);
    this.#idleTimer = setTimeout(() => { this.#idleTimer = undefined; this.stop(); }, this.#idle);
  }
  /** Call when the user sends or clears the draft. Signals that typing stopped if it had started. */
  stop(): void {
    if (this.#idleTimer !== undefined) { clearTimeout(this.#idleTimer); this.#idleTimer = undefined; }
    if (!this.#active) return;
    this.#active = false;
    if (this.enabled) this.#signal(false);
  }
  dispose(): void {
    if (this.#disposed) return;
    this.stop();
    this.#disposed = true;
  }
  #signal(isTyping: boolean): void {
    this.client.typing(this.conversationId, isTyping).catch((error: unknown) => {
      if (error instanceof ConvoHopProblem && error.code === "FEATURE_UNSUPPORTED") {
        this.#enabled = false; this.#active = false;
        if (this.#idleTimer !== undefined) { clearTimeout(this.#idleTimer); this.#idleTimer = undefined; }
      }
      try { this.#onError?.(asError(error, "Typing signal failed")); } catch { /* a failing handler must not stop typing signals */ }
    });
  }
}
