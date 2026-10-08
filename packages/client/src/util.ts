export function asError(error: unknown, fallback = "Operation failed"): Error {
  return error instanceof Error ? error : new Error(fallback);
}
/** Deeply freezes a value the SDK owns, so snapshots handed to apps can't be changed in place. */
export function frozen<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) frozen(child);
  }
  return value;
}
/** Calls every listener, isolating failures so one broken listener can't stop the others. */
export function notify(listeners: Iterable<() => void>, report: (error: unknown) => void): void {
  for (const listener of [...listeners]) {
    try { listener(); } catch (error) { report(error); }
  }
}
