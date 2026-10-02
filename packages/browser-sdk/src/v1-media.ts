import { Room, RoomEvent, Track, type RemoteTrack } from "livekit-client";
import { V1Problem, v1Id, v1Record, v1String } from "./v1.js";
import type { LiveParticipationHandle, LiveConnectOptions, LiveConnectionGrant } from "./live.js";

type NativeGrant = LiveConnectionGrant;

interface Admission {
  grant: NativeGrant; attemptId: string; used: boolean;
  resolve: (value: { admissionId: string; nativeConnectionId: string }) => void;
  reject: (error: Error) => void;
}
const pending = new Map<string, Admission>();
let originalConstructor: typeof WebSocket | undefined;
let installedConstructor: typeof WebSocket | undefined;

function register(grant: NativeGrant) {
  const url = new URL(grant.livekitUrl);
  if (url.search || url.hash || url.username || url.password ||
      (url.protocol !== "wss:" && !(url.protocol === "ws:" && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)))) throw new TypeError("Invalid media origin");
  if (Date.parse(grant.leaseExpiresAt) <= Date.now()) throw new Error("Fresh media credentials are required");
  const bindingKey = url.origin + ":" + grant.transportToken;
  if (pending.has(bindingKey)) throw new Error("A native admission can be attempted only once");
  const admitted = new Promise<{ admissionId: string; nativeConnectionId: string }>((resolve, reject) => {
    pending.set(bindingKey, { grant, attemptId: crypto.randomUUID(), used: false, resolve, reject });
  });
  if (!installedConstructor) {
    const Native = globalThis.WebSocket; originalConstructor = Native;
    // livekit-client 2.22.3 has no socket factory hook. Only registered /rtc
    // connections are gated; ordinary browser/realtime sockets are unchanged.
    class AdmissionSocket extends Native {
      #gate: Admission | undefined; #admitted = false;
      constructor(address: string | URL, protocols?: string | string[]) {
        const target = new URL(address);
        const gate = target.pathname === "/rtc" ? pending.get(target.origin + ":" + target.searchParams.get("access_token")) : undefined;
        if (gate?.used) throw new Error("Native credential reuse is forbidden; request fresh reconnect credentials");
        if (gate) gate.used = true;
        super(address, protocols);
        this.#gate = gate;
        if (!gate) return;
        const timer = setTimeout(() => {
          gate.reject(new Error("Native admission timed out"));
          Native.prototype.close.call(this, 1008, "Admission timed out");
        }, 9500);
        this.addEventListener("open", event => {
          if (this.#admitted) return;
          event.stopImmediatePropagation();
          const prelude = JSON.stringify({ type: "convohop.admission.v1", protocolVersion: "1",
            admissionAttemptId: gate.attemptId, mode: gate.grant.admissionTicket.mode,
            ticket: gate.grant.admissionTicket, leaseProof: gate.grant.forwardingLease });
          if (new TextEncoder().encode(prelude).length > 16384) {
            gate.reject(new Error("Native admission exceeds the protocol bound"));
            Native.prototype.close.call(this, 1008, "Admission too large"); return;
          }
          Native.prototype.send.call(this, prelude);
        }, { capture: true });
        this.addEventListener("message", event => {
          if (this.#admitted) return;
          event.stopImmediatePropagation();
          try {
            const frame = v1Record(JSON.parse(v1String(event.data)));
            if (frame.type !== "convohop.admitted.v1" || frame.leaseExpiresAt !== gate.grant.leaseExpiresAt) throw new Error("Native admission was not accepted");
            if (frame.participationId !== gate.grant.participationId)
              throw new Error("Native admission participation mismatch");
            const value = { admissionId: v1Id(frame.admissionId), nativeConnectionId: v1Id(frame.nativeConnectionId) };
            this.#admitted = true; clearTimeout(timer); gate.resolve(value);
            this.dispatchEvent(new Event("open"));
          } catch {
            clearTimeout(timer); gate.reject(new Error("Native admission rejected; no signaling or media was authorized"));
            Native.prototype.close.call(this, 1008, "Admission rejected");
            this.dispatchEvent(new Event("error"));
          }
        }, { capture: true });
        this.addEventListener("close", () => {
          clearTimeout(timer);
          if (!this.#admitted) gate.reject(new Error("Native admission connection closed"));
        });
        this.addEventListener("error", () => {
          if (!this.#admitted) gate.reject(new Error("Native admission transport failed"));
        });
      }
      override get readyState(): WebSocket["readyState"] {
        if (this.#gate && !this.#admitted && super.readyState === WebSocket.OPEN) return WebSocket.CONNECTING;
        return super.readyState;
      }
      override send(data: Parameters<WebSocket["send"]>[0]): void {
        if (this.#gate && !this.#admitted) throw new Error("Native signaling cannot precede admission");
        super.send(data);
      }
    }
    installedConstructor = AdmissionSocket;
    globalThis.WebSocket = AdmissionSocket;
  }
  return { admitted, release() {
    pending.delete(bindingKey);
    if (pending.size === 0 && installedConstructor && globalThis.WebSocket === installedConstructor && originalConstructor) {
      globalThis.WebSocket = originalConstructor; installedConstructor = undefined; originalConstructor = undefined;
    }
  } };
}
export interface V1RemoteMedia {
  trackId: string; participantIdentity: string; kind: "audio" | "video"; element: HTMLMediaElement;
}
export interface V1MediaOptions {
  iceTransportPolicy?: "all" | "relay";
  localVideo?: HTMLVideoElement;
  onTrack?: (track: V1RemoteMedia) => void;
  onTrackRemoved?: (track: V1RemoteMedia) => void;
  onDisconnected?: () => void;
  onAudioPlaybackBlocked?: () => void;
}
export interface V1MediaStats {
  audioTracks: number; videoTracks: number; audioBytesReceived: number;
  videoBytesReceived: number; framesDecoded: number; localAudioEnabled: boolean; localVideoEnabled: boolean;
  tracks: { trackId: string; participantIdentity: string; kind: "audio" | "video"; bytesReceived: number; framesDecoded: number }[];
  transports?: { localCandidateType: string; remoteCandidateType: string; protocol: string; relayProtocol?: string }[];
}
export class V1MediaConnection {
  readonly #room: Room;
  readonly #tracks = new Map<string, { remote: V1RemoteMedia; track: RemoteTrack }>();
  #registration: ReturnType<typeof register> | undefined;
  #closed = false;
  #left = false;
  #reconnecting: Promise<V1MediaConnection> | undefined;
  readonly #permissions: { microphone: boolean; camera: boolean };
  readonly options: V1MediaOptions;
  admissionId: string | undefined;
  nativeConnectionId: string | undefined;
  private constructor(readonly participation: LiveParticipationHandle, options: LiveConnectOptions) {
    const { requestId: _requestId, ...mediaOptions } = options;
    this.options = mediaOptions;
    if (options.iceTransportPolicy !== undefined && options.iceTransportPolicy !== "all" && options.iceTransportPolicy !== "relay") {
      throw new TypeError("ICE policy must be all or relay");
    }
    this.#permissions = { ...participation.snapshot.permissions };
    this.#room = new Room({
      adaptiveStream: false, dynacast: false, singlePeerConnection: false,
      reconnectPolicy: { nextRetryDelayInMs: () => null },
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
      const remote: V1RemoteMedia = { trackId: publication.trackSid, participantIdentity: participant.identity, kind: track.kind, element };
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
      if (!this.#closed) { this.#closed = true; this.#registration?.release(); this.#cleanup(); options.onDisconnected?.(); }
    });
    this.#room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
      if (!this.#room.canPlaybackAudio) options.onAudioPlaybackBlocked?.();
    });
  }
  /** @internal Connect never starts capture. */
  static async connectParticipation(participation: LiveParticipationHandle, options: LiveConnectOptions): Promise<V1MediaConnection> {
    const result = new V1MediaConnection(participation, options);
    const { requestId, grant } = await participation.connectionGrant(options);
    const ticket = v1Record(grant.admissionTicket), lease = v1Record(grant.forwardingLease);
    if (ticket.participationId !== participation.participationId || lease.participationId !== participation.participationId ||
        lease.leaseVersion !== "2") throw new TypeError("Native proof is not participation-bound");
    participation.connectionAttempted();
    await result.#open({ ...grant, admissionTicket: ticket, forwardingLease: lease }, requestId);
    return result;
  }
  async #open(grant: NativeGrant, requestId: string = crypto.randomUUID()): Promise<void> {
    const result = this;
    result.#registration = register(grant);
    try {
      const [, admission] = await Promise.all([
        result.#room.connect(grant.livekitUrl, grant.transportToken, { autoSubscribe: true, maxRetries: 0,
          rtcConfig: { iceTransportPolicy: result.options.iceTransportPolicy ?? "all" } }),
        result.#registration.admitted,
      ]);
      result.admissionId = admission.admissionId; result.nativeConnectionId = admission.nativeConnectionId;
    } catch {
      await result.disconnect();
      throw new V1Problem("MEDIA_CONNECT_FAILED", requestId, "unknown", 0,
        "Native connection failed. The participation reservation remains; resolve and retry connect, or explicitly leave.");
    }
  }
  reconnect(): Promise<V1MediaConnection> {
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
  async microphone(enabled: boolean): Promise<void> {
    if (!this.connected || !this.#permissions.microphone) throw new Error("Microphone is not authorized for this participation");
    await this.#room.localParticipant.setMicrophoneEnabled(enabled);
  }
  async camera(enabled: boolean): Promise<void> {
    if (!this.connected || !this.#permissions.camera) throw new Error("Camera is not authorized for this participation");
    await this.#room.localParticipant.setCameraEnabled(enabled);
    const track = this.#room.localParticipant.getTrackPublication(Track.Source.Camera)?.track;
    if (enabled && track && this.options.localVideo) track.attach(this.options.localVideo);
  }
  async enableAudio(): Promise<void> { await this.#room.startAudio(); }
  async stats(): Promise<V1MediaStats> {
    const result: V1MediaStats = { audioTracks: 0, videoTracks: 0, audioBytesReceived: 0, videoBytesReceived: 0,
      framesDecoded: 0, localAudioEnabled: this.#room.localParticipant.isMicrophoneEnabled,
      localVideoEnabled: this.#room.localParticipant.isCameraEnabled, tracks: [] };
    result.transports = [];
    for (const { track, remote } of this.#tracks.values()) {
      if (remote.kind === "audio") result.audioTracks++; else result.videoTracks++;
      const report = await track.getRTCStatsReport();
      const inbound = { trackId: remote.trackId, participantIdentity: remote.participantIdentity, kind: remote.kind, bytesReceived: 0, framesDecoded: 0 };
      report?.forEach(value => {
        const stat = v1Record(value);
        if (stat.type === "transport" && typeof stat.selectedCandidatePairId === "string") {
          const pair = report?.get(stat.selectedCandidatePairId);
          const local = pair && report?.get(pair.localCandidateId);
          const remote = pair && report?.get(pair.remoteCandidateId);
          if (local && remote) {
            const transport = { localCandidateType: v1String(local.candidateType),
              remoteCandidateType: v1String(remote.candidateType), protocol: v1String(local.protocol),
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
    try { await this.#room.disconnect(true); } finally { this.#registration?.release(); this.#cleanup(); }
  }
}
