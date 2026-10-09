import type { Connectivity, ConvoHopPlatform, Lifecycle, LifecycleState } from "@convohop/core";

type Listener = () => void;
interface EventSource {
  addEventListener?: (type: string, listener: Listener) => void;
  removeEventListener?: (type: string, listener: Listener) => void;
}
const scope = globalThis as EventSource & {
  navigator?: { onLine?: unknown };
  document?: EventSource & { visibilityState?: unknown };
};

function listenTo(source: EventSource | undefined, events: Record<string, Listener>): () => void {
  if (typeof source?.addEventListener !== "function") return () => undefined;
  for (const [type, listener] of Object.entries(events)) source.addEventListener(type, listener);
  return () => { for (const [type, listener] of Object.entries(events)) source.removeEventListener?.(type, listener); };
}
/** `navigator.onLine` and its events where the runtime has them; otherwise always online. */
export function browserConnectivity(): Connectivity {
  return {
    get online() { return scope.navigator?.onLine !== false; },
    subscribe: listener => listenTo(scope, { online: () => listener(true), offline: () => listener(false) }),
  };
}
/** Page visibility where the runtime has a document; otherwise always active. */
export function browserLifecycle(): Lifecycle {
  const state = (): LifecycleState => scope.document?.visibilityState === "hidden" ? "background" : "active";
  return {
    get state() { return state(); },
    subscribe: listener => listenTo(scope.document, { visibilitychange: () => listener(state()) }),
  };
}
// Clients may be duck-typed objects without a platform.
export function connectivityOf(platform: ConvoHopPlatform | undefined): Connectivity {
  return platform?.connectivity ?? browserConnectivity();
}
export function lifecycleOf(platform: ConvoHopPlatform | undefined): Lifecycle {
  return platform?.lifecycle ?? browserLifecycle();
}
/** Subscribes to a connectivity or lifecycle source. Returns its unsubscribe function, which must be a function. */
export function listen<T>(source: { subscribe(listener: (value: T) => void): () => void }, listener: (value: T) => void): () => void {
  const unsubscribe: unknown = source.subscribe(listener);
  if (typeof unsubscribe !== "function") throw new TypeError("subscribe must return an unsubscribe function");
  return () => { unsubscribe(); };
}

/** An `AggregateError`, or an `Error` with the same name and `errors` where the runtime has none. */
export function aggregateError(errors: unknown[], message: string): Error & { errors: unknown[] } {
  const Aggregate = (globalThis as { AggregateError?: AggregateErrorConstructor }).AggregateError;
  if (typeof Aggregate === "function") return new Aggregate(errors, message);
  return Object.assign(new Error(message), { name: "AggregateError", errors });
}
/** Why a signal aborted: its `reason`, or an `AbortError` where the runtime's signals have none. */
export function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? Object.assign(new Error("This operation was aborted"), { name: "AbortError" });
}
/** `signal.throwIfAborted()`, also where the runtime's signals lack it. */
export function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw abortReason(signal);
}
