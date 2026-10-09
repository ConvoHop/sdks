// Import order matters: @livekit/react-native installs the DOMException polyfill that livekit-client needs when it is
// evaluated, so it comes first.
import { registerGlobals } from "@livekit/react-native";
import { RTCAudioSession } from "@livekit/react-native-webrtc";
import { ConnectionState, Room, RoomEvent } from "livekit-client";
import { parseId, type LiveConnection, type LiveConnector } from "@convohop/client";
import { Platform } from "react-native";
import { callsModule, report } from "./native.js";
import { installCrypto } from "./random.js";

export interface MediaSetupOptions {
  /**
   * iOS: CallKit owns the audio session. Set it when calls go through CallKit, as incoming calls rung by
   * `@convohop/react-native` do: LiveKit then leaves the session to CallKit, and the SDK tells WebRTC each time CallKit
   * activates or deactivates it. Start every call with CallKit, including outgoing calls with `startOutgoingCall`,
   * or it has no audio. Ignored on Android. Default `false`.
   */
  callKit?: boolean;
}
export interface RoomConnectorOptions {
  /** `relay` sends media only through TURN. Default `all`. */
  iceTransportPolicy?: "all" | "relay";
  /** LiveKit lost the connection and is resuming it with the current or a server-refreshed token. */
  onResuming?: () => void;
  /** LiveKit resumed the same connection. */
  onResumed?: () => void;
  /**
   * The connection ended without `disconnect()`: the network failed past resuming, the server removed this
   * participant, or LiveKit reconnected as a new participant, which this participation's admission doesn't cover.
   * Connect again with `participation.connectWith`, which obtains fresh credentials.
   */
  onDisconnected?: () => void;
}
/** A room connection admitted for one participation. */
export interface RoomConnection extends LiveConnection {
  readonly room: Room;
  /** The participation's `nativeConnectionId`: the participant SID the media server assigned at admission. */
  readonly nativeConnectionId: string;
  /** LiveKit is resuming this connection after a network interruption. */
  readonly resuming: boolean;
}

let configured: { callKit: boolean } | undefined;
/**
 * Prepares LiveKit's React Native SDK. Call it once at the top of `index.js`, before anything uses LiveKit. It
 * installs a secure `crypto.getRandomValues` and `crypto.randomUUID` where the runtime lacks them, then LiveKit's
 * globals.
 */
export function setupMedia(options: MediaSetupOptions = {}): void {
  if (typeof options !== "object" || options === null) throw new TypeError("options must be an object");
  const callKit = options.callKit === undefined ? false : options.callKit;
  if (typeof callKit !== "boolean") throw new TypeError("callKit must be a boolean");
  if (configured) {
    if (configured.callKit !== callKit) throw new Error("setupMedia was already called with callKit: " + configured.callKit);
    return;
  }
  // On iOS with CallKit, CallKit owns the audio session. Elsewhere LiveKit configures it.
  const calls = callKit && Platform.OS === "ios" ? callsModule() : undefined;
  installCrypto();
  registerGlobals({ autoConfigureAudioSession: calls === undefined });
  configured = { callKit };
  if (calls) forwardCallKitAudio(calls);
}

// What WebRTC's shared audio session was last told. WebRTC counts activations, so each change is forwarded once.
let told = false;
function forwardCallKitAudio(calls: ReturnType<typeof callsModule>): void {
  let known = false;
  const apply = (active: boolean): void => {
    known = true;
    if (active === told) return;
    try {
      if (active) RTCAudioSession.audioSessionDidActivate();
      else RTCAudioSession.audioSessionDidDeactivate();
      told = active;
    } catch (error) {
      report(error);
    }
  };
  calls.onAudioSession(event => {
    if (typeof event?.active !== "boolean") report(new TypeError("ConvoHopCalls sent a malformed audio session event"));
    else apply(event.active);
  });
  // CallKit may have activated the session before JavaScript ran, such as for a call answered on the lock screen.
  calls.isAudioSessionActive().then(active => {
    if (known) return;
    if (typeof active !== "boolean") throw new TypeError("ConvoHopCalls returned a malformed audio session state");
    apply(active);
  }).catch(report);
}

/**
 * A LiveKit room with ConvoHop's media policy, the same as the Web SDK's: one peer connection per direction, no
 * simulcast, adaptive stream or dynacast, and VP8 video at up to 320x240, 15 frames per second and 350 kbit/s.
 */
export function createRoom(): Room {
  if (!configured) throw new Error("Call setupMedia() in index.js before creating a room");
  return new Room({
    adaptiveStream: false, dynacast: false, singlePeerConnection: false,
    videoCaptureDefaults: { resolution: { width: 320, height: 240, frameRate: 15 } },
    publishDefaults: { simulcast: false, videoCodec: "vp8", videoEncoding: { maxBitrate: 350000, maxFramerate: 15 } },
  });
}

type Callback = (() => void) | undefined;
function callback(value: unknown, name: string): Callback {
  if (value !== undefined && typeof value !== "function") throw new TypeError(name + " must be a function");
  return value as Callback;
}
function call(listener: Callback): void {
  if (!listener) return;
  try { listener(); } catch (error) { report(error); }
}
function requireDisconnected(room: Room): void {
  if (room.state !== ConnectionState.Disconnected) throw new Error("The room is already connected or connecting");
}
// The connection that currently owns each room. A replaced connection never disconnects its successor.
const owners = new WeakMap<Room, Connection>();
class Connection implements RoomConnection {
  readonly room: Room;
  #sid: string | undefined;
  #closed = false;
  #resuming = false;
  readonly #detach: () => void;
  constructor(room: Room, options: { onResuming: Callback; onResumed: Callback; onDisconnected: Callback }) {
    this.room = room;
    // Events before the connection opens belong to the attempt, which fails if the room disconnects.
    const disconnected = (): void => {
      if (this.#closed) return;
      const opened = this.#sid !== undefined;
      this.#close();
      if (opened) call(options.onDisconnected);
    };
    const reconnecting = (): void => {
      if (this.#closed || this.#sid === undefined) return;
      this.#resuming = true;
      call(options.onResuming);
    };
    const reconnected = (): void => {
      if (this.#closed || this.#sid === undefined) return;
      // A resume keeps the admitted connection. Any other identity was not admitted with this participation's grant.
      if (room.localParticipant.sid !== this.#sid) {
        this.disconnect().catch(report).finally(() => call(options.onDisconnected));
        return;
      }
      this.#resuming = false;
      call(options.onResumed);
    };
    room.on(RoomEvent.Disconnected, disconnected).on(RoomEvent.Reconnecting, reconnecting).on(RoomEvent.Reconnected, reconnected);
    this.#detach = () => {
      room.off(RoomEvent.Disconnected, disconnected).off(RoomEvent.Reconnecting, reconnecting).off(RoomEvent.Reconnected, reconnected);
    };
  }
  get nativeConnectionId(): string {
    if (this.#sid === undefined) throw new Error("The room isn't connected yet");
    return this.#sid;
  }
  get connected(): boolean { return !this.#closed && this.#sid !== undefined; }
  get resuming(): boolean { return this.#resuming; }
  opened(sid: string): void { this.#sid = sid; }
  #close(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#resuming = false;
    this.#detach();
  }
  async disconnect(): Promise<void> {
    const owner = owners.get(this.room) === this;
    this.#close();
    if (owner) {
      owners.delete(this.room);
      await this.room.disconnect(true);
    }
  }
}

/**
 * A connector for `participation.connectWith` that connects `room` once with each admitted attempt's single-use token,
 * the way the Web SDK connects. Pass a disconnected room, such as one from {@link createRoom}, and reuse it to connect
 * again. Connecting doesn't capture the microphone or camera: publish them with `room.localParticipant` after it
 * resolves. The media server enforces what the participation may publish.
 */
export function createRoomConnector(room: Room, options: RoomConnectorOptions = {}): LiveConnector<RoomConnection> {
  if (typeof room !== "object" || room === null || typeof room.connect !== "function" || typeof room.on !== "function")
    throw new TypeError("room must be a livekit-client Room");
  if (typeof options !== "object" || options === null) throw new TypeError("options must be an object");
  const iceTransportPolicy = options.iceTransportPolicy === undefined ? "all" : options.iceTransportPolicy;
  if (iceTransportPolicy !== "all" && iceTransportPolicy !== "relay") throw new TypeError("ICE policy must be all or relay");
  const callbacks = { onResuming: callback(options.onResuming, "onResuming"), onResumed: callback(options.onResumed, "onResumed"),
    onDisconnected: callback(options.onDisconnected, "onDisconnected") };
  // connectWith reports a connector's errors only as MEDIA_CONNECT_FAILED, after using the attempt, so check now too.
  requireDisconnected(room);
  return async attempt => {
    // LiveKit's connect would return the room's current connection without using the token.
    requireDisconnected(room);
    const connection = new Connection(room, callbacks);
    owners.set(room, connection);
    try {
      // One attempt: the token admits at most one new connection. LiveKit may later resume this connection.
      await room.connect(attempt.url, attempt.token, { autoSubscribe: true, maxRetries: 0, rtcConfig: { iceTransportPolicy } });
      connection.opened(parseId(room.localParticipant.sid));
      if (!connection.connected) throw new Error("The room disconnected while connecting");
    } catch (error) {
      await connection.disconnect().catch(() => {});
      throw error;
    }
    return connection;
  };
}
