import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { cliOperations, cliTypes, withheldOperations } from "@convohop/cli";
import { assertNoSecrets, assertUsage, sandbox } from "./helpers.mjs";

const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const COMMANDS = [
  "login", "logout", "status", "projects get", "projects create", "projects usage", "operation get", "resolve",
  "keys issue", "keys scopes", "keys revoke", "redeem", "webhooks list", "webhooks deliveries", "webhooks tail",
  "webhooks replay", "push test", "call",
];
const GROUPS = {
  projects: ["projects get", "projects create", "projects usage"], operation: ["operation get"],
  keys: ["keys issue", "keys scopes", "keys revoke"], webhooks: ["webhooks list", "webhooks deliveries", "webhooks tail", "webhooks replay"],
  push: ["push test"],
};
const listed = text => [...text.matchAll(/^ {2}([a-z]+(?: [a-z]+)?) {2,}\S/gm)].map(match => match[1]);

test("convohop alone, help and --help print the overview of every command and the exit codes", async t => {
  const { cli } = await sandbox(t);
  const overview = await cli([]);
  assert.equal(overview.code, 0);
  assert.equal(overview.stderr, "");
  assert.ok(overview.stdout.startsWith("convohop: the ConvoHop command-line interface for project operators.\n"));
  assert.deepEqual(listed(overview.stdout), COMMANDS);
  assert.match(overview.stdout, /Exit codes: 0 success, 1 failure, 2 usage error, 3 unknown outcome, 130 interrupted\./);
  for (const argv of [["help"], ["--help"], ["-h"], ["--profile", "staging", "--help"]])
    assert.deepEqual(await cli(argv), overview, argv.join(" "));
});

test("--version prints the package version", async t => {
  const { cli } = await sandbox(t);
  const result = await cli(["--version"]);
  assert.equal(result.code, 0);
  assert.equal(result.stdout, `${manifest.version}\n`);
  assert.equal(result.stderr, "");
});

test("a group word prints the group's commands, and help COMMAND, --help and -h print the command's options", async t => {
  const { cli } = await sandbox(t);
  for (const [group, commands] of Object.entries(GROUPS)) {
    const result = await cli([group]);
    assert.equal(result.code, 0, group);
    assert.ok(result.stdout.startsWith(`Usage: convohop ${group} COMMAND [options]\n`), group);
    assert.deepEqual(listed(result.stdout), commands, group);
    assert.deepEqual(await cli([group, "--help"]), result, group);
  }
  const help = await cli(["keys", "revoke", "--help"]);
  assert.equal(help.code, 0);
  assert.ok(help.stdout.startsWith("Usage: convohop keys revoke --project ID --key ID --expected-revision REVISION " +
    "[--revoke-sessions] [--yes]\n"));
  assert.match(help.stdout, /^ {2}--yes {2,}Don't ask for confirmation\.$/m);
  assert.match(help.stdout, /^Global options:\n {2}--profile NAME /m);
  for (const argv of [["help", "keys", "revoke"], ["keys", "revoke", "-h"], ["--profile", "x", "keys", "revoke", "--help"]])
    assert.deepEqual(await cli(argv), help, argv.join(" "));
  for (const command of COMMANDS) {
    const result = await cli([...command.split(" "), "--help"]);
    assert.equal(result.code, 0, command);
    assert.ok(result.stdout.startsWith(`Usage: convohop ${command}`), command);
  }
});

test("unknown commands and options are usage errors that never echo what may be a mistyped secret", async t => {
  const { cli } = await sandbox(t);
  assertUsage(await cli(["frobnicate"]), "Unknown command frobnicate");
  assertUsage(await cli(["keys", "rotate", "--project", "x"]), "Unknown command keys rotate");
  assertUsage(await cli(["help", "frobnicate"]), "Unknown command frobnicate");
  const secret = "Sk_Live_0123456789abcdef";
  for (const argv of [[secret], ["keys", secret], ["a", "b", "c", "d"]]) {
    const result = await cli(argv);
    assertUsage(result, "Unknown command");
    assertNoSecrets(result, secret);
  }
  assertUsage(await cli(["status", "--frobnicate"]), "Unknown option --frobnicate", "status");
  for (const argv of [["status", `--token=${secret}`], ["status", `--${secret}`], ["status", "-x"], [`--${secret}`]]) {
    const result = await cli(argv);
    assert.equal(result.code, 2);
    assert.match(result.stderr, /^convohop: Unknown option( --token)?\n/);
    assertNoSecrets(result, secret);
  }
  assertUsage(await cli(["status", secret]), "This command takes no arguments", "status");
  assertUsage(await cli(["call", "management.getProject", "extra"]), "Too many arguments", "call");
  assertUsage(await cli(["status", "--verify=yes"]), "--verify takes no value", "status");
  assertUsage(await cli(["projects", "get", "--project"]), "--project needs a value", "projects get");
  assertUsage(await cli(["projects", "get", "--project="]), "--project needs a value", "projects get");
  assertUsage(await cli(["projects", "get", "--project", "--help"]), "--project needs a value", "projects get");
  assertUsage(await cli(["projects", "get", "--project", "a", "--project", "b"]), "--project is given more than once",
    "projects get");
});

test("--profile can come before the command, and profile names are checked", async t => {
  const { cli } = await sandbox(t);
  const before = await cli(["--profile", "staging", "status"]), after = await cli(["status", "--profile=staging"]);
  assert.equal(before.code, 0, before.stderr);
  assert.deepEqual(before, after);
  assert.equal(JSON.parse(before.stdout).profile, "staging");
  const fromEnvironment = await cli(["status"], { env: { CONVOHOP_PROFILE: "staging" } });
  assert.equal(JSON.parse(fromEnvironment.stdout).profile, "staging");
  for (const name of ["-dash", "with space", "x".repeat(65), "slash/name"]) {
    const result = await cli(["status", `--profile=${name}`]);
    assertUsage(result, "A profile name has 1 to 64 letters, digits, dots, dashes or underscores, and starts with a " +
      "letter or digit");
  }
});

test("call --list lists every operation call can run, with its plane, kind and whether it is destructive", async t => {
  const { cli } = await sandbox(t);
  const result = await cli(["call", "--list"]);
  assert.equal(result.code, 0, result.stderr);
  const operations = JSON.parse(result.stdout);
  assert.deepEqual(operations, Object.values(cliOperations).map(({ id, plane, kind, destructive, summary }) =>
    ({ id, plane, kind, destructive, summary })));
  assert.equal(operations.length, 60);
  assert.deepEqual(operations.filter(op => op.destructive).map(op => op.id).sort(), [
    "communication.deleteMessage", "communication.disablePrincipal", "communication.endLiveSession",
    "communication.removeMember", "communication.revokeSession", "management.disableWebhook",
    "management.revokeBackendKey", "management.rotateWebhookSecret", "management.updateWebhook",
  ]);
  for (const id of Object.keys(withheldOperations)) assert.ok(!operations.some(op => op.id === id), id);
  assertUsage(await cli(["call", "management.getProject", "--list"]), "--list takes no operation", "call");
});

test("call OPERATION --help shows the operation's annotations and input fields", async t => {
  const { cli } = await sandbox(t);
  const revoke = await cli(["call", "management.revokeBackendKey", "--help"]);
  assert.equal(revoke.code, 0, revoke.stderr);
  const op = cliOperations["management.revokeBackendKey"];
  assert.ok(revoke.stdout.startsWith("Usage: convohop call management.revokeBackendKey [--input JSON | --input-file FILE] " +
    `[--yes]\n\n${op.summary}\n`));
  assert.match(revoke.stdout, new RegExp(`^Kind: management mutation\nCredential: ${op.credential}\nRequires: ` +
    `.+\nIdempotency: ${op.idempotency}\nDestructive: yes\\. convohop asks first, unless --yes is given$`, "m"));
  assert.match(revoke.stdout, new RegExp(`^Input \\(${op.input}\\):$`, "m"));
  for (const field of cliTypes[op.input].fields)
    assert.match(revoke.stdout, new RegExp(`^ {2}${field.name} +${field.type.replace(/[[\]!]/g, "\\$&")} +required`, "m"));
  assert.doesNotMatch(revoke.stdout, /CONVOHOP_BACKEND_KEY/);

  const members = await cli(["help", "call", "communication.addMembers"]);
  assert.equal(members.code, 0, members.stderr);
  assert.match(members.stdout, /^Usage: convohop call communication\.addMembers \[--input JSON \| --input-file FILE\] /);
  assert.match(members.stdout, /\[--project ID\] \[--incarnation ID\]\n/);
  assert.doesNotMatch(members.stdout, /Destructive/);
  assert.match(members.stdout, /^MemberBatchEntryInput:\n {2}principalId +UUID! +required/m);
  assert.match(members.stdout, /\nCommunication operations use a backend key from CONVOHOP_BACKEND_KEY or CONVOHOP_BACKEND_KEY_FILE\.\n$/);

  const capabilities = await cli(["call", "management.capabilities", "--help"]);
  assert.match(capabilities.stdout, /^Input: none$/m);
});

test("call refuses operations whose results are credentials, and unknown operations, before sending anything", async t => {
  const { cli } = await sandbox(t);
  for (const [id, reason] of Object.entries(withheldOperations)) {
    assertUsage(await cli(["call", id]), `convohop call doesn't run ${id}, which ${reason}`, "call");
    assertUsage(await cli(["call", id, "--help"]), `convohop call doesn't run ${id}, which ${reason}`, "call");
  }
  for (const id of ["communication.redeemCredential", "communication.acknowledgeCredential"])
    assertUsage(await cli(["call", id, "--input", "{}"]), `convohop redeem runs ${id}, and keeps the credential out of its output`,
      "call");
  assertUsage(await cli(["call"]), "Name an operation, such as management.getProject, or pass --list", "call");
  assertUsage(await cli(["call", "management.launchRocket"]),
    "Unknown operation management.launchRocket. convohop call --list lists them", "call");
  const secret = "whsec_c2VjcmV0LXRoYXQtbXVzdC1ub3QtcHJpbnQ=";
  const unknown = await cli(["call", secret]);
  assertUsage(unknown, "Unknown operation. convohop call --list lists them", "call");
  assertNoSecrets(unknown, secret);
});

test("call checks its input before it needs credentials", async t => {
  const { cli, directory } = await sandbox(t);
  const run = argv => cli(["call", ...argv]);
  assertUsage(await run(["management.getProject", "--project", "x"]),
    "--project and --incarnation apply to communication operations. Put the project in the input", "call");
  assertUsage(await run(["management.getProject", "--input", "{}", "--input-file", "x"]),
    "Set --input or --input-file, not both", "call");
  assertUsage(await run(["management.getProject", "--input", `"${"x".repeat(65_536)}"`]),
    "--input must be at most 65536 bytes", "call");
  const secret = "fixture-secret-in-bad-json";
  const invalid = await run(["management.getProject", "--input", `{"projectId": ${secret}}`]);
  assertUsage(invalid, "--input is not valid JSON", "call");
  assertNoSecrets(invalid, secret);
  assertUsage(await run(["management.getProject", "--input", "[]"]), "The input must be a JSON object", "call");
  assertUsage(await run(["management.getProject", "--input", "{\"projectID\":\"x\"}"]),
    "management.getProject has no input field projectID. convohop call management.getProject --help lists them", "call");
  const hidden = await run(["management.getProject", "--input", `{"${secret}":1}`]);
  assertUsage(hidden, "management.getProject has no input field with that name. convohop call management.getProject " +
    "--help lists them", "call");
  assertNoSecrets(hidden, secret);
  assertUsage(await run(["management.getProject", "--input", "{\"projectId\":null}"]),
    "The input needs projectId. convohop call management.getProject --help lists the fields", "call");
  const path = join(directory, "missing.json"), missing = await run(["management.getProject", "--input-file", path]);
  assert.equal(missing.code, 1);
  assert.equal(missing.stderr, `convohop: Can't read ${path}\n`);
});
