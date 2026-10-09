// Fake ConvoHop TurboModules. Each implements its whole spec with defaults that tests override, and logs every call.
import { Buffer } from "node:buffer";
import { randomBytes } from "node:crypto";
import { linkModule } from "react-native";

const modules = {
  ConvoHopPlatform: {
    methods: { getRandomBytes: length => Buffer.from(randomBytes(length)).toString("base64") },
    events: [],
  },
  ConvoHopPush: {
    methods: {
      getPermissionStatus: async () => "undetermined",
      requestPermission: async () => "granted",
      register: async () => {},
      unregister: async () => null,
      setRecipient: async () => {},
      getRegistrations: async () => [],
      takeInitialNotification: async () => null,
      handleRemoteMessage: async () => "notConvoHop",
    },
    events: ["onPushRegistration", "onPushRegistrationError", "onPushUnregistration", "onNotification"],
  },
  ConvoHopCalls: {
    methods: {
      getCalls: async () => [],
      forgetCall: async () => true,
      startOutgoingCall: async () => "0b6f7c1e-8a2d-4c3b-9e4f-5a6b7c8d9e0f",
      answerCall: async () => {},
      endCall: async () => {},
      stopRinging: async () => {},
      reportConnecting: async () => {},
      reportConnected: async () => {},
      updateCall: async () => {},
      setMuted: async () => {},
      setHeld: async () => {},
      setAudioRoute: async () => {},
      canUseFullScreenIntent: async () => true,
      openFullScreenIntentSettings: async () => {},
      getVoipToken: async () => null,
      isAudioSessionActive: async () => false,
    },
    events: ["onCallEvent", "onVoipToken", "onAudioSession"],
  },
};

/** Each fake module's method and event names, which the Codegen test compares with the specs. */
export const fakeSpecs = Object.fromEntries(Object.entries(modules).map(([name, { methods, events }]) =>
  [name, { methods: Object.keys(methods), events }]));

function link(name, overrides) {
  const { methods: defaults, events } = modules[name], unknown = Object.keys(overrides).filter(key => !(key in defaults));
  if (unknown.length) throw new Error(`${name} has no ${unknown.join(", ")}`);
  const log = [], methods = {};
  for (const [key, method] of Object.entries({ ...defaults, ...overrides }))
    methods[key] = (...args) => { log.push([key, ...args]); return method(...args); };
  return { ...linkModule(name, methods, events), log };
}
export const linkPlatform = (overrides = {}) => link("ConvoHopPlatform", overrides);
export const linkPush = (overrides = {}) => link("ConvoHopPush", overrides);
export const linkCalls = (overrides = {}) => link("ConvoHopCalls", overrides);

export const uuid = () => crypto.randomUUID();
/** A valid native call snapshot: a ringing incoming call unless `fields` says otherwise. */
export function snapshot(fields = {}) {
  const alertId = uuid();
  return { id: alertId, alertId, liveSessionId: uuid(), conversationId: uuid(), outgoing: false, hasVideo: false,
    mediaProfile: "AUDIO_ONLY", callerName: "Ada", expiresAtMs: Date.now() + 30000, state: "ringing", muted: false,
    availableAudioRoutes: [], ...fields };
}
/** Lets pending promise callbacks and native events run. */
export const turn = () => new Promise(resolve => setImmediate(resolve));
