import test from "node:test";
import assert from "node:assert/strict";
import { ConversationStore, ConvoHopProblem, Outbox } from "@convohop/client";

const id = () => crypto.randomUUID();
const at = "2026-10-08T12:00:00.000Z";
const turn = () => new Promise(resolve => setImmediate(resolve));
async function until(predicate, message = "condition") {
  for (let index = 0; index < 1000 && !predicate(); index++) await turn();
  assert.ok(predicate(), "timed out waiting for " + message);
}
const problem = (code, status = 409, outcome = "rejected") => new ConvoHopProblem(code, id(), outcome, status, "Fixture " + code);
const later = (a, b) => a === null ? b : b === null ? a : BigInt(a) >= BigInt(b) ? a : b;
const sequences = store => store.snapshot.messages.map(message => message.sequence);
const offline = { online: false, subscribe: () => () => undefined };

/**
 * One conversation behind a stub of the client methods the store uses. Calls are recorded; `fail[name]` queues errors
 * for the next calls and `gate[name]` holds them. Streams record the store's callbacks so tests can deliver pages.
 */
function world({ count = 5, pageSize = 3, receiptPageSize = 100 } = {}) {
  const conversationId = id(), principalId = id(), other = id();
  const w = { conversationId, principalId, other, calls: [], streams: [], messages: new Map(), receipts: new Map(), latest: 0,
    visibleFrom: 1n, pageSize, receiptPageSize, refreshState: "disabled", refreshes: 0, fail: {}, gate: {}, onWatch: undefined,
    membership: { conversationId, principalId, role: "member", status: "active", membershipEpoch: "1", visibilityEpoch: "1",
      revision: "1", visibleFromSequence: "1", canStartBroadcast: false } };
  w.add = (fields = {}) => {
    const sequence = String(++w.latest);
    const value = { messageId: id(), conversationId, authorId: other, sequence, revision: "1", revisionSequence: sequence,
      createdAt: at, deleted: false, text: "message " + sequence, props: {}, editedAt: null, ...fields };
    w.messages.set(value.messageId, value);
    return value;
  };
  w.revise = (messageId, fields) => {
    const current = w.messages.get(messageId), revision = String(BigInt(current.revision) + 1n);
    w.messages.set(messageId, { ...current, ...fields, revision });
    return revision;
  };
  w.receipt = (principal, delivered, read, fields = {}) => {
    const value = { principalId: principal, membershipEpoch: "1", visibilityEpoch: "1", deliveredThroughSequence: delivered,
      readThroughSequence: read, updatedAt: at, ...fields };
    w.receipts.set(principal, value);
    return value;
  };
  w.event = (type, payload = {}, sequence = String(++w.latest)) => ({ eventId: id(), conversationId, sequence, type, occurredAt: at, payload });
  w.created = message => w.event("message.created", { messageId: message.messageId }, message.sequence);
  w.conversation = () => ({ conversationId, revision: "1", title: "Fixture", props: {}, latestSequence: String(w.latest),
    membership: structuredClone(w.membership) });
  w.count = name => w.calls.filter(([called]) => called === name).length;
  w.stream = () => w.streams.at(-1);
  const call = async (conversation, name, ...args) => {
    assert.equal(conversation, conversationId);
    w.calls.push([name, ...args]);
    await w.gate[name];
    const error = w.fail[name]?.shift();
    if (error) throw error;
  };
  const open = (mode, apply, onError) => {
    w.onWatch?.(onError);
    const stream = { mode, closed: false, apply, onError, close() { this.closed = true; } };
    w.streams.push(stream);
    return stream;
  };
  const report = (kind, membership, through) => {
    const current = w.receipts.get(principalId);
    const same = current && current.membershipEpoch === membership.membershipEpoch && current.visibilityEpoch === membership.visibilityEpoch;
    return structuredClone(w.receipt(principalId, later(same ? current.deliveredThroughSequence : null, through),
      kind === "read" ? later(same ? current.readThroughSequence : null, through) : same ? current.readThroughSequence : null,
      { membershipEpoch: membership.membershipEpoch, visibilityEpoch: membership.visibilityEpoch }));
  };
  w.client = {
    projectId: id(), principalId, storage: undefined,
    get sessionRefreshState() { return w.refreshState; },
    http: { incarnation: id(), recoveryStates: [], initializeRecovery: async () => undefined },
    requests: { resolve: async () => { throw new Error("unexpected resolution"); }, retry: async () => { throw new Error("unexpected retry"); } },
    async getConversation(conversation) { await call(conversation, "getConversation"); return w.conversation(); },
    async messages(conversation, before, limit = 100) {
      await call(conversation, "messages", before ?? null, limit);
      const below = [...w.messages.values()].filter(message => BigInt(message.sequence) >= w.visibleFrom &&
        (before === undefined || BigInt(message.sequence) < BigInt(before))).sort((a, b) => Number(BigInt(b.sequence) - BigInt(a.sequence)));
      const items = below.slice(0, Math.min(limit, w.pageSize)), complete = items.length === below.length;
      return { items: structuredClone(items), complete, refreshRequired: false, ...(complete ? {} : { nextCursor: items.at(-1).sequence }) };
    },
    async receipts(conversation, cursor) {
      await call(conversation, "receipts", cursor ?? null);
      const all = [...w.receipts.values()], start = cursor === undefined ? 0 : Number(cursor);
      const items = all.slice(start, start + w.receiptPageSize), complete = start + items.length >= all.length;
      return { items: structuredClone(items), complete, refreshRequired: false, ...(complete ? {} : { nextCursor: String(start + items.length) }) };
    },
    async getMessage(conversation, messageId) {
      await call(conversation, "getMessage", messageId);
      const value = w.messages.get(messageId);
      if (!value || BigInt(value.sequence) < w.visibleFrom) throw problem("NOT_FOUND", 404);
      return structuredClone(value);
    },
    async watch(conversation, apply, onError) { await call(conversation, "watch"); return open("watch", apply, onError); },
    async resyncAuthorizedHistory(conversation, apply, onError) { await call(conversation, "resync"); return open("resync", apply, onError); },
    async refreshSession() { await call(conversationId, "refreshSession"); w.refreshes++; },
    async reportRead(conversation, membership, through) {
      await call(conversation, "reportRead", membership.membershipEpoch, through);
      return report("read", membership, through);
    },
    async reportDelivered(conversation, membership, through) {
      await call(conversation, "reportDelivered", membership.membershipEpoch, through);
      return report("delivered", membership, through);
    },
    async send(conversation, text) {
      await call(conversation, "send", text);
      const message = w.add({ authorId: principalId, text });
      return { messageId: message.messageId, conversationId, sequence: message.sequence, revision: "1", status: "sent",
        cursor: { incarnation: w.client.http.incarnation, conversationId, sequence: message.sequence } };
    },
  };
  for (let index = 0; index < count; index++) w.add();
  w.receipt(principalId, null, null);
  w.receipt(other, "2", "1");
  return w;
}
function store(t, w, options) {
  const value = new ConversationStore(w.client, w.conversationId, options);
  t.after(() => value.close());
  return value;
}

test("opening loads the conversation, its newest page and every receipt page, then applies only new events", async t => {
  const w = world({ receiptPageSize: 1 }), events = [], conversation = store(t, w, { onEvent: event => events.push(event) });
  const seen = [];
  conversation.subscribe(() => seen.push(conversation.snapshot.status));
  assert.equal(conversation.snapshot.status, "idle");
  const opening = conversation.open();
  assert.equal(conversation.open(), opening, "open() while loading returns the current attempt");
  await opening;
  assert.deepEqual([...new Set(seen)], ["loading", "live"]);
  assert.deepEqual(w.calls.map(([name]) => name), ["getConversation", "messages", "receipts", "receipts", "watch"]);
  const snapshot = conversation.snapshot;
  assert.equal(snapshot.conversation.conversationId, w.conversationId);
  assert.deepEqual(sequences(conversation), ["3", "4", "5"]);
  assert.equal(snapshot.hasOlder, true);
  assert.deepEqual(snapshot.receipts.map(receipt => receipt.principalId), [w.principalId, w.other].sort());
  assert.deepEqual([snapshot.error, snapshot.resyncRequired, snapshot.pending], [undefined, false, []]);
  assert.ok(Object.isFrozen(snapshot) && Object.isFrozen(snapshot.messages) && Object.isFrozen(snapshot.messages[0]));
  assert.ok(Object.isFrozen(snapshot.conversation.membership));
  assert.equal(conversation.snapshot, snapshot, "the snapshot is stable until something changes");
  assert.equal(await conversation.open(), undefined, "open() while live is a no-op");
  assert.equal(w.streams.length, 1);

  const stream = w.stream(), created = w.add();
  const replayed = w.created(snapshot.messages[2]), fresh = w.created(created);
  await stream.apply([replayed, fresh]);
  assert.deepEqual(sequences(conversation), ["3", "4", "5", "6"]);
  assert.deepEqual(w.calls.at(-1), ["messages", "7", 1], "created messages load in one page below the newest");
  assert.deepEqual(events, [fresh], "only new events reach onEvent");
  await stream.apply([fresh]);
  assert.equal(w.count("messages"), 2, "a redelivered page is skipped");
  assert.deepEqual(events, [fresh]);
});

test("older pages load one at a time until the visible history is complete", async t => {
  const w = world({ count: 7 }), conversation = store(t, w);
  assert.equal(await conversation.loadOlder(), false, "nothing loads before opening");
  await conversation.open();
  assert.deepEqual(sequences(conversation), ["5", "6", "7"]);
  const first = conversation.loadOlder();
  assert.equal(conversation.loadOlder(), first, "a second call shares the load in progress");
  assert.equal(await first, true);
  assert.deepEqual(sequences(conversation), ["2", "3", "4", "5", "6", "7"]);
  assert.equal(conversation.snapshot.hasOlder, true);
  assert.equal(await conversation.loadOlder(), true);
  assert.deepEqual(sequences(conversation), ["1", "2", "3", "4", "5", "6", "7"]);
  assert.equal(conversation.snapshot.hasOlder, false);
  assert.equal(await conversation.loadOlder(), false);
  assert.deepEqual(w.calls.filter(([name]) => name === "messages").map(([, before]) => before), [null, "5", "2"]);
});

test("created messages beyond one page are read one by one, and hidden ones are skipped", async t => {
  const w = world(), conversation = store(t, w);
  await conversation.open();
  const added = [w.add(), w.add(), w.add(), w.add()], hidden = { messageId: id(), sequence: String(++w.latest) };
  await w.stream().apply([...added.map(w.created), w.created(hidden)]);
  assert.deepEqual(sequences(conversation), ["3", "4", "5", "6", "7", "8", "9"]);
  assert.deepEqual(w.calls.filter(([name]) => name === "messages").at(-1), ["messages", "11", 5]);
  assert.deepEqual(w.calls.filter(([name]) => name === "getMessage").map(([, messageId]) => messageId).sort(),
    [added[0].messageId, hidden.messageId].sort(), "only what the page missed is read singly");
  assert.equal(conversation.snapshot.status, "live");
});

test("edits and deletes replace a message only with a newer revision, and a failed page changes nothing", async t => {
  const w = world(), conversation = store(t, w);
  await conversation.open();
  const [third, fourth, fifth] = conversation.snapshot.messages, list = conversation.snapshot.messages;
  const edited = w.revise(third.messageId, { text: "edited", editedAt: at });
  const deleted = w.revise(fourth.messageId, { deleted: true, text: null, props: null });
  await w.stream().apply([w.event("message.edited", { messageId: third.messageId, revision: edited }),
    w.event("message.deleted", { messageId: fourth.messageId, revision: deleted }),
    w.event("message.edited", { messageId: fifth.messageId, revision: "1" }),
    w.event("message.edited", { messageId: id(), revision: "4" })]);
  assert.deepEqual(w.calls.filter(([name]) => name === "getMessage").map(([, messageId]) => messageId).sort(),
    [third.messageId, fourth.messageId].sort(), "stale and unloaded messages aren't read");
  const [newThird, newFourth, newFifth] = conversation.snapshot.messages;
  assert.deepEqual([newThird.text, newThird.revision], ["edited", "2"]);
  assert.deepEqual([newFourth.deleted, newFourth.text, newFourth.props], [true, null, null], "a deletion is shown as sent");
  assert.ok(Object.isFrozen(newFourth));
  assert.equal(newFifth, fifth, "an unchanged message keeps its identity");
  assert.notEqual(conversation.snapshot.messages, list);

  const revision = w.revise(fifth.messageId, { text: "edited again" }), edit = w.event("message.edited", { messageId: fifth.messageId, revision });
  w.fail.getMessage = [problem("AUTHORITY_UNAVAILABLE", 503, "unknown")];
  const before = conversation.snapshot;
  await assert.rejects(w.stream().apply([edit]), { code: "AUTHORITY_UNAVAILABLE" });
  assert.equal(conversation.snapshot, before, "the stream can deliver the page again");
  await w.stream().apply([edit]);
  assert.equal(conversation.snapshot.messages[2].text, "edited again");

  w.fail.getConversation = [problem("AUTHORITY_UNAVAILABLE", 503, "unknown")];
  const update = w.event("conversation.updated"), loads = w.count("getConversation"), current = conversation.snapshot;
  await assert.rejects(w.stream().apply([update]), { code: "AUTHORITY_UNAVAILABLE" });
  assert.equal(conversation.snapshot, current);
  await w.stream().apply([update]);
  assert.equal(w.count("getConversation"), loads + 2, "the failed page applies when it's delivered again");
});

test("receipt events merge by epoch, and member events reload receipts or the conversation", async t => {
  const w = world(), conversation = store(t, w);
  await conversation.open();
  const receipt = principal => conversation.snapshot.receipts.find(value => value.principalId === principal);
  const reported = (principal, kind, through, epochs = {}) => w.event("receipt.reported",
    { principalId: principal, kind, throughSequence: through, membershipEpoch: "1", visibilityEpoch: "1", ...epochs });
  const messages = conversation.snapshot.messages;
  await w.stream().apply([reported(w.other, "read", "4"), reported(w.other, "delivered", "3")]);
  assert.deepEqual([receipt(w.other).deliveredThroughSequence, receipt(w.other).readThroughSequence], ["4", "4"]);
  assert.equal(receipt(w.other).updatedAt, at);
  assert.equal(conversation.snapshot.messages, messages, "receipts don't rebuild the message list");
  await w.stream().apply([reported(w.other, "read", "5", { membershipEpoch: "0" }), reported(w.other, "seen", "5")]);
  assert.equal(receipt(w.other).readThroughSequence, "4", "an older membership's report and unknown kinds are ignored");
  await w.stream().apply([reported(w.other, "delivered", "5", { visibilityEpoch: "2" })]);
  assert.deepEqual([receipt(w.other).visibilityEpoch, receipt(w.other).deliveredThroughSequence, receipt(w.other).readThroughSequence],
    ["2", "5", null], "a visibility change replaces earlier coverage");

  const third = id(), receipts = w.count("receipts"), conversations = w.count("getConversation");
  w.receipt(third, null, null);
  await w.stream().apply([w.event("member.joined", { principalId: third })]);
  assert.equal(w.count("receipts"), receipts + 1);
  assert.equal(w.count("getConversation"), conversations, "another member's change doesn't reload the conversation");
  assert.deepEqual(conversation.snapshot.receipts, [...w.receipts.values()].sort((a, b) => a.principalId < b.principalId ? -1 : 1),
    "reloaded receipts come from the authority");

  w.membership = { ...w.membership, role: "admin", revision: "2" };
  await w.stream().apply([w.event("member.updated", { principalId: w.principalId })]);
  assert.equal(w.count("getConversation"), conversations + 1);
  assert.equal(conversation.snapshot.conversation.membership.role, "admin");
  await w.stream().apply([w.event("conversation.updated")]);
  assert.equal(w.count("getConversation"), conversations + 2);
});

test("expanding the user's visible history lets earlier messages load", async t => {
  const w = world({ count: 4 }), conversation = store(t, w);
  w.visibleFrom = 3n;
  await conversation.open();
  assert.deepEqual([sequences(conversation), conversation.snapshot.hasOlder], [["3", "4"], false]);
  await w.stream().apply([w.event("member.historyExpanded", { principalId: w.other })]);
  assert.equal(conversation.snapshot.hasOlder, false, "another member's history doesn't change this user's");
  w.visibleFrom = 1n;
  await w.stream().apply([w.event("member.historyExpanded", { principalId: w.principalId })]);
  assert.equal(conversation.snapshot.hasOlder, true);
  assert.equal(await conversation.loadOlder(), true);
  assert.deepEqual(sequences(conversation), ["1", "2", "3", "4"]);
  assert.deepEqual(w.calls.filter(([name]) => name === "messages").at(-1), ["messages", "3", 100]);
});

test("read and delivery reports cover the newest visible message once", async t => {
  const w = world(), conversation = store(t, w);
  assert.equal(await conversation.markRead(), false, "nothing to report before loading");
  await conversation.open();
  const own = () => conversation.snapshot.receipts.find(receipt => receipt.principalId === w.principalId);
  assert.deepEqual(await Promise.all([conversation.markRead(), conversation.markRead()]), [true, false],
    "reports run one at a time, so the second sees the first one's coverage");
  assert.deepEqual(w.calls.filter(([name]) => name === "reportRead"), [["reportRead", "1", "5"]]);
  assert.equal(own().readThroughSequence, "5");
  assert.equal(await conversation.markDelivered(), false, "reading covers delivery");

  const newest = w.add(), removed = w.add({ deleted: true, text: null, props: null });
  await w.stream().apply([w.created(newest), w.created(removed)]);
  assert.equal(await conversation.markDelivered(), true);
  assert.deepEqual(w.calls.at(-1), ["reportDelivered", "1", newest.sequence], "a deleted message isn't reported");

  w.membership = { ...w.membership, membershipEpoch: "2", visibilityEpoch: "2", revision: "2" };
  w.fail.reportRead = [problem("REVISION_CONFLICT")];
  assert.equal(await conversation.markRead(), true);
  assert.deepEqual(w.calls.filter(([name]) => name === "reportRead").slice(-2).map(([, epoch]) => epoch), ["1", "2"],
    "a changed membership is reloaded and reported once more with its epochs");
  assert.deepEqual([own().membershipEpoch, own().readThroughSequence], ["2", newest.sequence]);
  assert.equal(conversation.snapshot.conversation.membership.membershipEpoch, "2");

  const another = w.add();
  await w.stream().apply([w.created(another)]);
  w.fail.reportRead = [problem("REVISION_CONFLICT"), problem("REVISION_CONFLICT")];
  await assert.rejects(conversation.markRead(), { code: "REVISION_CONFLICT" });
  w.fail.reportRead = [problem("FORBIDDEN", 403)];
  await assert.rejects(conversation.markRead(), { code: "FORBIDDEN" });
  assert.equal(await conversation.markRead(), true, "a failed report doesn't block the next");

  const outsider = world();
  outsider.membership = null;
  const notMember = store(t, outsider);
  await notMember.open();
  await assert.rejects(notMember.markRead(), /as a member/);
});

test("a retrying stream shows reconnecting, and a stopped one shows its error or the need to resync", async t => {
  const w = world(), errors = [], conversation = store(t, w, { onError: error => errors.push(error) });
  const early = new Error("recovering an earlier send failed");
  w.onWatch = onError => onError(early);
  await conversation.open();
  w.onWatch = undefined;
  assert.equal(conversation.snapshot.status, "live", "errors before the stream exists are only reported");
  const stream = w.stream(), dropped = new Error("socket closed");
  stream.onError(dropped);
  assert.deepEqual([conversation.snapshot.status, conversation.snapshot.error], ["reconnecting", dropped]);
  await stream.apply([w.event("conversation.updated")]);
  assert.deepEqual([conversation.snapshot.status, conversation.snapshot.error], ["live", undefined]);

  stream.closed = true;
  const expired = problem("CURSOR_EXPIRED");
  stream.onError(expired);
  assert.deepEqual([conversation.snapshot.status, conversation.snapshot.error, conversation.snapshot.resyncRequired], ["error", expired, true]);
  const loads = w.count("getConversation");
  await conversation.resync();
  assert.equal(w.stream().mode, "resync");
  assert.deepEqual([conversation.snapshot.status, conversation.snapshot.resyncRequired], ["live", false]);
  assert.equal(w.count("getConversation"), loads + 1, "resync reloads the conversation");
  stream.onError(new Error("late"));
  assert.equal(conversation.snapshot.status, "live", "a replaced stream's errors are ignored");

  const current = w.stream(), refused = problem("FORBIDDEN", 403);
  current.closed = true;
  current.onError(refused);
  assert.deepEqual([conversation.snapshot.status, conversation.snapshot.resyncRequired], ["error", false]);
  await conversation.open();
  assert.deepEqual([w.stream().mode, conversation.snapshot.status], ["watch", "live"]);
  assert.equal(w.count("getConversation"), loads + 1, "reopening after an error keeps the loaded state");
  assert.deepEqual(errors, [early, dropped, expired, refused]);

  const stale = world();
  stale.fail.watch = [new Error("History resynchronization required")];
  const failing = store(t, stale);
  await assert.rejects(failing.open(), /resynchronization required/);
  assert.deepEqual([failing.snapshot.status, failing.snapshot.resyncRequired], ["error", true]);
  const other = world();
  other.client.getConversation = async () => ({ ...other.conversation(), conversationId: id() });
  await assert.rejects(store(t, other).open(), /does not match/);
});

test("an expired session is refreshed once per interruption before following again", async t => {
  const w = world(), conversation = store(t, w);
  await conversation.open();
  w.refreshState = "ready";
  const expired = problem("UNAUTHENTICATED", 401);
  const stop = (error, within = w) => { const stream = within.stream(); stream.closed = true; stream.onError(error); };
  stop(expired);
  assert.deepEqual([conversation.snapshot.status, conversation.snapshot.error], ["reconnecting", expired]);
  await conversation.open();
  assert.deepEqual([w.refreshes, w.streams.length, conversation.snapshot.status], [1, 2, "live"]);
  assert.equal(w.count("getConversation"), 1, "the refreshed session follows from the loaded state");

  stop(expired);
  assert.deepEqual([conversation.snapshot.status, conversation.snapshot.error, w.refreshes], ["error", expired, 1],
    "a second expiry before any page arrives isn't refreshed again");
  await conversation.open();
  await w.stream().apply([w.event("conversation.updated")]);
  stop(expired);
  await conversation.open();
  assert.deepEqual([w.refreshes, conversation.snapshot.status], [2, "live"], "a delivered page allows the next refresh");

  const denied = problem("SESSION_REFRESH_REQUIRED");
  w.fail.refreshSession = [denied];
  await w.stream().apply([w.event("conversation.updated")]);
  stop(expired);
  await assert.rejects(conversation.open(), { code: "SESSION_REFRESH_REQUIRED" }, "open() shares the failed refresh");
  assert.deepEqual([conversation.snapshot.status, conversation.snapshot.error], ["error", denied]);

  let release;
  w.gate.refreshSession = new Promise(resolve => { release = resolve; });
  await conversation.open();
  await w.stream().apply([w.event("conversation.updated")]);
  stop(expired);
  conversation.close();
  release();
  await until(() => w.refreshes === 3, "the superseded refresh");
  await turn();
  assert.deepEqual([conversation.snapshot.status, w.streams.length], ["closed", 5], "a refresh that outlives the store doesn't reconnect");
  delete w.gate.refreshSession;

  const v = world(), unrefreshed = store(t, v);
  await unrefreshed.open();
  stop(expired, v);
  assert.equal(unrefreshed.snapshot.status, "error", "without session refresh the stream's expiry stops the store");
  assert.equal(v.count("refreshSession"), 0);
});

test("pending sends show until their message loads, and the store releases them from the outbox", async t => {
  const w = world(), conversation = store(t, w);
  const early = conversation.send("before opening");
  await conversation.outbox.flush();
  assert.deepEqual(conversation.snapshot.pending.map(entry => [entry.requestId, entry.status]), [[early.requestId, "sent"]]);
  await conversation.open();
  assert.deepEqual(conversation.snapshot.pending, [], "a sent message in the loaded page is settled");
  assert.equal(conversation.outbox.entries.length, 0);

  const entry = conversation.send("hello", { kind: "text" });
  await conversation.outbox.flush();
  const [pending] = conversation.snapshot.pending;
  assert.deepEqual([pending.requestId, pending.status], [entry.requestId, "sent"]);
  await w.stream().apply([w.created(w.messages.get(pending.messageId))]);
  assert.deepEqual(conversation.snapshot.pending, []);
  assert.equal(conversation.outbox.entries.length, 0);
  assert.equal(conversation.snapshot.messages.at(-1).text, "hello");

  const shared = new Outbox(w.client, { connectivity: offline });
  t.after(() => shared.close());
  const first = store(t, w, { outbox: shared });
  shared.send(id(), "elsewhere");
  first.send("here");
  assert.deepEqual(first.snapshot.pending.map(value => value.text), ["here"]);
  first.close();
  assert.throws(() => first.send("closed"), /closed/);
  assert.doesNotThrow(() => shared.send(w.conversationId, "still open"), "closing a store leaves a shared outbox open");
  assert.throws(() => new ConversationStore(world().client, w.conversationId, { outbox: shared }), /another client/);
  conversation.close();
  assert.throws(() => conversation.outbox.send(w.conversationId, "x"), /closed/, "a store closes its own outbox");
});

test("closing or restarting drops superseded work, and a closed store refuses more", async t => {
  const w = world(), conversation = store(t, w);
  let release;
  w.gate.getConversation = new Promise(resolve => { release = resolve; });
  const opening = conversation.open();
  conversation.close();
  release();
  await opening;
  assert.deepEqual([conversation.snapshot.status, w.count("watch")], ["closed", 0]);
  await assert.rejects(conversation.open(), /closed/);
  await assert.rejects(conversation.resync(), /closed/);
  await assert.rejects(conversation.markRead(), /closed/);
  assert.equal(await conversation.loadOlder(), false);
  conversation.close();

  const v = world(), restarted = store(t, v);
  let releaseWatch;
  v.gate.watch = new Promise(resolve => { releaseWatch = resolve; });
  const first = restarted.open();
  await until(() => v.count("watch") === 1, "the first watch");
  delete v.gate.watch;
  const second = restarted.resync();
  await until(() => v.count("resync") === 1, "the resync");
  releaseWatch();
  await Promise.all([first, second]);
  const watched = v.streams.find(stream => stream.mode === "watch"), resynced = v.streams.find(stream => stream.mode === "resync");
  assert.deepEqual([watched.closed, resynced.closed, restarted.snapshot.status], [true, false, "live"]);
  const before = restarted.snapshot, created = v.add();
  await assert.rejects(watched.apply([v.created(created)]), /superseded/);
  assert.equal(restarted.snapshot, before);
  restarted.close();
  assert.equal(resynced.closed, true);
});

test("listener, onEvent and onError failures don't stop the store", async t => {
  const w = world(), errors = [];
  const conversation = store(t, w, { onEvent: () => { throw new Error("onEvent"); }, onError: error => errors.push(error) });
  conversation.subscribe(() => { throw new Error("listener"); });
  await conversation.open();
  await w.stream().apply([w.created(w.add())]);
  assert.equal(conversation.snapshot.messages.length, 4);
  assert.ok(errors.some(error => error.message === "onEvent") && errors.some(error => error.message === "listener"));

  const v = world(), quiet = store(t, v, { onError: () => { throw new Error("handler"); } });
  quiet.subscribe(() => { throw new Error("listener"); });
  await quiet.open();
  await v.stream().apply([v.created(v.add())]);
  assert.equal(quiet.snapshot.messages.length, 4);
});

test("receipts beyond the supported conversation size fail the load", async t => {
  const w = world({ receiptPageSize: 1 });
  for (let index = 0; index < 50; index++) w.receipt(id(), null, null);
  const conversation = store(t, w);
  await assert.rejects(conversation.open(), RangeError);
  assert.equal(conversation.snapshot.status, "error");
  assert.equal(w.count("receipts"), 50);
});
