// Fails when a tracked path or an exported identifier gains a version marker such as `v1`, `V2`
// or `_v3`, or when private state and intent identities move. The version policy is in CONTRIBUTING.md, "Versioning".
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));

// Versions the policy keeps. Each match is removed before the marker check, so an entry covers
// only its own text. Add an entry only with the external specification or consumer that needs it.
const ALLOWED = [
  [/(?<![A-Za-z0-9])v\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?/g, "npm semver and release tags"],
  [/standard-webhooks-v1/g, "Standard Webhooks signature scheme"],
  [/(?<![A-Za-z0-9])rtc\/v1(?:\/validate)?/g, "LiveKit signalling endpoints"],
  [/(?<![A-Za-z0-9])(?:Statement|provenance)\/v1/g, "in-toto and SLSA type URIs"],
  [/(?<![A-Za-z0-9])uuidV[1-8](?![0-9])/g, "RFC 9562 UUID versions"],
];
const MARKERS = [/(?:^|[^A-Za-z0-9])[vV]\d+(?![a-z])/, /[a-z0-9]V\d+(?![a-z])/, /_[vV]\d+(?![a-z])/];

const strip = text => ALLOWED.reduce((rest, [pattern]) => rest.replace(pattern, " "), text);
const marked = text => MARKERS.some(marker => marker.test(strip(text)));

const SOURCE = /\.(?:[cm]?[jt]s|[jt]sx|graphql)$/;
const EXPORTS = [
  /export\s+(?:declare\s+)?(?:default\s+)?(?:abstract\s+)?(?:async\s+)?(?:class|interface|type|const|let|var|function\*?|enum|namespace)\s+([A-Za-z_$][\w$]*)/g,
  /export\s+(?:type\s+)?\*\s+as\s+([A-Za-z_$][\w$]*)/g,
];
const EXPORT_LIST = /export\s+(?:type\s+)?\{([^}]*)\}/g;
// Every identifier in a GraphQL schema is public contract: types, fields, arguments and enum values.
const GRAPHQL_NOISE = /"""[\s\S]*?"""|"(?:\\.|[^"\\\n])*"|#[^\n]*/g;

function exportedNames(path, text) {
  if (path.endsWith(".graphql"))
    return [...new Set(text.replace(GRAPHQL_NOISE, " ").match(/[A-Za-z_]\w*/g) ?? [])];
  const names = EXPORTS.flatMap(pattern => [...text.matchAll(pattern)].map(match => match[1]));
  for (const [, list] of text.matchAll(EXPORT_LIST))
    for (const entry of list.split(",")) names.push(entry.replace(/^\s*type\s+/, "").split(/\s+as\s+/).pop().trim());
  return names.filter(Boolean);
}

function trackedFiles() {
  return execFileSync("git", ["ls-files", "-z", "-s"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
    .split("\0").filter(Boolean).map(line => line.split("\t"))
    .filter(([meta]) => !meta.startsWith("160000")).map(([, path]) => path);
}

const source = path => readFileSync(join(ROOT, path), "utf8");

function stringConstant(text, name) {
  const match = new RegExp(`\\b${name}\\s*=\\s*"([^"\\n]*)"`).exec(text);
  assert.ok(match, `${name} has a literal string value`);
  return match[1];
}

const POLICY = "Remove the version marker, or add a reasoned ALLOWED entry (CONTRIBUTING.md, Versioning)";

test("the marker check flags version markers and spares kept versions", () => {
  for (const name of ["schema/communication-v1.graphql", "docs/snippets/v1/a.md", "V1Client", "v1Id", "parse_v2", "ClientV3"])
    assert.equal(marked(name), true, name);
  for (const name of ["schema/communication.graphql", "release/v1.2.3-rc.1/notes.md", "standard-webhooks-v1.json",
    "mock/rtc/v1/validate.json", "provenance/v1/statement.json", "uuidV5", "IPv4", "Version", "h264", "base64"])
    assert.equal(marked(name), false, name);
});

test("every GraphQL schema identifier counts as exported, but descriptions and comments do not", () => {
  const schema = '"""Mentions v1 in prose."""\ntype WidgetV2 {\n  nameV3(firstV4: Int): String # v5\n}\n'
    + "enum Format {\n  WIRE_V6\n}\n";
  assert.deepEqual(exportedNames("schema/widget.graphql", schema).filter(marked),
    ["WidgetV2", "nameV3", "firstV4", "WIRE_V6"]);
});

test("tracked paths carry no version markers", () => {
  assert.deepEqual(trackedFiles().filter(marked), [], POLICY);
});

test("exported identifiers carry no version markers", () => {
  const found = trackedFiles().filter(path => SOURCE.test(path)).flatMap(path =>
    exportedNames(path, readFileSync(join(ROOT, path), "utf8")).filter(marked).map(name => `${path}: ${name}`));
  assert.deepEqual(found, [], POLICY);
});

test("Flutter iOS keeps the private VoIP and stopped-ring identities", () => {
  const calls = source("flutter/ios/instantrelay/Sources/instantrelay/RelayCalls.swift");
  assert.equal(stringConstant(calls, "voipKey"), "com.convohop.flutter.voip");
  assert.equal(stringConstant(calls, "stoppedKey"), "com.convohop.flutter.stopped");
  assert.match(calls, /UserDefaults\.standard\.set\(true, forKey: RelayCalls\.voipKey\)/);
  assert.match(calls, /if UserDefaults\.standard\.bool\(forKey: RelayCalls\.voipKey\) \{ startRegistry\(\) \}/);
  assert.match(calls, /UserDefaults\.standard\.dictionary\(forKey: stoppedKey\)/);
  assert.match(calls, /defaults\.dictionary\(forKey: RelayCalls\.stoppedKey\)/);
  assert.match(calls, /defaults\.set\(entries, forKey: RelayCalls\.stoppedKey\)/);
});

test("Flutter Android keeps its private push state and shared record keys", () => {
  const state = source("flutter/android/src/main/java/dev/instantrelay/flutter/RelayState.java");
  for (const [name, value] of Object.entries({
    PREFERENCES: "com.convohop.flutter.push", SEEN: "seen", STOPPED: "stopped", ACTIONS: "actions", INTENT_SECRET: "intentSecret",
  })) assert.equal(stringConstant(state, name), value, name);
  assert.match(state, /getSharedPreferences\(PREFERENCES, Context\.MODE_PRIVATE\)/);
  assert.match(state, /array\(preferences, SEEN\)/);
  assert.match(state, /putString\(SEEN, next\.toString\(\)\)/);
  assert.match(state, /prune\(object\(preferences, STOPPED\)\)/);
  assert.match(state, /object\(preferences\(context\), STOPPED\)\.optJSONObject\(alertId\)/);
  assert.match(state, /putString\(STOPPED, stopped\.toString\(\)\)/);
  assert.equal([...state.matchAll(/array\(preferences, ACTIONS\)/g)].length, 2, "queue and drain read the same actions");
  assert.match(state, /putString\(ACTIONS, next\.toString\(\)\)/);
  assert.match(state, /preferences\.edit\(\)\.remove\(ACTIONS\)/);
  for (const key of ["action", "alertId", "payload"]) {
    assert.match(state, new RegExp(`\\.put\\("${key}", ${key}\\)`));
    assert.match(state, new RegExp(`queued\\.optString\\("${key}"`));
  }
  assert.match(state, /\.put\("at", System\.currentTimeMillis\(\)\)/);
  assert.match(state, /queued\.optLong\("at"\) < oldest/);
  assert.equal([...state.matchAll(/preferences(?:\(context\))?\.getString\(INTENT_SECRET, null\)/g)].length, 2);
  assert.match(state, /putString\(INTENT_SECRET, secret\)\.commit\(\)/);
  assert.match(state, /secret != null\s*&& expected != null\s*&& MessageDigest\.isEqual\(/);
});

test("Flutter Android keeps notification actions, extras and replay markers aligned", () => {
  const notifier = source("flutter/android/src/main/java/dev/instantrelay/flutter/RelayNotifier.java");
  const plugin = source("flutter/android/src/main/java/dev/instantrelay/flutter/RelayPlugin.java");
  for (const [name, suffix] of Object.entries({
    ACTION_OPEN: "OPEN", ACTION_INCOMING_CALL: "INCOMING_CALL", ACTION_ANSWER_CALL: "ANSWER_CALL",
    ACTION_DECLINE_CALL: "DECLINE_CALL", EXTRA_PAYLOAD: "PAYLOAD", EXTRA_ALERT_ID: "ALERT_ID",
    EXTRA_SECRET: "SECRET", EXTRA_CONVERSATION_ID: "CONVERSATION_ID",
  })) assert.equal(stringConstant(notifier, name), `com.convohop.flutter.${suffix}`, name);
  assert.equal(stringConstant(plugin, "EXTRA_HANDLED"), "com.convohop.flutter.HANDLED");
  assert.match(notifier, /new Intent\(action\)/);
  for (const name of ["EXTRA_PAYLOAD", "EXTRA_ALERT_ID", "EXTRA_SECRET"]) {
    assert.match(notifier, new RegExp(`intent\\.putExtra\\(${name},`));
    assert.match(plugin, new RegExp(`intent\\.getStringExtra\\(RelayNotifier\\.${name}\\)`));
  }
  for (const name of ["ACTION_OPEN", "ACTION_INCOMING_CALL", "ACTION_ANSWER_CALL"])
    assert.match(plugin, new RegExp(`RelayNotifier\\.${name}\\.equals\\(action\\)`));
  assert.match(plugin, /RelayState\.isIntentSecret\(\s*context, intent\.getStringExtra\(RelayNotifier\.EXTRA_SECRET\)\)/);
  assert.match(plugin, /intent\.getBooleanExtra\(EXTRA_HANDLED, false\)/);
  assert.match(plugin, /intent\.putExtra\(EXTRA_HANDLED, true\)/);
  assert.match(notifier, /extras\.putString\(EXTRA_CONVERSATION_ID, message\.conversationId\)/);
  assert.match(notifier, /extras\.getString\(EXTRA_CONVERSATION_ID\)/);
  assert.match(notifier, /extras\.putString\(EXTRA_PAYLOAD, call\.json\)/);
  assert.match(notifier, /extras\.getString\(EXTRA_PAYLOAD\)/);
});

test("Flutter Android keeps the non-exported component stored in decline PendingIntents", () => {
  const manifest = source("flutter/android/src/main/AndroidManifest.xml");
  assert.match(manifest, /<receiver\s+android:name="com\.convohop\.flutter\.ConvoHopCallReceiver"\s+android:exported="false"\s*\/>/);
  assert.equal([...manifest.matchAll(/<receiver\b/g)].length, 1, "only the stable component is registered");
  const component = source("flutter/android/src/main/java/com/convohop/flutter/ConvoHopCallReceiver.java");
  assert.match(component, /^package com\.convohop\.flutter;/);
  assert.match(component, /public final class ConvoHopCallReceiver extends dev\.instantrelay\.flutter\.RelayCallReceiver \{\}/);
  const notifier = source("flutter/android/src/main/java/dev/instantrelay/flutter/RelayNotifier.java");
  assert.match(notifier, /new Intent\(ACTION_DECLINE_CALL\)\s*\.setClass\(context, com\.convohop\.flutter\.ConvoHopCallReceiver\.class\)/);
  assert.match(notifier, /PendingIntent\.FLAG_IMMUTABLE \| PendingIntent\.FLAG_UPDATE_CURRENT/);
  const receiver = source("flutter/android/src/main/java/dev/instantrelay/flutter/RelayCallReceiver.java");
  assert.match(receiver, /if \(!RelayNotifier\.ACTION_DECLINE_CALL\.equals\(intent\.getAction\(\)\)\) return;/);
  assert.match(receiver, /intent\.getStringExtra\(RelayNotifier\.EXTRA_ALERT_ID\)/);
  assert.match(receiver, /if \(alertId != null\) RelayCalls\.decline\(context, alertId\);/);
});

test("React Native Android keeps the stored recipient and fail-closed reader", () => {
  const recipients = source("packages/react-native/android/src/main/java/dev/instantrelay/reactnative/Recipients.kt");
  assert.equal(stringConstant(recipients, "FILE"), "com.convohop.reactnative.recipient");
  assert.equal(stringConstant(recipients, "KEY"), "recipient");
  assert.match(recipients, /getSharedPreferences\(FILE, Context\.MODE_PRIVATE\)/);
  assert.match(recipients, /Recipient\.decode\(preferences\.getString\(KEY, null\)\)/);
  assert.match(recipients, /if \(recipient == null\) editor\.remove\(KEY\) else editor\.putString\(KEY, recipient\.encode\(\)\)/);
  assert.match(recipients, /recipient\(\)\?\.recipientId == recipientId && app\?\.accepts\(recipientId\) != false/);
});

test("React Native Android keeps private signing and opened-notification identities", () => {
  const opened = source("packages/react-native/android/src/main/java/dev/instantrelay/reactnative/OpenedNotifications.kt");
  const push = source("packages/react-native/android/src/main/java/dev/instantrelay/reactnative/RelayPushModule.kt");
  for (const [name, value] of Object.entries({
    FILE: "com.convohop.reactnative.intents", KEY: "key", DOMAIN: "convohop.opened\\u0000", ALGORITHM: "HmacSHA256",
    EXTRA_PAYLOAD: "com.convohop.reactnative.extra.PAYLOAD", EXTRA_SIGNATURE: "com.convohop.reactnative.extra.SIGNATURE",
  })) assert.equal(stringConstant(opened, name), value, name);
  assert.match(opened, /getSharedPreferences\(FILE, Context\.MODE_PRIVATE\)/);
  assert.match(opened, /unhex\(preferences\.getString\(KEY, null\)\)/);
  assert.match(opened, /putString\(KEY, hex\(key\)\)\.commit\(\)/);
  assert.match(opened, /MessageDigest\.isEqual\(sign\(payload\)\.toByteArray/);
  assert.match(opened, /mac\.doFinal\(\(DOMAIN \+ payload\)\.toByteArray/);
  for (const name of ["EXTRA_PAYLOAD", "EXTRA_SIGNATURE"]) {
    assert.match(opened, new RegExp(`\\.putExtra\\(${name},`));
    assert.match(push, new RegExp(`intent\\.getStringExtra\\(SignedConversationIntent\\.${name}\\)`));
    assert.match(push, new RegExp(`intent\\.removeExtra\\(SignedConversationIntent\\.${name}\\)`));
  }
  assert.match(push, /if \(payload == null \|\| signature == null \|\| !process\.signer\.verify\(payload, signature\)\) return null/);
  assert.match(push, /if \(notification\.projectId != recipient\.projectId \|\| notification\.recipientId != recipient\.recipientId\) return null/);
  assert.match(push, /if \(notifications\.options\.recipientFilter\?\.accepts\(notification\.recipientId\) == false\) return null/);
});

test("React Native Android keeps the stored push permission decision", () => {
  const push = source("packages/react-native/android/src/main/java/dev/instantrelay/reactnative/RelayPushModule.kt");
  assert.equal(stringConstant(push, "PERMISSION_FILE"), "com.convohop.reactnative.permission");
  assert.equal(stringConstant(push, "ASKED"), "asked");
  assert.match(push, /getSharedPreferences\(PERMISSION_FILE, Context\.MODE_PRIVATE\)/);
  assert.match(push, /permissionState\.edit\(\)\.putBoolean\(ASKED, true\)\.apply\(\)/);
  assert.match(push, /val asked = permissionState\.getBoolean\(ASKED, false\)/);
  assert.match(push, /return if \(asked\) DENIED else UNDETERMINED/);
});
