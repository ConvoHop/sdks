import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ConvoHopClient, LiveConnectOptions, LiveParticipationHandle, LiveSessionHandle, MediaConnection, MediaOptions,
  RemoteMedia } from "@convohop/client";
import { toError, useConvoHop } from "./provider.js";

const noop = () => undefined;

/** Holds one frozen state and notifies subscribers when it changes. */
class StateCell<S extends object> {
  readonly #listeners = new Set<() => void>();
  #state: S;
  constructor(initial: S) { this.#state = initial; }
  get state(): S { return this.#state; }
  readonly subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => { this.#listeners.delete(listener); };
  };
  protected set(next: S): void {
    const current = this.#state as Record<string, unknown>;
    if (Object.entries(next).every(([key, value]) => Object.is(current[key], value))) return;
    this.#state = Object.freeze(next);
    for (const listener of [...this.#listeners]) listener();
  }
}

export type LiveSessionStatus = "idle" | "loading" | "ready" | "error";
export interface LiveSessionState {
  readonly status: LiveSessionStatus;
  /** The conversation's current live session, `null` when none is running, and undefined until it first loads. */
  readonly session: LiveSessionHandle | null | undefined;
  /** Why the last load failed. `session` keeps the value last loaded. */
  readonly error: Error | undefined;
}
export interface LiveSessionView extends LiveSessionState {
  /** Loads the current live session again; a failure shows in `error`. Calls during a load share one more load after it. */
  refresh(): Promise<void>;
}
const idleLive: LiveSessionState = Object.freeze({ status: "idle", session: undefined, error: undefined });

class LiveSessionTracker extends StateCell<LiveSessionState> {
  #loading: Promise<void> | undefined;
  #queued: Promise<void> | undefined;
  #closed = false;
  constructor(readonly client: ConvoHopClient, readonly conversationId: string) { super(idleLive); }
  refresh(): Promise<void> {
    if (this.#closed) return Promise.resolve();
    if (this.#queued) return this.#queued;
    if (this.#loading) return this.#queued = this.#loading.then(() => { this.#queued = undefined; return this.refresh(); });
    const loading = this.#load().finally(() => { if (this.#loading === loading) this.#loading = undefined; });
    return this.#loading = loading;
  }
  close(): void { this.#closed = true; }
  async #load(): Promise<void> {
    if (this.state.session === undefined) this.set({ status: "loading", session: undefined, error: undefined });
    try {
      const session = await this.client.conversation(this.conversationId).live.current();
      if (this.#closed) return;
      const previous = this.state.session;
      // A reload that finds the same state keeps the handle, so effects keyed on it don't run again.
      const same = previous && session && JSON.stringify(previous.snapshot) === JSON.stringify(session.snapshot);
      this.set({ status: "ready", session: same ? previous : session, error: undefined });
    } catch (error) {
      if (!this.#closed) this.set({ status: "error", session: this.state.session, error: toError(error) });
    }
  }
}

/**
 * The conversation's current live session. It loads when the component mounts and again after each live-session event
 * that a mounted {@link useConversation} for the same conversation, under the same provider, receives. Call `refresh()`
 * in other cases, for example when a call push notification arrives.
 */
export function useLiveSession(conversationId: string | null | undefined): LiveSessionView {
  const { client, events } = useConvoHop();
  const [tracker, setTracker] = useState<LiveSessionTracker>();
  useEffect(() => {
    if (!conversationId) return;
    const value = new LiveSessionTracker(client, conversationId);
    setTracker(value);
    const off = events.on(client, conversationId, event => {
      if (typeof event.type === "string" && event.type.startsWith("live.")) void value.refresh();
    });
    void value.refresh();
    return () => { off(); value.close(); };
  }, [client, events, conversationId]);
  const current = tracker && tracker.client === client && tracker.conversationId === conversationId ? tracker : undefined;
  const subscribe = useCallback((listener: () => void) => current ? current.subscribe(listener) : noop, [current]);
  const read = () => current ? current.state : idleLive;
  const state = useSyncExternalStore(subscribe, read, read);
  return useMemo(() => ({ ...state, refresh: () => current ? current.refresh() : Promise.resolve() }), [state, current]);
}

export type MediaConnectionStatus = "idle" | "connecting" | "connected" | "resuming" | "disconnected" | "failed";
export interface MediaConnectionState {
  readonly status: MediaConnectionStatus;
  /** The latest connection: use it for the microphone, camera and stats. It stays after a disconnection, for `reconnect()`. */
  readonly connection: MediaConnection | undefined;
  /** Remote audio and video, in subscription order. Add each `element` to the page, for example from a ref callback. */
  readonly tracks: readonly RemoteMedia[];
  /** The browser blocked remote audio: call `enableAudio()` from a user gesture, such as a click. */
  readonly audioBlocked: boolean;
  /** Why the last connect or reconnect failed. */
  readonly error: Error | undefined;
}
export interface MediaConnectionView extends MediaConnectionState {
  /**
   * Connects a participation's media with `livekit-client`. Call it from a user gesture, so the browser allows audio and
   * each admission is used once. Rejects while this hook's connection is connecting or connected, or when the
   * participation's media is connected elsewhere.
   */
  connect(participation: LiveParticipationHandle, options?: LiveConnectOptions): Promise<MediaConnection>;
  /** Connects again with fresh credentials, typically after `disconnected`. */
  reconnect(): Promise<MediaConnection>;
  /** Disconnects. A connection still opening closes as soon as it opens. */
  disconnect(): Promise<void>;
  /** Plays the remote audio the browser blocked. Call it from a user gesture. */
  enableAudio(): Promise<void>;
}
const noTracks: readonly RemoteMedia[] = Object.freeze([]);
const idleMedia: MediaConnectionState = Object.freeze({
  status: "idle", connection: undefined, tracks: noTracks, audioBlocked: false, error: undefined,
});
const closedWhileOpening = () => new Error("The media connection was closed while it opened");

/** One connect() and its reconnects: the callbacks given to the connection. Events from an earlier run are ignored. */
type Run = MediaOptions;

class MediaController extends StateCell<MediaConnectionState> {
  #run: Run | undefined;
  /** The latest connect or reconnect, until it settles and any connection it opened too late has closed. */
  #pending: Promise<unknown> | undefined;
  #attached = false;
  constructor() { super(idleMedia); }
  attach(): void { this.#attached = true; }
  detach(): void {
    this.#attached = false;
    this.disconnect().catch(noop);
  }
  connect(participation: LiveParticipationHandle, options: LiveConnectOptions = {}): Promise<MediaConnection> {
    if (!this.#attached) return Promise.reject(new Error("The component isn't mounted"));
    const { status } = this.state;
    if (status === "connecting" || status === "connected" || status === "resuming")
      return Promise.reject(new Error("Disconnect the current media connection first"));
    const run = this.#run = this.#callbacks(options), previous = this.#pending;
    this.set({ status: "connecting", connection: undefined, tracks: noTracks, audioBlocked: false, error: undefined });
    const opening = (async () => {
      // A connection this hook abandoned may still be opening, and the participation would return it to this run.
      await previous?.catch(noop);
      if (this.#run !== run) throw closedWhileOpening();
      return participation.connect({ ...options, ...run });
    })();
    return this.#settle(run, opening);
  }
  reconnect(): Promise<MediaConnection> {
    if (!this.#attached) return Promise.reject(new Error("The component isn't mounted"));
    const run = this.#run, { connection, status } = this.state;
    if (!run || !connection) return Promise.reject(new Error("There's no media connection to reconnect"));
    if (status === "connecting") return Promise.reject(new Error("The media connection is already connecting"));
    this.set({ status: "connecting", connection, tracks: noTracks, audioBlocked: false, error: undefined });
    let opening: Promise<MediaConnection>;
    try { opening = connection.reconnect(); }
    catch (error) { opening = Promise.reject(error); }
    return this.#settle(run, opening);
  }
  async disconnect(): Promise<void> {
    const { connection } = this.state, pending = this.#pending;
    this.#run = undefined;
    this.set(idleMedia);
    try { await connection?.disconnect(); }
    finally { await pending?.catch(noop); }
  }
  async enableAudio(): Promise<void> {
    const { connection } = this.state;
    if (!connection) throw new Error("There's no media connection");
    await connection.enableAudio();
    if (this.state.connection === connection) this.set({ ...this.state, audioBlocked: false });
  }
  #settle(run: Run, opening: Promise<MediaConnection>): Promise<MediaConnection> {
    const fail = (error: unknown) => {
      if (this.#run === run) this.set({ ...this.state, status: "failed", tracks: noTracks, error: toError(error) });
      return error;
    };
    const settled = (async () => {
      let connection: MediaConnection;
      try { connection = await opening; }
      catch (error) { throw fail(error); }
      // The participation returns a connection opened elsewhere as is; its events go to that caller.
      if (connection.options.onTrack !== run.onTrack)
        throw fail(new Error("This participation's media is connected elsewhere; disconnect it there first"));
      if (this.#run !== run) {
        await connection.disconnect();
        throw closedWhileOpening();
      }
      // Events that arrived while it opened were ignored, so read the connection's own state.
      if (!connection.connected) this.set({ ...this.state, status: "disconnected", connection, tracks: noTracks, error: undefined });
      else this.set({ ...this.state, status: connection.resuming ? "resuming" : "connected", connection, error: undefined });
      return connection;
    })();
    this.#pending = settled;
    return settled;
  }
  #callbacks(options: MediaOptions): Run {
    const update = (change: (state: MediaConnectionState) => MediaConnectionState | undefined) => {
      if (this.#run !== run) return;
      const next = change(this.state);
      if (next) this.set(next);
    };
    const run: Run = {
      onTrack: remote => {
        update(state => ({ ...state, tracks: Object.freeze([...state.tracks, remote]) }));
        options.onTrack?.(remote);
      },
      onTrackRemoved: remote => {
        update(state => ({ ...state, tracks: Object.freeze(state.tracks.filter(track => track !== remote)) }));
        options.onTrackRemoved?.(remote);
      },
      onDisconnected: () => {
        update(state => state.status === "connecting" ? undefined : { ...state, status: "disconnected", tracks: noTracks });
        options.onDisconnected?.();
      },
      onResuming: () => {
        update(state => state.status === "connected" ? { ...state, status: "resuming" } : undefined);
        options.onResuming?.();
      },
      onResumed: () => {
        update(state => state.status === "resuming" ? { ...state, status: "connected" } : undefined);
        options.onResumed?.();
      },
      onAudioPlaybackBlocked: () => {
        update(state => ({ ...state, audioBlocked: true }));
        options.onAudioPlaybackBlocked?.();
      },
    };
    return run;
  }
}

/**
 * Connects a live-session participation's media in the browser and tracks its remote audio and video. Unmounting
 * disconnects. Browser only: on React Native, connect with `participation.connectWith` and a native LiveKit SDK.
 */
export function useMediaConnection(): MediaConnectionView {
  const [controller] = useState(() => new MediaController());
  useEffect(() => {
    controller.attach();
    return () => { controller.detach(); };
  }, [controller]);
  const read = () => controller.state;
  const state = useSyncExternalStore(controller.subscribe, read, read);
  return useMemo(() => ({
    ...state,
    connect: (participation: LiveParticipationHandle, options?: LiveConnectOptions) => controller.connect(participation, options),
    reconnect: () => controller.reconnect(),
    disconnect: () => controller.disconnect(),
    enableAudio: () => controller.enableAudio(),
  }), [state, controller]);
}
