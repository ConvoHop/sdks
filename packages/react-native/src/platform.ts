import type { Connectivity, ConvoHopPlatform, Lifecycle, LifecycleState, PlatformURLConstructor } from "@convohop/client";
import { AppState } from "react-native";
import { report } from "./native.js";
import { randomUUID } from "./random.js";
import { sha256 } from "./sha256.js";
import { URL } from "./url.js";

/** The part of `@react-native-community/netinfo` the platform uses. Pass its default export. */
export interface NetInfoSource {
  addEventListener(listener: (state: { readonly isConnected: boolean | null }) => void): () => void;
}
export interface PlatformOptions {
  /**
   * `@react-native-community/netinfo`'s default export. The outbox then waits while the device is offline, and
   * the client resumes as soon as it is back. Without it, the platform always reports online.
   */
  netInfo?: NetInfoSource;
}
/** A {@link ConvoHopPlatform} for React Native: pass it as `ConvoHopClient`'s `platform` option. */
export interface ReactNativePlatform extends ConvoHopPlatform {
  /** Version 4 UUIDs from the platform's secure generator. */
  readonly randomUUID: () => string;
  readonly sha256: (data: Uint8Array) => Promise<Uint8Array>;
  /** A WHATWG URL constructor. Hosts must be ASCII: write internationalized domain names in Punycode. */
  readonly URL: PlatformURLConstructor;
  /** NetInfo's `isConnected`. Unknown counts as online. */
  readonly connectivity: Connectivity;
  /** `AppState`: `background` is background, and every other state, including iOS's `inactive`, is active. */
  readonly lifecycle: Lifecycle;
  /** Removes the platform's AppState and NetInfo listeners. Its state stops changing. */
  dispose(): void;
}

function lifecycleState(status: unknown): LifecycleState {
  return status === "background" ? "background" : "active";
}

class Listeners<T> {
  readonly #listeners = new Set<{ listener: (value: T) => void }>();
  subscribe(listener: (value: T) => void): () => void {
    if (typeof listener !== "function") throw new TypeError("listener must be a function");
    const entry = { listener };
    this.#listeners.add(entry);
    return () => { this.#listeners.delete(entry); };
  }
  emit(value: T): void {
    for (const entry of [...this.#listeners]) {
      if (!this.#listeners.has(entry)) continue;
      try { entry.listener(value); } catch (error) { report(error); }
    }
  }
}

/**
 * Creates the React Native platform for `@convohop/client`. It listens to `AppState`, and to NetInfo when you pass
 * it, from creation until {@link ReactNativePlatform.dispose}. Create one for the app and share it between clients.
 */
export function createPlatform(options: PlatformOptions = {}): ReactNativePlatform {
  if (options === null || typeof options !== "object") throw new TypeError("options must be an object");
  const netInfo = options.netInfo;
  if (netInfo !== undefined && typeof netInfo?.addEventListener !== "function")
    throw new TypeError("netInfo must have an addEventListener function");
  const onlineListeners = new Listeners<boolean>(), stateListeners = new Listeners<LifecycleState>();
  let online = true, state = lifecycleState(AppState.currentState), disposed = false;
  const appState = AppState.addEventListener("change", status => {
    const next = lifecycleState(status);
    if (disposed || next === state) return;
    state = next;
    stateListeners.emit(next);
  });
  let unsubscribe: unknown;
  try {
    unsubscribe = netInfo?.addEventListener(change => {
      const next = change?.isConnected !== false;
      if (disposed || next === online) return;
      online = next;
      onlineListeners.emit(next);
    });
    if (netInfo && typeof unsubscribe !== "function") throw new TypeError("netInfo.addEventListener must return an unsubscribe function");
  } catch (error) {
    disposed = true;
    appState.remove();
    throw error;
  }
  return Object.freeze({
    randomUUID,
    sha256,
    URL,
    connectivity: Object.freeze({ get online() { return online; }, subscribe: onlineListeners.subscribe.bind(onlineListeners) }),
    lifecycle: Object.freeze({ get state() { return state; }, subscribe: stateListeners.subscribe.bind(stateListeners) }),
    dispose() {
      if (disposed) return;
      disposed = true;
      appState.remove();
      if (typeof unsubscribe === "function") unsubscribe();
    },
  });
}
