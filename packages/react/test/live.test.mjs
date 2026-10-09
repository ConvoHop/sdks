import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { act } from "react-test-renderer";
import { useConversation, useLiveSession, useMediaConnection } from "../dist/index.js";
import { conversationA, conversationB, deferred, liveEvent, renderHook, stubClient, waitFor } from "./support.mjs";

/** A client whose live-session loads wait for `answer`. */
function liveClient() {
  const loads = [];
  const client = stubClient({
    conversation(conversationId) {
      return { live: { current() { const load = { conversationId, ...deferred() }; loads.push(load); return load.promise; } } };
    },
  });
  /** Settles every waiting load: with `value`, or with `value(conversationId)` when it's a function. */
  const answer = value => {
    for (const load of loads.splice(0)) {
      if (value instanceof Error) load.reject(value);
      else load.resolve(typeof value === "function" ? value(load.conversationId) : value);
    }
  };
  return { client, loads, answer };
}
const session = (conversationId, revision = "1") =>
  ({ snapshot: { liveSessionId: "6a1d0f3e-5b2c-4d7e-9f80-1a2b3c4d5e6f", conversationId, state: "active", revision } });

describe("useLiveSession", () => {
  test("loads the conversation's current live session", async () => {
    const { client, answer } = liveClient();
    const { result, unmount } = await renderHook(() => useLiveSession(conversationA), { client });
    assert.equal(result.current.status, "loading");
    assert.equal(result.current.session, undefined);
    const current = session(conversationA);
    await act(async () => { answer(current); });
    assert.equal(result.current.status, "ready");
    assert.equal(result.current.session, current);
    assert.equal(result.current.error, undefined);
    await unmount();
  });

  test("reloads on live events a mounted conversation receives, keeping an unchanged session", async () => {
    const { client, loads, answer } = liveClient();
    const { result, unmount } = await renderHook(() => ({ conversation: useConversation(conversationA), live: useLiveSession(conversationA) }),
      { client });
    await waitFor(() => result.current.conversation.status === "live");
    const first = session(conversationA);
    await act(async () => { answer(first); });
    const [stream] = client.streams.filter(item => !item.closed);

    await act(() => stream.apply([liveEvent(1, "live.participationJoined")]));
    assert.equal(loads.length, 1);
    await act(async () => { answer(session(conversationA)); });
    assert.equal(result.current.live.session, first);

    await act(() => stream.apply([liveEvent(2, "live.ended")]));
    await act(async () => { answer(null); });
    assert.equal(result.current.live.status, "ready");
    assert.equal(result.current.live.session, null);

    await act(() => stream.apply([{ ...liveEvent(3), type: "message.deleted", payload: { messageId: conversationB, revision: "2" } }]));
    assert.equal(loads.length, 0);
    await unmount();
  });

  test("calls during a load share one more load", async () => {
    const { client, loads, answer } = liveClient();
    const { result, unmount } = await renderHook(() => useLiveSession(conversationA), { client });
    await act(async () => { answer(session(conversationA, "1")); });
    let calls;
    await act(async () => { calls = [result.current.refresh(), result.current.refresh(), result.current.refresh()]; });
    assert.equal(loads.length, 1);
    await act(async () => { answer(session(conversationA, "2")); });
    assert.equal(loads.length, 1);
    const last = session(conversationA, "3");
    await act(async () => { answer(last); await Promise.all(calls); });
    assert.equal(loads.length, 0);
    assert.equal(result.current.session, last);
    await unmount();
  });

  test("keeps the last session when a load fails", async () => {
    const { client, answer } = liveClient();
    const { result, unmount } = await renderHook(() => useLiveSession(conversationA), { client });
    const current = session(conversationA);
    await act(async () => { answer(current); });
    let reload;
    await act(async () => { reload = result.current.refresh(); answer(new Error("offline")); await reload; });
    assert.equal(result.current.status, "error");
    assert.equal(result.current.error.message, "offline");
    assert.equal(result.current.session, current);
    await act(async () => { reload = result.current.refresh(); answer(session(conversationA)); await reload; });
    assert.equal(result.current.status, "ready");
    assert.equal(result.current.error, undefined);
    assert.equal(result.current.session, current);
    await unmount();
  });

  test("a new conversation never shows the old one's session, and late loads are ignored", async () => {
    const { client, loads, answer } = liveClient();
    const seen = [];
    const { result, rerender, unmount } = await renderHook(id => {
      const view = useLiveSession(id);
      seen.push([id, view.session?.snapshot.conversationId]);
      return view;
    }, { client, props: conversationA });
    await act(async () => { answer(session); });
    const stale = loads.length;
    await rerender({ props: conversationB });
    assert.equal(result.current.session, undefined);
    assert.equal(loads.length, stale + 1);
    await act(async () => { answer(session); });
    assert.equal(result.current.session.snapshot.conversationId, conversationB);
    await act(async () => { result.current.refresh(); });
    await unmount();
    await act(async () => { answer(session(conversationA)); });
    for (const [id, shown] of seen) if (shown !== undefined) assert.equal(shown, id);
  });
});

/** A participation whose connect() calls wait to be opened, failed or answered with another connection. */
function participation() {
  const attempts = [];
  const value = {
    attempts,
    connect(options) {
      const attempt = { options, ...deferred() };
      attempts.push(attempt);
      return attempt.promise;
    },
  };
  return value;
}
/** Opens `attempt` with a connection that keeps its options' callbacks, as MediaConnection does. */
function open(owner, attempt, state = {}) {
  const connection = {
    options: attempt.options, connected: true, resuming: false, disconnects: 0, audioStarts: 0, ...state,
    async disconnect() { connection.disconnects++; connection.connected = false; },
    reconnect() { connection.connected = false; return owner.connect(connection.options); },
    async enableAudio() { connection.audioStarts++; },
  };
  attempt.resolve(connection);
  return connection;
}
const remote = (trackId, kind = "audio") => ({ trackId, participantIdentity: "bob", kind, element: { trackId } });

describe("useMediaConnection", () => {
  test("connects on request, tracks remote media, forwards callbacks and disconnects on unmount", async () => {
    const { result, unmount } = await renderHook(() => useMediaConnection());
    assert.equal(result.current.status, "idle");
    const owner = participation();
    const forwarded = [];
    let connecting;
    await act(async () => {
      connecting = result.current.connect(owner, { requestId: "c1", iceTransportPolicy: "relay",
        onTrack: media => { forwarded.push(["track", media.trackId]); },
        onTrackRemoved: media => { forwarded.push(["removed", media.trackId]); } });
    });
    assert.equal(result.current.status, "connecting");
    const [attempt] = owner.attempts;
    assert.equal(attempt.options.requestId, "c1");
    assert.equal(attempt.options.iceTransportPolicy, "relay");
    let connection;
    await act(async () => { connection = open(owner, attempt); assert.equal(await connecting, connection); });
    assert.equal(result.current.status, "connected");
    assert.equal(result.current.connection, connection);

    const audio = remote("t1"), video = remote("t2", "video");
    await act(async () => { attempt.options.onTrack(audio); attempt.options.onTrack(video); });
    assert.deepEqual(result.current.tracks, [audio, video]);
    await act(async () => { attempt.options.onTrackRemoved(audio); });
    assert.deepEqual(result.current.tracks, [video]);
    assert.deepEqual(forwarded, [["track", "t1"], ["track", "t2"], ["removed", "t1"]]);

    await assert.rejects(result.current.connect(owner), /Disconnect the current media connection first/);
    assert.equal(owner.attempts.length, 1);
    await unmount();
    assert.equal(connection.disconnects, 1);
  });

  test("a connect after a disconnect waits for the abandoned attempt, which closes once it opens", async () => {
    const { result, unmount } = await renderHook(() => useMediaConnection());
    const owner = participation();
    let first, stopping, second;
    await act(async () => { first = result.current.connect(owner); });
    await act(async () => { stopping = result.current.disconnect(); });
    assert.equal(result.current.status, "idle");
    await act(async () => { second = result.current.connect(owner); });
    assert.equal(result.current.status, "connecting");
    assert.equal(owner.attempts.length, 1);

    const [abandoned] = owner.attempts;
    let late;
    await act(async () => {
      late = open(owner, abandoned);
      await assert.rejects(first, /closed while it opened/);
      await stopping;
    });
    assert.equal(late.disconnects, 1);
    assert.equal(owner.attempts.length, 2);
    const [, current] = owner.attempts;
    assert.notEqual(current.options.onTrack, abandoned.options.onTrack);
    await act(async () => { abandoned.options.onTrack(remote("stale")); abandoned.options.onDisconnected(); });
    assert.equal(result.current.status, "connecting");
    assert.deepEqual(result.current.tracks, []);

    let connection;
    await act(async () => { connection = open(owner, current); await second; });
    assert.equal(result.current.status, "connected");
    assert.equal(result.current.connection, connection);
    await unmount();
    assert.equal(connection.disconnects, 1);
  });

  test("unmounting while connecting closes the connection once it opens", async () => {
    const { result, unmount } = await renderHook(() => useMediaConnection());
    const owner = participation();
    let connecting;
    await act(async () => { connecting = result.current.connect(owner); });
    await unmount();
    const connection = open(owner, owner.attempts[0]);
    await assert.rejects(connecting, /closed while it opened/);
    assert.equal(connection.disconnects, 1);
    await assert.rejects(result.current.connect(owner), /isn't mounted/);
    assert.equal(owner.attempts.length, 1);
  });

  test("doesn't take over media connected elsewhere", async () => {
    const { result, unmount } = await renderHook(() => useMediaConnection());
    const owner = participation();
    let connecting;
    await act(async () => { connecting = result.current.connect(owner); });
    const elsewhere = { options: { onTrack() {} }, connected: true, resuming: false, disconnects: 0,
      async disconnect() { elsewhere.disconnects++; } };
    await act(async () => {
      owner.attempts[0].resolve(elsewhere);
      await assert.rejects(connecting, /connected elsewhere/);
    });
    assert.equal(result.current.status, "failed");
    assert.match(result.current.error.message, /connected elsewhere/);
    assert.equal(result.current.connection, undefined);
    await assert.rejects(result.current.reconnect(), /no media connection to reconnect/);
    await unmount();
    assert.equal(elsewhere.disconnects, 0);
  });

  test("shows a failed connect and allows another", async () => {
    const { result, unmount } = await renderHook(() => useMediaConnection());
    const owner = participation();
    let connecting;
    await act(async () => { connecting = result.current.connect(owner); });
    await act(async () => {
      owner.attempts[0].reject(new Error("admission refused"));
      await assert.rejects(connecting, /admission refused/);
    });
    assert.equal(result.current.status, "failed");
    assert.equal(result.current.error.message, "admission refused");
    await act(async () => { connecting = result.current.connect(owner); });
    assert.equal(result.current.status, "connecting");
    assert.equal(result.current.error, undefined);
    await act(async () => { open(owner, owner.attempts[1]); await connecting; });
    assert.equal(result.current.status, "connected");
    await unmount();
  });

  test("a connection that dropped while it opened shows as disconnected", async () => {
    const { result, unmount } = await renderHook(() => useMediaConnection());
    const owner = participation();
    let connecting, connection;
    await act(async () => { connecting = result.current.connect(owner); });
    await act(async () => { connection = open(owner, owner.attempts[0], { connected: false }); await connecting; });
    assert.equal(result.current.status, "disconnected");
    assert.equal(result.current.connection, connection);
    await unmount();
  });

  test("follows resumes and drops, and reconnects with the same callbacks", async () => {
    const { result, unmount } = await renderHook(() => useMediaConnection());
    const owner = participation();
    const forwarded = [];
    let connecting;
    await act(async () => {
      connecting = result.current.connect(owner, { onDisconnected: () => { forwarded.push("disconnected"); },
        onResuming: () => { forwarded.push("resuming"); }, onResumed: () => { forwarded.push("resumed"); } });
    });
    const [attempt] = owner.attempts;
    let first;
    await act(async () => { first = open(owner, attempt); await connecting; });
    await act(async () => { attempt.options.onResuming(); });
    assert.equal(result.current.status, "resuming");
    await act(async () => { attempt.options.onResumed(); });
    assert.equal(result.current.status, "connected");

    await act(async () => { attempt.options.onTrack(remote("t1")); });
    await act(async () => { first.connected = false; attempt.options.onDisconnected(); });
    assert.equal(result.current.status, "disconnected");
    assert.deepEqual(result.current.tracks, []);
    assert.equal(result.current.connection, first);
    assert.deepEqual(forwarded, ["resuming", "resumed", "disconnected"]);

    let reconnecting;
    await act(async () => { reconnecting = result.current.reconnect(); });
    assert.equal(result.current.status, "connecting");
    await assert.rejects(result.current.reconnect(), /already connecting/);
    const [, again] = owner.attempts;
    assert.equal(again.options, attempt.options);
    let second;
    await act(async () => { second = open(owner, again); assert.equal(await reconnecting, second); });
    assert.equal(result.current.status, "connected");
    assert.equal(result.current.connection, second);
    await act(async () => { again.options.onTrack(remote("t2")); });
    assert.deepEqual(result.current.tracks.map(media => media.trackId), ["t2"]);
    await unmount();
    assert.equal(second.disconnects, 1);
  });

  test("a disconnect during a reconnect closes the new connection", async () => {
    const { result, unmount } = await renderHook(() => useMediaConnection());
    const owner = participation();
    let connecting, reconnecting, stopping;
    await act(async () => { connecting = result.current.connect(owner); });
    await act(async () => { open(owner, owner.attempts[0]); await connecting; });
    await act(async () => { reconnecting = result.current.reconnect(); });
    await act(async () => { stopping = result.current.disconnect(); });
    assert.equal(result.current.status, "idle");
    let late;
    await act(async () => {
      late = open(owner, owner.attempts[1]);
      await assert.rejects(reconnecting, /closed while it opened/);
      await stopping;
    });
    assert.equal(late.disconnects, 1);
    assert.equal(result.current.status, "idle");
    await unmount();
  });

  test("shows blocked audio until enableAudio()", async () => {
    const { result, unmount } = await renderHook(() => useMediaConnection());
    await assert.rejects(result.current.enableAudio(), /no media connection/);
    const owner = participation();
    let connecting, connection;
    await act(async () => { connecting = result.current.connect(owner); });
    await act(async () => { connection = open(owner, owner.attempts[0]); await connecting; });
    await act(async () => { owner.attempts[0].options.onAudioPlaybackBlocked(); });
    assert.equal(result.current.audioBlocked, true);
    await act(() => result.current.enableAudio());
    assert.equal(connection.audioStarts, 1);
    assert.equal(result.current.audioBlocked, false);
    await unmount();
  });
});
