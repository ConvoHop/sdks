import { Platform } from "react-native";
import { callsModule, report } from "./native.js";

/**
 * - `ringing`: an incoming call is ringing.
 * - `connecting`: the user answered, or started an outgoing call, and the app is joining its media.
 * - `active`: the app reported the call connected.
 * - `held`: the system or the user put the call on hold.
 * - `ended`: see {@link Call.endReason}.
 */
export type CallState = "ringing" | "connecting" | "active" | "held" | "ended";
/**
 * Why a call ended:
 * - `rejected`: the user declined it here.
 * - `hungUp`: the user or the app ended it here.
 * - `answeredElsewhere`, `declinedElsewhere`: another of the user's devices handled the ring.
 * - `missed`: the caller stopped calling before anyone answered.
 * - `expired`: the ring timed out.
 * - `stopped`: the server stopped the ring for another reason; see {@link Call.serverReason}.
 * - `failed`: the system couldn't place or keep the call.
 */
export type CallEndReason = "rejected" | "hungUp" | "answeredElsewhere" | "declinedElsewhere" | "missed" | "expired" | "stopped" | "failed";
export type AudioRoute = "earpiece" | "speaker" | "bluetooth" | "wiredHeadset" | "streaming" | "unknown";
/** `answered` means the user answered a ringing call in the system UI or with {@link answerCall}. */
export type CallEventType = "incoming" | "outgoing" | "answered" | "ended" | "changed";
/** A call the system knows about: CallKit on iOS, Telecom on Android. */
export interface Call {
  /** The CallKit call UUID on iOS, the ring's `alertId` on Android. */
  readonly id: string;
  /** The ring that started an incoming call. */
  readonly alertId?: string;
  readonly liveSessionId: string;
  readonly conversationId?: string;
  readonly outgoing: boolean;
  readonly hasVideo: boolean;
  /** `AUDIO_ONLY`, `AUDIO_VIDEO` or a later profile. */
  readonly mediaProfile?: string;
  readonly callerName?: string;
  /** When an unanswered ring stops, in milliseconds since the epoch. */
  readonly expiresAt?: number;
  readonly state: CallState;
  readonly muted: boolean;
  /** Set once `state` is `ended`. */
  readonly endReason?: CallEndReason;
  /** The server's reason for stopping the ring, such as `answered`, when the server stopped it. */
  readonly serverReason?: string;
  /** Android: the current audio route. */
  readonly audioRoute?: AudioRoute;
  /** Android: the routes {@link setAudioRoute} accepts. */
  readonly availableAudioRoutes: readonly AudioRoute[];
}
export interface CallEvent {
  readonly type: CallEventType;
  readonly call: Call;
}
export interface OutgoingCallRequest {
  liveSessionId: string;
  conversationId: string;
  /** What the system shows and puts in its call history to identify the other side, such as a user name. */
  handle: string;
  displayName?: string;
  hasVideo?: boolean;
}
export interface CallUpdate {
  callerName?: string;
  hasVideo?: boolean;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, NIL_UUID = "00000000-0000-0000-0000-000000000000";
const IDENTIFIER = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const states = new Set<string>(["ringing", "connecting", "active", "held", "ended"]);
const reasons = new Set<string>(["rejected", "hungUp", "answeredElsewhere", "declinedElsewhere", "missed", "expired", "stopped", "failed"]);
const settableRoutes = new Set<string>(["earpiece", "speaker", "bluetooth", "wiredHeadset", "streaming"]);
const routes = new Set<string>([...settableRoutes, "unknown"]);
const types = new Set<string>(["incoming", "outgoing", "answered", "ended", "changed"]);

const isId = (value: unknown): value is string => typeof value === "string" && UUID.test(value) && value !== NIL_UUID;
function id(value: unknown, name = "id"): string {
  if (!isId(value)) throw new TypeError(name + " must be a lowercase, non-nil UUID");
  return value;
}
function text(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim() === "" || value.length > 1024) throw new TypeError(name + " must be a non-empty string of at most 1024 characters");
  return value;
}
function bool(value: unknown, name: string): boolean {
  if (typeof value !== "boolean") throw new TypeError(name + " must be a boolean");
  return value;
}
const malformed = (what: string): TypeError => new TypeError("ConvoHopCalls " + what);

/** Validates a native call snapshot. Returns `undefined` for anything that isn't one. */
function call(value: unknown): Call | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const source = value as Readonly<Record<string, unknown>>, optional = (name: string): unknown => source[name] ?? undefined;
  const { state, outgoing, hasVideo, muted } = source, routeList = source.availableAudioRoutes;
  const alertId = optional("alertId"), conversationId = optional("conversationId"), mediaProfile = optional("mediaProfile");
  const callerName = optional("callerName"), expiresAt = optional("expiresAtMs"), endReason = optional("endReason");
  const serverReason = optional("serverReason"), audioRoute = optional("audioRoute");
  if (!isId(source.id) || !isId(source.liveSessionId) || typeof state !== "string" || !states.has(state) ||
      typeof outgoing !== "boolean" || typeof hasVideo !== "boolean" || typeof muted !== "boolean" ||
      !Array.isArray(routeList) || !routeList.every(route => typeof route === "string" && routes.has(route)) ||
      (alertId !== undefined && !isId(alertId)) || (conversationId !== undefined && !isId(conversationId)) ||
      (mediaProfile !== undefined && (typeof mediaProfile !== "string" || !IDENTIFIER.test(mediaProfile))) ||
      (callerName !== undefined && typeof callerName !== "string") ||
      (expiresAt !== undefined && (typeof expiresAt !== "number" || !Number.isSafeInteger(expiresAt) || expiresAt < 0)) ||
      (state === "ended") !== (endReason !== undefined) ||
      (endReason !== undefined && (typeof endReason !== "string" || !reasons.has(endReason))) ||
      (serverReason !== undefined && (typeof serverReason !== "string" || !IDENTIFIER.test(serverReason))) ||
      (audioRoute !== undefined && (typeof audioRoute !== "string" || !routes.has(audioRoute)))) return undefined;
  return Object.freeze({
    id: source.id, ...(alertId === undefined ? {} : { alertId }), liveSessionId: source.liveSessionId,
    ...(conversationId === undefined ? {} : { conversationId }), outgoing, hasVideo,
    ...(mediaProfile === undefined ? {} : { mediaProfile }), ...(callerName === undefined ? {} : { callerName }),
    ...(expiresAt === undefined ? {} : { expiresAt }), state: state as CallState, muted,
    ...(endReason === undefined ? {} : { endReason: endReason as CallEndReason }),
    ...(serverReason === undefined ? {} : { serverReason }),
    ...(audioRoute === undefined ? {} : { audioRoute: audioRoute as AudioRoute }),
    availableAudioRoutes: Object.freeze([...routeList as AudioRoute[]]),
  } as Call);
}
function event(value: unknown): CallEvent | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const { type, call: snapshot } = value as Readonly<Record<string, unknown>>, found = call(snapshot);
  return typeof type === "string" && types.has(type) && found ? Object.freeze({ type: type as CallEventType, call: found }) : undefined;
}

/** The current calls, and ended calls the system still remembers, for up to a minute or until {@link forgetCall}. */
export async function getCalls(): Promise<Call[]> {
  const snapshots: unknown = await callsModule().getCalls();
  if (!Array.isArray(snapshots)) throw malformed("returned malformed calls");
  const calls = snapshots.map(call);
  if (calls.includes(undefined)) throw malformed("returned malformed calls");
  return calls as Call[];
}
/** Calls `listener` for each change to a call. Returns a function that stops listening. */
export function onCallEvent(listener: (event: CallEvent) => void): () => void {
  if (typeof listener !== "function") throw new TypeError("listener must be a function");
  const subscription = callsModule().onCallEvent(value => {
    const found = event(value);
    if (!found) { report(malformed("sent a malformed call event")); return; }
    try { listener(found); } catch (error) { report(error); }
  });
  let removed = false;
  return () => {
    if (removed) return;
    removed = true;
    subscription.remove();
  };
}
/**
 * Calls `listener` once for each incoming call the user answered: in the system UI, from a notification, or with
 * {@link answerCall}. It first replays answered calls that are still current, so a call answered on the lock screen
 * before JavaScript started isn't lost. Join each call's live session from the listener, and skip calls you already
 * joined. Returns a function that stops listening.
 */
export function subscribeAnsweredCalls(listener: (call: Call) => void): () => void {
  if (typeof listener !== "function") throw new TypeError("listener must be a function");
  const delivered = new Set<string>();
  let stopped = false;
  const deliver = (found: Call): void => {
    if (stopped || found.outgoing || delivered.has(found.id)) return;
    delivered.add(found.id);
    try { listener(found); } catch (error) { report(error); }
  };
  const unsubscribe = onCallEvent(({ type, call: found }) => { if (type === "answered") deliver(found); });
  getCalls().then(calls => {
    for (const found of calls) if (found.state === "connecting" || found.state === "active" || found.state === "held") deliver(found);
  }).catch(report);
  return () => {
    stopped = true;
    unsubscribe();
  };
}
/** Drops an ended call from {@link getCalls}. Resolves `false` for a call that hasn't ended. */
export async function forgetCall(callId: string): Promise<boolean> {
  const forgotten: unknown = await callsModule().forgetCall(id(callId));
  if (typeof forgotten !== "boolean") throw malformed("returned a malformed result");
  return forgotten;
}
/**
 * iOS: reports an outgoing call to CallKit, which then owns its audio session, and resolves the call's ID. Then join
 * the live session and report progress with {@link reportConnecting} and {@link reportConnected}. On Android, join
 * without the system call UI.
 */
export async function startOutgoingCall(request: OutgoingCallRequest): Promise<string> {
  if (Platform.OS !== "ios") throw new Error("startOutgoingCall is only available on iOS");
  if (typeof request !== "object" || request === null) throw new TypeError("request must be an object");
  const { liveSessionId, conversationId, handle, displayName, hasVideo = false } = request;
  const callId: unknown = await callsModule().startOutgoingCall({
    liveSessionId: id(liveSessionId, "liveSessionId"), conversationId: id(conversationId, "conversationId"),
    handle: text(handle, "handle"), ...(displayName === undefined ? {} : { displayName: text(displayName, "displayName") }),
    hasVideo: bool(hasVideo, "hasVideo"),
  });
  if (!isId(callId)) throw malformed("returned a malformed call ID");
  return callId;
}
/** Answers a ringing call, as if the user answered it in the system UI. Its `answered` event follows. */
export async function answerCall(callId: string): Promise<void> {
  await callsModule().answerCall(id(callId));
}
/** Declines a ringing call, or hangs up any other. Leave the live session too, if you joined it. */
export async function endCall(callId: string): Promise<void> {
  await callsModule().endCall(id(callId));
}
/**
 * Stops a ring the server stopped, such as one answered on another device, when your app learns of it before the
 * cancellation push arrives. `serverReason` is the server's reason, such as `answered`, `declined` or `ended`. It
 * leaves a call that isn't ringing unchanged, such as one the user just answered on this device.
 */
export async function stopRinging(callId: string, serverReason: string): Promise<void> {
  if (typeof serverReason !== "string" || !IDENTIFIER.test(serverReason))
    throw new TypeError("serverReason must be an ASCII letter followed by up to 63 ASCII letters, digits or _");
  await callsModule().stopRinging(id(callId), serverReason);
}
/** Tells the system the app is joining the call's media. */
export async function reportConnecting(callId: string): Promise<void> {
  await callsModule().reportConnecting(id(callId));
}
/** Tells the system the call's media connected. The call becomes `active`. */
export async function reportConnected(callId: string): Promise<void> {
  await callsModule().reportConnected(id(callId));
}
/** Updates what the system shows for a call. */
export async function updateCall(callId: string, update: CallUpdate): Promise<void> {
  if (typeof update !== "object" || update === null) throw new TypeError("update must be an object");
  const { callerName, hasVideo } = update;
  await callsModule().updateCall(id(callId), {
    ...(callerName === undefined ? {} : { callerName: text(callerName, "callerName") }),
    ...(hasVideo === undefined ? {} : { hasVideo: bool(hasVideo, "hasVideo") }),
  });
}
/** Mutes or unmutes the call in the system UI. Mute your LiveKit microphone track from its `changed` event. */
export async function setMuted(callId: string, muted: boolean): Promise<void> {
  await callsModule().setMuted(id(callId), bool(muted, "muted"));
}
export async function setHeld(callId: string, held: boolean): Promise<void> {
  await callsModule().setHeld(id(callId), bool(held, "held"));
}
/** Android: routes the call's audio to one of its `availableAudioRoutes`. On iOS, show the system route picker. */
export async function setAudioRoute(callId: string, route: Exclude<AudioRoute, "unknown">): Promise<void> {
  if (Platform.OS !== "android") throw new Error("setAudioRoute is only available on Android");
  if (typeof route !== "string" || !settableRoutes.has(route)) throw new TypeError("route must be a known audio route");
  await callsModule().setAudioRoute(id(callId), route);
}
/**
 * Whether incoming calls can ring full screen over the lock screen. Android 14 and later grant this only to calling
 * and alarm apps, and users can revoke it; without it, a call rings as a heads-up notification. iOS resolves `true`.
 */
export async function canUseFullScreenIntent(): Promise<boolean> {
  const allowed: unknown = await callsModule().canUseFullScreenIntent();
  if (typeof allowed !== "boolean") throw malformed("returned a malformed result");
  return allowed;
}
/** Android 14 and later: opens the setting that lets this app ring full screen. */
export async function openFullScreenIntentSettings(): Promise<void> {
  if (Platform.OS !== "android") throw new Error("openFullScreenIntentSettings is only available on Android");
  await callsModule().openFullScreenIntentSettings();
}
