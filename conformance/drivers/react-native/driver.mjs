// ConvoHop conformance driver for @convohop/react-native (spec/conformance/driver-protocol.md). It runs the reference
// driver's protocol loop, ../ts/dist/driver.mjs, with ./sdk.mjs in place of the reference's SDK module, in a Node
// process that looks like a React Native app: the package's test stand-ins replace react-native, a fake ConvoHopPlatform
// TurboModule supplies random bytes, and the globals Hermes lacks are gone. It doesn't run Hermes or native code.
import module from "node:module";

const at = path => new URL(path, import.meta.url).href;
const reference = at("../ts/dist/driver.mjs"), referenceSdk = at("../ts/dist/sdk.mjs"), sdk = at("sdk.mjs");
const support = name => at(`../../../packages/react-native/test/support/${name}`);
const [register, native, globals] = ["register.mjs", "native.mjs", "globals.mjs"].map(support);

await import(register);
let replaced = false;
module.registerHooks({
  resolve(specifier, context, next) {
    const resolved = next(specifier, context);
    if (resolved.url !== referenceSdk) return resolved;
    replaced = true;
    return { ...resolved, url: sdk };
  },
});
const { linkPlatform } = await import(native);
linkPlatform();
// Node's fetch and WebSocket stand in for React Native's native ones. Node loads them on first use, so load them
// before their globals go. They still look up Buffer, DOMException, Event and URL when called (closing a connecting
// WebSocket aborts its handshake with a DOMException), and the protocol loop copies results with structuredClone, so
// those stay. No SDK module uses them: the client parses URLs with the platform's URL. The package's
// test/bare-runtime.mjs removes them all, and WebSocket, and runs the send, outbox and push paths on a stand-in fetch.
void globalThis.fetch;
void globalThis.WebSocket;
const { emulateReactNative } = await import(globals);
emulateReactNative({ keep: ["Buffer", "DOMException", "Event", "structuredClone", "URL"] });
await import(reference);
if (!replaced) {
  process.stderr.write("The reference driver no longer imports ../ts/dist/sdk.mjs; update the React Native driver\n");
  process.exit(2);
}
