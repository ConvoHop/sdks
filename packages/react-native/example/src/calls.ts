// One call at a time: the system call UI (CallKit on iOS, Telecom on Android) around a ConvoHop live session, with
// LiveKit's React Native SDK for the media.
import { Platform } from "react-native";
import { ConnectionState, RoomEvent, type Room } from "livekit-client";
import { AudioSession } from "@livekit/react-native";
import { ConvoHopProblem, type ConvoHopClient, type LiveConnector, type LiveParticipationHandle, type LiveSessionHandle } from "@convohop/client";
import {
  endCall, onCallEvent, reportConnected, reportConnecting, setAudioRoute, setMuted as setSystemMuted, startOutgoingCall,
  subscribeAnsweredCalls, type AudioRoute, type Call, type CallEvent,
} from "@convohop/react-native";
import { createRoom, createRoomConnector, type RoomConnection } from "@convohop/react-native/media";

export type CallStatus = "joining" | "calling" | "connected" | "reconnecting" | "held";
export interface CallView {
  readonly title: string;
  readonly outgoing: boolean;
  readonly status: CallStatus;
  readonly muted: boolean;
  /** How many others are connected. */
  readonly others: number;
  /** Android: where the call's audio plays, and the outputs to choose from. iOS shows its own route picker. */
  readonly output: string | undefined;
  readonly outputs: readonly string[];
}

const NO_ANSWER_MS = 60_000;
const ALONE_MS = 3_000;
const CONNECT_DELAYS_MS = [0, 1_000, 2_000, 4_000];
const RECONNECT_DELAYS_MS = [1_000, 2_000, 4_000];

/** Thrown inside a call's work once the call ended, so the work stops quietly. */
class CallEnded extends Error {}

type Output = Exclude<AudioRoute, "unknown">;
const isOutput = (route: AudioRoute): route is Output => route !== "unknown";
const android = Platform.OS === "android";

interface Active {
  readonly title: string;
  readonly outgoing: boolean;
  muted: boolean;
  held: boolean;
  others: number;
  /** Whether anyone else connected. Until then an outgoing call is calling. */
  met: boolean;
  connected: boolean;
  connectedOnce: boolean;
  resuming: boolean;
  /** The system call: CallKit's call UUID, or the ring's alert ID on Android. */
  systemCallId: string | undefined;
  /** The system call ended already, so it needs no endCall. */
  systemEnded: boolean;
  /** The system call was reported connected. */
  reported: boolean;
  live: LiveSessionHandle | undefined;
  /** The live session this device started. Only its creator can ring members and end it. */
  startedId: string | undefined;
  /** The request ID of a join whose outcome isn't known yet, so retrying it can't join twice. */
  joinId: string | undefined;
  participation: LiveParticipationHandle | undefined;
  /** The call's one room, connected again after a drop. */
  room: Room | undefined;
  connector: LiveConnector<RoomConnection> | undefined;
  /** Android: LiveKit's audio session was started. On iOS, CallKit activates the audio session. */
  audio: boolean;
  /** Android: the routes of the system call, if there is one. */
  routes: readonly AudioRoute[];
  output: string | undefined;
  outputs: readonly string[];
  ended: boolean;
  readonly timers: Set<ReturnType<typeof setTimeout>>;
  /** Wakes the call's sleeping work when it ends. */
  readonly wakers: Set<() => void>;
  /** The call's work in progress. Each promise resolves, never rejects. */
  readonly work: Set<Promise<void>>;
  detach: (() => void) | undefined;
  /** The release of the calls before this one, which this one waits for. */
  readonly after: Promise<void>;
}

export interface CallControllerOptions {
  /** A version 4 UUID generator: the React Native platform's `randomUUID`. */
  readonly randomUUID: () => string;
  readonly onError: (error: unknown) => void;
}

/**
 * Joins the calls the user answers in the system UI, starts the user's own, and leaves each one on hang-up. The
 * caller's hang-up ends a call for everyone; anyone else just leaves. `subscribe` and `current` suit
 * `useSyncExternalStore`.
 */
export class CallController {
  readonly #client: ConvoHopClient;
  readonly #randomUUID: () => string;
  readonly #onError: (error: unknown) => void;
  readonly #listeners = new Set<() => void>();
  readonly #answered = new Set<string>();
  readonly #stop: (() => void)[];
  #active: Active | undefined;
  #view: CallView | undefined;
  /** Releases ended calls one after another. Never rejects. */
  #released: Promise<void> = Promise.resolve();
  #closed = false;

  constructor(client: ConvoHopClient, { randomUUID, onError }: CallControllerOptions) {
    this.#client = client;
    this.#randomUUID = randomUUID;
    this.#onError = onError;
    this.#stop = [
      subscribeAnsweredCalls(call => { this.#answer(call); }),
      onCallEvent(event => { this.#event(event); }),
    ];
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => { this.#listeners.delete(listener); };
  };
  /** The current call, or undefined. The same object until the call changes. */
  readonly current = (): CallView | undefined => this.#view;

  /** Calls a conversation's members: starts a voice call and rings the others, or joins the call already running there. */
  startCall(conversationId: string, title: string): void {
    if (this.#closed) return;
    this.#start({ title, outgoing: true }, async active => {
      const live = await this.#startOrJoin(active, conversationId);
      if (!android) {
        // CallKit shows the call and activates its audio session. Android joins without a system call.
        active.systemCallId = await startOutgoingCall({ liveSessionId: live.liveSessionId, conversationId, handle: title, hasVideo: false });
        this.#ensure(active);
      }
      this.#later(active, NO_ANSWER_MS, () => { if (!active.met) this.#finish(active); });
      if (active.startedId !== undefined) this.#track(active, this.#ring(active, live));
      await this.#keepConnecting(active, CONNECT_DELAYS_MS);
    });
  }
  /** Mutes or unmutes the microphone. With a system call, the system UI shows it too. */
  setMuted(muted: boolean): void {
    const active = this.#active;
    if (active === undefined || active.muted === muted) return;
    if (active.systemCallId !== undefined) {
      // The call's `changed` event applies it.
      this.#track(active, setSystemMuted(active.systemCallId, muted).catch(this.#reporter(active)));
      return;
    }
    active.muted = muted;
    this.#microphone(active);
    this.#publish();
  }
  /** Android: plays the call's audio on one of `outputs`. */
  chooseOutput(output: string): void {
    const active = this.#active;
    if (active === undefined) return;
    const id = active.systemCallId;
    if (id !== undefined) {
      const route = active.routes.filter(isOutput).find(value => value === output);
      // The call's `changed` event shows it.
      if (route !== undefined) this.#track(active, setAudioRoute(id, route).catch(this.#reporter(active)));
    } else if (active.audio && active.outputs.includes(output)) {
      this.#track(active, AudioSession.selectAudioOutput(output).then(() => {
        active.output = output;
        this.#publish();
      }, this.#reporter(active)));
    }
  }
  /** iOS: shows the system's audio route picker. */
  showOutputPicker(): void {
    const active = this.#active;
    if (active !== undefined) this.#track(active, AudioSession.showAudioRoutePicker().catch(this.#reporter(active)));
  }
  hangUp(): void {
    if (this.#active !== undefined) this.#finish(this.#active);
  }
  /** Hangs up, stops joining answered calls, and resolves once every call has been released. Never rejects. */
  close(): Promise<void> {
    if (!this.#closed) {
      this.#closed = true;
      for (const stop of this.#stop.splice(0)) stop();
      this.hangUp();
      this.#listeners.clear();
    }
    return this.#released;
  }

  #answer(call: Call): void {
    if (this.#closed || call.state === "ended" || this.#answered.has(call.id)) return;
    this.#answered.add(call.id);
    this.#start({
      title: call.callerName ?? "Incoming call", outgoing: false, muted: call.muted, systemCallId: call.id,
      routes: android ? call.availableAudioRoutes : [], output: android ? call.audioRoute : undefined,
    }, async active => {
      active.live = await this.#client.liveSession(call.liveSessionId);
      await this.#keepConnecting(active, CONNECT_DELAYS_MS);
    });
  }
  #event({ type, call }: CallEvent): void {
    const active = this.#active;
    if (active === undefined || active.systemCallId !== call.id) return;
    if (type === "ended") {
      active.systemEnded = true;
      this.#finish(active);
      return;
    }
    if (type !== "changed") return;
    const held = call.state === "held";
    if (call.muted !== active.muted || held !== active.held) {
      active.muted = call.muted;
      active.held = held;
      this.#microphone(active);
    }
    if (android) {
      active.routes = call.availableAudioRoutes;
      active.output = call.audioRoute;
      active.outputs = call.availableAudioRoutes.filter(isOutput);
    }
    this.#publish();
  }

  #start(init: { title: string; outgoing: boolean; muted?: boolean; systemCallId?: string; routes?: readonly AudioRoute[];
    output?: string | undefined }, body: (active: Active) => Promise<void>): void {
    if (this.#active !== undefined) this.#finish(this.#active);
    const routes = init.routes ?? [];
    const active: Active = {
      title: init.title, outgoing: init.outgoing, muted: init.muted ?? false, held: false, others: 0, met: false,
      connected: false, connectedOnce: false, resuming: false, systemCallId: init.systemCallId, systemEnded: false,
      reported: false, live: undefined, startedId: undefined, joinId: undefined, participation: undefined,
      room: undefined, connector: undefined, audio: false, routes, output: init.output, outputs: routes.filter(isOutput),
      ended: false, timers: new Set(), wakers: new Set(), work: new Set(), detach: undefined, after: this.#released,
    };
    this.#active = active;
    this.#track(active, this.#guard(active, body));
    this.#publish();
  }
  /** Runs a call's work once the previous calls were released. A failure ends the call. */
  async #guard(active: Active, body: (active: Active) => Promise<void>): Promise<void> {
    try {
      await active.after;
      this.#ensure(active);
      await body(active);
    } catch (error) {
      if (active.ended) return;
      // The call ended before this device joined it.
      if (!(error instanceof ConvoHopProblem && error.code === "LIVE_SESSION_CLOSED")) this.#onError(error);
      this.#finish(active);
    }
  }
  #ensure(active: Active): void {
    if (active.ended) throw new CallEnded("The call ended");
  }
  #track(active: Active, work: Promise<void>): void {
    const tracked = work.finally(() => { active.work.delete(tracked); });
    active.work.add(tracked);
  }
  #reporter(active: Active): (error: unknown) => void {
    return error => { if (!active.ended) this.#onError(error); };
  }
  #later(active: Active, delayMs: number, run: () => void): void {
    const timer = setTimeout(() => {
      active.timers.delete(timer);
      if (!active.ended) run();
    }, delayMs);
    active.timers.add(timer);
  }
  /** Waits, or less if the call ends meanwhile. */
  #sleep(active: Active, delayMs: number): Promise<void> {
    if (active.ended || delayMs <= 0) return Promise.resolve();
    return new Promise(resolve => {
      const wake = () => {
        clearTimeout(timer);
        active.wakers.delete(wake);
        resolve();
      };
      const timer = setTimeout(wake, delayMs);
      active.wakers.add(wake);
    });
  }

  async #startOrJoin(active: Active, conversationId: string): Promise<LiveSessionHandle> {
    const live = this.#client.conversation(conversationId).live;
    try {
      const start = await live.startVoice();
      active.startedId = start.liveSessionId;
      // No abort signal: a call hung up meanwhile still ends the session once it is ready.
      active.live = await start.ready({ timeoutMs: 30_000 });
    } catch (error) {
      if (!(error instanceof ConvoHopProblem) || error.code !== "LIVE_SESSION_EXISTS") throw error;
      // Someone already started a call here: join it.
      const current = await live.current();
      if (current === null) throw error;
      active.live = current;
    }
    this.#ensure(active);
    return active.live;
  }
  /** Rings the conversation's other members. Only the session's creator can. */
  async #ring(active: Active, live: LiveSessionHandle): Promise<void> {
    try {
      const me = this.#client.principalId, principalIds: string[] = [];
      let cursor: string | undefined;
      do {
        const page = await this.#client.members(live.conversationId, cursor === undefined ? {} : { cursor });
        this.#ensure(active);
        for (const member of page.items) if (member.status === "active" && member.principalId !== me) principalIds.push(member.principalId);
        cursor = typeof page.nextCursor === "string" ? page.nextCursor : undefined;
      } while (cursor !== undefined);
      if (principalIds.length > 0) await live.alerts.send(principalIds);
    } catch (error) {
      // The call goes on: members can still join it from the conversation.
      if (!active.ended) this.#onError(error);
    }
  }
  /** Connects the call's media, again after each failure, unless the call is over or can't work. */
  async #keepConnecting(active: Active, delaysMs: readonly number[]): Promise<void> {
    let failure: unknown;
    for (const [attempt, delayMs] of delaysMs.entries()) {
      await this.#sleep(active, delayMs);
      this.#ensure(active);
      const live = active.live;
      if (live === undefined) throw new Error("The call has no live session");
      try {
        // A fresh handle's snapshot is current. Later, check whether the call ended for everyone meanwhile.
        const { state } = attempt === 0 ? live.snapshot : await live.get();
        this.#ensure(active);
        if (state === "ENDED" || state === "FAILED") {
          this.#finish(active);
          return;
        }
        await this.#connect(active, live);
        return;
      } catch (error) {
        // Retrying a rejected request won't change its outcome.
        if (error instanceof CallEnded || (error instanceof ConvoHopProblem && error.outcome === "rejected")) throw error;
        failure = error;
      }
    }
    throw failure;
  }
  /** Joins the live session, unless already joined, and connects its media. */
  async #connect(active: Active, live: LiveSessionHandle): Promise<void> {
    let participation = await live.participation();
    this.#ensure(active);
    if (participation === null || participation.snapshot.state === "LEFT" || participation.snapshot.state === "LEAVING") {
      const requestId = active.joinId ?? this.#randomUUID();
      active.joinId = requestId;
      participation = await live.join({ requestId });
      active.joinId = undefined;
    }
    active.participation = participation;
    this.#ensure(active);
    if (android && !active.audio) {
      await AudioSession.startAudioSession();
      active.audio = true;
      this.#ensure(active);
      if (active.systemCallId === undefined) {
        active.outputs = await AudioSession.getAudioOutputs();
        this.#ensure(active);
      }
    }
    if (active.outgoing && active.systemCallId !== undefined && !active.connectedOnce) {
      await reportConnecting(active.systemCallId);
      this.#ensure(active);
    }
    const connection = await participation.connectWith(active.connector ?? this.#room(active));
    this.#ensure(active);
    // It dropped already: onDisconnected connects again.
    if (!connection.connected) return;
    active.connected = true;
    active.connectedOnce = true;
    active.resuming = false;
    this.#count(active);
    this.#microphone(active);
    this.#reportConnected(active);
    this.#publish();
  }
  #room(active: Active): LiveConnector<RoomConnection> {
    const room = createRoom();
    const count = () => { this.#count(active); };
    room.on(RoomEvent.ParticipantConnected, count).on(RoomEvent.ParticipantDisconnected, count);
    active.detach = () => {
      room.off(RoomEvent.ParticipantConnected, count).off(RoomEvent.ParticipantDisconnected, count);
    };
    active.room = room;
    active.connector = createRoomConnector(room, {
      onResuming: () => {
        active.resuming = true;
        this.#publish();
      },
      onResumed: () => {
        active.resuming = false;
        this.#publish();
      },
      onDisconnected: () => { this.#disconnected(active); },
    });
    return active.connector;
  }
  #count(active: Active): void {
    const room = active.room;
    if (active.ended || room === undefined) return;
    active.others = room.remoteParticipants.size;
    if (active.others > 0) active.met = true;
    else if (active.met) {
      // Everyone else left: hang up, unless someone comes back.
      this.#later(active, ALONE_MS, () => {
        if (room.state === ConnectionState.Connected && room.remoteParticipants.size === 0) this.#finish(active);
      });
    }
    this.#reportConnected(active);
    this.#publish();
  }
  /** Tells the system the call connected: an answered call once its media connects, an outgoing one once answered. */
  #reportConnected(active: Active): void {
    const id = active.systemCallId;
    if (id === undefined || active.reported || !active.connected || (active.outgoing && !active.met)) return;
    active.reported = true;
    this.#track(active, reportConnected(id).catch(this.#reporter(active)));
  }
  #microphone(active: Active): void {
    const room = active.room;
    if (room === undefined || !active.connected || active.ended) return;
    this.#track(active, room.localParticipant.setMicrophoneEnabled(!active.muted && !active.held).then(() => {}, this.#reporter(active)));
  }
  /** The media connection dropped for good: connect again, unless the call is over. */
  #disconnected(active: Active): void {
    if (active.ended) return;
    active.connected = false;
    active.resuming = false;
    this.#publish();
    this.#track(active, this.#guard(active, () => this.#keepConnecting(active, RECONNECT_DELAYS_MS)));
  }

  #finish(active: Active): void {
    if (active.ended) return;
    active.ended = true;
    for (const timer of active.timers) clearTimeout(timer);
    active.timers.clear();
    for (const wake of [...active.wakers]) wake();
    active.detach?.();
    active.detach = undefined;
    if (this.#active === active) {
      this.#active = undefined;
      this.#publish();
    }
    this.#released = this.#released.then(() => this.#release(active));
  }
  /** Once the call's work stops: ends the system call, leaves the live session and stops the audio session. */
  async #release(active: Active): Promise<void> {
    while (active.work.size > 0) await Promise.allSettled([...active.work]);
    const failures: unknown[] = [];
    const attempt = async (step: () => Promise<unknown>) => {
      try {
        await step();
      } catch (error) {
        failures.push(error);
      }
    };
    const { systemCallId, participation } = active;
    if (systemCallId !== undefined && !active.systemEnded) await attempt(() => endCall(systemCallId));
    // Leaving disconnects the media too.
    if (participation !== undefined) await attempt(() => participation.leave());
    if (active.startedId !== undefined) await attempt(() => this.#end(active));
    if (active.audio) await attempt(() => AudioSession.stopAudioSession());
    for (const failure of failures) this.#onError(failure);
  }
  /** Ends the live session this device started, for everyone. */
  async #end(active: Active): Promise<void> {
    const startedId = active.startedId;
    if (startedId === undefined) return;
    // A session that never became ready ends too.
    const live = active.live ?? await this.#client.liveSession(startedId);
    if (live.snapshot.state === "ENDED" || live.snapshot.state === "FAILED") return;
    let requestId: string | undefined;
    for (;;) {
      try {
        await live.end(requestId === undefined ? {} : { requestId });
        return;
      } catch (error) {
        if (!(error instanceof ConvoHopProblem)) throw error;
        if (error.code === "LIVE_SESSION_CLOSED") return;
        // Someone joined or left meanwhile. A new request reads the session's current revision; retry once.
        if (error.code !== "REVISION_CONFLICT" || requestId !== undefined) throw error;
        requestId = this.#randomUUID();
      }
    }
  }

  #publish(): void {
    const active = this.#active;
    this.#view = active === undefined ? undefined : {
      title: active.title,
      outgoing: active.outgoing,
      status: active.held ? "held"
        : active.resuming || (active.connectedOnce && !active.connected) ? "reconnecting"
        : active.outgoing && !active.met ? "calling"
        : active.connected ? "connected" : "joining",
      muted: active.muted,
      others: active.others,
      output: active.output,
      outputs: active.outputs,
    };
    for (const listener of [...this.#listeners]) listener();
  }
}
