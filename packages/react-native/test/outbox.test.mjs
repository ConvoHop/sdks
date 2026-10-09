// The persistent outbox in a React Native app: AsyncStorage's own JavaScript over a fake of its native module, the
// React Native platform, and launches that each load their own modules, as an app's processes do. Killing a launch
// skips all of its cleanup. Native AsyncStorage, Hermes and real process death are not covered.
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { emulateReactNative } from "./support/globals.mjs";

emulateReactNative();
const { device } = await import("./support/device.mjs");
const { reported } = await import("react-native");

const turn = () => new Promise(resolve => setImmediate(resolve));
async function until(predicate, message) {
  for (let index = 0; index < 1000 && !predicate(); index++) await turn();
  assert.ok(predicate(), "timed out waiting for " + message);
}
const saved = (phone, key) => JSON.parse(phone.read(key) ?? "[]");
const sendIds = phone => phone.authority.sends.map(request => request.variables.context.requestId);
const sorted = values => [...values].sort();

test("messages queued offline outlive a killed launch and are sent first, once each, by the next", async t => {
  const phone = device({ online: false }), conversationId = randomUUID(), slot = phone.keys.outbox;
  const first = await phone.launch();
  t.after(first.stop);
  const { outbox, errors: firstErrors } = first.open();
  const queued = [outbox.send(conversationId, "first"), outbox.send(conversationId, "second")];
  await until(() => saved(phone, slot).length === 2, "both messages to be saved");
  first.kill();

  phone.network.set(true);
  const loading = phone.storage.hold((method, keys) => method === "getValues" && keys.includes(slot));
  const second = await phone.launch();
  t.after(second.stop);
  const { outbox: after, errors } = second.open();
  const added = after.send(conversationId, "third");
  await until(() => loading.held, "the saved messages to be read");
  for (let index = 0; index < 10; index++) await turn();
  assert.deepEqual(after.entries.map(entry => entry.text), ["third"], "saved messages are still loading");
  assert.deepEqual(phone.authority.sends, [], "nothing is sent before saved messages load");
  loading.release();
  await after.flush();
  assert.deepEqual(after.entries.map(entry => [entry.text, entry.status]), [["first", "sent"], ["second", "sent"], ["third", "sent"]]);
  assert.deepEqual(sendIds(phone), [...queued, added].map(entry => entry.requestId),
    "saved messages keep their place and request IDs, and each is sent once");
  await until(() => phone.read(slot) === null, "the sent outbox to be removed");
  assert.deepEqual([...firstErrors, ...errors], []);
  assert.deepEqual(reported, []);
});

test("a send cut off by a kill reaches the authority once, recovered from its recovery record or sent by the next launch", async t => {
  const phone = device(), conversationId = randomUUID(), slot = phone.keys.outbox, requests = phone.keys.requests;
  const first = await phone.launch();
  t.after(first.stop);
  const { outbox } = first.open();
  // The authority commits the message, but the app is killed before the reply arrives.
  phone.authority.onSend = request => { phone.authority.commit(request); return new Promise(() => {}); };
  const committed = outbox.send(conversationId, "committed");
  await until(() => phone.authority.sends.length === 1, "the send");
  first.kill();

  phone.authority.onSend = undefined;
  phone.network.set(false);
  const second = await phone.launch();
  t.after(second.stop);
  const { outbox: recovering, errors } = second.open();
  await recovering.flush();
  assert.deepEqual(recovering.entries.map(entry => [entry.requestId, entry.status]), [[committed.requestId, "unknown"]],
    "an attempted message restores as uncertain");
  phone.network.set(true);
  await until(() => recovering.entries[0].status === "sent", "the recovery once online");
  assert.equal(recovering.entries[0].messageId, phone.authority.committed.get(committed.requestId).messageId);
  assert.equal(phone.authority.resolves.length, 1, "the commit was found read-only");
  assert.deepEqual(sendIds(phone), [committed.requestId], "and not sent again");
  await until(() => phone.read(slot) === null, "the sent outbox to be removed");
  assert.deepEqual(errors, []);
  second.kill();

  // Killed before the transport stores the request's recovery record, so the message never left.
  const third = await phone.launch();
  t.after(third.stop);
  const { outbox: recording } = third.open();
  const unrecorded = phone.storage.hold((method, keys) => method === "setValues" && keys.includes(requests));
  const unsent = recording.send(conversationId, "never sent");
  await until(() => unrecorded.held, "the recovery record's write");
  assert.deepEqual(saved(phone, slot).map(entry => [entry.requestId, entry.attempted]), [[unsent.requestId, false]],
    "the outbox notes an attempt only once the transport has recorded the request");
  third.kill();
  unrecorded.release();

  const fourth = await phone.launch();
  t.after(fourth.stop);
  const { outbox: resending, errors: resendErrors } = fourth.open();
  await resending.flush();
  assert.deepEqual(resending.entries.map(entry => [entry.requestId, entry.status]), [[unsent.requestId, "sent"]]);
  assert.deepEqual(sendIds(phone), [committed.requestId, unsent.requestId], "a message that never left is sent once");
  await until(() => phone.read(slot) === null, "the sent outbox to be removed");

  // Killed after the transport recorded the request but before the outbox noted the attempt: the record recovers it.
  phone.network.set(false);
  const recorded = resending.send(conversationId, "recorded");
  await until(() => saved(phone, slot).length === 1, "the queued message to be saved");
  const unnoted = phone.storage.hold((method, keys) => method === "setValues" && keys.includes(slot));
  phone.network.set(true);
  await until(() => unnoted.held, "the outbox's note of the attempt");
  assert.ok(phone.read(requests)?.includes(recorded.requestId), "the transport recorded the request first");
  assert.deepEqual(sendIds(phone), [committed.requestId, unsent.requestId], "and sends it only after the note is saved");
  assert.deepEqual(resendErrors, []);
  fourth.kill();
  unnoted.release();

  const fifth = await phone.launch();
  t.after(fifth.stop);
  const { outbox: after, errors: retryErrors } = fifth.open();
  await after.flush();
  assert.deepEqual(after.entries.map(entry => [entry.requestId, entry.status]), [[recorded.requestId, "sent"]]);
  assert.deepEqual(sendIds(phone), [committed.requestId, unsent.requestId, recorded.requestId],
    "the recorded request is sent once, with its request ID");
  await until(() => phone.read(slot) === null, "the sent outbox to be removed");
  assert.deepEqual(retryErrors, []);
  assert.deepEqual(reported, []);
});

test("outboxes of one launch coordinate without Web Locks, and the next launch takes over what a killed one left", async t => {
  const phone = device({ online: false }), conversationId = randomUUID(), slot = phone.keys.outbox;
  const first = await phone.launch();
  t.after(first.stop);
  const one = first.open(), two = first.open();
  const fromOne = one.outbox.send(conversationId, "from the first outbox");
  const fromTwo = two.outbox.send(conversationId, "from the second outbox");
  await until(() => phone.read(slot) !== null && phone.read(slot + ":1") !== null, "each outbox to save its slot");
  assert.deepEqual([saved(phone, slot), saved(phone, slot + ":1")].map(entries => entries.map(entry => entry.text)),
    [["from the first outbox"], ["from the second outbox"]], "running outboxes keep their messages apart");
  await one.outbox.close();
  await until(() => phone.read(slot) === null, "the second outbox to take over the first's messages");
  assert.deepEqual(sorted(saved(phone, slot + ":1").map(entry => entry.requestId)), sorted([fromOne.requestId, fromTwo.requestId]));
  assert.deepEqual(sorted(two.outbox.entries.map(entry => entry.requestId)), sorted([fromOne.requestId, fromTwo.requestId]));
  first.kill();

  phone.network.set(true);
  const second = await phone.launch();
  t.after(second.stop);
  const { outbox, errors } = second.open();
  await outbox.flush();
  assert.deepEqual(outbox.entries.map(entry => entry.status), ["sent", "sent"], "the killed launch's slot was free to take over");
  assert.deepEqual(sorted(sendIds(phone)), sorted([fromOne.requestId, fromTwo.requestId]), "each sent once");
  await until(() => phone.read(slot) === null && phone.read(slot + ":1") === null, "both slots to be removed");
  assert.deepEqual([...one.errors, ...two.errors, ...errors], []);
  assert.deepEqual(reported, []);
});

for (const [last, label] of [["outbox", "the outbox's send"], ["direct", "a request elsewhere on the client"]]) {
  test(`signing out as the example does waits until ${label}, settling last, has saved, so the clear leaves none of the user's data`, async t => {
    const phone = device(), conversationId = randomUUID(), replies = new Map();
    phone.authority.onSend = request => new Promise(resolve => { replies.set(request.variables.context.requestId, resolve); });
    // A failed assertion leaves a reply held; release it so its request doesn't wait out the deadline.
    t.after(() => { for (const release of replies.values()) release(); });
    const first = await phone.launch();
    t.after(first.stop);
    const { client, outbox, errors } = first.open();
    const queued = outbox.send(conversationId, "from the outbox"), directId = randomUUID();
    // Such as a read report: it keeps a recovery record too.
    const direct = client.send(conversationId, "sent directly", directId);
    await until(() => replies.size === 2, "both sends to reach the authority");
    let signedOut = false;
    const signingOut = first.signOut([direct]).then(() => { signedOut = true; });
    const [early, late] = last === "outbox" ? [directId, queued.requestId] : [queued.requestId, directId];
    // Each reply makes the transport save its request's outcome, and the outbox save its entry's.
    replies.get(early)();
    for (let index = 0; index < 20; index++) await turn();
    assert.equal(signedOut, false, "signing out waits for the send still in flight");
    assert.notEqual(phone.read(phone.keys.requests), null, "nothing is cleared while a send is in flight");
    replies.get(late)();
    await signingOut;
    for (let index = 0; index < 20; index++) await turn();
    await until(() => phone.storage.idle, "storage to finish");
    assert.deepEqual([...phone.storage.database().keys()], [], "no save landed after the clear");
    assert.deepEqual(sorted(phone.authority.committed.keys()), sorted([queued.requestId, directId]));
    assert.deepEqual(errors, []);
    assert.deepEqual(reported, []);
  });
}
