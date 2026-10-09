import type { PushRegistration } from "@convohop/client";
import { parsePushPayload, type PushNotification } from "@convohop/client/push";
import { Platform } from "react-native";
import { callsModule, pushModule, report } from "./native.js";
import type { NotificationEvent } from "./specs/NativeConvoHopPush.js";

/** Whether the app may show notifications. `provisional` is iOS's quiet delivery to Notification Center. */
export type PushPermission = "granted" | "provisional" | "denied" | "undetermined";
/** iOS presentation options to request. Android ignores them and requests `POST_NOTIFICATIONS` on Android 13+. */
export interface PushPermissionRequest {
  alert?: boolean;
  badge?: boolean;
  sound?: boolean;
  /** iOS 12+: deliver quietly without asking. The user can promote or turn off notifications later. */
  provisional?: boolean;
}
/**
 * A push registration from a native app: an APNs or PushKit token on iOS. On Android, an FCM registration token, or
 * the Firebase installation ID (FID) when the app registers with FCM by FID. Your backend sends FCM messages to
 * whichever it got.
 */
export type NativePushRegistration = Exclude<PushRegistration, { readonly kind: "webPush" }>;
export interface RegisterForPushOptions {
  /**
   * Stores the registration with your backend, for the signed-in user, so it can send pushes to this device. Called
   * once for each registration this sees: the current ones, then each new one. On iOS that is the APNs token and, when
   * the app receives calls, the PushKit token. On Android it is the FCM registration token or FID, which change when
   * the app's data is cleared or Firebase replaces them. A registration your backend fails to store is offered again
   * if the platform reports it again.
   */
  register: (registration: NativePushRegistration) => Promise<void> | void;
  /**
   * Deletes a registration from your backend when Android reports that FCM unregistered it, so pushes to it stop:
   * after `unregisterFromPush`, or when Firebase unregisters the FID itself. The same report can arrive more than
   * once. If FCM registers that token or FID again, `register` gets it again. iOS never calls it.
   */
  unregister?: (registration: NativePushRegistration) => Promise<void> | void;
  /**
   * Receives the errors that don't reject `registerForPush`: failures after it resolved, and PushKit failures. By
   * default they go to React Native's error handler.
   */
  onError?: (error: unknown) => void;
  /** How long to wait for the APNs token or the FCM registration to be stored, in milliseconds. Default 30000. */
  timeoutMs?: number;
  /**
   * Stops registering when it aborts, as the function `registerForPush` resolves does. If that hasn't resolved yet,
   * it rejects with the signal's `reason`. Use it to sign out, or to clean up an effect, without waiting for the
   * platform or your backend.
   */
  signal?: AbortSignalLike;
}
/** The part of an `AbortSignal` this package uses, such as one from React Native's `AbortController`. */
export interface AbortSignalLike {
  readonly aborted: boolean;
  readonly reason?: unknown;
  addEventListener(type: "abort", listener: () => void): void;
  removeEventListener(type: "abort", listener: () => void): void;
}
/** A ConvoHop push the app received while running (`received`) or that the user opened (`opened`). */
export interface NotificationResponse {
  readonly action: "received" | "opened";
  readonly notification: PushNotification;
}
/** The user whose ConvoHop pushes this device accepts: the signed-in user. */
export interface PushRecipient {
  /** The client's `projectId`. */
  readonly projectId: string;
  /** The user's principal ID: the client's `principalId`. */
  readonly recipientId: string;
}
/**
 * What the native handler did with an Android data message:
 * - `notConvoHop`: the message isn't a ConvoHop push. Handle it yourself.
 * - `invalid`: it is a ConvoHop push that doesn't match the push payload contract. It was dropped.
 * - `ignored`: a duplicate, or a ring for a call that already stopped.
 * - `message`: it showed a message notification.
 * - `ringing`: it started ringing an incoming call.
 * - `stopped`: it stopped a ring that was answered or declined, on any device.
 * - `missed`: it stopped a ring nobody answered and showed a missed call.
 */
export type RemoteMessageResult = "notConvoHop" | "invalid" | "ignored" | "message" | "ringing" | "stopped" | "missed";

const permissions = new Set<string>(["granted", "provisional", "denied", "undetermined"]);
const results = new Set<string>(["notConvoHop", "invalid", "ignored", "message", "ringing", "stopped", "missed"]);
// FCM tokens are opaque, so only printable ASCII without spaces is required. FIDs are 22 URL-safe base64 characters,
// or 11 when Firebase kept an earlier Instance ID.
const APNS_TOKEN = /^(?:[0-9a-f]{2}){8,256}$/, FCM_TOKEN = /^[!-~]{1,4096}$/, FID = /^[A-Za-z0-9_-]{11,64}$/;
// Push payloads carry lowercase UUIDs, so an ID in any other form would never match.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, NIL_UUID = "00000000-0000-0000-0000-000000000000";

function permission(value: unknown): PushPermission {
  if (typeof value !== "string" || !permissions.has(value)) throw new TypeError("ConvoHopPush returned an unknown permission status");
  return value as PushPermission;
}
function flag(request: PushPermissionRequest, name: keyof PushPermissionRequest, fallback: boolean): boolean {
  const value = request[name];
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") throw new TypeError(name + " must be a boolean");
  return value;
}
function objectOf(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Readonly<Record<string, unknown>> : undefined;
}
const absent = (value: unknown): boolean => value === undefined || value === null;
function isSignal(value: unknown): value is AbortSignalLike {
  const source = objectOf(value);
  return source !== undefined && typeof source.aborted === "boolean" && typeof source.addEventListener === "function" &&
    typeof source.removeEventListener === "function";
}
/** Why a signal aborted: its `reason`, or an `AbortError` where the runtime's signals have none. */
function abortReason(signal: AbortSignalLike): unknown {
  return signal.reason ?? Object.assign(new Error("This operation was aborted"), { name: "AbortError" });
}

/** The current notification permission. */
export async function getPushPermission(): Promise<PushPermission> {
  return permission(await pushModule().getPermissionStatus());
}
/**
 * Asks the user for notification permission, unless they already decided, and resolves the result. By default it
 * asks for alerts, badges and sounds.
 */
export async function requestPushPermission(request: PushPermissionRequest = {}): Promise<PushPermission> {
  if (objectOf(request) === undefined) throw new TypeError("request must be an object");
  return permission(await pushModule().requestPermission({
    alert: flag(request, "alert", true), badge: flag(request, "badge", true),
    sound: flag(request, "sound", true), provisional: flag(request, "provisional", false),
  }));
}

type RegistrationKind = NativePushRegistration["kind"];
/** The registration kind of this platform's notification pushes. */
function primaryKind(): "apns" | "fcm" {
  if (Platform.OS === "ios") return "apns";
  if (Platform.OS === "android") return "fcm";
  throw new Error("ConvoHop pushes need iOS or Android");
}
/** Validates a registration of `kind` from the native modules. Returns `undefined` for anything else. */
function registration(value: unknown, kind: RegistrationKind): NativePushRegistration | undefined {
  const source = objectOf(value);
  if (!source || source.kind !== kind) return undefined;
  const { token, fid, environment } = source;
  if (kind === "fcm") {
    if (!absent(environment)) return undefined;
    if (typeof token === "string" && FCM_TOKEN.test(token) && absent(fid)) return Object.freeze({ kind, token });
    return typeof fid === "string" && FID.test(fid) && absent(token) ? Object.freeze({ kind, fid }) : undefined;
  }
  if (typeof token !== "string" || !APNS_TOKEN.test(token) || !absent(fid)) return undefined;
  if (absent(environment)) return Object.freeze({ kind, token });
  return environment === "development" || environment === "production" ? Object.freeze({ kind, token, environment }) : undefined;
}
const malformedRegistrations = (): TypeError => new TypeError("ConvoHopPush returned malformed registrations");
const malformedRegistration = (): TypeError => new TypeError("ConvoHop sent a malformed push registration");
/** Tells registrations apart: the same token with another APNs environment is another registration. */
function keyOf(found: NativePushRegistration): string {
  return "fid" in found ? "fid\n" + found.fid
    : found.kind + "\n" + found.token + "\n" + ("environment" in found ? found.environment ?? "" : "");
}
/** The push registrations this process has seen: the APNs and PushKit tokens on iOS, the FCM token or FID on Android. */
export async function getPushRegistrations(): Promise<NativePushRegistration[]> {
  const kind = primaryKind(), registrations: unknown = await pushModule().getRegistrations();
  if (!Array.isArray(registrations)) throw malformedRegistrations();
  const found = registrations.map(value => registration(value, kind));
  if (kind === "apns") {
    const voip: unknown = await callsModule().getVoipToken();
    if (voip !== null) found.push(registration(voip, "apnsVoip"));
  }
  if (found.includes(undefined)) throw malformedRegistrations();
  return found as NativePushRegistration[];
}

/**
 * Registers this device for ConvoHop pushes. It starts the platform's registration and passes each registration to
 * your `register` callback, which stores it with your backend. It resolves once the APNs token (iOS) or the FCM
 * registration (Android) is stored, and keeps passing new registrations until you call the function it resolves or
 * abort `signal`. It rejects when the platform can't register, `register` fails for that registration, `timeoutMs`
 * passes first, or `signal` aborts first.
 *
 * Call it after sign-in on every launch, after `setPushRecipient`: registrations change, and your backend should keep
 * the latest for each user. The same registration arrives again on later launches, so store it idempotently. On
 * sign-out, abort `signal` or call the function it resolves, then `unregisterFromPush` on Android. Android follows
 * your app's FCM mode: it registers by FID when the app manifest sets `firebase_messaging_installation_id_enabled`,
 * and by registration token otherwise; see the README. Tokens and FIDs address this device for your push provider.
 * Don't log them.
 */
export function registerForPush(options: RegisterForPushOptions): Promise<() => void> {
  try {
    return start(options);
  } catch (error) {
    return Promise.reject(error);
  }
}
function start(options: RegisterForPushOptions): Promise<() => void> {
  if (objectOf(options) === undefined) throw new TypeError("options must be an object");
  const { register, unregister, onError, timeoutMs = 30000, signal } = options;
  if (typeof register !== "function") throw new TypeError("register must be a function");
  if (unregister !== undefined && typeof unregister !== "function") throw new TypeError("unregister must be a function");
  if (onError !== undefined && typeof onError !== "function") throw new TypeError("onError must be a function");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 600000) throw new RangeError("timeoutMs must be an integer from 1 to 600000");
  if (signal !== undefined && !isSignal(signal)) throw new TypeError("signal must be an AbortSignal");
  if (signal?.aborted) throw abortReason(signal);
  const primary = primaryKind(), push = pushModule(), calls = primary === "apns" ? callsModule() : undefined;
  return new Promise((resolve, reject) => {
    let settled = false, stopped = false, chain = Promise.resolve(), timer: ReturnType<typeof setTimeout> | undefined;
    const offered = new Set<string>(), subscriptions: { remove(): void }[] = [];
    const stop = (): void => {
      if (stopped) return;
      stopped = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      for (const subscription of subscriptions.splice(0)) subscription.remove();
    };
    const settle = (error?: unknown): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error === undefined) resolve(stop);
      else { stop(); reject(error); }
    };
    const abort = (): void => {
      if (signal) settle(abortReason(signal));
      stop();
    };
    const fail = (kind: string | undefined, error: unknown): void => {
      if (stopped) return;
      if (!settled && kind === primary) settle(error);
      else if (onError) { try { onError(error); } catch (thrown) { report(thrown); } }
      else report(error);
    };
    const offer = (value: unknown, kind: RegistrationKind): void => {
      if (stopped || (value === null && kind === "apnsVoip")) return;
      const found = registration(value, kind);
      if (!found) { fail(undefined, malformedRegistration()); return; }
      const key = keyOf(found);
      if (offered.has(key)) return;
      offered.add(key);
      chain = chain.then(async () => {
        if (stopped) return;
        try {
          await register(found);
          if (found.kind === primary) settle();
        } catch (error) {
          offered.delete(key);
          fail(found.kind, error);
        }
      });
    };
    const withdraw = (value: unknown): void => {
      if (stopped) return;
      const found = registration(value, primary);
      if (!found) { fail(undefined, malformedRegistration()); return; }
      // A registration FCM ended is new again if it comes back, even if a store of it is still pending.
      offered.delete(keyOf(found));
      if (!unregister) return;
      chain = chain.then(async () => {
        if (stopped) return;
        try {
          await unregister(found);
        } catch (error) {
          fail(undefined, error);
        }
      });
    };
    try {
      subscriptions.push(push.onPushRegistration(event => offer(event, primary)));
      subscriptions.push(push.onPushUnregistration(event => withdraw(event)));
      subscriptions.push(push.onPushRegistrationError(event => {
        const source = objectOf(event), message = source?.message;
        fail(source?.kind === "apnsVoip" ? "apnsVoip" : primary,
          new Error("Push registration failed" + (typeof message === "string" && message !== "" ? ": " + message : "")));
      }));
      if (calls) subscriptions.push(calls.onVoipToken(event => offer(event, "apnsVoip")));
    } catch (error) {
      settle(error);
      return;
    }
    signal?.addEventListener("abort", abort);
    timer = setTimeout(() => settle(new Error("Timed out waiting for the " + (primary === "apns" ? "APNs token" : "FCM registration"))),
      timeoutMs);
    push.getRegistrations().then(registrations => {
      if (!Array.isArray(registrations)) throw malformedRegistrations();
      for (const value of registrations) offer(value, primary);
    }).catch(error => fail(undefined, error));
    calls?.getVoipToken().then(value => offer(value, "apnsVoip"), error => fail("apnsVoip", error));
    push.register().catch(error => fail(primary, error));
  });
}

function response(event: unknown): NotificationResponse | undefined {
  const source = objectOf(event), action = source?.action, payload = source?.payload;
  if ((action !== "received" && action !== "opened") || typeof payload !== "string") return undefined;
  try {
    return Object.freeze({ action, notification: parsePushPayload(JSON.parse(payload)) });
  } catch {
    return undefined;
  }
}
const invalidNotification = (): TypeError => new TypeError("ConvoHopPush sent a notification that isn't a valid ConvoHop push");
/**
 * Calls `listener` for each ConvoHop push the app receives while running and each one the user opens. The native
 * modules present pushes and ring calls themselves; use this to update your UI or navigate.
 */
export function onNotification(listener: (response: NotificationResponse) => void): () => void {
  if (typeof listener !== "function") throw new TypeError("listener must be a function");
  const subscription = pushModule().onNotification((event: NotificationEvent) => {
    const found = response(event);
    if (!found) { report(invalidNotification()); return; }
    try { listener(found); } catch (error) { report(error); }
  });
  let removed = false;
  return () => {
    if (removed) return;
    removed = true;
    subscription.remove();
  };
}
/** The ConvoHop notification the user opened to launch the app. Resolves it once, then `null`. */
export async function takeInitialNotification(): Promise<NotificationResponse | null> {
  const event = await pushModule().takeInitialNotification();
  if (event === null || event === undefined) return null;
  const found = response(event);
  if (found?.action === "opened") return found;
  report(invalidNotification());
  return null;
}
function recipientField(source: Readonly<Record<string, unknown>>, field: keyof PushRecipient): string {
  const value = source[field];
  if (typeof value !== "string" || !UUID.test(value) || value === NIL_UUID) throw new TypeError(field + " must be a lowercase, non-nil UUID");
  return value;
}
/**
 * Sets the user whose ConvoHop pushes this device shows and rings, or `null` for nobody. Call it with the client's
 * `projectId` and `principalId` after sign-in, before `registerForPush`, and with `null` when sign-out starts. The
 * device keeps the two IDs, never a credential, so the filter also applies to a push that starts the app before
 * JavaScript runs.
 *
 * The native handlers drop every ConvoHop push for anyone else, and `onNotification` and `takeInitialNotification`
 * never see it. Until the first call, and after `null`, they drop every ConvoHop push, so a registration your backend
 * failed to delete reaches nobody. iOS still reports a dropped VoIP push to CallKit, which ends it at once. On iOS, a
 * message push that arrives while the app isn't in the foreground is shown by iOS itself: see the README.
 */
export async function setPushRecipient(recipient: PushRecipient | null): Promise<void> {
  if (recipient === null) {
    await pushModule().setRecipient(null);
    return;
  }
  const source = objectOf(recipient);
  if (!source) throw new TypeError("recipient must be an object or null");
  const stored = { projectId: recipientField(source, "projectId"), recipientId: recipientField(source, "recipientId") };
  await pushModule().setRecipient(stored);
}
/**
 * Android: unregisters this device from FCM, for example when the user signs out. In your app's FCM mode it deletes
 * the registration token or unregisters the FID, so pushes to it stop, and resolves the registration this process
 * knew, or `null`: delete it from your backend. Stop `registerForPush` first; while it runs, its `unregister` callback
 * gets the registration too. With FCM auto-init on, Firebase registers the device again when the app next starts.
 *
 * iOS rejects: Apple advises against unregistering from APNs, and an app's APNs and PushKit tokens don't change
 * between users. Delete them from your backend instead.
 */
export async function unregisterFromPush(): Promise<NativePushRegistration | null> {
  if (Platform.OS !== "android") throw new Error("unregisterFromPush is only available on Android");
  const removed: unknown = await pushModule().unregister();
  if (removed === null || removed === undefined) return null;
  const found = registration(removed, "fcm");
  if (!found) throw new TypeError("ConvoHopPush returned a malformed registration");
  return found;
}
/**
 * Android: hands an FCM data message to the native ConvoHop handler, which shows message notifications and rings
 * calls. Use it when another library, such as React Native Firebase, owns your `FirebaseMessagingService`. Without
 * one, the ConvoHop service receives pushes itself and you don't need this.
 */
export async function handleRemoteMessage(data: Readonly<Record<string, string>>): Promise<RemoteMessageResult> {
  if (Platform.OS !== "android") throw new Error("handleRemoteMessage is only available on Android");
  const source = objectOf(data);
  if (!source || Object.values(source).some(value => typeof value !== "string")) throw new TypeError("data must be an object of strings");
  const result: unknown = await pushModule().handleRemoteMessage(JSON.stringify(source));
  if (typeof result !== "string" || !results.has(result)) throw new TypeError("ConvoHopPush returned an unknown result");
  return result as RemoteMessageResult;
}
