// Makes Node's globals look like a React Native app's, so code that only works because Node has a global fails here
// as it would on a device. Used by bare-runtime.mjs and by the conformance driver in conformance/drivers/react-native.

/** Node globals that a React Native 0.76 app may not have: neither Hermes nor React Native's own setup defines them. */
export const missingGlobals = Object.freeze(["AggregateError", "atob", "btoa", "Buffer", "crypto", "CustomEvent",
  "DOMException", "Event", "EventTarget", "structuredClone", "TextDecoder", "TextEncoder"]);

/**
 * Deletes the missing globals, `AbortSignal.timeout` and `throwIfAborted`, and installs what React Native defines
 * instead: `window`, a `navigator` whose product is "ReactNative" and a `URL` that isn't WHATWG-conformant. `keep`
 * names globals to leave as Node has them: missing ones, or `URL`. Node loads `fetch` and `WebSocket` on first use,
 * so a caller that needs them must read them first.
 */
export function emulateReactNative({ keep = [] } = {}) {
  const unknown = keep.filter(name => name !== "URL" && !missingGlobals.includes(name));
  if (unknown.length) throw new Error(`Not a missing global: ${unknown.join(", ")}`);
  for (const name of missingGlobals) if (!keep.includes(name)) delete globalThis[name];
  delete AbortSignal.timeout;
  delete AbortSignal.prototype.throwIfAborted;
  const left = missingGlobals.filter(name => !keep.includes(name) && name in globalThis);
  if (left.length || "timeout" in AbortSignal || "throwIfAborted" in AbortSignal.prototype)
    throw new Error(`Globals remain: ${left.join(", ") || "AbortSignal members"}`);
  delete globalThis.navigator;
  globalThis.window = globalThis;
  globalThis.navigator = { product: "ReactNative" };
  if (!keep.includes("URL")) globalThis.URL = class URL { constructor(href) { this.href = String(href); } };
}
