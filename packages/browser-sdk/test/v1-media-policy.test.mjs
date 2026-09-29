import assert from "node:assert/strict";
import { test } from "node:test";
import { V1MediaConnection } from "../dist/index.js";

test("native ICE policy rejects invalid values before credentials or network work", async () => {
  let requested = 0;
  const participation = { connectionGrant: async () => { requested++; throw new Error("must not be called"); } };
  for (const iceTransportPolicy of ["tcp", "Relay", "", null, false, {}, 1]) {
    await assert.rejects(V1MediaConnection.connectParticipation(participation, { iceTransportPolicy }),
      { name: "TypeError", message: "ICE policy must be all or relay" });
  }
  assert.equal(requested, 0);
});
