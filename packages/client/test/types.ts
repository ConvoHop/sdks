// Compile-time checks of public types that no runtime test reaches. `npm test` runs them with `tsc -p test`.
import type { PushRegistration } from "@convohop/client";

// One of each registration that a ConvoHop client hands your backend.
export const registrations: readonly PushRegistration[] = [
  { kind: "webPush", subscription: { endpoint: "https://push.example/1", keys: { p256dh: "key", auth: "secret" } } },
  { kind: "apns", token: "apns-token", environment: "production" },
  { kind: "apnsVoip", token: "pushkit-token" },
  { kind: "fcm", token: "registration-token" },
  { kind: "fcm", fid: "firebase-installation-id" },
];

// An fcm registration has exactly one target.
// @ts-expect-error Not both a token and a FID.
export const both: PushRegistration = { kind: "fcm", token: "registration-token", fid: "firebase-installation-id" };
// @ts-expect-error Not neither.
export const neither: PushRegistration = { kind: "fcm" };
// Excess-property checks reject both only in a literal; the `?: never` members also reject a value with both.
declare const bothTargets: { kind: "fcm"; token: string; fid: string };
// @ts-expect-error Not both, from a variable either.
export const bothFromVariable: PushRegistration = bothTargets;

// So a backend can tell which FCM HTTP v1 target to send to.
export function fcmTarget(registration: Extract<PushRegistration, { kind: "fcm" }>): { token: string } | { fid: string } {
  return registration.fid === undefined ? { token: registration.token } : { fid: registration.fid };
}
