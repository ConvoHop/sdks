import type { ConvoHopClient } from "@convohop/client";
import { getCalls, onCallEvent, stopRinging, type Call } from "./calls.js";
import { report } from "./native.js";

/** The client methods {@link watchRingingCalls} uses. */
export type RingingClient = Pick<ConvoHopClient, "liveAlerts" | "liveSession">;
export interface WatchRingingOptions {
  /** How often to check while an incoming call rings, in milliseconds: 1000 to 60000. Defaults to 3000. */
  intervalMs?: number;
  /** Receives errors from checking, until watching stops; checking continues. By default React Native's error handler reports them. */
  onError?: (error: unknown) => void;
}

const MAX_PAGES = 10, MISSES_TO_STOP = 2;

type AlertPage = { items: { alertId: string }[]; nextCursor: string | null; complete: boolean; refreshRequired: boolean };
function isPage(value: unknown): value is AlertPage {
  if (typeof value !== "object" || value === null) return false;
  const { items, nextCursor, complete, refreshRequired } = value as Readonly<Record<string, unknown>>;
  return Array.isArray(items) && items.every(item => typeof item === "object" && item !== null &&
    typeof (item as { alertId?: unknown }).alertId === "string") &&
    (nextCursor === null || (typeof nextCursor === "string" && nextCursor !== "")) &&
    typeof complete === "boolean" && typeof refreshRequired === "boolean";
}
/**
 * The user's current alert IDs, or `undefined` when the listing can't prove that an alert is absent. It requests no
 * page once `stopped` returns `true`.
 */
async function currentAlerts(client: RingingClient, stopped: () => boolean): Promise<Set<string> | undefined> {
  const alerts = new Set<string>();
  let cursor: string | undefined;
  for (let pages = 0; pages < MAX_PAGES && !stopped(); pages++) {
    const page: unknown = await client.liveAlerts.list(cursor === undefined ? {} : { cursor });
    if (!isPage(page)) throw new TypeError("liveAlerts.list returned a malformed page");
    if (page.refreshRequired) return undefined;
    for (const { alertId } of page.items) alerts.add(alertId);
    if (page.nextCursor === null) return page.complete ? alerts : undefined;
    cursor = page.nextCursor;
  }
  return undefined;
}

/**
 * Stops incoming calls that ring here after the server stopped their ring: another of the user's devices answered,
 * the caller hung up, or the ring expired. iOS gets no VoIP push for a stopped ring, because iOS would make the app
 * report it to CallKit as a new call, so an app that rings through CallKit has to stop the ring itself. On Android a
 * cancellation arrives as a data message; watching also covers one that arrives late.
 *
 * While an incoming call rings, it lists the user's live alerts every `intervalMs`. A ring whose alert is missing from
 * two complete listings in a row stops with the server reason `ended` if its live session ended, `answered` if the user
 * has an unfinished participation in it, `expired` after its `expiresAt` and `stopped` otherwise. A ring stops with
 * `expired` at its `expiresAt` at the latest. Start watching after sign-in; returns a function that stops watching,
 * which you call before the client's session ends. Once stopped, it starts no request and calls `onError` no more: a
 * request already in flight finishes, and its result is ignored.
 */
export function watchRingingCalls(client: RingingClient, options: WatchRingingOptions = {}): () => void {
  if (typeof client?.liveAlerts?.list !== "function" || typeof client.liveSession !== "function")
    throw new TypeError("client must be a ConvoHopClient");
  if (typeof options !== "object" || options === null) throw new TypeError("options must be an object");
  const { intervalMs = 3000, onError = report } = options;
  if (!Number.isSafeInteger(intervalMs) || intervalMs < 1000 || intervalMs > 60000)
    throw new RangeError("intervalMs must be an integer from 1000 to 60000");
  if (typeof onError !== "function") throw new TypeError("onError must be a function");

  const ringing = new Map<string, Call>(), misses = new Map<string, number>(), changed = new Set<string>();
  let stopped = false, checking = false, timer: ReturnType<typeof setTimeout> | undefined;
  const fail = (error: unknown): void => {
    if (stopped) return;
    try { onError(error); } catch (thrown) { report(thrown); }
  };
  const track = (found: Call): void => {
    if (found.state === "ringing" && !found.outgoing && found.alertId !== undefined) ringing.set(found.id, found);
    else {
      ringing.delete(found.id);
      misses.delete(found.id);
    }
  };
  const schedule = (): void => {
    if (stopped || checking || timer !== undefined || ringing.size === 0) return;
    const now = Date.now();
    let delay = intervalMs;
    for (const { expiresAt } of ringing.values()) if (expiresAt !== undefined) delay = Math.min(delay, Math.max(0, expiresAt - now));
    timer = setTimeout(() => {
      timer = undefined;
      void check();
    }, delay);
  };
  const stop = async (found: Call, reason: string): Promise<void> => {
    if (stopped || !ringing.has(found.id)) return;
    ringing.delete(found.id);
    misses.delete(found.id);
    try { await stopRinging(found.id, reason); } catch (error) { fail(error); }
  };
  const reasonFor = async (found: Call): Promise<string> => {
    try {
      const { snapshot } = await client.liveSession(found.liveSessionId);
      if (snapshot.state === "ENDED" || snapshot.state === "FAILED") return "ended";
      if (found.expiresAt !== undefined && found.expiresAt <= Date.now()) return "expired";
      const mine = snapshot.myParticipation;
      if (mine !== null && mine.state !== "LEAVING" && mine.state !== "LEFT") return "answered";
    } catch (error) {
      if ((error as { code?: unknown } | null)?.code !== "NOT_FOUND") fail(error);
    }
    return "stopped";
  };
  const check = async (): Promise<void> => {
    checking = true;
    try {
      const now = Date.now(), candidates = [...ringing.values()], waiting: Call[] = [];
      for (const found of candidates) {
        if (found.expiresAt !== undefined && found.expiresAt <= now) await stop(found, "expired");
        else waiting.push(found);
      }
      if (stopped || waiting.length === 0) return;
      let alerts: Set<string> | undefined;
      try { alerts = await currentAlerts(client, () => stopped); } catch (error) { fail(error); return; }
      if (alerts === undefined) return;
      for (const found of waiting) {
        if (stopped) return;
        if (!ringing.has(found.id)) continue;
        if (alerts.has(found.alertId as string)) {
          misses.delete(found.id);
          continue;
        }
        const count = (misses.get(found.id) ?? 0) + 1;
        misses.set(found.id, count);
        if (count >= MISSES_TO_STOP) await stop(found, await reasonFor(found));
      }
    } finally {
      checking = false;
      schedule();
    }
  };

  const unsubscribe = onCallEvent(({ call: found }) => {
    changed.add(found.id);
    track(found);
    schedule();
  });
  getCalls().then(calls => {
    if (stopped) return;
    for (const found of calls) if (!changed.has(found.id)) track(found);
    schedule();
  }).catch(fail);
  return () => {
    if (stopped) return;
    stopped = true;
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    unsubscribe();
    ringing.clear();
    misses.clear();
  };
}
