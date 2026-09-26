import { Room, RoomEvent, Track, type RemoteTrack } from "livekit-client";
import type { MediaJoin, MediaSession } from "./types.js";

export interface RemoteMediaTrack {
  readonly trackSid: string;
  readonly participantIdentity: string;
  readonly kind: "audio" | "video";
  readonly element: HTMLMediaElement;
}

export interface MediaConnectOptions {
  publish?: boolean;
  camera?: boolean;
  localVideo?: HTMLVideoElement;
  onTrackAdded?: (track: RemoteMediaTrack) => void;
  onTrackRemoved?: (track: RemoteMediaTrack) => void;
  onReconnecting?: () => void;
  onReconnected?: () => void;
  onDisconnected?: (error: Error) => void;
  onAudioPlaybackBlocked?: () => void;
  onError?: (error: Error) => void;
}

interface MediaOperations {
  joinMedia(id: string, renewParticipantId?: string): Promise<MediaJoin>;
  removeMediaParticipant(id: string, participantId: string): Promise<void>;
}

function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

function withCleanupError(error: unknown, cleanup: unknown): Error {
  return new AggregateError([error, cleanup], "Media operation and admission cleanup failed");
}

export class MediaConnection {
  readonly mediaId: string;
  readonly participantId: string;
  readonly #client: MediaOperations;
  readonly #options: MediaConnectOptions;
  readonly #publish: boolean;
  readonly #camera: boolean;
  readonly #roomFactory: () => Room;
  readonly #tracks = new Map<string, { details: RemoteMediaTrack; source: RemoteTrack }>();
  #room: Room | undefined;
  #status: "connecting" | "connected" | "reconnecting" | "left" = "connecting";
  #grantExpiresAt: string;
  #closed = false;
  #pending: Promise<void> = Promise.resolve();
  #reconnectPromise: Promise<void> | undefined;
  #leavePromise: Promise<void> | undefined;
  #disconnectedDuringConnect = false;
  #revoked = false;

  private constructor(
    client: MediaOperations,
    session: MediaSession,
    grant: MediaJoin,
    options: MediaConnectOptions,
    roomFactory: () => Room,
  ) {
    this.#client = client;
    this.mediaId = session.id;
    this.participantId = grant.participantId;
    this.#grantExpiresAt = grant.expiresAt;
    this.#options = options;
    this.#roomFactory = roomFactory;
    this.#publish = options.publish ?? true;
    this.#camera = this.#publish && (options.camera ?? session.mode !== "audio");
  }

  static async connect(
    client: MediaOperations,
    session: MediaSession,
    options: MediaConnectOptions,
    roomFactory: (() => Room) | undefined,
  ): Promise<MediaConnection> {
    if (options.publish !== undefined && typeof options.publish !== "boolean") {
      throw new TypeError("publish must be a boolean");
    }
    if (options.camera !== undefined && typeof options.camera !== "boolean") {
      throw new TypeError("camera must be a boolean");
    }
    if (session.mode === "audio" && options.camera === true) {
      throw new TypeError("Audio calls cannot publish a camera");
    }
    if (options.publish === false && options.camera === true) {
      throw new TypeError("A viewer cannot publish a camera");
    }
    const grant = await client.joinMedia(session.id);
    const connection = new MediaConnection(
      client, session, grant, options,
      roomFactory ?? (() => new Room({ adaptiveStream: true, dynacast: true })),
    );
    try {
      await connection.#openRoom(grant);
      connection.#status = "connected";
      return connection;
    } catch (error) {
      try {
        await connection.leave();
      } catch (cleanup) {
        throw withCleanupError(error, cleanup);
      }
      throw error;
    }
  }

  get status(): "connecting" | "connected" | "reconnecting" | "left" {
    return this.#status;
  }

  get grantExpiresAt(): string {
    return this.#grantExpiresAt;
  }

  get remoteTracks(): ReadonlyArray<RemoteMediaTrack> {
    return [...this.#tracks.values()].map(({ details }) => details);
  }

  enableAudio(): Promise<void> {
    if (this.#closed || !this.#room) {
      return Promise.reject(new Error("Join a media session before enabling audio playback"));
    }
    return this.#room.startAudio();
  }

  reconnect(): Promise<void> {
    if (this.#closed) return Promise.reject(new Error("Media connection has been closed"));
    if (this.#reconnectPromise) return this.#reconnectPromise;
    const work = this.#schedule(() => this.#renewAndReconnect());
    const reconnect = work.catch(async (error: unknown) => {
      if (this.#closed) throw error;
      let failure = asError(error);
      try {
        await this.leave();
      } catch (cleanup) {
        failure = withCleanupError(failure, cleanup);
      }
      this.#notify(() => this.#options.onDisconnected?.(failure));
      throw failure;
    }).finally(() => {
      this.#reconnectPromise = undefined;
    });
    this.#reconnectPromise = reconnect;
    return reconnect;
  }

  leave(): Promise<void> {
    if (this.#leavePromise) return this.#leavePromise;
    this.#closed = true;
    this.#status = "left";
    const work = this.#schedule(async () => {
      const room = this.#room;
      this.#releaseTracks(room);
      const failures: unknown[] = [];
      try {
        await room?.disconnect(true);
        this.#room = undefined;
      } catch (error) {
        failures.push(error);
      }
      if (!this.#revoked) {
        try {
          await this.#client.removeMediaParticipant(this.mediaId, this.participantId);
          this.#revoked = true;
        } catch (error) {
          failures.push(error);
        }
      }
      if (failures.length === 1) throw failures[0];
      if (failures.length > 1) throw new AggregateError(failures, "Media disconnect and revocation failed");
    });
    this.#leavePromise = work.finally(() => {
      if (this.#room || !this.#revoked) this.#leavePromise = undefined;
    });
    return this.#leavePromise;
  }

  #schedule(action: () => Promise<void>): Promise<void> {
    const work = this.#pending.then(action);
    this.#pending = work.then(() => {}, () => {});
    return work;
  }

  async #renewAndReconnect(): Promise<void> {
    if (this.#closed) throw new Error("Media connection has been closed");
    if (this.#status !== "reconnecting") {
      this.#status = "reconnecting";
      this.#notify(() => this.#options.onReconnecting?.());
    }
    const grant = await this.#client.joinMedia(this.mediaId, this.participantId);
    if (grant.participantId !== this.participantId) {
      try {
        await this.#client.removeMediaParticipant(this.mediaId, grant.participantId);
      } catch (cleanup) {
        throw withCleanupError(new Error("Media renewal returned a different participantId"), cleanup);
      }
      throw new Error("Media renewal returned a different participantId");
    }
    if (this.#closed) throw new Error("Media connection was closed during renewal");
    const previous = this.#room;
    this.#room = undefined;
    this.#releaseTracks(previous);
    await previous?.disconnect(true);
    if (this.#closed) throw new Error("Media connection was closed during reconnection");
    this.#grantExpiresAt = grant.expiresAt;
    await this.#openRoom(grant);
    if (this.#closed) throw new Error("Media connection was closed during reconnection");
    this.#status = "connected";
    this.#notify(() => this.#options.onReconnected?.());
  }

  async #openRoom(grant: MediaJoin): Promise<void> {
    const room = this.#roomFactory();
    this.#room = room;
    this.#disconnectedDuringConnect = false;
    let opening = true;
    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (this.#room !== room || this.#closed) return;
      if (track.kind !== Track.Kind.Audio && track.kind !== Track.Kind.Video) {
        this.#reportError(new Error("LiveKit returned an unsupported track kind"));
        return;
      }
      try {
        this.#removeTrack(publication.trackSid);
        const element = track.attach();
        element.autoplay = true;
        if (track.kind === Track.Kind.Video && "playsInline" in element) element.playsInline = true;
        const details: RemoteMediaTrack = {
          trackSid: publication.trackSid,
          participantIdentity: participant.identity,
          kind: track.kind,
          element,
        };
        this.#tracks.set(details.trackSid, { details, source: track });
        this.#notify(() => this.#options.onTrackAdded?.(details));
      } catch (error) {
        this.#reportError(asError(error));
      }
    });
    room.on(RoomEvent.TrackUnsubscribed, (_track, publication) => {
      if (this.#room === room) this.#removeTrack(publication.trackSid);
    });
    room.on(RoomEvent.Reconnecting, () => {
      if (this.#room !== room || this.#closed || this.#status !== "connected") return;
      this.#status = "reconnecting";
      this.#notify(() => this.#options.onReconnecting?.());
    });
    room.on(RoomEvent.Reconnected, () => {
      if (this.#room !== room || this.#closed || this.#reconnectPromise) return;
      this.#status = "connected";
      this.#notify(() => this.#options.onReconnected?.());
    });
    room.on(RoomEvent.Disconnected, () => {
      if (this.#room !== room || this.#closed) return;
      if (opening) {
        this.#disconnectedDuringConnect = true;
      } else if (!this.#reconnectPromise) {
        void this.reconnect().catch((error: unknown) => this.#reportError(asError(error)));
      }
    });
    room.on(RoomEvent.MediaDevicesError, (error) => this.#reportError(asError(error)));
    room.on(RoomEvent.AudioPlaybackStatusChanged, (playing) => {
      if (this.#room === room && !this.#closed && !playing) {
        this.#notify(() => this.#options.onAudioPlaybackBlocked?.());
      }
    });
    try {
      await room.connect(grant.serverUrl, grant.token);
      if (this.#disconnectedDuringConnect || this.#closed || this.#room !== room) {
        throw new Error("Media disconnected during connection");
      }
      if (this.#publish) {
        await room.localParticipant.setMicrophoneEnabled(true);
        if (this.#camera) {
          await room.localParticipant.setCameraEnabled(true);
          const localVideo = this.#options.localVideo;
          if (localVideo) {
            room.localParticipant.getTrackPublication(Track.Source.Camera)?.track?.attach(localVideo);
          }
        }
      }
      if (this.#disconnectedDuringConnect || this.#closed || this.#room !== room) {
        throw new Error("Media disconnected while publishing");
      }
    } finally {
      opening = false;
    }
  }

  #removeTrack(trackSid: string): void {
    const entry = this.#tracks.get(trackSid);
    if (!entry) return;
    this.#tracks.delete(trackSid);
    try {
      entry.source.detach(entry.details.element);
    } catch (error) {
      this.#reportError(asError(error));
    }
    this.#notify(() => this.#options.onTrackRemoved?.(entry.details));
  }

  #releaseTracks(room: Room | undefined): void {
    for (const trackSid of this.#tracks.keys()) this.#removeTrack(trackSid);
    const localVideo = this.#options.localVideo;
    if (!localVideo) return;
    try {
      room?.localParticipant.getTrackPublication(Track.Source.Camera)?.track?.detach(localVideo);
    } catch (error) {
      this.#reportError(asError(error));
    }
    localVideo.srcObject = null;
  }

  #notify(callback: () => void): void {
    try {
      callback();
    } catch (error) {
      this.#reportError(asError(error));
    }
  }

  #reportError(error: Error): void {
    if (this.#options.onError) {
      try {
        this.#options.onError(error);
      } catch (handlerError) {
        console.error("Threadwave media error handler failed:", error, handlerError);
      }
    } else console.error("Threadwave media:", error);
  }
}
