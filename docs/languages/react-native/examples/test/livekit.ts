// A stand-in for @livekit/react-native, which test/setup.ts resolves the samples' and the SDK's imports to. Its
// registerGlobals is packages/react-native's stand-in, and AudioSession lists what the calling samples ask of it.

const packageStandIn = "../../../../../packages/react-native/test/support/livekit-react-native.mjs";
type PackageStandIn = { registerGlobals(options?: object): void };
export const { registerGlobals } = (await import(new URL(packageStandIn, import.meta.url).href)) as PackageStandIn;

// What the samples asked of LiveKit's audio session, in order.
export const audioSession: ("start" | "stop")[] = [];

export const AudioSession = {
  async startAudioSession(): Promise<void> {
    audioSession.push("start");
  },
  async stopAudioSession(): Promise<void> {
    audioSession.push("stop");
  },
};
