import test from "node:test";
import assert from "node:assert/strict";
import { ScopeRequiredProblem, ConvoHopProblem, ConvoHopTransport } from "@convohop/core";

const credential = "fixture-key-never-in-errors", projectId = crypto.randomUUID();
const scopeMessage = scope => `The backend key requires the current ${scope} scope`;

/** A transport whose authority answers every request with `respond(request)`. */
function transport(respond) {
  return new ConvoHopTransport({ baseUrl: "http://127.0.0.1:18080", credential, namespace: crypto.randomUUID(),
    incarnation: crypto.randomUUID(), fetch: async (_url, init) => respond(JSON.parse(init.body)) });
}
const graphqlError = (extensions, message = "Rate limited", init) => request => Response.json({ errors: [{ message,
  extensions: { requestId: request.variables.context.requestId, outcome: "rejected", ...extensions } }] }, init);
const httpError = (body, headers = {}, status = 429) => () => Response.json(body, { status, headers });
async function problem(respond, key = "communication.capabilities", input = {}) {
  const requestId = crypto.randomUUID();
  return transport(respond).execute(key, projectId, input, requestId).then(() => assert.fail("expected a problem"), error => {
    assert.ok(error instanceof ConvoHopProblem, String(error));
    assert.equal(error.requestId, requestId);
    for (const view of [String(error), error.message, JSON.stringify(error)]) assert.equal(view.includes(credential), false);
    return error;
  });
}

test("retryAfter comes from extensions.retryAfter, else the Retry-After header, on either error path", async () => {
  const limited = { code: "RATE_LIMITED", status: 429, retryable: true };
  for (const [respond, expected] of [
    [graphqlError({ ...limited, retryAfter: 7 }), 7],
    [graphqlError({ ...limited, retryAfter: "12" }), 12],
    [graphqlError({ ...limited, retryAfter: 0 }), 0],
    [graphqlError(limited, "Rate limited", { headers: { "retry-after": "5" } }), 5],
    [graphqlError({ ...limited, retryAfter: 3 }, "Rate limited", { headers: { "retry-after": "9" } }), 3],
    // An unusable extension falls back to the header rather than hiding it.
    [graphqlError({ ...limited, retryAfter: "soon" }, "Rate limited", { headers: { "retry-after": "6" } }), 6],
    [httpError({ code: "RATE_LIMITED", outcome: "rejected", message: "Slow down", retryAfter: 4 }), 4],
    [httpError({ code: "RATE_LIMITED", outcome: "rejected", message: "Slow down" }, { "retry-after": "8" }), 8],
    [httpError({ code: "RATE_LIMITED", outcome: "rejected", message: "Slow down", retryAfter: 2 }, { "retry-after": "8" }), 2],
  ]) {
    const error = await problem(respond);
    assert.deepEqual([error.code, error.outcome, error.status, error.retryAfter], ["RATE_LIMITED", "rejected", 429, expected]);
    assert.ok(Object.hasOwn(error, "retryAfter"));
    assert.equal(error instanceof ScopeRequiredProblem, false);
  }
});

test("an error response that isn't JSON, such as a gateway's, keeps its Retry-After", async () => {
  for (const [status, headers, expected] of [[503, { "retry-after": "7" }, 7], [502, {}, undefined],
    [503, { "retry-after": "Wed, 21 Oct 2026 07:28:00 GMT" }, undefined]]) {
    const error = await problem(() => new Response("Service Unavailable", { status, headers: { "content-type": "text/plain", ...headers } }));
    assert.deepEqual([error.code, error.outcome, error.status, error.retryAfter, Object.hasOwn(error, "retryAfter")],
      ["INVALID_RESPONSE", "unknown", status, expected, expected !== undefined]);
  }
});

test("delays that are not whole seconds, including HTTP-dates, are ignored rather than guessed", async () => {
  const invalid = [-1, 1.5, "1.5", "", " 5", "+5", "0x10", "12345678901", Number.MAX_SAFE_INTEGER + 1, true, null, {}, [5]];
  for (const retryAfter of invalid) {
    const error = await problem(graphqlError({ code: "RATE_LIMITED", status: 429, retryAfter }));
    assert.equal(error.retryAfter, undefined, JSON.stringify(retryAfter));
    assert.equal(Object.hasOwn(error, "retryAfter"), false);
  }
  for (const header of ["Wed, 21 Oct 2026 07:28:00 GMT", "1.5", "-1", "5, 6"]) {
    for (const respond of [graphqlError({ code: "RATE_LIMITED", status: 429 }, "Rate limited", { headers: { "retry-after": header } }),
      httpError({ code: "RATE_LIMITED", outcome: "rejected", message: "Slow down" }, { "retry-after": header })]) {
      const error = await problem(respond);
      assert.deepEqual([error.code, error.retryAfter, Object.hasOwn(error, "retryAfter")], ["RATE_LIMITED", undefined, false], header);
    }
  }
  const unannotated = await problem(graphqlError({ code: "NOT_FOUND", status: 404 }, "Not found"));
  assert.deepEqual([unannotated.code, Object.hasOwn(unannotated, "retryAfter")], ["NOT_FOUND", false]);
});

test("a rejected mutation keeps its retry delay and is never resent by the transport", async () => {
  let requests = 0;
  const error = await problem(request => {
    requests++;
    return graphqlError({ code: "RATE_LIMITED", status: 429, retryAfter: 30 })(request);
  }, "communication.createPrincipal", { externalUserId: "fixture-user" });
  assert.deepEqual([error.code, error.retryAfter, requests], ["RATE_LIMITED", 30, 1]);
});

test("SCOPE_REQUIRED is a ScopeRequiredProblem that names the missing scope", async () => {
  for (const respond of [graphqlError({ code: "SCOPE_REQUIRED", status: 403, retryable: false }, scopeMessage("messageRead")),
    httpError({ code: "SCOPE_REQUIRED", outcome: "rejected", message: scopeMessage("messageRead") }, {}, 403)]) {
    const error = await problem(respond);
    assert.ok(error instanceof ScopeRequiredProblem);
    assert.deepEqual([error.name, error.code, error.status, error.outcome, error.scope],
      ["ScopeRequiredProblem", "SCOPE_REQUIRED", 403, "rejected", "messageRead"]);
    assert.equal(Object.hasOwn(error, "retryAfter"), false);
  }
});

test("a SCOPE_REQUIRED message in another wording keeps the class but not a guessed scope", async () => {
  for (const message of ["Missing scope", `${scopeMessage("messageRead")}.`, scopeMessage("MessageRead"),
    scopeMessage("message read"), `${scopeMessage("messageRead")}\n`, `Note: ${scopeMessage("messageRead")}`,
    scopeMessage(`m${"x".repeat(64)}`)]) {
    const error = await problem(graphqlError({ code: "SCOPE_REQUIRED", status: 403 }, message));
    assert.ok(error instanceof ScopeRequiredProblem, message);
    assert.deepEqual([error.code, error.scope, error.message], ["SCOPE_REQUIRED", undefined, message]);
  }
  const unexplained = await problem(request => Response.json({ errors: [{ extensions: { code: "SCOPE_REQUIRED",
    requestId: request.variables.context.requestId, outcome: "rejected", status: 403 } }] }));
  assert.ok(unexplained instanceof ScopeRequiredProblem);
  assert.deepEqual([unexplained.scope, unexplained.message], [undefined, "GraphQL rejected the request"]);
});

test("problems constructed directly keep the same shape", () => {
  const requestId = crypto.randomUUID(), cause = new Error("cause");
  const limited = new ConvoHopProblem("RATE_LIMITED", requestId, "rejected", 429, "Rate limited", { cause, retryAfter: 3 });
  assert.deepEqual([limited.name, limited.retryAfter, limited.cause], ["ConvoHopProblem", 3, cause]);
  assert.equal(Object.hasOwn(new ConvoHopProblem("NOT_FOUND", requestId, "rejected", 404, "Not found"), "retryAfter"), false);
  const scoped = new ScopeRequiredProblem(requestId, "rejected", 403, scopeMessage("callRead"));
  assert.ok(scoped instanceof ConvoHopProblem);
  assert.deepEqual([scoped.code, scoped.scope, scoped.requestId], ["SCOPE_REQUIRED", "callRead", requestId]);
});
