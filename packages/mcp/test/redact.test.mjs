import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { REDACTED, redact, redactObject, redactedFields, withheldOperations } from "@convohop/mcp";

const ir = JSON.parse(readFileSync(new URL("../../../schema/ir.json", import.meta.url), "utf8"));
const credentialLike = /token|secret|key|permit|ticket|password|credential|lease|proof|signature/i;
// Result fields that look like credentials but aren't, each with the reason tool results may carry them.
const notCredentials = {
  "AgentGrant.keys": "key summaries whose own fields are checked",
  "AgentKey.keyId": "identifies the key, which is not a secret",
  "AgentSignupStatus.keys": "key summaries whose own fields are checked",
  "Capabilities.serverRelease": "a release name",
  "CredentialCapsule.keyId": "identifies the key, which is not a secret",
  "CredentialCapsule.secretVersion": "a rotation version",
  "LimitEntry.key": "a limit name",
  "LiveConnectionGrant.leaseExpiresAt": "a timestamp",
  "LiveConnectionGrant.leasePolicyId": "a policy identifier",
  "LiveCredentialIssuance.leaseId": "identifies the lease, which is not a secret",
  "LiveCredentialIssuance.leaseExpiresAt": "a timestamp",
  "MediaPolicy.leasePolicyId": "a policy identifier",
  "MediaPolicy.maxLeaseMs": "a duration",
  "OperationResult.keyId": "identifies the key, which is not a secret",
  "RetainedResult.credentialDeliveryReceipt": "a receipt whose own fields are checked",
  "RetainedResult.liveCredentialIssuance": "an issuance record whose own fields are checked",
  "RouteReply.result": "the route proof binds the project to its serving authority and authorizes nothing",
  "SessionBootstrap.tokenExpiresAt": "a timestamp",
  "WebhookEndpoint.secretVersion": "a rotation version",
  "CredentialPermitReply.result": "only management.credentialPermit returns it, and no tool runs that operation",
  "AgentCredentialPermitReply.result": "only management.agentCredentialPermit returns it, and no tool runs that operation",
};
const permitReplies = ["CredentialPermitReply", "AgentCredentialPermitReply"];
const typeName = type => (type.kind === "list" ? typeName(type.ofType) : type.name);

test("every credential, secret or signed proof that a result can carry is redacted", () => {
  const found = [];
  for (const type of ir.types.filter(value => value.kind === "object")) {
    for (const field of type.fields) {
      if (!credentialLike.test(field.name) && typeName(field.type) !== "SignedProof") continue;
      const name = `${type.name}.${field.name}`;
      found.push(name);
      assert.ok(redactedFields.includes(field.name) || Object.hasOwn(notCredentials, name),
        `${name} looks like a credential: add ${field.name} to redactedFields or explain why it is not one`);
    }
  }
  assert.deepEqual(Object.keys(notCredentials).filter(name => !found.includes(name)), [], "stale allowlist entries");
  const fieldNames = new Set(ir.types.filter(value => value.kind === "object").flatMap(type => type.fields.map(field => field.name)));
  assert.deepEqual(redactedFields.filter(name => !fieldNames.has(name)), [], "redactedFields names no result field");
  const permits = ir.operations.filter(operation => permitReplies.includes(typeName(operation.result.type)));
  assert.deepEqual(permits.map(operation => operation.id).sort(),
    ["management.agentCredentialPermit", "management.credentialPermit"]);
  assert.deepEqual(permits.map(operation => operation.id).filter(id => !Object.hasOwn(withheldOperations, id)), []);
});

test("redaction replaces credential fields at any depth and keeps null ones", () => {
  const value = {
    status: "committed",
    result: { credentialCapsule: { keyId: "key-1", backendKey: "capsule-key", secret: "whsec_capsule", secretVersion: "2" } },
    receipt: { result: { sessionBootstrap: { session: null, tokenExpiresAt: "2026-10-08T00:00:00.000Z", sessionToken: "token" },
      signedProof: null } },
    grants: [{ connectToken: "connect", admissionTicket: { signature: "s" }, forwardingLease: { lease: 1 }, transportToken: "t" }],
    count: 3, enabled: false,
  };
  const before = structuredClone(value);
  assert.deepEqual(redactObject(value), {
    status: "committed",
    result: { credentialCapsule: { keyId: "key-1", backendKey: REDACTED, secret: REDACTED, secretVersion: "2" } },
    receipt: { result: { sessionBootstrap: { session: null, tokenExpiresAt: "2026-10-08T00:00:00.000Z", sessionToken: REDACTED },
      signedProof: null } },
    grants: [{ connectToken: REDACTED, admissionTicket: REDACTED, forwardingLease: REDACTED, transportToken: REDACTED }],
    count: 3, enabled: false,
  });
  assert.deepEqual(value, before, "redaction copies its input");
});

test("redaction scrubs configured secrets from every string", () => {
  const secrets = ["portal-secret", "backend-secret", ""];
  assert.deepEqual(redact({ message: "portal-secret and backend-secret, twice: backend-secret",
    nested: [["Bearer portal-secret"], { note: "clean" }] }, secrets), {
    message: `${REDACTED} and ${REDACTED}, twice: ${REDACTED}`,
    nested: [[`Bearer ${REDACTED}`], { note: "clean" }],
  });
  assert.equal(redact("nothing to hide", secrets), "nothing to hide");
  assert.deepEqual([redact(null, secrets), redact(7, secrets), redact(true, secrets)], [null, 7, true]);
  assert.ok(Object.isFrozen(redactedFields));
});
