import type { CodegenTypes, TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

// Codegen before React Native 0.80 recognizes an event emitter only by the bare name `EventEmitter`.
type EventEmitter<T> = CodegenTypes.EventEmitter<T>;

export type PushRegistrationEvent = {
  /** `apns` (iOS) or `fcm` (Android). */
  kind: string;
  /** APNs: the device token as lowercase hex. FCM: the registration token, unless the app registers by FID. */
  token?: string;
  /** FCM registered by FID only: the Firebase installation ID. A registration has a `token` or an `fid`, never both. */
  fid?: string;
  /** APNs only: `development` or `production`, when the app knows its entitlement. */
  environment?: string;
};

export type PushRegistrationErrorEvent = {
  kind: string;
  message: string;
};

export type NotificationEvent = {
  /** `received` while the app runs, or `opened` when the user opened the notification. */
  action: string;
  /** The push's ConvoHop payload as JSON text: `{"convohop": …}` from the APNs `userInfo`, or the FCM data map. */
  payload: string;
};

export type PermissionRequest = {
  alert: boolean;
  badge: boolean;
  sound: boolean;
  provisional: boolean;
};

/** The user whose pushes the device accepts: lowercase UUIDs. */
export type Recipient = {
  projectId: string;
  recipientId: string;
};

export interface Spec extends TurboModule {
  readonly onPushRegistration: EventEmitter<PushRegistrationEvent>;
  readonly onPushRegistrationError: EventEmitter<PushRegistrationErrorEvent>;
  /**
   * Android: FCM unregistered a registration, through `unregister()` or Firebase's `onUnregistered`, so pushes to it
   * stop. The same report can repeat. iOS never emits it.
   */
  readonly onPushUnregistration: EventEmitter<PushRegistrationEvent>;
  readonly onNotification: EventEmitter<NotificationEvent>;
  /** `granted`, `provisional`, `denied` or `undetermined`. */
  getPermissionStatus(): Promise<string>;
  requestPermission(request: PermissionRequest): Promise<string>;
  /**
   * Starts APNs registration (iOS) or FCM registration (Android). Android follows the app's FCM mode: when the app
   * manifest sets `firebase_messaging_installation_id_enabled`, it calls `FirebaseMessaging.register()` and reports
   * the FID; otherwise it reports the registration token from `getToken()` and `onNewToken`. Registrations arrive
   * through `onPushRegistration`. It rejects when the platform can't register, for example offline, or when the
   * app's firebase-messaging is too old for its FCM mode.
   */
  register(): Promise<void>;
  /**
   * Android: unregisters this device from FCM in the app's FCM mode: deletes the registration token, or unregisters
   * the FID. Then it reports the registration this process knew through `onPushUnregistration` and resolves it, or
   * `null` if it knew none. It rejects as `register()` does. iOS rejects.
   */
  unregister(): Promise<PushRegistrationEvent | null>;
  /**
   * Stores, on the device, the user whose ConvoHop pushes it accepts, or `null` for none, which is also the state
   * before the first call. The native handlers drop every other ConvoHop push, including one that starts the app before
   * JavaScript runs, and emit nothing for it. iOS still reports a dropped VoIP push to CallKit and ends it at once.
   * It stores the two IDs and no credential. Resolves once they are stored.
   *
   * `recipient` is a {@link Recipient} or `null`. It's typed `Object` because Codegen's iOS bindings pass a typed
   * object as a C++ reference, which can't be `null`.
   */
  setRecipient(recipient: Object | null): Promise<void>;
  /** The latest registration of each kind this process has seen, unless it was unregistered since. */
  getRegistrations(): Promise<ReadonlyArray<PushRegistrationEvent>>;
  /** The notification the user opened to launch the app, once. */
  takeInitialNotification(): Promise<NotificationEvent | null>;
  /** Android: hands an FCM data map (as JSON) to the ConvoHop handler. Resolves its result. iOS rejects. */
  handleRemoteMessage(dataJson: string): Promise<string>;
}

export default TurboModuleRegistry.get<Spec>("ConvoHopPush");
