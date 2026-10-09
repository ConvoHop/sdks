// Loaded with --import before each test file. React Native, its native modules, NetInfo and LiveKit's React Native SDK
// only run in an app, so the samples' imports of them resolve to stand-ins: packages/react-native's, and netinfo.ts and
// livekit.ts here. Everything else, including AsyncStorage's JavaScript and the ConvoHop SDKs, is the real package.
import { registerHooks } from "node:module";

await import(new URL("../../../../../packages/react-native/test/support/register.mjs", import.meta.url).href);
// Hooks registered later run first, so livekit.ts takes the place of packages/react-native's LiveKit stand-in.
const standIns = new Map<string, string>([
  ["@react-native-community/netinfo", new URL("./netinfo.ts", import.meta.url).href],
  ["@livekit/react-native", new URL("./livekit.ts", import.meta.url).href],
]);
registerHooks({
  resolve: (specifier, context, next) => {
    const url = standIns.get(specifier);
    return url === undefined ? next(specifier, context) : { url, shortCircuit: true };
  },
});

const { native, reactNative } = await import("./native.ts");
const { nativeAsyncStorage } = await import("./storage.ts");
// AsyncStorage looks its native module up as it loads, and the SDK's UUIDs come from ConvoHopPlatform's random bytes.
reactNative.linkModule("RNAsyncStorage", nativeAsyncStorage);
native.linkPlatform();
