import type { CodegenTypes, TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

// Codegen before React Native 0.80 recognizes an event emitter only by the bare name `EventEmitter`.
type EventEmitter<T> = CodegenTypes.EventEmitter<T>;

export type CallSnapshot = {
  /** Lowercase UUID: the CallKit UUID on iOS, the ring's `alertId` on Android. */
  id: string;
  alertId?: string;
  liveSessionId: string;
  conversationId?: string;
  outgoing: boolean;
  hasVideo: boolean;
  mediaProfile?: string;
  callerName?: string;
  /** When an unanswered ring stops, in milliseconds since the epoch. */
  expiresAtMs?: number;
  /** `ringing`, `connecting`, `active`, `held` or `ended`. */
  state: string;
  muted: boolean;
  /** Set once `state` is `ended`. */
  endReason?: string;
  /** The server's cancellation reason, when the server stopped the ring. */
  serverReason?: string;
  audioRoute?: string;
  availableAudioRoutes: ReadonlyArray<string>;
};

export type CallEvent = {
  /** `incoming`, `outgoing`, `answered`, `ended` or `changed`. */
  type: string;
  call: CallSnapshot;
};

export type VoipTokenEvent = {
  /** `apnsVoip`. */
  kind: string;
  token: string;
  environment?: string;
};

export type AudioSessionEvent = {
  active: boolean;
};

export type OutgoingCallRequest = {
  liveSessionId: string;
  conversationId: string;
  handle: string;
  displayName?: string;
  hasVideo: boolean;
};

export type CallUpdate = {
  callerName?: string;
  hasVideo?: boolean;
};

export interface Spec extends TurboModule {
  readonly onCallEvent: EventEmitter<CallEvent>;
  readonly onVoipToken: EventEmitter<VoipTokenEvent>;
  /** iOS: CallKit activated or deactivated the audio session. */
  readonly onAudioSession: EventEmitter<AudioSessionEvent>;
  /** Current calls, and ended calls the platform still remembers. */
  getCalls(): Promise<ReadonlyArray<CallSnapshot>>;
  /** Drops an ended call from `getCalls()`. Resolves `false` for a call that hasn't ended. */
  forgetCall(id: string): Promise<boolean>;
  /** iOS: reports an outgoing call to CallKit and resolves its id. Android rejects. */
  startOutgoingCall(request: OutgoingCallRequest): Promise<string>;
  answerCall(id: string): Promise<void>;
  /** Declines a ringing call; ends any other. */
  endCall(id: string): Promise<void>;
  /**
   * Stops a ring the server cancelled, with the server's reason, such as `answered`. Resolves without changing a call
   * that isn't ringing, such as one answered on this device, which also receives the `answered` cancellation push.
   */
  stopRinging(id: string, serverReason: string): Promise<void>;
  reportConnecting(id: string): Promise<void>;
  reportConnected(id: string): Promise<void>;
  updateCall(id: string, update: CallUpdate): Promise<void>;
  setMuted(id: string, muted: boolean): Promise<void>;
  setHeld(id: string, held: boolean): Promise<void>;
  /** Android: routes call audio. iOS rejects; use the system route picker. */
  setAudioRoute(id: string, route: string): Promise<void>;
  /** Android 14+: whether incoming calls may show full screen. iOS resolves `true`. */
  canUseFullScreenIntent(): Promise<boolean>;
  /** Android 14+: opens the setting that allows full-screen calls. iOS rejects. */
  openFullScreenIntentSettings(): Promise<void>;
  /** iOS: the latest PushKit token. Android resolves `null`. */
  getVoipToken(): Promise<VoipTokenEvent | null>;
  /**
   * iOS: whether CallKit has activated the audio session and not deactivated it since, so a listener that attaches
   * late doesn't miss an activation. Android resolves `false`.
   */
  isAudioSessionActive(): Promise<boolean>;
}

export default TurboModuleRegistry.get<Spec>("ConvoHopCalls");
