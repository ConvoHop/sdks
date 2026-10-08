import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { access, chmod, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import test from "node:test";
import { reply } from "../../../test/graphql-fixtures.mjs";
import {
  COMMUNICATION_URL, MANAGEMENT_URL, PORTAL_TOKEN, UUID, assertNoSecrets, assertUsage, capabilities, cli, fakeAuthority,
  problem, project, sandbox, stdinOf,
} from "./helpers.mjs";

const exists = path => access(path).then(() => true, () => false);
const ok = (stdout = "") => ({ code: 0, stdout, stderr: "" });

/** The macOS keychain as security presents it, keeping items by account. */
function keychain() {
  const items = new Map(), calls = [];
  const runCommand = async (command, args, input) => {
    calls.push({ command, args: [...args], input });
    assert.equal(command, "security");
    if (args.length === 1 && args[0] === "-i") {
      const match = /^add-generic-password -U -a ([0-9a-f-]{36}) -s com\.convohop\.cli -l convohop-cli\/([\w.-]+) -X ([0-9a-f]+)\n$/
        .exec(input);
      assert.ok(match, "security -i gets one add-generic-password command");
      items.set(match[1], Buffer.from(match[3], "hex").toString("utf8"));
      return ok();
    }
    const [verb, ...rest] = args, account = rest[rest.indexOf("-a") + 1];
    assert.equal(rest[rest.indexOf("-s") + 1], "com.convohop.cli");
    if (verb === "find-generic-password") return items.has(account) ? ok(`${items.get(account)}\n`) : { code: 44, stdout: "", stderr: "" };
    if (verb === "delete-generic-password") return items.delete(account) ? ok() : { code: 44, stdout: "", stderr: "" };
    throw new Error(`Unexpected security ${verb}`);
  };
  return { items, calls, runCommand };
}

/** The Secret Service as secret-tool presents it. */
function secretService() {
  const items = new Map(), calls = [];
  const runCommand = async (command, args, input) => {
    calls.push({ command, args: [...args], input });
    assert.equal(command, "secret-tool");
    const account = args.at(-1);
    if (args[0] === "store") {
      items.set(account, input);
      return ok();
    }
    if (args[0] === "lookup") return items.has(account) ? ok(items.get(account)) : { code: 1, stdout: "", stderr: "" };
    if (args[0] === "clear") {
      items.delete(account);
      return ok();
    }
    throw new Error(`Unexpected secret-tool ${args[0]}`);
  };
  return { items, calls, runCommand };
}

const login = (extra = []) => ["login", "--management-url", MANAGEMENT_URL, ...extra];

test("login checks a piped portal token and saves it in credentials.json, readable only by the user", async t => {
  const { cli, config } = await sandbox(t);
  const authority = fakeAuthority({ ManagementCapabilities: request => capabilities(request, { portalIdentity: "operator@example.com" }) });
  const result = await cli(login(["--communication-url", `${COMMUNICATION_URL}/`, "--credential-store", "file"]),
    { stdin: stdinOf(`  ${PORTAL_TOKEN}\n`), fetch: authority.fetch });
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.deepEqual(JSON.parse(result.stdout), { profile: "default", managementUrl: MANAGEMENT_URL,
    communicationUrl: COMMUNICATION_URL, credentialStore: "file", verified: true, portalIdentity: "operator@example.com" });
  assert.deepEqual(authority.requests.map(({ url, authorization, operationName }) => ({ url, authorization, operationName })),
    [{ url: `${MANAGEMENT_URL}/graphql`, authorization: `Bearer ${PORTAL_TOKEN}`, operationName: "ManagementCapabilities" }]);
  assertNoSecrets(result, PORTAL_TOKEN);

  assert.equal((await stat(config)).mode & 0o777, 0o700);
  for (const file of ["config.json", "credentials.json"]) assert.equal((await stat(join(config, file))).mode & 0o777, 0o600, file);
  const saved = JSON.parse(await readFile(join(config, "config.json"), "utf8"));
  const ref = saved.profiles.default.credentialRef;
  assert.match(ref, UUID);
  assert.deepEqual(saved, { profiles: { default: { managementUrl: MANAGEMENT_URL, communicationUrl: COMMUNICATION_URL,
    credentialStore: "file", credentialRef: ref } } });
  assert.deepEqual(JSON.parse(await readFile(join(config, "credentials.json"), "utf8")), { tokens: { [ref]: PORTAL_TOKEN } });

  const status = await cli(["status"]);
  assert.deepEqual(JSON.parse(status.stdout), { profile: "default", loggedIn: true, managementUrl: MANAGEMENT_URL,
    communicationUrl: COMMUNICATION_URL, credentialStore: "file", token: "present" });

  const projectId = randomUUID(), incarnation = randomUUID();
  const reader = fakeAuthority({ ManagementGetProject: request => reply(request, { result: project(projectId, incarnation) }) });
  const shown = await cli(["projects", "get", "--project", projectId.toUpperCase()], { fetch: reader.fetch });
  assert.equal(shown.code, 0, shown.stderr);
  assert.equal(JSON.parse(shown.stdout).incarnation, incarnation);
  assert.equal(reader.requests[0].url, `${MANAGEMENT_URL}/graphql`);
  assert.equal(reader.requests[0].authorization, `Bearer ${PORTAL_TOKEN}`);
  assert.deepEqual(reader.requests[0].variables.input, { projectId });

  const out = await cli(["logout"]);
  assert.equal(out.code, 0, out.stderr);
  assert.deepEqual(JSON.parse(out.stdout), { profile: "default", loggedOut: true });
  assert.equal(await exists(join(config, "credentials.json")), false);
  assert.deepEqual(JSON.parse(await readFile(join(config, "config.json"), "utf8")), { profiles: {} });
  assert.deepEqual(JSON.parse((await cli(["logout"])).stdout), { profile: "default", loggedOut: false });
  assert.deepEqual(JSON.parse((await cli(["status"])).stdout), { profile: "default", loggedIn: false, managementUrl: null,
    communicationUrl: null, credentialStore: null, token: "missing" });
});

test("on macOS, login gives the keychain the token as hex on standard input, never as an argument", async t => {
  const { cli, config } = await sandbox(t);
  const store = keychain(), authority = fakeAuthority({ ManagementCapabilities: capabilities });
  const result = await cli(login(), { platform: "darwin", runCommand: store.runCommand, stdin: stdinOf(PORTAL_TOKEN),
    fetch: authority.fetch });
  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { profile: "default", managementUrl: MANAGEMENT_URL, credentialStore: "keychain",
    verified: true, portalIdentity: null });
  const ref = JSON.parse(await readFile(join(config, "config.json"), "utf8")).profiles.default.credentialRef;
  assert.deepEqual([...store.items], [[ref, PORTAL_TOKEN]]);
  assert.deepEqual(store.calls.map(call => call.args), [
    ["-i"], ["find-generic-password", "-a", ref, "-s", "com.convohop.cli", "-w"],
  ]);
  for (const call of store.calls)
    assert.ok(!call.args.some(arg => arg.includes(PORTAL_TOKEN)) && !call.input.includes(PORTAL_TOKEN));
  assert.equal(await exists(join(config, "credentials.json")), false);

  const status = await cli(["status"], { platform: "darwin", runCommand: store.runCommand });
  assert.equal(JSON.parse(status.stdout).token, "present");

  const failing = async (command, args, input) => args[0] === "delete-generic-password" ? { code: 51, stdout: "", stderr: "" }
    : store.runCommand(command, args, input);
  const kept = await cli(["logout"], { platform: "darwin", runCommand: failing });
  assert.equal(kept.code, 1);
  assert.equal(kept.stderr, "convohop: Can't remove the portal token from the keychain credential store: security exited " +
    "with code 51. The profile is kept, so you can try again\n");
  assert.equal(store.items.size, 1);
  const out = await cli(["logout"], { platform: "darwin", runCommand: store.runCommand });
  assert.equal(out.code, 0, out.stderr);
  assert.equal(store.items.size, 0);
});

test("on Linux, login gives secret-tool the token on standard input", async t => {
  const { cli, config } = await sandbox(t);
  const store = secretService();
  const result = await cli(login(["--no-verify", "--profile", "ci.linux"]), { platform: "linux", runCommand: store.runCommand,
    stdin: stdinOf(`${PORTAL_TOKEN}\r\n`) });
  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { profile: "ci.linux", managementUrl: MANAGEMENT_URL,
    credentialStore: "secret-service", verified: false });
  const ref = JSON.parse(await readFile(join(config, "config.json"), "utf8")).profiles["ci.linux"].credentialRef;
  assert.deepEqual(store.calls, [
    { command: "secret-tool", args: ["store", "--label=convohop-cli/ci.linux", "service", "com.convohop.cli", "account", ref],
      input: PORTAL_TOKEN },
    { command: "secret-tool", args: ["lookup", "service", "com.convohop.cli", "account", ref], input: "" },
  ]);
  assert.deepEqual(JSON.parse((await cli(["status", "--profile", "ci.linux"], { runCommand: store.runCommand })).stdout).token,
    "present");
  const out = await cli(["logout", "--profile", "ci.linux"], { runCommand: store.runCommand });
  assert.equal(out.code, 0, out.stderr);
  assert.deepEqual(store.calls.at(-1).args, ["clear", "service", "com.convohop.cli", "account", ref]);
  assert.equal(store.items.size, 0);
});

test("auto falls back to credentials.json with a warning when the OS store is unavailable", async t => {
  const { directory } = await sandbox(t);
  const env = { XDG_CONFIG_HOME: join(directory, "xdg") }, path = join(directory, "xdg", "convohop", "credentials.json");
  const result = await cli(login(["--no-verify"]), { env, platform: "darwin", stdin: stdinOf(PORTAL_TOKEN) });
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, "warning: can't use the keychain credential store (security is not available). Saving the " +
    `token in ${path}, readable only by you.\n`);
  assert.equal(JSON.parse(result.stdout).credentialStore, "file");
  assert.equal((await stat(path)).mode & 0o777, 0o600);

  const windows = await cli(login(["--no-verify", "--profile", "windows"]), { env, platform: "win32", stdin: stdinOf(PORTAL_TOKEN) });
  assert.equal(windows.code, 0, windows.stderr);
  assert.equal(windows.stderr, "");
  assert.equal(JSON.parse(windows.stdout).credentialStore, "file");
});

test("a chosen store that fails is an error, and nothing is saved", async t => {
  const { cli, config } = await sandbox(t);
  const result = await cli(login(["--no-verify", "--credential-store", "keychain"]), { platform: "darwin",
    stdin: stdinOf(PORTAL_TOKEN) });
  assert.equal(result.code, 1);
  assert.equal(result.stderr, "convohop: Can't save the portal token in the keychain credential store: security is not available\n");
  const different = keychain();
  const mismatch = await cli(login(["--no-verify", "--credential-store", "keychain"]), { platform: "darwin",
    stdin: stdinOf(PORTAL_TOKEN), runCommand: async (command, args, input) => args[0] === "find-generic-password"
      ? ok("another-token\n") : different.runCommand(command, args, input) });
  assert.equal(mismatch.code, 1);
  assert.equal(mismatch.stderr, "convohop: Can't save the portal token in the keychain credential store: the keychain returned " +
    "a different token\n");
  assert.equal(different.items.size, 0);
  assert.equal(await exists(join(config, "config.json")), false);
  assertUsage(await cli(login(["--credential-store", "vault"]), { stdin: stdinOf(PORTAL_TOKEN) }),
    "--credential-store must be auto, keychain, secret-service or file", "login");
});

test("logging in again with another store moves the token and keeps the profile's credential reference", async t => {
  const { cli, config } = await sandbox(t);
  const first = await cli(login(["--no-verify", "--credential-store", "file", "--communication-url", COMMUNICATION_URL]),
    { stdin: stdinOf("old-token") });
  assert.equal(first.code, 0, first.stderr);
  const { credentialRef } = JSON.parse(await readFile(join(config, "config.json"), "utf8")).profiles.default;
  const store = keychain();
  const second = await cli(["login", "--no-verify"], { platform: "darwin", runCommand: store.runCommand,
    stdin: stdinOf(PORTAL_TOKEN) });
  assert.equal(second.code, 0, second.stderr);
  assert.deepEqual(JSON.parse(second.stdout), { profile: "default", managementUrl: MANAGEMENT_URL,
    communicationUrl: COMMUNICATION_URL, credentialStore: "keychain", verified: false });
  assert.deepEqual([...store.items], [[credentialRef, PORTAL_TOKEN]]);
  assert.equal(await exists(join(config, "credentials.json")), false);
});

test("login saves nothing when the authority rejects the token", async t => {
  const { cli, config } = await sandbox(t);
  const authority = fakeAuthority({ ManagementCapabilities: request => problem(request, "UNAUTHENTICATED", 401,
    "The credential is not valid") });
  const result = await cli(login(["--credential-store", "file"]), { stdin: stdinOf(PORTAL_TOKEN), fetch: authority.fetch });
  assert.equal(result.code, 1);
  assert.match(result.stderr, /^convohop: UNAUTHENTICATED: The credential is not valid\n {2}outcome: rejected\n {2}requestId: /);
  assertNoSecrets(result, PORTAL_TOKEN);
  assert.equal(await exists(config), false);
});

test("login takes the token only from standard input, as one line of printable ASCII", async t => {
  const { cli, config } = await sandbox(t);
  for (const text of ["two words", "first\nsecond", "caf\u00e9"]) {
    const result = await cli(login(["--no-verify"]), { stdin: stdinOf(text) });
    assert.equal(result.code, 1);
    assert.equal(result.stderr, "convohop: The portal token must be one line of printable ASCII characters\n");
    assertNoSecrets(result, text);
  }
  const long = await cli(login(["--no-verify"]), { stdin: stdinOf("x".repeat(16 * 1024 + 1)) });
  assert.equal(long.code, 1);
  assert.equal(long.stderr, "convohop: The portal token must be at most 16384 bytes\n");
  for (const stdin of [stdinOf(), stdinOf(" \n")])
    assertUsage(await cli(login(["--no-verify"]), { stdin }), "Pipe the portal token to standard input, or run convohop " +
      "login in a terminal", "login");
  assertUsage(await cli(["login", "--no-verify"], { stdin: stdinOf(PORTAL_TOKEN) }), "Set --management-url or " +
    "CONVOHOP_MANAGEMENT_URL", "login");
  assert.equal(await exists(config), false);
});

test("at a terminal, login reads the token at a hidden prompt that handles Backspace, Ctrl-U, Ctrl-C and Ctrl-D", async t => {
  const { cli, config } = await sandbox(t);
  const terminal = typed => {
    const stdin = new PassThrough(), modes = [];
    stdin.isTTY = true;
    stdin.setRawMode = mode => {
      modes.push(mode);
      return stdin;
    };
    stdin.write(typed);
    return { stdin, modes };
  };
  const authority = fakeAuthority({ ManagementCapabilities: capabilities });
  const typed = terminal(`typo\u0015x\u007f${PORTAL_TOKEN.slice(0, 5)}?\b${PORTAL_TOKEN.slice(5)}\rignored`);
  const result = await cli(login(["--credential-store", "file"]), { stdin: typed.stdin, fetch: authority.fetch });
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, "Portal token: \n");
  assert.deepEqual(typed.modes, [true, false]);
  assert.equal(authority.requests[0].authorization, `Bearer ${PORTAL_TOKEN}`);
  assert.ok(Object.values(JSON.parse(await readFile(join(config, "credentials.json"), "utf8")).tokens).includes(PORTAL_TOKEN));

  const interrupted = terminal("abc\u0003");
  const stopped = await cli(login(["--profile", "other"]), { stdin: interrupted.stdin });
  assert.equal(stopped.code, 130);
  assert.equal(stopped.stderr, "Portal token: \nconvohop: Interrupted\n");
  assert.deepEqual(interrupted.modes, [true, false]);
  const empty = await cli(login(["--profile", "other"]), { stdin: terminal("\u0004").stdin });
  assert.equal(empty.code, 1);
  assert.equal(empty.stderr, "Portal token: \nconvohop: Nothing was entered\n");
  const closed = terminal(PORTAL_TOKEN);
  closed.stdin.end();
  const ended = await cli(login(["--profile", "other"]), { stdin: closed.stdin });
  assert.equal(ended.code, 1);
  assert.equal(ended.stderr, "Portal token: \nconvohop: Standard input closed before Enter was pressed\n");
  assert.deepEqual(closed.modes, [true, false]);
  assert.equal(await exists(join(config, "config.json")), true);
  assert.deepEqual(Object.keys(JSON.parse(await readFile(join(config, "config.json"), "utf8")).profiles), ["default"]);
});

test("a credentials file that other users can read, or that isn't valid, is refused without printing tokens", async t => {
  const { cli, config } = await sandbox(t);
  assert.equal((await cli(login(["--no-verify", "--credential-store", "file"]), { stdin: stdinOf(PORTAL_TOKEN) })).code, 0);
  const path = join(config, "credentials.json");
  await chmod(path, 0o644);
  const shared = await cli(["status"]);
  assert.equal(shared.code, 1);
  assert.equal(shared.stderr, `convohop: ${path} is accessible to other users. Run chmod 600 on it, or delete it and log in again\n`);
  await writeFile(path, `{"tokens": {"x": "${PORTAL_TOKEN}"`, { mode: 0o600 });
  await chmod(path, 0o600);
  const broken = await cli(["status"]);
  assert.equal(broken.code, 1);
  assert.equal(broken.stderr, `convohop: ${path} is not valid JSON; fix or delete it\n`);
  assertNoSecrets(broken, PORTAL_TOKEN);
  await writeFile(path, `${JSON.stringify({ tokens: { x: 1 } })}\n`);
  assert.equal((await cli(["status"])).stderr, `convohop: ${path} is not a convohop credentials file; delete it and log in again\n`);

  const configPath = join(config, "config.json");
  await writeFile(configPath, "[]\n");
  assert.equal((await cli(["status"])).stderr, `convohop: ${configPath} is not a convohop configuration; fix or delete it\n`);
  await writeFile(configPath, `${JSON.stringify({ profiles: { default: { managementUrl: "ftp://example.com",
    credentialStore: "file", credentialRef: randomUUID() } } })}\n`);
  assert.equal((await cli(["status"])).stderr, `convohop: ${configPath} has an invalid profile; fix or delete it\n`);
});

test("CONVOHOP_PORTAL_TOKEN and CONVOHOP_PORTAL_TOKEN_FILE take precedence over the profile's token", async t => {
  const { cli, directory } = await sandbox(t);
  assert.equal((await cli(login(["--no-verify", "--credential-store", "file"]), { stdin: stdinOf("profile-token") })).code, 0);
  const environment = await cli(["status"], { env: { CONVOHOP_PORTAL_TOKEN: PORTAL_TOKEN } });
  assert.equal(JSON.parse(environment.stdout).token, "environment");

  const tokenFile = join(directory, "token");
  await writeFile(tokenFile, `${PORTAL_TOKEN}\n`, { mode: 0o600 });
  const authority = fakeAuthority({ ManagementCapabilities: request => capabilities(request, { portalIdentity: "ci" }) });
  const verified = await cli(["status", "--verify"], { env: { CONVOHOP_PORTAL_TOKEN_FILE: tokenFile }, fetch: authority.fetch });
  assert.equal(verified.code, 0, verified.stderr);
  assert.deepEqual(JSON.parse(verified.stdout), { profile: "default", loggedIn: true, managementUrl: MANAGEMENT_URL,
    communicationUrl: null, credentialStore: "file", token: "environment", verified: true, portalIdentity: "ci" });
  assert.equal(authority.requests[0].authorization, `Bearer ${PORTAL_TOKEN}`);
  assertNoSecrets(verified, PORTAL_TOKEN, "profile-token");

  assertUsage(await cli(["status", "--verify"], { env: { CONVOHOP_PORTAL_TOKEN: PORTAL_TOKEN, CONVOHOP_PORTAL_TOKEN_FILE: tokenFile } }),
    "Set CONVOHOP_PORTAL_TOKEN or CONVOHOP_PORTAL_TOKEN_FILE, not both");
  const missing = await cli(["status", "--verify"], { env: { CONVOHOP_PORTAL_TOKEN_FILE: join(directory, "missing") } });
  assert.equal(missing.code, 1);
  assert.equal(missing.stderr, "convohop: Can't read the file that CONVOHOP_PORTAL_TOKEN_FILE names\n");
});

test("management commands explain how to log in or name the authority", async t => {
  const { cli, config } = await sandbox(t);
  const projectId = randomUUID();
  const get = (options, extra = []) => cli(["projects", "get", "--project", projectId, ...extra], options);
  const anonymous = await get({});
  assert.equal(anonymous.code, 1);
  assert.equal(anonymous.stderr, "convohop: Not logged in. Run convohop login, or set CONVOHOP_PORTAL_TOKEN or " +
    "CONVOHOP_PORTAL_TOKEN_FILE\n");
  assert.equal((await get({}, ["--profile", "work"])).stderr, "convohop: Not logged in. Run convohop login --profile work, or " +
    "set CONVOHOP_PORTAL_TOKEN or CONVOHOP_PORTAL_TOKEN_FILE\n");
  const env = { CONVOHOP_PORTAL_TOKEN: PORTAL_TOKEN };
  assertUsage(await get({ env }), "Set --management-url or CONVOHOP_MANAGEMENT_URL, or run convohop login");
  for (const [url, message] of [
    ["http://management.example.com", "--management-url must be an https URL, or http on localhost"],
    ["https://management.example.com/graphql", "--management-url must be an origin, such as https://management.example.com"],
    [`https://user:${PORTAL_TOKEN}@management.example.com`, "--management-url must be an origin, such as https://management.example.com"],
    ["management.example.com", "--management-url is not a URL"],
  ]) {
    const result = await get({ env }, ["--management-url", url]);
    assertUsage(result, message);
    assertNoSecrets(result, PORTAL_TOKEN);
  }
  assertUsage(await get({ env: { ...env, CONVOHOP_MANAGEMENT_URL: "http://example.com" } }),
    "CONVOHOP_MANAGEMENT_URL must be an https URL, or http on localhost");

  assert.equal((await cli(login(["--no-verify", "--credential-store", "file"]), { stdin: stdinOf(PORTAL_TOKEN) })).code, 0);
  await writeFile(join(config, "credentials.json"), `${JSON.stringify({ tokens: {} })}\n`, { mode: 0o600 });
  const lost = await get({});
  assert.equal(lost.code, 1);
  assert.equal(lost.stderr, "convohop: The default profile's token is missing from its credential store. Run convohop login\n");

  const store = secretService();
  assert.equal((await cli(login(["--no-verify", "--profile", "linux", "--credential-store", "secret-service"]),
    { runCommand: store.runCommand, stdin: stdinOf(PORTAL_TOKEN) })).code, 0);
  const unreadable = await cli(["projects", "get", "--project", projectId, "--profile", "linux"],
    { runCommand: async () => ({ code: 2, stdout: PORTAL_TOKEN, stderr: PORTAL_TOKEN }) });
  assert.equal(unreadable.code, 1);
  assert.equal(unreadable.stderr, "convohop: Can't read the portal token from the secret-service credential store: " +
    "secret-tool exited with code 2. Run convohop login again\n");
  assertNoSecrets(unreadable, PORTAL_TOKEN);
});
