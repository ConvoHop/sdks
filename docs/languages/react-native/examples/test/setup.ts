// Loaded with --import before each test file. React Native, its native modules and NetInfo only run in an app, so the
// samples' imports of them resolve to stand-ins: packages/react-native's, and netinfo.ts here. Everything else,
// including AsyncStorage's JavaScript and the ConvoHop SDKs, is the real package.
import { registerHooks } from "node:module";

await import(new URL("../../../../../packages/react-native/test/support/register.mjs", import.meta.url).href);
const netInfo = new URL("./netinfo.ts", import.meta.url).href;
registerHooks({
  resolve: (specifier, context, next) =>
    specifier === "@react-native-community/netinfo" ? { url: netInfo, shortCircuit: true } : next(specifier, context),
});

const { native, reactNative } = await import("./native.ts");
const { nativeAsyncStorage } = await import("./storage.ts");
// AsyncStorage looks its native module up as it loads, and the SDK's UUIDs come from ConvoHopPlatform's random bytes.
reactNative.linkModule("RNAsyncStorage", nativeAsyncStorage);
native.linkPlatform();
