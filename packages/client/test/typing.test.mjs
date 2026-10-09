import test from "node:test";
import assert from "node:assert/strict";
import { ConvoHopProblem, TypingIndicator } from "@convohop/client";

const conversationId = crypto.randomUUID();
const turn = () => new Promise(resolve => setImmediate(resolve));
function fakeClient(outcome = () => undefined) {
  const signals = [];
  return { signals, typing: async (id, isTyping) => {
    assert.equal(id, conversationId);
    signals.push(isTyping);
    return outcome(isTyping);
  } };
}
function clock(t) {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 1_000_000 });
}

test("typing signals are throttled while the user types and stop after the idle time", async t => {
  clock(t);
  const client = fakeClient(), typing = new TypingIndicator(client, conversationId);
  typing.input();
  assert.deepEqual(client.signals, [true]);
  assert.equal(typing.active, true);
  t.mock.timers.tick(2999); typing.input();
  assert.deepEqual(client.signals, [true], "a second input within the interval doesn't signal again");
  t.mock.timers.tick(1); typing.input();
  assert.deepEqual(client.signals, [true, true], "typing is signalled again once the interval passed");
  t.mock.timers.tick(4999);
  assert.equal(typing.active, true, "each input restarts the idle time");
  t.mock.timers.tick(1);
  assert.deepEqual(client.signals, [true, true, false]);
  assert.equal(typing.active, false);
  typing.input();
  assert.deepEqual(client.signals, [true, true, false, true], "typing after stopping signals at once");
});

test("stop signals only after typing started, and custom intervals apply", async t => {
  clock(t);
  const client = fakeClient(), typing = new TypingIndicator(client, conversationId, { intervalMs: 100, idleMs: 250 });
  typing.stop();
  assert.deepEqual(client.signals, [], "stopping without typing sends nothing");
  typing.input(); t.mock.timers.tick(100); typing.input();
  assert.deepEqual(client.signals, [true, true]);
  typing.stop();
  assert.deepEqual(client.signals, [true, true, false]);
  t.mock.timers.tick(1000);
  assert.deepEqual(client.signals, [true, true, false], "stop clears the idle timer");
});

test("a disabled indicator sends nothing, and disabling it stops typing first", async t => {
  clock(t);
  const quiet = fakeClient();
  const disabled = new TypingIndicator(quiet, conversationId, { enabled: false });
  disabled.input(); t.mock.timers.tick(10000);
  assert.deepEqual(quiet.signals, []);
  assert.equal(disabled.enabled, false);

  const client = fakeClient(), typing = new TypingIndicator(client, conversationId);
  typing.input();
  typing.enabled = false;
  assert.deepEqual(client.signals, [true, false]);
  typing.input(); t.mock.timers.tick(10000);
  assert.deepEqual(client.signals, [true, false]);
  typing.enabled = true; typing.input();
  assert.deepEqual(client.signals, [true, false, true]);

  typing.dispose();
  assert.deepEqual(client.signals, [true, false, true, false], "dispose stops typing");
  assert.equal(typing.enabled, false);
  typing.enabled = true; typing.input();
  assert.deepEqual(client.signals, [true, false, true, false], "a disposed indicator never signals again");
  typing.dispose();
});

test("a project without typing turns the indicator off and reports the problem once per signal", async t => {
  clock(t);
  const errors = [];
  const client = fakeClient(() => {
    throw new ConvoHopProblem("FEATURE_UNSUPPORTED", crypto.randomUUID(), "rejected", 400, "Typing is not enabled");
  });
  const typing = new TypingIndicator(client, conversationId, { onError: error => errors.push(error) });
  typing.input();
  await turn();
  assert.equal(typing.enabled, false);
  assert.equal(typing.active, false);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].code, "FEATURE_UNSUPPORTED");
  typing.input(); t.mock.timers.tick(10000);
  assert.deepEqual(client.signals, [true], "no stop signal or later signal is sent once typing is unsupported");
});

test("other failures are reported without disabling typing, even when the handler throws", async t => {
  clock(t);
  let calls = 0;
  const client = fakeClient(() => { throw new TypeError("network"); });
  const typing = new TypingIndicator(client, conversationId, { onError: () => { calls++; throw new Error("handler"); } });
  typing.input();
  await turn();
  assert.equal(calls, 1);
  assert.equal(typing.enabled, true);
  assert.equal(typing.active, true);
  t.mock.timers.tick(5000);
  await turn();
  assert.deepEqual(client.signals, [true, false]);
  assert.equal(calls, 2);
});

test("durations and the conversation are validated", () => {
  const client = fakeClient();
  for (const bad of [0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => new TypingIndicator(client, conversationId, { intervalMs: bad }), RangeError);
    assert.throws(() => new TypingIndicator(client, conversationId, { idleMs: bad }), RangeError);
  }
  assert.throws(() => new TypingIndicator(client, "not-a-uuid"), TypeError);
});
