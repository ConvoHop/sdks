// The parts of react-native the SDK uses, with controls for the tests.
export const Platform = { OS: "ios" };

// The SDK caches the modules it looks up, so each linked name resolves to one proxy that forwards to the module the
// test linked last.
const linked = new Map(), proxies = new Map();
export const TurboModuleRegistry = {
  get(name) {
    if (!linked.has(name)) return null;
    if (!proxies.has(name)) proxies.set(name, new Proxy({}, { get: (_target, key) => linked.get(name)?.[key] }));
    return proxies.get(name);
  },
};

/**
 * Links a fake TurboModule. `methods` implement its spec, and each name in `events` becomes a Codegen event emitter:
 * a function that takes a listener and returns a subscription. Removing a subscription twice throws, so the tests
 * catch code that loses track of what it subscribed.
 */
export function linkModule(name, methods = {}, events = []) {
  const listeners = new Map(events.map(event => [event, new Set()]));
  const module = { ...methods };
  for (const event of events) {
    module[event] = listener => {
      const entry = { listener };
      listeners.get(event).add(entry);
      return {
        remove: () => {
          if (!listeners.get(event).delete(entry)) throw new Error(`A ${name}.${event} subscription was removed twice`);
        },
      };
    };
  }
  linked.set(name, module);
  return {
    module,
    emit(event, value) { for (const { listener } of [...listeners.get(event)]) listener(value); },
    listenerCount: event => listeners.get(event).size,
  };
}

const appStateListeners = new Set();
export const AppState = {
  currentState: "active",
  addEventListener(type, listener) {
    if (type !== "change") throw new Error(`Unexpected AppState event ${type}`);
    const entry = { listener };
    appStateListeners.add(entry);
    return {
      remove: () => {
        if (!appStateListeners.delete(entry)) throw new Error("An AppState subscription was removed twice");
      },
    };
  },
};
export function changeAppState(state) {
  AppState.currentState = state;
  for (const { listener } of [...appStateListeners]) listener(state);
}
export const appStateListenerCount = () => appStateListeners.size;

// React Native's global error handler, which the SDK reports errors it can't throw to. Launches share it, as they
// share the process.
globalThis.ErrorUtils ??= (reported => ({ reported, reportError: error => { reported.push(error); } }))([]);
export const reported = globalThis.ErrorUtils.reported;
