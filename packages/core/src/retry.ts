import { errorCodes, type ErrorCodeDefinition } from "./generated/errors.js";
import { ConvoHopProblem } from "./protocol.js";

/** Whole-second retry delay from `extensions.retryAfter` or an HTTP `Retry-After` delta; anything else is ignored. */
export function retryDelay(value: unknown): number | undefined {
  if (typeof value === "string" && /^[0-9]{1,10}$/.test(value)) value = Number(value);
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}
/** What the schema says about `code`, when it lists the code. */
export function errorCode(code: string): ErrorCodeDefinition | undefined {
  return Object.hasOwn(errorCodes, code) ? errorCodes[code] : undefined;
}
/**
 * Whether a later attempt of a request may still succeed after a problem with `code`. The schema says so for each code
 * it lists; `WRONG_REGION` succeeds once the client routes again. A code the schema doesn't list counts as retryable.
 */
export function retryableCode(code: string): boolean {
  return code === "WRONG_REGION" || errorCode(code)?.retryable !== false;
}
/** After a failure, try again, route again and then try, or stop and surface the problem. */
export type ReconnectAction = "retry" | "reroute" | "stop";
/**
 * Classifies a failure of initialization, a realtime connection or a queued send. Only a problem whose code is
 * retryable and whose status is 0 (no response), 408, 429 or 5xx is retried; `WRONG_REGION` routes again first.
 * Anything else stops: `QUOTA_EXCEEDED`, `PLAN_LIMIT_EXCEEDED`, authentication and scope problems, and errors that
 * aren't a {@link ConvoHopProblem}.
 */
export function reconnectAction(error: unknown): ReconnectAction {
  if (!(error instanceof ConvoHopProblem)) return "stop";
  if (error.code === "WRONG_REGION") return "reroute";
  if (!retryableCode(error.code)) return "stop";
  const status = error.status;
  return status === 0 || status === 408 || status === 429 || (status >= 500 && status <= 599) ? "retry" : "stop";
}
/**
 * The wait before reconnection attempt `attempt`, counted from 0: 1 s doubling to at most 10 s, never less than the
 * authority's `retryAfter` seconds, plus up to 0.5 s of jitter.
 */
export function reconnectDelay(attempt: number, retryAfter = 0): number {
  const backoff = Math.max(Math.min(1000 * 2 ** Math.min(attempt, 4), 10000), retryAfter * 1000);
  return Math.min(backoff + Math.floor(Math.random() * 500), 2147483647);
}
/** Close codes that end realtime authorization, as the schema's reconnect policy lists them. */
const terminalCloseCodes: readonly number[] = [4400, 4401, 4403, 4408, 4409];
/**
 * The problem a realtime close reports, if any. A reason that starts with an error code the schema lists, such as
 * `QUOTA_EXCEEDED retryAfter=60 meter=messages`, reports that code with its `retryAfter=` seconds, whatever the close
 * code. Otherwise a close code that ends realtime authorization reports `UNAUTHENTICATED`, and any other close reports
 * nothing, so the stream reconnects.
 */
export function closeProblem(code: number, reason: string, requestId: string): ConvoHopProblem | undefined {
  const words = reason.trim().split(/\s+/), name = words[0] ?? "", known = errorCode(name);
  if (known) {
    const retryAfter = retryDelay(words.find(word => word.startsWith("retryAfter="))?.slice("retryAfter=".length));
    return new ConvoHopProblem(name, requestId, "rejected", known.status ?? (code >= 4000 && code <= 4999 ? code - 4000 : 0),
      `Realtime connection closed: ${words.join(" ")}`, retryAfter === undefined ? undefined : { retryAfter });
  }
  if (terminalCloseCodes.includes(code))
    return new ConvoHopProblem("UNAUTHENTICATED", requestId, "rejected", 401, "Realtime authorization ended; obtain a current session");
  return undefined;
}
