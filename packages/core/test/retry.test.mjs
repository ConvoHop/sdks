import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ConvoHopProblem } from "@convohop/core";
import { closeProblem, reconnectAction, reconnectDelay, retryableCode } from "@convohop/core/internal";

const ir = JSON.parse(readFileSync(new URL("../../../schema/ir.json", import.meta.url), "utf8"));
const requestId = crypto.randomUUID();
const problem = (code, status) => new ConvoHopProblem(code, requestId, "rejected", status, code);

test("one classifier decides whether initialization, the realtime stream and queued sends try again", () => {
  for (const [code, status, expected] of [
    ["TRANSPORT_UNKNOWN", 0, "retry"],
    ["HTTP_FAILURE", 408, "retry"],
    ["HTTP_FAILURE", 500, "retry"],
    ["HTTP_FAILURE", 502, "retry"],
    ["HTTP_FAILURE", 503, "retry"],
    ["HTTP_FAILURE", 504, "retry"],
    ["AUTHORITY_UNAVAILABLE", 503, "retry"],
    ["INVALID_RESPONSE", 502, "retry"],
    ["RATE_LIMITED", 429, "retry"],
    ["ADMISSION_LIMIT", 429, "retry"],
    // Routing again finds the region that serves the project.
    ["WRONG_REGION", 409, "reroute"],
    // The schema says a later attempt can't succeed, whatever the status.
    ["QUOTA_EXCEEDED", 429, "stop"],
    ["PLAN_LIMIT_EXCEEDED", 403, "stop"],
    ["MEMBERSHIP_COUNT_INVALID", 503, "stop"],
    ["UNAUTHENTICATED", 401, "stop"],
    ["SESSION_REFRESH_REQUIRED", 409, "stop"],
    ["FORBIDDEN", 403, "stop"],
    ["SCOPE_REQUIRED", 403, "stop"],
    ["RECOVERY_LIMIT", 409, "stop"],
    // A retryable code still stops on a status that no later attempt changes.
    ["HTTP_FAILURE", 400, "stop"],
    ["HTTP_FAILURE", 404, "stop"],
    // A code the schema doesn't list is judged by its status.
    ["NEWLY_ADDED", 503, "retry"],
    ["NEWLY_ADDED", 429, "retry"],
    ["NEWLY_ADDED", 409, "stop"],
  ]) assert.equal(reconnectAction(problem(code, status)), expected, `${code} ${status}`);
  for (const error of [new Error("boom"), new TypeError("offline"), "failed", undefined])
    assert.equal(reconnectAction(error), "stop", String(error));
});

test("a request may be sent again after a retryable code, or after WRONG_REGION once routed again", () => {
  for (const code of ["RATE_LIMITED", "AUTHORITY_UNAVAILABLE", "TRANSPORT_UNKNOWN", "WRONG_REGION", "NEWLY_ADDED"])
    assert.equal(retryableCode(code), true, code);
  for (const code of ["QUOTA_EXCEEDED", "PLAN_LIMIT_EXCEEDED", "NOT_FOUND", "FORBIDDEN", "RECOVERY_LIMIT"])
    assert.equal(retryableCode(code), false, code);
});

test("reconnection waits 1 s doubling to 10 s, never less than retryAfter, plus under 0.5 s of jitter", t => {
  const cases = [[0, 0, 1000], [1, 0, 2000], [3, 0, 8000], [4, 0, 10000], [40, 0, 10000], [0, 2, 2000],
    [0, 30, 30000], [4, 3, 10000]];
  const random = t.mock.method(Math, "random", () => 0);
  for (const [attempt, retryAfter, base] of cases) assert.equal(reconnectDelay(attempt, retryAfter), base);
  random.mock.mockImplementation(() => 0.9999);
  for (const [attempt, retryAfter, base] of cases) assert.equal(reconnectDelay(attempt, retryAfter), base + 499);
  assert.equal(reconnectDelay(0, 10 ** 9), 2147483647, "a delay stays within what a timer accepts");
});

test("a realtime close reports the problem its reason names, whatever the close code", () => {
  for (const [code, reason, expected, action] of [
    [4429, "RATE_LIMITED retryAfter=5", ["RATE_LIMITED", 429, 5], "retry"],
    [4429, "QUOTA_EXCEEDED retryAfter=60 meter=messages", ["QUOTA_EXCEEDED", 429, 60], "stop"],
    [4403, "PLAN_LIMIT_EXCEEDED planLimit=connections", ["PLAN_LIMIT_EXCEEDED", 403, undefined], "stop"],
    [4409, "  WRONG_REGION  ", ["WRONG_REGION", 409, undefined], "reroute"],
    [1011, "AUTHORITY_UNAVAILABLE retryAfter=2", ["AUTHORITY_UNAVAILABLE", 503, 2], "retry"],
    // A retryAfter that isn't whole seconds is ignored rather than guessed.
    [4429, "RATE_LIMITED retryAfter=soon", ["RATE_LIMITED", 429, undefined], "retry"],
    [4429, "RATE_LIMITED retryAfter=1.5", ["RATE_LIMITED", 429, undefined], "retry"],
    // A listed code without a status takes it from the close code.
    [4400, "GRAPHQL_ERROR", ["GRAPHQL_ERROR", 400, undefined], "stop"],
  ]) {
    const reported = closeProblem(code, reason, requestId);
    assert.ok(reported instanceof ConvoHopProblem, reason);
    assert.deepEqual([reported.code, reported.status, reported.retryAfter], expected, reason);
    assert.deepEqual([reported.requestId, reported.outcome], [requestId, "rejected"]);
    assert.equal(reconnectAction(reported), action, reason);
  }
});

test("a close that ends realtime authorization without naming a code reports UNAUTHENTICATED; others report nothing", () => {
  for (const code of [4400, 4401, 4403, 4408, 4409]) for (const reason of ["", "Forbidden", "rate_limited"]) {
    const reported = closeProblem(code, reason, requestId);
    assert.deepEqual([reported?.code, reported?.status, reported?.outcome], ["UNAUTHENTICATED", 401, "rejected"], `${code} ${reason}`);
    assert.equal(reconnectAction(reported), "stop");
  }
  // These reconnect after the usual backoff.
  for (const [code, reason] of [[1000, ""], [1001, "going away"], [1006, ""], [1011, "internal error"], [4429, "slow down"],
    [4500, ""], [4429, "rate_limited retryAfter=5"]])
    assert.equal(closeProblem(code, reason, requestId), undefined, `${code} ${reason}`);
});

test("the backoff and terminal close codes are the schema's realtime reconnect policy", t => {
  const channel = ir.realtime.channels.find(entry => entry.name === "conversationEvents");
  const { baseDelayMs, maxDelayMs, jitterMs, terminalCloseCodes } = channel.reconnect;
  const random = t.mock.method(Math, "random", () => 0);
  assert.equal(reconnectDelay(0), baseDelayMs);
  assert.equal(reconnectDelay(64), maxDelayMs);
  random.mock.mockImplementation(() => 0.9999);
  assert.equal(reconnectDelay(64), maxDelayMs + jitterMs - 1);
  const terminal = [];
  for (let code = 1000; code <= 4999; code++) if (closeProblem(code, "", requestId)) terminal.push(code);
  assert.deepEqual(terminal, [...terminalCloseCodes].sort((a, b) => a - b));
});
