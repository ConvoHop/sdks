import assert from "node:assert/strict";
import { test } from "node:test";
import { Room } from "livekit-client";
import { MediaConnection, ConvoHopTransport } from "@convohop/client";
import { reply, resolution } from "../../../test/graphql-fixtures.mjs";
import { asyncStorage } from "../../../test/recovery-fixtures.mjs";

test("native ICE policy rejects invalid values before credentials or network work", async () => {
  let requested = 0;
  const participation = { connectionGrant: async () => { requested++; throw new Error("must not be called"); } };
  for (const iceTransportPolicy of ["tcp", "Relay", "", null, false, {}, 1]) {
    await assert.rejects(MediaConnection.connectParticipation(participation, { iceTransportPolicy }),
      { name: "TypeError", message: "ICE policy must be all or relay" });
  }
  assert.equal(requested, 0);
});

for (const fail of [false, true]) {
  test(`native admission awaits its durable marker${fail ? " and never opens after a failed commit" : " before opening"}`, async t => {
    const gate = Promise.withResolvers(), entered = Promise.withResolvers();
    const saved = asyncStorage({ onWrite: async (_key, _value, count) => {
      if (count === 4) { entered.resolve(); await gate.promise; }
    } });
    const projectId = crypto.randomUUID(), incarnation = crypto.randomUUID(), liveSessionId = crypto.randomUUID();
    const participationId = crypto.randomUUID(), requestId = crypto.randomUUID(), expires = new Date(Date.now() + 60000).toISOString();
    const grant = { liveSessionId, participationId, generation: "1", roomName: "fixture", participantIdentity: "fixture",
      livekitUrl: "ws://localhost:17880", transportToken: "fixture-private-grant",
      admissionTicket: { participationId, signature: "fixture-private-ticket" },
      forwardingLease: { participationId, leaseVersion: "2", signature: "fixture-private-proof" },
      transportExpiresAt: expires, admissionExpiresAt: expires, leaseExpiresAt: expires, leasePolicyId: "fixture",
      connectToken: "fixture-private-connect-token" };
    const transportOptions = { baseUrl: "http://localhost:18080", namespace: "native-async", incarnation, asyncRecoveryStorage: saved };
    const transport = new ConvoHopTransport({ ...transportOptions, fetch: async (_url, init) =>
      reply(JSON.parse(init.body), { result: grant }) });
    await transport.execute("communication.liveSessionCredentials", projectId,
      { liveSessionId, participationId, expectedGeneration: "1", mode: "INITIAL" }, requestId);
    let nativeOpens = 0, room;
    const on = Room.prototype.on;
    t.mock.method(Room.prototype, "on", function (...args) {
      room = this;
      return on.apply(this, args);
    });
    const participation = { participationId, snapshot: { permissions: { microphone: false, camera: false, subscribe: true } },
      connectionGrant: async () => ({ requestId, grant }),
      connectionAttempted: () => transport.markMediaAdmissionAttempted(requestId) };
    const work = MediaConnection.connectParticipation(participation, {});
    assert.ok(room);
    let opened;
    t.mock.method(room, "connect", async (url, token) => {
      nativeOpens++;
      opened = [url, token];
      assert.equal(JSON.parse([...saved.values.values()][0])[0].mediaAdmissionAttempted, true);
      throw new Error("synthetic native failure");
    });
    t.mock.method(room, "disconnect", async () => {});
    const rejected = assert.rejects(work, { code: fail ? "RECOVERY_STORAGE_FAILURE" : "MEDIA_CONNECT_FAILED", requestId });
    await entered.promise;
    assert.equal(nativeOpens, 0);
    assert.equal(transport.recoveryStates[0].mediaAdmissionAttempted, true);
    assert.equal(JSON.parse([...saved.values.values()][0])[0].mediaAdmissionAttempted, undefined);
    if (fail) gate.reject(new Error("durable commit unavailable")); else gate.resolve();
    await rejected;
    assert.equal(nativeOpens, fail ? 0 : 1);
    // The Web SDK keeps first-frame admission; connectToken is for stock LiveKit SDKs.
    if (!fail) assert.deepEqual(opened, [grant.livekitUrl, grant.transportToken]);
    assert.ok(saved.writes.every(({ value }) => !value.includes("fixture-private")));
    if (!fail) {
      const restarted = new ConvoHopTransport({ ...transportOptions, fetch: async (_url, init) => {
        const request = JSON.parse(init.body);
        assert.equal(request.operationName, "CommunicationResolveRequest");
        return reply(request, { result: resolution(requestId, "notObservedYet") });
      } });
      await assert.rejects(restarted.retry(requestId), { code: "RESOLUTION_REQUIRED", requestId });
      assert.equal(restarted.recoveryStates[0].mediaAdmissionAttempted, true);
    }
  });
}
