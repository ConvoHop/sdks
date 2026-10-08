import type { RemoteTrack, Room } from "livekit-client";
import { parseId, parseObject, parseString } from "@convohop/core";
import { admitConnection } from "./admission.js";
import type { LiveParticipationHandle, LiveConnectOptions, LiveConnectionAttempt } from "./live.js";

type LiveKit = typeof import("livekit-client");
let livekit: Promise<LiveKit> | undefined;
/**
 * Loads `livekit-client` on first use. Evaluating it needs browser globals, such as `DOMException`, that other
 * runtimes lack, so importing this SDK must not evaluate it.
 */
function loadLiveKit(): Promise<LiveKit> {
  return livekit ??= import("livekit-client").catch((error: unknown) => { livekit = undefined; throw error; });
}
export interface RemoteMedia {
  trackId: string; participantIdentity: string; kind: "audio" | "video"; element: HTMLMediaElement;
}
export interface MediaOptions {
  iceTransportPolicy?: "all" | "relay";
  localVideo?: HTMLVideoElement;
  onTrack?: (track: RemoteMedia) => void;
  onTrackRemoved?: (track: RemoteMedia) => void;
  /** The media connection ended without `disconnect()`. Call `reconnect()` to connect again with fresh credentials. */
  onDisconnected?: () => void;
  /** LiveKit lost the connection and is resuming it with the current or a server-refreshed token. */
  onResuming?: () => void;
  /** LiveKit resumed the same native connection. */
  onResumed?: () => void;
  onAudioPlaybackBlocked?: () => void;
}
export interface MediaStats {
  audioTracks: number; videoTracks: number; audioBytesReceived: number;
  videoBytesReceived: number; framesDecoded: number; localAudioEnabled: boolean; localVideoEnabled: boolean;
  tracks: { trackId: string; participantIdentity: string; kind: "audio" | "video"; bytesReceived: number; framesDecoded: number }[];
  transports?: { localCandidateType: string; remoteCandidateType: string; protocol: string; relayProtocol?: string }[];
}
export class MediaConnection {
  readonly #kit: LiveKit;
  readonly #room: Room;
  readonly #tracks = new Map<string, { remote: RemoteMedia; track: RemoteTrack }>();
  #closed = false;
  #left = false;
  #resuming = false;
  #reconnecting: Promise<MediaConnection> | undefined;
  readonly #permissions: { microphone: boolean; camera: boolean };
  readonly options: MediaOptions;
  /** The participation's `nativeConnectionId`: the LiveKit participant sid the media server assigned at admission. */
  nativeConnectionId: string | undefined;
  private constructor(readonly participation: LiveParticipationHandle, options: LiveConnectOptions, kit: LiveKit) {
    const { requestId: _requestId, ...mediaOptions } = options;
    const { Room, RoomEvent, Track } = this.#kit = kit;
    this.options = mediaOptions;
    this.#permissions = { ...participation.snapshot.permissions };
    this.#room = new Room({
      adaptiveStream: false, dynacast: false, singlePeerConnection: false,
      videoCaptureDefaults: { resolution: { width: 320, height: 240, frameRate: 15 } },
      publishDefaults: { simulcast: false, videoCodec: "vp8", videoEncoding: { maxBitrate: 350000, maxFramerate: 15 } },
    });
    this.#room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (track.kind !== Track.Kind.Audio && track.kind !== Track.Kind.Video) return;
      const element = track.attach();
      element.autoplay = true;
      if (element instanceof HTMLVideoElement) element.playsInline = true;
      element.setAttribute("data-remote-kind", track.kind);
      element.setAttribute("data-participant-identity", participant.identity);
      const remote: RemoteMedia = { trackId: publication.trackSid, participantIdentity: participant.identity, kind: track.kind, element };
      this.#tracks.set(publication.trackSid, { remote, track }); options.onTrack?.(remote);
    });
    this.#room.on(RoomEvent.TrackUnsubscribed, (track, publication) => {
      const entry = this.#tracks.get(publication.trackSid);
      track.detach().forEach(element => element.remove());
      this.#tracks.delete(publication.trackSid);
      if (entry) {
        entry.remote.element.pause(); entry.remote.element.srcObject = null; entry.remote.element.remove();
        options.onTrackRemoved?.(entry.remote);
      }
    });
    this.#room.on(RoomEvent.Disconnected, () => {
      this.#resuming = false;
      if (!this.#closed) { this.#closed = true; this.#cleanup(); options.onDisconnected?.(); }
    });
    this.#room.on(RoomEvent.Reconnecting, () => {
      if (this.#closed) return;
      this.#resuming = true; options.onResuming?.();
    });
    this.#room.on(RoomEvent.Reconnected, () => {
      this.#resuming = false;
      if (this.#closed) return;
      // A resume keeps the admitted connection. Any other identity was not admitted with this participation's grant.
      if (this.#room.localParticipant.sid !== this.nativeConnectionId) {
        void this.#close(false).catch(() => {}).finally(() => options.onDisconnected?.());
        return;
      }
      options.onResumed?.();
    });
    this.#room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
      if (!this.#room.canPlaybackAudio) options.onAudioPlaybackBlocked?.();
    });
  }
  /** @internal Connect never starts capture. The room exists only once the attempt is admitted and marked. */
  static async connectParticipation(participation: LiveParticipationHandle, options: LiveConnectOptions): Promise<MediaConnection> {
    if (options.iceTransportPolicy !== undefined && options.iceTransportPolicy !== "all" && options.iceTransportPolicy !== "relay")
      throw new TypeError("ICE policy must be all or relay");
    const kit = await loadLiveKit();
    return admitConnection(participation, options, async attempt => {
      const result = new MediaConnection(participation, options, kit);
      await result.#open(attempt);
      return result;
    }, participation.live.client.platform);
  }
  async #open(attempt: LiveConnectionAttempt): Promise<void> {
    try {
      // One attempt: the token admits at most one new connection. LiveKit may later resume this connection.
      await this.#room.connect(attempt.url, attempt.token, { autoSubscribe: true, maxRetries: 0,
        rtcConfig: { iceTransportPolicy: this.options.iceTransportPolicy ?? "all" } });
      this.nativeConnectionId = parseId(this.#room.localParticipant.sid);
    } catch (error) {
      await this.disconnect();
      throw error;
    }
  }
  reconnect(): Promise<MediaConnection> {
    if (this.#reconnecting) return this.#reconnecting;
    if (this.#left) return Promise.reject(new Error("A deliberately closed connection cannot reconnect"));
    const work = async () => {
      await this.#close(false);
      if (this.#left) throw new Error("Connection was closed during reconnect");
      const next = await this.participation.connect(this.options);
      if (this.#left) { await next.disconnect(); throw new Error("Connection was closed during reconnect"); }
      return next;
    };
    this.#reconnecting = work();
    return this.#reconnecting.finally(() => { this.#reconnecting = undefined; });
  }
  get connected(): boolean { return !this.#closed && this.nativeConnectionId !== undefined; }
  /** LiveKit is resuming this connection after a network interruption. */
  get resuming(): boolean { return this.#resuming; }
  async microphone(enabled: boolean): Promise<void> {
    if (!this.connected || !this.#permissions.microphone) throw new Error("Microphone is not authorized for this participation");
    await this.#room.localParticipant.setMicrophoneEnabled(enabled);
  }
  async camera(enabled: boolean): Promise<void> {
    if (!this.connected || !this.#permissions.camera) throw new Error("Camera is not authorized for this participation");
    await this.#room.localParticipant.setCameraEnabled(enabled);
    const track = this.#room.localParticipant.getTrackPublication(this.#kit.Track.Source.Camera)?.track;
    if (enabled && track && this.options.localVideo) track.attach(this.options.localVideo);
  }
  async enableAudio(): Promise<void> { await this.#room.startAudio(); }
  async stats(): Promise<MediaStats> {
    const result: MediaStats = { audioTracks: 0, videoTracks: 0, audioBytesReceived: 0, videoBytesReceived: 0,
      framesDecoded: 0, localAudioEnabled: this.#room.localParticipant.isMicrophoneEnabled,
      localVideoEnabled: this.#room.localParticipant.isCameraEnabled, tracks: [] };
    result.transports = [];
    for (const { track, remote } of this.#tracks.values()) {
      if (remote.kind === "audio") result.audioTracks++; else result.videoTracks++;
      const report = await track.getRTCStatsReport();
      const inbound = { trackId: remote.trackId, participantIdentity: remote.participantIdentity, kind: remote.kind, bytesReceived: 0, framesDecoded: 0 };
      report?.forEach(value => {
        const stat = parseObject(value);
        if (stat.type === "transport" && typeof stat.selectedCandidatePairId === "string") {
          const pair = report?.get(stat.selectedCandidatePairId);
          const local = pair && report?.get(pair.localCandidateId);
          const remote = pair && report?.get(pair.remoteCandidateId);
          if (local && remote) {
            const transport = { localCandidateType: parseString(local.candidateType),
              remoteCandidateType: parseString(remote.candidateType), protocol: parseString(local.protocol),
              ...(typeof local.relayProtocol === "string" ? { relayProtocol: local.relayProtocol } : {}) };
            if (!result.transports?.some(value => JSON.stringify(value) === JSON.stringify(transport))) result.transports?.push(transport);
          }
        }
        if (stat.type !== "inbound-rtp" || (stat.kind !== undefined && stat.kind !== remote.kind)) return;
        const bytes = typeof stat.bytesReceived === "number" ? stat.bytesReceived : 0;
        inbound.bytesReceived += bytes;
        inbound.framesDecoded += typeof stat.framesDecoded === "number" ? stat.framesDecoded : 0;
        if (remote.kind === "audio") result.audioBytesReceived += bytes;
        else {
          result.videoBytesReceived += bytes;
          result.framesDecoded += typeof stat.framesDecoded === "number" ? stat.framesDecoded : 0;
        }
      });
      result.tracks.push(inbound);
    }
    return result;
  }
  #cleanup(): void {
    for (const { track, remote } of this.#tracks.values()) {
      track.detach().forEach(element => element.remove());
      remote.element.pause(); remote.element.srcObject = null; remote.element.remove();
    }
    this.#tracks.clear();
    if (this.options.localVideo) this.options.localVideo.srcObject = null;
  }
  async disconnect(): Promise<void> {
    await this.#close(true);
  }
  async #close(deliberate: boolean): Promise<void> {
    this.#closed = true;
    this.#left ||= deliberate;
    try { await this.#room.disconnect(true); } finally { this.#cleanup(); }
  }
}
