import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { act } from "react-test-renderer";
import { ConvoHopProvider, useConversation, useConvoHopClient, useOutbox } from "../dist/index.js";
import { alice, conversationA, conversationB, fakeOutbox, liveEvent, renderHook, stubClient, waitFor } from "./support.mjs";

const open = client => client.streams.filter(stream => !stream.closed);

describe("ConvoHopProvider", () => {
  test("provides its client to the hooks below it", async () => {
    const client = stubClient();
    const { result, unmount } = await renderHook(() => useConvoHopClient(), { client });
    assert.equal(result.current, client);
    await unmount();
  });

  test("hooks outside a provider throw", async () => {
    const { result, unmount } = await renderHook(() => {
      try { return useConvoHopClient(); } catch (error) { return error; }
    });
    assert.match(result.current.message, /inside a ConvoHopProvider/);
    await unmount();
  });

  test("rejects an outbox of another client", () => {
    // The check runs before the provider's first hook, so calling the component shows it without an error boundary.
    assert.throws(() => ConvoHopProvider({ client: stubClient(), outbox: fakeOutbox(stubClient()) }),
      { name: "TypeError", message: /belongs to another client/ });
  });
});

describe("useConversation", () => {
  test("opens one store while mounted, through StrictMode's remount, and closes it on unmount", async () => {
    const client = stubClient();
    const { result, unmount } = await renderHook(() => useConversation(conversationA), { client });
    await waitFor(() => result.current.status === "live");
    const { store } = result.current;
    assert.equal(store.conversationId, conversationA);
    assert.equal(result.current.conversation.conversationId, conversationA);
    assert.deepEqual(result.current.messages, []);
    assert.equal(result.current.hasOlder, false);
    assert.deepEqual(open(client).length, 1);

    await unmount();
    assert.equal(store.snapshot.status, "closed");
    assert.deepEqual(open(client), []);
  });

  test("passes deleted messages through as the authority sends them, with no text or props", async () => {
    const message = (sequence, fields = {}) => ({ messageId: `5a1b2c3d-4e5f-4a6b-8c7d-00000000000${sequence}`,
      conversationId: conversationA, authorId: alice, sequence: String(sequence), revision: "1", revisionSequence: String(sequence),
      createdAt: new Date(0).toISOString(), deleted: false, text: `message ${sequence}`, props: { sequence }, editedAt: null, ...fields });
    const deletion = { deleted: true, text: null, props: null, revision: "2" };
    const gone = message(1, { ...deletion, revisionSequence: "3" }), shown = message(2);
    const client = stubClient({
      async getConversation(conversationId) {
        return { conversationId, title: "Stub", latestSequence: "3",
          membership: { principalId: alice, role: "member", membershipEpoch: "1", visibilityEpoch: "1" } };
      },
      async messages() { return { items: [gone, shown], complete: true, nextCursor: null }; },
      async getMessage(conversationId, messageId) { return { ...shown, ...deletion, messageId, revisionSequence: "4" }; },
    });
    const { result, unmount } = await renderHook(() => useConversation(conversationA), { client });
    await waitFor(() => result.current.status === "live");
    const shownAs = () => result.current.messages.map(each => [each.sequence, each.deleted, each.text, each.props]);
    assert.deepEqual(shownAs(), [["1", true, null, null], ["2", false, "message 2", { sequence: 2 }]]);

    const [stream] = open(client);
    await act(() => stream.apply([{ ...liveEvent(4, "message.deleted"), payload: { messageId: shown.messageId, revision: "2" } }]));
    assert.deepEqual(shownAs(), [["1", true, null, null], ["2", true, null, null]]);
    assert.equal(result.current.error, undefined);
    await unmount();
  });

  test("without a conversation, shows idle and refuses actions", async () => {
    const client = stubClient();
    const { result, unmount } = await renderHook(() => useConversation(null), { client });
    const view = result.current;
    assert.equal(view.status, "idle");
    assert.equal(view.store, undefined);
    assert.deepEqual([view.messages, view.pending, view.receipts], [[], [], []]);
    assert.throws(() => view.send("hello"), /isn't open/);
    for (const action of ["open", "resync", "loadOlder", "markRead", "markDelivered"])
      await assert.rejects(view[action](), /isn't open/, action);
    assert.equal(client.streams.length, 0);
    await unmount();
  });

  test("a new conversation closes the old store and never shows its state", async () => {
    const client = stubClient();
    const seen = [];
    const { result, rerender, unmount } = await renderHook(id => {
      const view = useConversation(id);
      seen.push({ id, shown: view.conversation?.conversationId, store: view.store?.conversationId });
      return view;
    }, { client, props: conversationA });
    await waitFor(() => result.current.status === "live");
    const first = result.current.store;

    await rerender({ props: conversationB });
    assert.equal(first.snapshot.status, "closed");
    await waitFor(() => result.current.status === "live");
    assert.equal(result.current.conversation.conversationId, conversationB);
    assert.deepEqual(open(client).map(stream => stream.conversationId), [conversationB]);

    await rerender({ props: null });
    assert.equal(result.current.status, "idle");
    assert.deepEqual(open(client), []);
    for (const { id, shown, store } of seen) {
      if (shown !== undefined) assert.equal(shown, id);
      if (store !== undefined) assert.equal(store, id);
    }
    await unmount();
  });

  test("sends through the provider's outbox, which it neither closes nor keeps subscribed", async () => {
    const client = stubClient();
    const outbox = fakeOutbox(client);
    const { result, unmount } = await renderHook(() => ({ view: useConversation(conversationA), entries: useOutbox() }),
      { client, outbox });
    await waitFor(() => result.current.view.status === "live");
    let entry;
    await act(async () => { entry = result.current.view.send("hello", { draft: "d1" }); });
    assert.deepEqual(outbox.sent.map(sent => [sent.conversationId, sent.text, sent.props]), [[conversationA, "hello", { draft: "d1" }]]);
    assert.deepEqual(result.current.view.pending.map(pending => pending.requestId), [entry.requestId]);
    assert.deepEqual(result.current.entries.map(queued => queued.requestId), [entry.requestId]);

    await unmount();
    assert.equal(outbox.closed, false);
    assert.equal(outbox.listeners, 0);
  });

  test("shows a failed open, recovers through open() and calls the latest callbacks without reopening", async () => {
    const calls = [];
    const failure = new Error("socket refused");
    let refuse = true;
    const client = stubClient();
    const watch = client.watch;
    client.watch = (...args) => refuse ? Promise.reject(failure) : watch(...args);
    const { result, rerender, unmount } = await renderHook(tag => useConversation(conversationA, {
      onEvent: event => { calls.push([tag, event.type]); },
      onError: error => { calls.push([tag, error.message]); },
    }), { client, props: "first" });
    await waitFor(() => result.current.status === "error");
    assert.equal(result.current.error, failure);
    assert.deepEqual(calls, [["first", "socket refused"]]);

    const { store } = result.current;
    await rerender({ props: "second" });
    assert.equal(result.current.store, store);
    refuse = false;
    await act(() => result.current.open());
    assert.equal(result.current.status, "live");
    assert.equal(result.current.error, undefined);
    const [stream] = open(client);
    await act(() => stream.apply([liveEvent(1)]));
    assert.deepEqual(calls, [["first", "socket refused"], ["second", "live.started"]]);
    assert.equal(client.streams.length, 1);
    await unmount();
  });
});

describe("useOutbox", () => {
  test("follows an outbox it's given", async () => {
    const outbox = fakeOutbox(stubClient());
    const { result, unmount } = await renderHook(() => useOutbox(outbox));
    assert.deepEqual(result.current, []);
    await act(async () => { outbox.send(conversationA, "queued"); });
    assert.deepEqual(result.current.map(entry => entry.text), ["queued"]);
    await unmount();
    assert.equal(outbox.listeners, 0);
  });

  test("throws without an outbox", async () => {
    const { result, unmount } = await renderHook(() => {
      try { return useOutbox(); } catch (error) { return error; }
    }, { client: stubClient() });
    assert.match(result.current.message, /Pass an outbox, or give the ConvoHopProvider one/);
    await unmount();
  });
});
