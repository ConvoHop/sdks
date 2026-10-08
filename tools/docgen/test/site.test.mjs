import assert from "node:assert/strict";
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { buildSite } from "../lib/generate.mjs";
import { formatReference, parseReference, resolveReference, validate } from "../lib/languages.mjs";
import { checkLinks, parsePage, resolveLink, toPlainText } from "../lib/markdown.mjs";
import {
  API,
  CONFIG,
  LANGUAGE_DIRECTORY,
  LANGUAGE_FILE,
  OPERATIONS_FILE,
  SURFACE_FILE,
  editJson,
  editText,
  write,
  writeFixture,
} from "./helpers.mjs";

const SITE = `${CONFIG.outputDirectory}/`;
const MONO = "docs/languages/mono";

/** Builds the site. `files` maps docs/site-relative paths to contents. */
function build(root, config = CONFIG) {
  const { files, problems } = buildSite(root, config);
  for (const file of files) assert.ok(file.path.startsWith(SITE), file.path);
  return { problems, files: new Map(files.map(file => [file.path.slice(SITE.length), file.contents])) };
}

/** Builds a site that must have no problems. */
function site(root, config) {
  const { files, problems } = build(root, config);
  assert.deepEqual(problems, []);
  return files;
}

/** The problems of a build that fails while loading its inputs, before anything is rendered. */
function inputProblems(root, config) {
  const { files, problems } = build(root, config);
  assert.equal(files.size, 0, "input problems stop generation before rendering");
  return problems;
}

function page(...lines) {
  return `${lines.join("\n")}\n`;
}

/** Parses every generated page; README.md links out of the site, so sites skip it. */
function parsePages(files) {
  return new Map([...files].filter(([path]) => path.endsWith(".md") && path !== "README.md").map(([path, contents]) => [path, parsePage(contents)]));
}

/** Every reference JSON entry, depth first. */
function entries(symbols) {
  return symbols.flatMap(symbol => [symbol, ...entries(symbol.members ?? [])]);
}

/** Adds a second language, mono, with only the server package and its own operation map. */
function addMono(root, order) {
  cpSync(join(root, LANGUAGE_DIRECTORY), join(root, MONO), { recursive: true });
  rmSync(join(root, MONO, "quickstarts/client.md"));
  write(root, `${MONO}/overview.md`, "# Mono\n\nThe Mono SDK calls the fixture API from backends.\n");
  editJson(root, `${MONO}/language.json`, language => {
    language.id = "mono";
    language.name = "Mono";
    language.order = order;
    language.status = "stable";
    language.packages = language.packages.filter(pkg => pkg.layer === "server");
    language.quickstarts = ["server"];
  });
  editJson(root, `${MONO}/surface.json`, surface => {
    surface.language = "mono";
    surface.packages = surface.packages.filter(pkg => pkg.name === "pseudo-server");
  });
  write(root, `${MONO}/operations.json`, {
    $schema: "../../../spec/docs/operation-map.schema.json",
    operations: {
      "alpha.ping": ["pseudo-server#ServerClient.ping"],
      "alpha.purge": ["pseudo-server#ServerClient.connect:static", "pseudo-server#ServerClient.ping"],
    },
  });
}

test("renders the fixture site's files in code-unit order", t => {
  const { files, problems } = buildSite(writeFixture(t), CONFIG);
  assert.deepEqual(problems, []);
  assert.deepEqual(
    files.map(file => file.path),
    [
      "README.md",
      "index.md",
      "llms-full.txt",
      "llms.txt",
      "manifest.json",
      "operations/alpha/ping.md",
      "operations/alpha/purge.md",
      "operations/alpha/watch.md",
      "operations/index.json",
      "operations/index.md",
      "pseudo/index.md",
      "pseudo/llms-full.txt",
      "pseudo/quickstarts/client.md",
      "pseudo/quickstarts/server.md",
      "pseudo/reference/client.json",
      "pseudo/reference/client.md",
      "pseudo/reference/index.md",
      "pseudo/reference/operations.md",
      "pseudo/reference/server.json",
      "pseudo/reference/server.md",
    ].map(path => SITE + path),
  );
});

test("every page lints and every link resolves, including the rebased links in llms-full files", t => {
  const files = site(writeFixture(t));
  const pages = parsePages(files);
  for (const [path, parsed] of pages) assert.deepEqual(parsed.errors, [], path);
  assert.deepEqual(checkLinks(pages, [...files.keys()]), []);

  const manifest = JSON.parse(files.get("manifest.json"));
  for (const [path, selected] of [
    ["llms-full.txt", manifest.pages],
    ["pseudo/llms-full.txt", manifest.pages.filter(entry => entry.language === "pseudo")],
  ]) {
    const full = parsePage(files.get(path));
    assert.deepEqual(
      full.headings.filter(heading => heading.level === 1).map(heading => toPlainText(heading.text)),
      selected.map(entry => entry.title),
      `${path} concatenates its pages in reading order`,
    );
    const links = selected.reduce((count, entry) => count + pages.get(entry.path).links.length, 0);
    assert.equal(full.links.length, links, `${path} keeps every link`);
    assert.deepEqual(checkLinks(new Map([...pages, [path, { headings: [], links: full.links }]]), [...files.keys()]), [], path);
  }
  assert.match(files.get("llms-full.txt"), /\[`ServerClient`\]\(pseudo\/reference\/server\.md#serverclient-class\)/);
  assert.match(files.get("pseudo/llms-full.txt"), /^# Pseudo\n\n.*\[`ServerClient`\]\(reference\/server\.md#serverclient-class\)/s);
});

test("manifest.json validates and lists languages, topics and pages in reading order", t => {
  const root = writeFixture(t);
  const files = site(root);
  const manifest = JSON.parse(files.get("manifest.json"));
  const problems = [];
  assert.ok(validate(root, "manifest", manifest, "manifest.json", problems), problems.join("\n"));
  assert.equal(manifest.$schema, "../../spec/docs/manifest.schema.json");
  assert.equal(manifest.title, CONFIG.title);
  assert.equal(manifest.description, CONFIG.description);
  assert.deepEqual(manifest.topics, CONFIG.topics);
  assert.deepEqual(manifest.languages, [
    {
      id: "pseudo",
      name: "Pseudo",
      status: "preview",
      codeFence: "pseudo",
      home: "pseudo/index.md",
      reference: "pseudo/reference/index.md",
      coverage: "pseudo/reference/operations.md",
      llmsFull: "pseudo/llms-full.txt",
      packages: [
        {
          name: "pseudo-server",
          slug: "server",
          layer: "server",
          summary: "Server package for trusted backends.",
          runtime: "Pseudo 2 or later",
          source: "packages/pseudo-server",
          reference: "pseudo/reference/server.md",
          data: "pseudo/reference/server.json",
        },
        {
          name: "pseudo-client",
          slug: "client",
          layer: "client",
          summary: "Client package for apps.",
          runtime: "Pseudo 2 or later",
          source: "packages/pseudo-client",
          reference: "pseudo/reference/client.md",
          data: "pseudo/reference/client.json",
        },
      ],
      quickstarts: [
        { topic: "server", path: "pseudo/quickstarts/server.md" },
        { topic: "client", path: "pseudo/quickstarts/client.md" },
      ],
    },
  ]);
  assert.deepEqual(manifest.operations, { index: "operations/index.md", data: "operations/index.json" });
  assert.deepEqual(manifest.llms, { index: "llms.txt", full: "llms-full.txt" });
  assert.deepEqual(
    manifest.pages.map(entry => [entry.path, entry.kind]),
    [
      ["index.md", "home"],
      ["pseudo/index.md", "language"],
      ["pseudo/quickstarts/server.md", "quickstart"],
      ["pseudo/quickstarts/client.md", "quickstart"],
      ["pseudo/reference/index.md", "reference-index"],
      ["pseudo/reference/server.md", "reference"],
      ["pseudo/reference/client.md", "reference"],
      ["pseudo/reference/operations.md", "coverage"],
      ["operations/index.md", "operation-index"],
      ["operations/alpha/ping.md", "operation"],
      ["operations/alpha/purge.md", "operation"],
      ["operations/alpha/watch.md", "operation"],
    ],
  );
  const describe = path => manifest.pages.find(entry => entry.path === path);
  assert.deepEqual(describe("pseudo/quickstarts/server.md"), {
    path: "pseudo/quickstarts/server.md",
    kind: "quickstart",
    title: "Pseudo server quickstart",
    description: "Call the fixture API from a backend with ServerClient.",
    language: "pseudo",
    topic: "server",
  });
  assert.deepEqual(describe("pseudo/reference/server.md"), {
    path: "pseudo/reference/server.md",
    kind: "reference",
    title: "pseudo-server",
    description: "Server package for trusted backends.",
    language: "pseudo",
    package: "pseudo-server",
  });
  assert.deepEqual(describe("operations/alpha/ping.md"), {
    path: "operations/alpha/ping.md",
    kind: "operation",
    title: "alpha.ping",
    description: "Check that the API answers.",
    operation: "alpha.ping",
  });
  const listed = new Set(manifest.pages.map(entry => entry.path));
  assert.deepEqual([...parsePages(files).keys()].filter(path => !listed.has(path)), [], "the manifest lists every page but README.md");
});

test("llms.txt lists every page by language, then the API operations", t => {
  const files = site(writeFixture(t));
  assert.equal(
    files.get("llms.txt"),
    page(
      "# Fixture SDK documentation",
      "",
      "> Reference documentation and quickstarts for the fixture SDKs.",
      "",
      "Pages are Markdown. Each language has an overview, quickstarts with tested code, a reference for each package and the SDK members that send each API operation. The API operation pages document the GraphQL API that every SDK wraps.",
      "",
      "## Pseudo",
      "",
      "- [Pseudo](pseudo/index.md): The Pseudo SDKs call the fixture API from backends and apps.",
      "- [Pseudo server quickstart](pseudo/quickstarts/server.md): Call the fixture API from a backend with ServerClient.",
      "- [Pseudo client quickstart](pseudo/quickstarts/client.md): Watch a user's events with the client package.",
      "- [Pseudo reference](pseudo/reference/index.md): The public API of each Pseudo package, generated from its declarations.",
      "- [pseudo-server](pseudo/reference/server.md): Server package for trusted backends.",
      "- [pseudo-client](pseudo/reference/client.md): Client package for apps.",
      "- [Pseudo operation coverage](pseudo/reference/operations.md): The Pseudo SDK members that send each API operation. 2 of the 3 operations that Pseudo packages can send have a method.",
      "",
      "## API operations",
      "",
      "- [API operations](operations/index.md): Every operation in the ConvoHop GraphQL API, with its authorization, idempotency, input, result and errors, and the SDK members that send it.",
      "- [alpha.ping](operations/alpha/ping.md): Check that the API answers.",
      "- [alpha.purge](operations/alpha/purge.md): Delete every message.",
      "- [alpha.watch](operations/alpha/watch.md): Watch a user's events.",
      "",
      "## Optional",
      "",
      "- [Every page in one file](llms-full.txt): all of the pages above.",
      "- [Pseudo in one file](pseudo/llms-full.txt): every Pseudo page.",
    ),
  );
});

test("the home page links each language, quickstart and the operation reference", t => {
  const files = site(writeFixture(t));
  assert.equal(
    files.get("index.md"),
    page(
      "# Fixture SDK documentation",
      "",
      "Reference documentation and quickstarts for the fixture SDKs.",
      "",
      "## Languages",
      "",
      "| Language | Status | Packages |",
      "| --- | --- | --- |",
      "| [Pseudo](pseudo/index.md) | Preview | [`pseudo-server`](pseudo/reference/server.md), [`pseudo-client`](pseudo/reference/client.md) |",
      "",
      "## Quickstarts",
      "",
      "| Topic | Summary | Languages |",
      "| --- | --- | --- |",
      "| Server | Call the API from a backend. | [Pseudo](pseudo/quickstarts/server.md) |",
      "| Client | Call the API as a signed-in user. | [Pseudo](pseudo/quickstarts/client.md) |",
      "",
      "## API operations",
      "",
      "The [operation reference](operations/index.md) documents each of the 3 GraphQL operations and the SDK members that send it.",
      "",
      "## For LLMs and agents",
      "",
      "[llms.txt](llms.txt) lists these pages and [llms-full.txt](llms-full.txt) contains all of them. Each language also has one file with all of its pages, linked from its home page.",
    ),
  );
  assert.match(files.get("README.md"), /^# Generated SDK documentation\n\nDon't edit this directory\./);
});

test("language pages put the overview before generated package, quickstart and reference tables", t => {
  const files = site(writeFixture(t));
  const home = files.get("pseudo/index.md");
  assert.ok(home.startsWith("# Pseudo\n\nThe Pseudo SDKs call the fixture API from backends and apps.\n\n## Install\n\n```sh\npseudo add pseudo-server\n```\n\n## Packages\n"));
  assert.match(home, /\n\| \[`pseudo-client`\]\(reference\/client\.md\) \| Client \| Pseudo 2 or later \| Client package for apps\. \|\n/);
  assert.match(home, /\n## Quickstarts\n\n\| Quickstart \| Summary \|\n\| --- \| --- \|\n\| \[Server\]\(quickstarts\/server\.md\) \| Call the API from a backend\. \|\n\| \[Client\]\(quickstarts\/client\.md\) \| Call the API as a signed-in user\. \|\n/);
  assert.match(home, /\n- \[Pseudo in one file\]\(llms-full\.txt\): every Pseudo page, for LLMs and agents\.\n$/);
  assert.equal(
    files.get("pseudo/quickstarts/server.md"),
    page(
      "# Pseudo server quickstart",
      "",
      "Call the fixture API from a backend with [`ServerClient`](../reference/server.md#serverclient-class).",
      "",
      "## Ping",
      "",
      "```pseudo snippet=docs/languages/pseudo/examples/src/server.pseudo#ping",
      "client = ServerClient(key)",
      "pong = client.ping()",
      "```",
      "",
      "The reply is a [`Pong`](../reference/server.md#pong-type).",
    ),
  );
});

test("reference pages render signatures, docs, deprecations, origins and the operations each member sends", t => {
  const files = site(writeFixture(t));
  assert.equal(
    files.get("pseudo/reference/server.md"),
    page(
      "# `pseudo-server`",
      "",
      "Server package for trusted backends.",
      "",
      "**Layer:** Server. **Runtime:** Pseudo 2 or later. **Source:** `packages/pseudo-server`.",
      "",
      "## Classes",
      "",
      "### `ServerClient` class",
      "",
      "```pseudo",
      "class ServerClient",
      "```",
      "",
      "Calls the API with a backend key, such as `new ServerClient({ key })`.",
      "",
      "#### `ServerClient` constructor",
      "",
      "```pseudo",
      "constructor(options: { key: string })",
      "```",
      "",
      "#### `ServerClient.connect` static method",
      "",
      "**Deprecated:** Use the constructor.",
      "",
      "```pseudo",
      "static connect(url: string): ServerClient",
      "```",
      "",
      "Connects to `url`.",
      "",
      "#### `ServerClient.ping` method",
      "",
      "```pseudo",
      "ping(): Pong",
      "ping(timeout: number): Pong",
      "```",
      "",
      "Sends a ping.",
      "",
      "Sends [`alpha.ping`](../../operations/alpha/ping.md).",
      "",
      "## Types",
      "",
      "### `Pong` type",
      "",
      "```pseudo",
      "type Pong = { at: string }",
      "```",
      "",
      "A reply.",
      "",
      "**Fields**",
      "",
      "Only `at`, a \\<time>.",
      "",
      "Re-exported from `pseudo-core`.",
    ),
  );
  assert.match(files.get("pseudo/reference/client.md"), /\nSends a ping\.\n\nInherited from `BaseClient`\. Sends \[`alpha\.ping`\]\(\.\.\/\.\.\/operations\/alpha\/ping\.md\)\.\n/);
  assert.match(files.get("pseudo/reference/index.md"), /\n\| \[`pseudo-server`\]\(server\.md\) \| Server \| Server package for trusted backends\. \|\n/);
});

test("reference JSON mirrors its page: anchors, references, docs as rendered and operation links", t => {
  const root = writeFixture(t);
  const files = site(root);
  const server = JSON.parse(files.get("pseudo/reference/server.json"));
  assert.deepEqual(server, {
    $schema: "../../../../spec/docs/reference.schema.json",
    language: "pseudo",
    package: "pseudo-server",
    layer: "server",
    page: "server.md",
    symbols: [
      {
        name: "ServerClient",
        kind: "class",
        ref: "pseudo-server#ServerClient",
        anchor: "serverclient-class",
        signatures: ["class ServerClient"],
        docs: "Calls the API with a backend key, such as `new ServerClient({ key })`.",
        members: [
          {
            name: "constructor",
            kind: "constructor",
            ref: "pseudo-server#ServerClient.constructor",
            anchor: "serverclient-constructor",
            signatures: ["constructor(options: { key: string })"],
            docs: "",
          },
          {
            name: "connect",
            kind: "method",
            ref: "pseudo-server#ServerClient.connect:static",
            anchor: "serverclientconnect-static-method",
            signatures: ["static connect(url: string): ServerClient"],
            docs: "Connects to `url`.",
            deprecated: "Use the constructor.",
            static: true,
          },
          {
            name: "ping",
            kind: "method",
            ref: "pseudo-server#ServerClient.ping",
            anchor: "serverclientping-method",
            signatures: ["ping(): Pong", "ping(timeout: number): Pong"],
            docs: "Sends a ping.",
            operations: [{ id: "alpha.ping", page: "../../operations/alpha/ping.md" }],
          },
        ],
      },
      {
        name: "Pong",
        kind: "type",
        ref: "pseudo-server#Pong",
        anchor: "pong-type",
        signatures: ["type Pong = { at: string }"],
        docs: "A reply.\n\n**Fields**\n\nOnly `at`, a \\<time>.",
        origin: "pseudo-core",
      },
    ],
  });
  const client = JSON.parse(files.get("pseudo/reference/client.json"));
  assert.equal(client.symbols[0].members[0].inherited, "BaseClient");
  const pages = parsePages(files);
  for (const path of ["pseudo/reference/server.json", "pseudo/reference/client.json"]) {
    const data = JSON.parse(files.get(path));
    const problems = [];
    assert.ok(validate(root, "reference", data, path, problems), problems.join("\n"));
    const target = resolveLink(path, data.page).path;
    const headings = new Set(pages.get(target).headings.map(heading => heading.slug));
    for (const entry of entries(data.symbols)) {
      assert.ok(headings.has(entry.anchor), `${path}: ${entry.ref} has anchor #${entry.anchor} on ${target}`);
      for (const operation of entry.operations ?? []) assert.ok(files.has(resolveLink(path, operation.page).path), operation.page);
    }
  }
});

test("operation pages and operations/index.json list the members that send each operation", t => {
  const files = site(writeFixture(t));
  assert.equal(
    files.get("operations/alpha/purge.md"),
    page(
      "# `alpha.purge`",
      "",
      "Delete every message.",
      "",
      "- **Layer:** server.",
      "",
      "## SDK members",
      "",
      "| Language | Members |",
      "| --- | --- |",
      "| [Pseudo](../../pseudo/reference/operations.md) | Not wrapped by a method |",
    ),
  );
  assert.match(
    files.get("operations/alpha/ping.md"),
    /\n\| \[Pseudo\]\(\.\.\/\.\.\/pseudo\/reference\/operations\.md\) \| \[`ServerClient\.ping`\]\(\.\.\/\.\.\/pseudo\/reference\/server\.md#serverclientping-method\), \[`UserClient\.ping`\]\(\.\.\/\.\.\/pseudo\/reference\/client\.md#userclientping-method\) \|\n$/,
  );
  const index = files.get("operations/index.md");
  assert.match(index, /\n## Alpha\n\nPings, purges and events\.\n\n\| Operation \| Kind \| Layer \| Summary \|\n/);
  assert.match(index, /\n\| \[`alpha\.watch`\]\(alpha\/watch\.md\) \| subscription \| client \| Watch a user's events\. \|\n$/);
  assert.doesNotMatch(index, /## Beta/, "planes without operations are left out");
  const data = JSON.parse(files.get("operations/index.json"));
  assert.equal(data.$schema, "../../../spec/docs/operation-index.schema.json");
  assert.deepEqual(data.operations[1], {
    id: "alpha.purge",
    plane: "alpha",
    kind: "mutation",
    field: "purge",
    operationName: "AlphaPurge",
    layer: "server",
    summary: "Delete every message.",
    page: "alpha/purge.md",
    languages: { pseudo: [] },
  });
  assert.deepEqual(data.operations[2].languages, {
    pseudo: [{ ref: "pseudo-client#UserClient.watch", package: "pseudo-client", page: "../pseudo/reference/client.md#userclientwatch-method" }],
  });
});

test("the coverage page counts the operations each language can send and wraps", t => {
  const files = site(writeFixture(t));
  assert.equal(
    files.get("pseudo/reference/operations.md"),
    page(
      "# Pseudo operation coverage",
      "",
      "The Pseudo SDK members that send each API operation. 2 of the 3 operations that Pseudo packages can send have a method.",
      "",
      "## Alpha",
      "",
      "Pings, purges and events.",
      "",
      "| Operation | Layer | Members |",
      "| --- | --- | --- |",
      "| [`alpha.ping`](../../operations/alpha/ping.md) | both | [`ServerClient.ping`](server.md#serverclientping-method), [`UserClient.ping`](client.md#userclientping-method) |",
      "| [`alpha.purge`](../../operations/alpha/purge.md) | server | Not wrapped by a method |",
      "| [`alpha.watch`](../../operations/alpha/watch.md) | client | [`UserClient.watch`](client.md#userclientwatch-method) |",
    ),
  );
});

test("a new language directory is discovered without configuration and sorted by order, then ID", t => {
  const root = writeFixture(t);
  addMono(root, 20);
  let files = site(root);
  let manifest = JSON.parse(files.get("manifest.json"));
  assert.deepEqual(manifest.languages.map(language => language.id), ["pseudo", "mono"], "order 10 sorts before order 20");
  assert.deepEqual(manifest.languages[1].quickstarts, [{ topic: "server", path: "mono/quickstarts/server.md" }]);
  assert.deepEqual(
    [...files.keys()].filter(path => path.startsWith("mono/")),
    ["mono/index.md", "mono/llms-full.txt", "mono/quickstarts/server.md", "mono/reference/index.md", "mono/reference/operations.md", "mono/reference/server.json", "mono/reference/server.md"],
  );
  const pages = parsePages(files);
  for (const [path, parsed] of pages) assert.deepEqual(parsed.errors, [], path);
  assert.deepEqual(checkLinks(pages, [...files.keys()]), []);

  assert.match(files.get("llms.txt"), /\n## Pseudo\n[^#]+\n## Mono\n\n- \[Mono\]\(mono\/index\.md\): The Mono SDK calls the fixture API from backends\.\n/);
  assert.match(files.get("llms.txt"), /\n- \[Pseudo in one file\]\(pseudo\/llms-full\.txt\): every Pseudo page\.\n- \[Mono in one file\]\(mono\/llms-full\.txt\): every Mono page\.\n$/);
  assert.match(files.get("index.md"), /\n\| \[Mono\]\(mono\/index\.md\) \| Stable \| \[`pseudo-server`\]\(mono\/reference\/server\.md\) \|\n/);
  assert.match(files.get("index.md"), /\n\| Server \| Call the API from a backend\. \| \[Pseudo\]\(pseudo\/quickstarts\/server\.md\), \[Mono\]\(mono\/quickstarts\/server\.md\) \|\n\| Client \| Call the API as a signed-in user\. \| \[Pseudo\]\(pseudo\/quickstarts\/client\.md\) \|\n/);

  // Mono can't send the client operation alpha.watch, so its coverage and the watch page leave it out.
  assert.match(files.get("mono/reference/operations.md"), /^# Mono operation coverage\n\nThe Mono SDK members that send each API operation\. 2 of the 2 operations that Mono packages can send have a method\.\n/);
  assert.doesNotMatch(files.get("mono/reference/operations.md"), /alpha\.watch/);
  assert.doesNotMatch(files.get("operations/alpha/watch.md"), /Mono/);
  assert.match(
    files.get("operations/alpha/purge.md"),
    /\n\| \[Pseudo\]\(\.\.\/\.\.\/pseudo\/reference\/operations\.md\) \| Not wrapped by a method \|\n\| \[Mono\]\(\.\.\/\.\.\/mono\/reference\/operations\.md\) \| \[`ServerClient\.connect` \(static\)\]\(\.\.\/\.\.\/mono\/reference\/server\.md#serverclientconnect-static-method\), \[`ServerClient\.ping`\]\(\.\.\/\.\.\/mono\/reference\/server\.md#serverclientping-method\) \|\n$/,
  );
  assert.match(files.get("mono/reference/server.md"), /\nSends a ping\.\n\nSends \[`alpha\.ping`\]\(\.\.\/\.\.\/operations\/alpha\/ping\.md\) and \[`alpha\.purge`\]\(\.\.\/\.\.\/operations\/alpha\/purge\.md\)\.\n/);
  const operations = JSON.parse(files.get("operations/index.json")).operations;
  assert.deepEqual(operations.map(operation => Object.keys(operation.languages)), [["pseudo", "mono"], ["pseudo", "mono"], ["pseudo"]]);
  assert.deepEqual(operations[1].languages.mono.map(entry => entry.page), [
    "../mono/reference/server.md#serverclientconnect-static-method",
    "../mono/reference/server.md#serverclientping-method",
  ]);

  editJson(root, `${MONO}/language.json`, language => {
    language.order = 10;
  });
  manifest = JSON.parse(site(root).get("manifest.json"));
  assert.deepEqual(manifest.languages.map(language => language.id), ["mono", "pseudo"], "equal orders sort by ID");

  rmSync(join(root, LANGUAGE_DIRECTORY), { recursive: true });
  write(root, `${MONO}/operations.json`, { $schema: "../../../spec/docs/operation-map.schema.json", operations: { "alpha.ping": ["pseudo-server#ServerClient.ping"] } });
  files = site(root);
  assert.match(files.get("operations/alpha/watch.md"), /\n## SDK members\n\nNo SDK has a package that can send this operation\.\n$/);
  assert.match(files.get("index.md"), /\n\| Client \| Call the API as a signed-in user\. \| None yet \|\n/);
  assert.match(files.get("mono/reference/operations.md"), /\. 1 of the 2 operations that Mono packages can send has a method\.\n/);
  assert.deepEqual(JSON.parse(files.get("operations/index.json")).operations[2].languages, {});
});

test("headings in extracted docs become bold paragraphs, so they can repeat across symbols", t => {
  const root = writeFixture(t);
  editJson(root, SURFACE_FILE, surface => {
    for (const symbol of surface.packages[0].symbols) symbol.docs += "\n\n## Examples\n\nSee the quickstart.";
    surface.packages[0].symbols[1].members[1].deprecated = "Use the constructor.\n\n### Migration\n\nPass `{ key }`.";
  });
  const files = site(root);
  const server = files.get("pseudo/reference/server.md");
  assert.equal(server.match(/\n\*\*Examples\*\*\n\nSee the quickstart\.\n/g).length, 2);
  assert.match(server, /\n\*\*Deprecated:\*\* Use the constructor\.\n\n\*\*Migration\*\*\n\nPass `\{ key \}`\.\n/);
  assert.doesNotMatch(server, /^#+ (Examples|Migration)$/m);
  const data = JSON.parse(files.get("pseudo/reference/server.json"));
  assert.equal(data.symbols[1].docs, "A reply.\n\n**Fields**\n\nOnly `at`, a \\<time>.\n\n**Examples**\n\nSee the quickstart.");
  assert.equal(data.symbols[0].members[1].deprecated, "Use the constructor.\n\n**Migration**\n\nPass `{ key }`.");
});

test("docgen.config.mjs and IR problems stop generation", t => {
  const root = writeFixture(t);
  const config = {
    ...CONFIG,
    topics: [
      { id: "Server", title: "Server", summary: "Call the API from a backend." },
      { id: "client", title: "Client", summary: "Call the API as a signed-in user." },
      { id: "client", title: "", summary: "Again." },
    ],
  };
  assert.deepEqual(inputProblems(root, config), [
    'docgen.config.mjs: topic ID "Server" isn\'t kebab-case',
    "docgen.config.mjs: topic client repeats",
    "docgen.config.mjs: topic client needs a title and summary",
    `${LANGUAGE_FILE}: quickstart topic server isn't in tools/docgen/docgen.config.mjs`,
  ]);
  assert.deepEqual(inputProblems(root, { ...CONFIG, languagesDirectory: "docs/missing" }), ["docs/missing doesn't exist"]);

  rmSync(join(root, "docs/snippets/alpha/purge.md"));
  assert.deepEqual(inputProblems(root), ["docs/snippets has no page for alpha.purge; run npm run generate:graphql"]);

  rmSync(join(root, "schema/ir.json"));
  write(root, "docs/snippets/index.json", "{");
  const [missing, invalid, ...rest] = inputProblems(root);
  assert.equal(missing, "schema/ir.json doesn't exist");
  assert.match(invalid, /^docs\/snippets\/index\.json isn't valid JSON: /);
  assert.deepEqual(rest, []);
});

test("a docs/snippets page without its H2 is a problem", t => {
  const root = writeFixture(t);
  write(root, "docs/snippets/alpha/watch.md", "Watch a user's events.\n");
  const { problems } = build(root);
  assert.ok(problems.includes("docs/snippets for alpha.watch must start with an H2; run npm run generate:graphql"), problems.join("\n"));
});

test("language.json must match its schema, its directory and the configured topics", t => {
  const root = writeFixture(t);
  mkdirSync(join(root, "docs/languages/empty"));
  editJson(root, LANGUAGE_FILE, language => {
    delete language.status;
  });
  const [empty, schema, ...rest] = inputProblems(root);
  assert.equal(empty, "docs/languages/empty/language.json doesn't exist");
  assert.match(schema, /^docs\/languages\/pseudo\/language\.json doesn't match spec\/docs\/language\.schema\.json:\n.*status/s);
  assert.deepEqual(rest, []);
  rmSync(join(root, "docs/languages/empty"), { recursive: true });

  editJson(root, LANGUAGE_FILE, language => {
    language.status = "preview";
    language.id = "other";
    language.testedFences = ["text"];
    language.packages[1].name = "pseudo-server";
    language.packages[1].slug = "server";
    language.packages.push({ ...language.packages[0], name: "pseudo-extra", slug: "operations", source: "packages/missing" });
    language.quickstarts.push("calling");
  });
  assert.deepEqual(
    inputProblems(root),
    [
      "id other must match its directory, pseudo",
      "testedFences must contain codeFence pseudo",
      "package slug operations is reserved for generated pages",
      "package names repeat: pseudo-server",
      "package slugs repeat: server",
      "package pseudo-extra source packages/missing isn't a directory",
      "quickstart topic calling isn't in tools/docgen/docgen.config.mjs",
    ].map(problem => `${LANGUAGE_FILE}: ${problem}`),
  );
});

test("a language directory can't take a generated page's name", t => {
  const root = writeFixture(t);
  cpSync(join(root, LANGUAGE_DIRECTORY), join(root, "docs/languages/operations"), { recursive: true });
  editJson(root, "docs/languages/operations/language.json", language => {
    language.id = "operations";
  });
  assert.deepEqual(inputProblems(root), ["docs/languages/operations/language.json: operations is reserved for generated pages; rename the language directory"]);
});

test("each language needs its overview, quickstarts, snippet roots and operation map", t => {
  const root = writeFixture(t);
  rmSync(join(root, LANGUAGE_DIRECTORY, "quickstarts/client.md"));
  write(root, `${LANGUAGE_DIRECTORY}/quickstarts/calling.md`, "# Calling\n\nCall someone.\n");
  rmSync(join(root, LANGUAGE_DIRECTORY, "overview.md"));
  rmSync(join(root, OPERATIONS_FILE));
  editJson(root, LANGUAGE_FILE, language => {
    language.snippetRoots.push("examples/missing");
  });
  assert.deepEqual(
    inputProblems(root),
    [
      "quickstart client needs quickstarts/client.md",
      "quickstarts/calling.md isn't listed in language.json quickstarts",
      "snippet root examples/missing isn't a directory",
      "needs an overview.md",
      "operation map operations.json doesn't exist",
    ].map(problem => `${LANGUAGE_DIRECTORY}: ${problem}`),
  );
});

test("the extracted surface must exist and match language.json, with unique names", t => {
  const root = writeFixture(t);
  rmSync(join(root, SURFACE_FILE));
  assert.deepEqual(inputProblems(root), [`${SURFACE_FILE} doesn't exist; run npm run build && npm run extract:docs -- pseudo`]);

  write(root, SURFACE_FILE, { $schema: "../../../spec/docs/surface.schema.json", language: "pseudo", packages: [] });
  const [schema, ...rest] = inputProblems(root);
  assert.match(schema, /^docs\/languages\/pseudo\/surface\.json doesn't match spec\/docs\/surface\.schema\.json:\n/);
  assert.deepEqual(rest, []);

  const server = structuredClone(API["pseudo-server"]);
  const serverClient = server.symbols.find(symbol => symbol.name === "ServerClient");
  serverClient.members.push(
    { name: "ping", kind: "property", signatures: ["ping: number"], docs: "" },
    { name: "connect", kind: "method", signatures: ["connect(): void"], docs: "An instance member may share a static member's name." },
    { name: "connect", kind: "method", static: true, signatures: ["static connect(): ServerClient"], docs: "" },
  );
  server.symbols.push(structuredClone(server.symbols[0]), {
    name: "Tools",
    kind: "namespace",
    signatures: ["namespace Tools"],
    docs: "",
    members: [
      {
        name: "Inner",
        kind: "property",
        signatures: ["Inner: Inner"],
        docs: "",
        members: [
          { name: "x", kind: "property", signatures: ["x: number"], docs: "" },
          { name: "x", kind: "property", signatures: ["x: string"], docs: "" },
        ],
      },
    ],
  });
  write(root, SURFACE_FILE, {
    $schema: "../../../spec/docs/surface.schema.json",
    language: "other",
    packages: [
      { name: "pseudo-client", ...API["pseudo-client"] },
      { name: "pseudo-server", ...server },
    ],
  });
  assert.deepEqual(
    inputProblems(root),
    [
      "language is other, not pseudo",
      "packages are pseudo-client, pseudo-server, not pseudo-server, pseudo-client as in language.json",
      "pseudo-server has more than one symbol named Pong",
      "pseudo-server#ServerClient has more than one member named ping; list overloads as one member with several signatures",
      "pseudo-server#ServerClient has more than one static member named connect; list overloads as one member with several signatures",
      "pseudo-server#Tools.Inner has more than one member named x; list overloads as one member with several signatures",
    ].map(problem => `${SURFACE_FILE}: ${problem}`),
  );
});

test("operation maps resolve against the IR, the surface and package layers", t => {
  const root = writeFixture(t);
  write(root, OPERATIONS_FILE, {
    $schema: "../../../spec/docs/operation-map.schema.json",
    operations: {
      "alpha.nope": ["pseudo-server#ServerClient.ping"],
      "alpha.ping": ["pseudo-server#ServerClient.missing", "pseudo-server#ServerClient.connect", "pseudo-other#Client", "pseudo-server#Nope"],
      "alpha.purge": ["pseudo-server#ServerClient.ping:static"],
      "alpha.watch": ["pseudo-server#ServerClient.ping"],
    },
  });
  assert.deepEqual(
    inputProblems(root),
    [
      "operation alpha.nope isn't in schema/ir.json",
      "alpha.ping: pseudo-server#ServerClient.missing doesn't exist",
      "alpha.ping: pseudo-server#ServerClient.connect doesn't exist (it's static; add :static)",
      "alpha.ping: package pseudo-other isn't documented",
      "alpha.ping: pseudo-server has no symbol Nope",
      "alpha.purge: pseudo-server#ServerClient.ping:static doesn't exist (it isn't static)",
      "alpha.watch is a client operation, but pseudo-server is a server package",
    ].map(problem => `${OPERATIONS_FILE}: ${problem}`),
  );

  write(root, OPERATIONS_FILE, { $schema: "../../../spec/docs/operation-map.schema.json", operations: { "alpha.ping": ["ServerClient.ping"] } });
  const [schema, ...rest] = inputProblems(root);
  assert.match(schema, /^docs\/languages\/pseudo\/operations\.json doesn't match spec\/docs\/operation-map\.schema\.json:\n/);
  assert.deepEqual(rest, []);
});

test("references parse, format and resolve", () => {
  const surface = { language: "pseudo", packages: Object.entries(API).map(([name, api]) => ({ name, ...api })) };
  const reference = "pseudo-server#ServerClient.connect:static";
  assert.deepEqual(parseReference(reference), { package: "pseudo-server", symbol: "ServerClient", members: [{ name: "connect", static: true }] });
  const resolved = resolveReference(surface, reference);
  assert.equal(resolved.package.name, "pseudo-server");
  assert.equal(resolved.symbol.name, "ServerClient");
  assert.deepEqual(resolved.members.map(member => member.name), ["connect"]);
  assert.equal(formatReference("pseudo-server", resolved.symbol, resolved.members), reference);
  assert.equal(formatReference("pseudo-server", resolved.symbol), "pseudo-server#ServerClient");
  assert.deepEqual(resolveReference({ packages: [{ name: "p", symbols: [{ name: "A" }, { name: "A" }] }] }, "p#A"), { error: "p has 2 symbols named A" });
});

test("include problems in quickstarts stop generation", t => {
  const root = writeFixture(t);
  const quickstart = `${LANGUAGE_DIRECTORY}/quickstarts/server.md`;
  editText(root, quickstart, text => text.replace("server.pseudo#ping", "server.pseudo#pong").replace("The reply", "```pseudo\npong\n```\n\nThe reply"));
  assert.deepEqual(inputProblems(root), [
    `${LANGUAGE_DIRECTORY}/examples/src/server.pseudo:1: region pong doesn't exist (included by ${quickstart}:7)`,
    `${quickstart}:10: pseudo code must come from a tested snippet: \`\`\`pseudo include=<file>#<region>`,
  ]);
});

test("lint and link problems name the generated page and the hand-written source", t => {
  const root = writeFixture(t);
  editText(root, `${LANGUAGE_DIRECTORY}/overview.md`, text => text.replace("backends and apps.", "backends and apps.\n\nUse <Client>."));
  editText(root, `${LANGUAGE_DIRECTORY}/quickstarts/server.md`, text => text.replace("#pong-type", "#ping-type"));
  const { files, problems } = build(root);
  assert.ok(files.size > 0, "render problems still return files; the CLI writes none of them");
  assert.deepEqual(problems, [
    `docs/site/pseudo/index.md:5: escape <, { and } outside code (\\<, \\{, \\}) (from ${LANGUAGE_DIRECTORY}/overview.md)`,
    `docs/site/pseudo/quickstarts/server.md:12: anchor doesn't exist: ../reference/server.md#ping-type (from ${LANGUAGE_DIRECTORY}/quickstarts/server.md)`,
  ]);
});
