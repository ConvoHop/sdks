// The part of @livekit/react-native the SDK uses. Like the real registerGlobals, it gives a runtime without
// crypto.randomUUID one built on Math.random.
export const registrations = [];
export function registerGlobals(options) {
  registrations.push({ options, hadRandomUUID: typeof globalThis.crypto?.randomUUID === "function" });
  if (globalThis.crypto === undefined) globalThis.crypto = {};
  if (typeof globalThis.crypto.randomUUID !== "function") globalThis.crypto.randomUUID = mathRandomUUID;
}
export function mathRandomUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c =>
    (c === "x" ? Math.random() * 16 | 0 : Math.random() * 4 | 8).toString(16));
}
