// Loaded with --import. React Native and LiveKit's React Native packages only run inside an app, so the tests resolve
// them to the stand-ins in this directory. Everything else, including livekit-client and @convohop/client, is real.
import module from "node:module";
import { URL } from "node:url";

if (typeof module.registerHooks !== "function") throw new Error("The tests need Node 22.15 or later (module.registerHooks)");
const standIns = new Map([
  ["react-native", "react-native.mjs"],
  ["@livekit/react-native", "livekit-react-native.mjs"],
  ["@livekit/react-native-webrtc", "react-native-webrtc.mjs"],
].map(([specifier, file]) => [specifier, new URL(file, import.meta.url).href]));
module.registerHooks({
  resolve(specifier, context, next) {
    const url = standIns.get(specifier);
    return launched(url ? { url, shortCircuit: true } : metro(specifier, context, next), context.parentURL);
  },
});

/**
 * Metro resolves a package's extensionless imports, trying React Native's platform extension first. AsyncStorage
 * relies on it: its "./createAsyncStorage" is the native module's binding in an app and IndexedDB on the web.
 */
function metro(specifier, context, next) {
  if (!context.conditions?.includes("import") || !context.parentURL?.includes("/node_modules/") ||
      !/^\.\.?\//.test(specifier) || /\.[cm]?js$/.test(specifier)) return next(specifier, context);
  for (const candidate of [specifier + ".native.js", specifier + ".js"]) {
    try { return next(candidate, context); }
    catch (error) { if (error?.code !== "ERR_MODULE_NOT_FOUND") throw error; }
  }
  return next(specifier, context);
}

/**
 * A module imported with `?context=N` gets its own instance of every module it imports, stand-ins included, as each
 * launch of an app does. CommonJS modules stay shared, which suits the stateless ones the SDK uses.
 */
function launched(resolved, parentURL) {
  const launch = parentURL?.startsWith("file:") ? new URL(parentURL).searchParams.get("context") : null;
  if (launch === null || !resolved.url.startsWith("file:")) return resolved;
  const url = new URL(resolved.url);
  url.searchParams.set("context", launch);
  return { ...resolved, url: url.href };
}
