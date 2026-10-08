import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { formatJson } from "../../sdkgen/lib/json.mjs";
import { codeUnitCompare } from "../../sdkgen/lib/naming.mjs";

export const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

/** Captures CLI output lines. */
export function capture() {
  const out = [];
  const err = [];
  return { out, err, io: { out: line => out.push(line), err: line => err.push(line) } };
}

/** An empty temporary directory removed after the test. */
export function tempRoot(t) {
  const root = mkdtempSync(join(tmpdir(), "docgen-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

/** Writes `contents` (a string, or a value written as formatted JSON) to `path` under `root`. */
export function write(root, path, contents) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), typeof contents === "string" ? contents : formatJson(contents));
}

export function read(root, path) {
  return readFileSync(join(root, path), "utf8");
}

/** Rewrites a JSON file with `edit`, which mutates the parsed value or returns a replacement. */
export function editJson(root, path, edit) {
  const value = JSON.parse(read(root, path));
  write(root, path, edit(value) ?? value);
}

/** Rewrites a text file with `edit`. */
export function editText(root, path, edit) {
  write(root, path, edit(read(root, path)));
}

export function listTree(root, directory = "") {
  const absolute = join(root, directory);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute, { withFileTypes: true })
    .flatMap(entry => {
      const path = directory ? `${directory}/${entry.name}` : entry.name;
      return entry.isDirectory() ? listTree(root, path) : [path];
    })
    .sort(codeUnitCompare);
}

/** Two topics, so a language can cover some and not others. */
export const CONFIG = Object.freeze({
  title: "Fixture SDK documentation",
  description: "Reference documentation and quickstarts for the fixture SDKs.",
  languagesDirectory: "docs/languages",
  outputDirectory: "docs/site",
  topics: [
    { id: "server", title: "Server", summary: "Call the API from a backend." },
    { id: "client", title: "Client", summary: "Call the API as a signed-in user." },
  ],
});

export const LANGUAGE_DIRECTORY = "docs/languages/pseudo";
export const LANGUAGE_FILE = `${LANGUAGE_DIRECTORY}/language.json`;
export const SURFACE_FILE = `${LANGUAGE_DIRECTORY}/surface.json`;
export const OPERATIONS_FILE = `${LANGUAGE_DIRECTORY}/operations.json`;
/** The fixture's test commands append their names here, so tests can see what ran. */
export const TEST_LOG = `${LANGUAGE_DIRECTORY}/examples/ran.log`;

const IR = {
  planes: [
    { name: "alpha", summary: "Pings, purges and events." },
    { name: "beta", summary: "Nothing yet." },
  ],
  operations: [
    { id: "alpha.ping", plane: "alpha", kind: "query", field: "ping", operationName: "AlphaPing", layer: "both", summary: "Check that the API answers." },
    { id: "alpha.purge", plane: "alpha", kind: "mutation", field: "purge", operationName: "AlphaPurge", layer: "server", summary: "Delete every message." },
    { id: "alpha.watch", plane: "alpha", kind: "subscription", field: "watch", operationName: "AlphaWatch", layer: "client", summary: "Watch a user's events." },
  ],
};

const snippet = operation => `## \`${operation.field}\`\n\n${operation.summary}\n\n- **Layer:** ${operation.layer}.\n`;

/** What the pseudo extractor prints for each package, from packages/<name>/api.json. */
export const API = {
  "pseudo-server": {
    symbols: [
      {
        name: "Pong",
        kind: "type",
        signatures: ["type Pong = { at: string }"],
        docs: "A reply.\n\n## Fields\n\nOnly `at`, a <time>.",
        origin: "pseudo-core",
      },
      {
        name: "ServerClient",
        kind: "class",
        signatures: ["class ServerClient"],
        docs: "Calls the API with a backend key, such as `new ServerClient({ key })`.",
        members: [
          { name: "constructor", kind: "constructor", signatures: ["constructor(options: { key: string })"], docs: "" },
          {
            name: "connect",
            kind: "method",
            static: true,
            signatures: ["static connect(url: string): ServerClient"],
            docs: "Connects to `url`.",
            deprecated: "Use the constructor.",
          },
          { name: "ping", kind: "method", signatures: ["ping(): Pong", "ping(timeout: number): Pong"], docs: "Sends a ping." },
        ],
      },
    ],
  },
  "pseudo-client": {
    symbols: [
      {
        name: "UserClient",
        kind: "class",
        signatures: ["class UserClient extends BaseClient"],
        docs: "Calls the API as one signed-in user.",
        members: [
          { name: "ping", kind: "method", signatures: ["ping(): Pong"], docs: "Sends a ping.", inherited: "BaseClient" },
          { name: "watch", kind: "method", signatures: ["watch(): Events"], docs: "" },
        ],
      },
    ],
  },
};

const LANGUAGE = {
  $schema: "../../../spec/docs/language.schema.json",
  id: "pseudo",
  name: "Pseudo",
  order: 10,
  status: "preview",
  codeFence: "pseudo",
  regionComment: "--",
  testedFences: ["pseudo"],
  snippetRoots: ["examples/src"],
  packages: [
    { name: "pseudo-server", slug: "server", layer: "server", summary: "Server package for trusted backends.", runtime: "Pseudo 2 or later", source: "packages/pseudo-server" },
    { name: "pseudo-client", slug: "client", layer: "client", summary: "Client package for apps.", runtime: "Pseudo 2 or later", source: "packages/pseudo-client" },
  ],
  quickstarts: ["server", "client"],
  operations: "operations.json",
  extract: { command: ["node", `${LANGUAGE_DIRECTORY}/extract.mjs`] },
  test: {
    install: ["node", `${LANGUAGE_DIRECTORY}/examples/run.mjs`, "install"],
    command: ["node", `${LANGUAGE_DIRECTORY}/examples/run.mjs`, "test"],
  },
};

const EXTRACTOR = `// Prints the pseudo surface from each package's api.json.
import { readFileSync } from "node:fs";
try {
  const packages = ["pseudo-server", "pseudo-client"].map(name => ({ name, ...JSON.parse(readFileSync(\`packages/\${name}/api.json\`, "utf8")) }));
  process.stdout.write(JSON.stringify({ language: "pseudo", packages }));
} catch (error) {
  console.error(\`pseudo extractor: \${error.message}\`);
  process.exitCode = 1;
}
`;

const RUNNER = `// Appends its step to ran.log and fails the test step when examples/fail exists.
import { appendFileSync, existsSync } from "node:fs";
const step = process.argv[2];
appendFileSync("${TEST_LOG}", \`\${step}\\n\`);
if (step === "test" && existsSync("${LANGUAGE_DIRECTORY}/examples/fail")) process.exitCode = 3;
`;

const OVERVIEW = `# Pseudo

The Pseudo SDKs call the fixture API from backends and apps.

## Install

\`\`\`sh
pseudo add pseudo-server
\`\`\`
`;

const SERVER_QUICKSTART = `# Pseudo server quickstart

Call the fixture API from a backend with [\`ServerClient\`](../reference/server.md#serverclient-class).

## Ping

\`\`\`pseudo include=examples/src/server.pseudo#ping
\`\`\`

The reply is a [\`Pong\`](../reference/server.md#pong-type).
`;

const CLIENT_QUICKSTART = `# Pseudo client quickstart

Watch a user's events with the client package.

\`\`\`pseudo include=examples/src/client.pseudo
\`\`\`
`;

const SERVER_EXAMPLE = `-- #region ping
client = ServerClient(key)
-- #region reply
pong = client.ping()
-- #endregion reply
-- #endregion ping
`;

const CLIENT_EXAMPLE = `user = UserClient(token)
user.watch()
`;

/**
 * Writes a fixture repository under a temporary root: the docs JSON Schemas,
 * a three-operation IR with its docs/snippets pages, and one language,
 * pseudo, with two packages. Its extractor prints packages/<name>/api.json
 * and its test commands append to TEST_LOG. Generation succeeds as written.
 */
export function writeFixture(t) {
  const root = tempRoot(t);
  cpSync(join(REPO_ROOT, "spec/docs"), join(root, "spec/docs"), { recursive: true, filter: source => !source.endsWith(".md") });
  write(root, "schema/ir.json", IR);
  write(root, "docs/snippets/index.json", { operations: IR.operations.map(operation => ({ id: operation.id, path: `${operation.plane}/${operation.field}.md` })) });
  for (const operation of IR.operations) write(root, `docs/snippets/${operation.plane}/${operation.field}.md`, snippet(operation));
  for (const [name, api] of Object.entries(API)) write(root, `packages/${name}/api.json`, api);
  write(root, LANGUAGE_FILE, LANGUAGE);
  write(root, `${LANGUAGE_DIRECTORY}/extract.mjs`, EXTRACTOR);
  write(root, SURFACE_FILE, {
    $schema: "../../../spec/docs/surface.schema.json",
    language: "pseudo",
    packages: Object.entries(API).map(([name, api]) => ({ name, ...api })),
  });
  write(root, OPERATIONS_FILE, {
    $schema: "../../../spec/docs/operation-map.schema.json",
    operations: {
      "alpha.ping": ["pseudo-server#ServerClient.ping", "pseudo-client#UserClient.ping"],
      "alpha.watch": ["pseudo-client#UserClient.watch"],
    },
  });
  write(root, `${LANGUAGE_DIRECTORY}/overview.md`, OVERVIEW);
  write(root, `${LANGUAGE_DIRECTORY}/quickstarts/server.md`, SERVER_QUICKSTART);
  write(root, `${LANGUAGE_DIRECTORY}/quickstarts/client.md`, CLIENT_QUICKSTART);
  write(root, `${LANGUAGE_DIRECTORY}/examples/src/server.pseudo`, SERVER_EXAMPLE);
  write(root, `${LANGUAGE_DIRECTORY}/examples/src/client.pseudo`, CLIENT_EXAMPLE);
  write(root, `${LANGUAGE_DIRECTORY}/examples/run.mjs`, RUNNER);
  return root;
}
