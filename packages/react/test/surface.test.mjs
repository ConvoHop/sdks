import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { version } from "react";
import * as react from "../dist/index.js";
import { builtImportSpecifiers, sortedKeys } from "../../../test/package-fixtures.mjs";

// The Web workflow's oldest-react job installs another React line and sets this to its major.
test("runs on the React line CI installed", { skip: process.env.CONVOHOP_REACT_MAJOR === undefined }, () => {
  assert.equal(version.split(".")[0], process.env.CONVOHOP_REACT_MAJOR);
});

test("runtime exports are pinned", () => {
  assert.deepEqual(sortedKeys(react), [
    "ConvoHopProvider", "useConversation", "useConvoHopClient", "useLiveSession", "useMediaConnection", "useOutbox",
    "useSessionRefresh", "useTyping",
  ]);
});

test("built JavaScript imports only React and the client, so React Native can use it", async () => {
  assert.deepEqual([...(await builtImportSpecifiers(new URL("../dist/", import.meta.url))).keys()].sort(),
    ["@convohop/client", "react"]);
});

test("React and the client are peers, so the app's copies are used", async () => {
  const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(manifest.dependencies, undefined);
  assert.deepEqual(manifest.peerDependencies, { "@convohop/client": "*", react: ">=18" });
});
