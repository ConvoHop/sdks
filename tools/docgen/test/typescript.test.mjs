import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { DtsParseError, parseDeclarations, parseDoc } from "../extractors/dts.mjs";
import { ExtractError, collapseSignature, extractTypeScript } from "../extractors/typescript.mjs";
import { REPO_ROOT, tempRoot, write } from "./helpers.mjs";

const NO_DOC = { text: "", internal: false };
const doc = text => ({ text, internal: false });
const lines = (...items) => `${items.join("\n")}\n`;

test("parseDoc turns TSDoc into Markdown with parameters, links, returns, throws and deprecation", () => {
  const parsed = parseDoc(
    lines(
      "/**",
      " * Sends a message. See {@link Conversation.send} and {@link https://example.com/guide | the guide}.",
      " *",
      " * @param conversationId - The conversation.",
      " * @param [options] Optional settings,",
      " *   over two lines.",
      " * @returns The sent message.",
      " * @throws {@link ConvoHopError} when the request fails.",
      " * @remarks Retries keep the request ID.",
      " * @defaultValue `{}`",
      " * @deprecated Use `Conversation.send`.",
      " */",
    ).trimEnd(),
  );
  assert.deepEqual(parsed, {
    text: [
      "Sends a message. See `Conversation.send` and [the guide](https://example.com/guide).",
      "Parameters:\n\n- `conversationId`: The conversation.\n- `options`: Optional settings,\n  over two lines.",
      "Returns: The sent message.",
      "Throws: `ConvoHopError` when the request fails.",
      "Retries keep the request ID.",
      "Default: `{}`",
    ].join("\n\n"),
    internal: false,
    deprecated: "Use `Conversation.send`.",
  });
  assert.deepEqual(parseDoc("/** Old.\n * @deprecated\n */"), { text: "Old.", internal: false, deprecated: true });
  assert.deepEqual(parseDoc("/** @internal */"), { text: "", internal: true });
  assert.throws(
    () => parseDoc("/**\n * Sends.\n * @example send()\n */", "client.d.ts:3"),
    error =>
      error instanceof DtsParseError &&
      error.message === "client.d.ts:3: unsupported JSDoc tag @example; document it in prose, or put example code in a tested quickstart snippet",
  );
});

test("parseDeclarations reads imports, exports and declarations, dropping private and @internal members", () => {
  const source = lines(
    "/**",
    " * Fixture package.",
    " *",
    " * @packageDocumentation",
    " */",
    'import type { Base } from "./base.js";',
    'import * as wire from "./generated/wire.js";',
    'import "./side-effect.js";',
    'export { helper as aliased, type Shape } from "./helper.js";',
    'export * from "./more.js";',
    "/** Model helpers. */",
    'export * as models from "./models.js";',
    "/** A client. */",
    "export declare class Client extends Base implements Disposable {",
    "    #private;",
    "    private secret;",
    "    protected guard(): void;",
    "    /** @internal */",
    "    hidden(): void;",
    "    /** Creates a client. */",
    "    constructor(options: {",
    "        key: string;",
    "    });",
    "    /** Sends one message. */",
    "    send(text: string): Promise<void>;",
    "    send(texts: string[]): Promise<void>;",
    "    get state(): string;",
    "    set state(value: string);",
    "    static create(): Client;",
    "    readonly options: {",
    "        key: string;",
    "        /** Milliseconds. */",
    "        timeout?: number;",
    "    };",
    "    [key: string]: unknown;",
    "}",
    "/** @internal */",
    "export declare function internalHelper(): void;",
    "export declare const DEFAULT_TIMEOUT = 30000;",
    'export type Mode = "a" | "b";',
    "export declare enum Color {",
    "    Red = 0,",
    "    /** @internal */",
    "    Hidden = 1",
    "}",
    "interface Local {",
    "    (input: string): number;",
    "    new (input: string): Local;",
    "}",
    "export {};",
  );
  const noHeritage = { extends: [], implements: [] };
  assert.deepEqual(parseDeclarations(source, "fixture.d.ts"), {
    file: "fixture.d.ts",
    doc: doc("Fixture package."),
    imports: [
      { local: "Base", imported: "Base", from: "./base.js" },
      { local: "wire", imported: "*", from: "./generated/wire.js" },
    ],
    exports: [
      { kind: "named", names: [{ local: "helper", exported: "aliased" }, { local: "Shape", exported: "Shape" }], from: "./helper.js" },
      { kind: "star", from: "./more.js" },
      { kind: "namespace", name: "models", from: "./models.js", doc: doc("Model helpers.") },
    ],
    declarations: [
      {
        name: "Client",
        kind: "class",
        exported: true,
        signature: "class Client extends Base implements Disposable",
        heritage: { extends: [{ text: "Base", name: "Base" }], implements: [{ text: "Disposable", name: "Disposable" }] },
        doc: doc("A client."),
        members: [
          { name: "constructor", kind: "constructor", signatures: ["constructor(options: {\n    key: string;\n})"], doc: doc("Creates a client.") },
          { name: "send", kind: "method", signatures: ["send(text: string): Promise<void>", "send(texts: string[]): Promise<void>"], doc: doc("Sends one message.") },
          { name: "state", kind: "property", signatures: ["get state(): string", "set state(value: string)"], doc: NO_DOC },
          { name: "create", kind: "method", static: true, signatures: ["static create(): Client"], doc: NO_DOC },
          {
            name: "options",
            kind: "property",
            signatures: ["readonly options: { … }"],
            doc: NO_DOC,
            members: [
              { name: "key", kind: "property", signatures: ["key: string"], doc: NO_DOC },
              { name: "timeout", kind: "property", signatures: ["timeout?: number"], doc: doc("Milliseconds.") },
            ],
          },
          { name: "[key: string]", kind: "index", signatures: ["[key: string]: unknown"], doc: NO_DOC },
        ],
      },
      { name: "DEFAULT_TIMEOUT", kind: "constant", exported: true, signature: "const DEFAULT_TIMEOUT = 30000", doc: NO_DOC },
      { name: "Mode", kind: "type", exported: true, signature: 'type Mode = "a" | "b"', doc: NO_DOC },
      {
        name: "Color",
        kind: "enum",
        exported: true,
        signature: "enum Color",
        heritage: noHeritage,
        doc: NO_DOC,
        members: [{ name: "Red", kind: "case", signatures: ["Red = 0"], doc: NO_DOC }],
      },
      {
        name: "Local",
        kind: "interface",
        exported: false,
        signature: "interface Local",
        heritage: noHeritage,
        doc: NO_DOC,
        members: [
          { name: "()", kind: "call", signatures: ["(input: string): number"], doc: NO_DOC },
          { name: "new", kind: "constructor", signatures: ["new (input: string): Local"], doc: NO_DOC },
        ],
      },
    ],
  });
});

test("parseDeclarations rejects constructs it doesn't understand, with the file and line", () => {
  for (const [source, message] of [
    ["export default class Client {}\n", 'fixture.d.ts:1: unsupported export form "export default"'],
    ["export = Client;\n", 'fixture.d.ts:1: unsupported export form "export ="'],
    ["\ndeclare namespace Client {}\n", 'fixture.d.ts:2: unsupported statement starting with "namespace"'],
    ["export declare const a = 1,\n    b = 2;\n", "fixture.d.ts:1: declare one variable per statement"],
    ["/**\n * Sends.\n * @example send()\n */\nexport declare function send(): void;\n", /^fixture\.d\.ts:1: unsupported JSDoc tag @example;/],
  ]) {
    assert.throws(() => parseDeclarations(source, "fixture.d.ts"), error => {
      assert.ok(error instanceof DtsParseError);
      if (typeof message === "string") assert.equal(error.message, message);
      else assert.match(error.message, message);
      return true;
    });
  }
});

test("collapseSignature collapses result-type objects, innermost first, until the signature fits", () => {
  const signature = [
    "get(options: {",
    "    id: string;",
    "}): Promise<{",
    "    conversation: {",
    "        id: string;",
    "        title: string;",
    "    };",
    "    members: string[];",
    "}>",
  ].join("\n");
  assert.equal(collapseSignature(signature), signature, "signatures within the limit are kept");
  assert.equal(
    collapseSignature(signature, 6),
    ["get(options: {", "    id: string;", "}): Promise<{", "    conversation: { … };", "    members: string[];", "}>"].join("\n"),
  );
  assert.equal(collapseSignature(signature, 5), ["get(options: {", "    id: string;", "}): Promise<{ … }>"].join("\n"), "parameter shapes are kept");
  assert.equal(collapseSignature("type Pong = {\n    at: string;\n}", 1), "type Pong = { … }");
  assert.equal(collapseSignature("readonly options: {\n    key: string;\n}", 1), "readonly options: { … }");
});

/**
 * A workspace with two packages linked from node_modules, as npm installs
 * workspaces: @fx/core, and @fx/sdk, which re-exports from it. One
 * third-party package is installed in node_modules.
 */
function writeWorkspace(t) {
  const root = tempRoot(t);
  const pkg = (name, dir) => {
    write(root, `packages/${dir}/package.json`, { name, exports: { ".": { types: "./dist/index.d.ts", default: "./dist/index.js" } } });
    mkdirSync(join(root, "node_modules", ...name.split("/").slice(0, -1)), { recursive: true });
    symlinkSync(join(root, "packages", dir), join(root, "node_modules", ...name.split("/")), "dir");
  };
  pkg("@fx/core", "core");
  pkg("@fx/sdk", "sdk");
  write(root, "node_modules/thirdparty/package.json", { name: "thirdparty", types: "./index.d.ts" });
  write(root, "node_modules/thirdparty/index.d.ts", "export declare const thing: number;\n");
  write(
    root,
    "packages/core/dist/index.d.ts",
    lines(
      "/** Base of every client. */",
      "export declare class BaseClient {",
      "    /** Creates a base client. */",
      "    constructor(url: string);",
      "    /** Checks the connection. */",
      "    ping(): Promise<void>;",
      "    /** Closes the client. */",
      "    close(): void;",
      "}",
      "/** Shared options. */",
      "export interface Options {",
      "    url: string;",
      "}",
      'export * from "./generated/types.js";',
    ),
  );
  write(
    root,
    "packages/core/dist/generated/types.d.ts",
    lines("/** A generated input. */", "export type SendInput = {", "    text: string;", "    to: string;", "};"),
  );
  write(
    root,
    "packages/sdk/dist/index.d.ts",
    lines(
      'export { BaseClient, type Options } from "@fx/core";',
      'export type { SendInput } from "@fx/core";',
      'export * from "./client.js";',
      'export { send, post } from "./send.js";',
      "/** Model helpers. */",
      'export * as models from "./models.js";',
    ),
  );
  write(
    root,
    "packages/sdk/dist/client.d.ts",
    lines(
      'import { BaseClient } from "@fx/core";',
      "/** Calls the API as one user. */",
      "export declare class UserClient extends BaseClient {",
      "    #private;",
      "    private token;",
      "    /** @internal */",
      "    debug(): void;",
      "    constructor(token: string);",
      "    /** Closes the client and its streams. */",
      "    close(): void;",
      "    /** Watches events. */",
      "    watch(): AsyncIterable<string>;",
      "}",
    ),
  );
  write(
    root,
    "packages/sdk/dist/send.d.ts",
    lines(
      "/** Sends one message. */",
      "export declare function send(text: string): Promise<void>;",
      "export declare function send(texts: string[]): Promise<void>;",
      "/**",
      " * Posts one message.",
      " * @deprecated",
      " */",
      "export declare function post(text: string): Promise<void>;",
    ),
  );
  write(root, "packages/sdk/dist/models.d.ts", "export declare function model(): void;\n");
  return root;
}

test("extractTypeScript follows workspace re-exports, inherits members and keeps generated declarations opaque", t => {
  const root = writeWorkspace(t);
  const close = { name: "close", kind: "method", signatures: ["close(): void"] };
  assert.deepEqual(extractTypeScript({ root, language: "fixture", packages: ["@fx/sdk"] }), {
    language: "fixture",
    packages: [
      {
        name: "@fx/sdk",
        symbols: [
          {
            name: "BaseClient",
            kind: "class",
            signatures: ["class BaseClient"],
            docs: "Base of every client.",
            origin: "@fx/core",
            members: [
              { name: "constructor", kind: "constructor", signatures: ["constructor(url: string)"], docs: "Creates a base client." },
              { name: "ping", kind: "method", signatures: ["ping(): Promise<void>"], docs: "Checks the connection." },
              { ...close, docs: "Closes the client." },
            ],
          },
          {
            name: "Options",
            kind: "interface",
            signatures: ["interface Options"],
            docs: "Shared options.",
            origin: "@fx/core",
            members: [{ name: "url", kind: "property", signatures: ["url: string"], docs: "" }],
          },
          { name: "SendInput", kind: "type", signatures: ["type SendInput = { … }"], docs: "A generated input.", origin: "@fx/core" },
          {
            name: "UserClient",
            kind: "class",
            signatures: ["class UserClient extends BaseClient"],
            docs: "Calls the API as one user.",
            members: [
              { name: "constructor", kind: "constructor", signatures: ["constructor(token: string)"], docs: "" },
              { ...close, docs: "Closes the client and its streams." },
              { name: "watch", kind: "method", signatures: ["watch(): AsyncIterable<string>"], docs: "Watches events." },
              { name: "ping", kind: "method", signatures: ["ping(): Promise<void>"], docs: "Checks the connection.", inherited: "BaseClient" },
            ],
          },
          { name: "models", kind: "namespace", signatures: ["namespace models"], docs: "Model helpers." },
          { name: "post", kind: "function", signatures: ["function post(text: string): Promise<void>"], docs: "Posts one message.", deprecated: "" },
          {
            name: "send",
            kind: "function",
            signatures: ["function send(text: string): Promise<void>", "function send(texts: string[]): Promise<void>"],
            docs: "Sends one message.",
          },
        ],
      },
    ],
  });
});

test("extractTypeScript names the package or file it can't document", t => {
  const root = writeWorkspace(t);
  const fails = (packages, message) =>
    assert.throws(() => extractTypeScript({ root, packages }), error => {
      assert.ok(error instanceof ExtractError, error.stack);
      assert.equal(error.message, message);
      return true;
    });
  fails(["@fx/missing"], "@fx/missing is not a workspace package in node_modules; run npm ci first");
  fails(["thirdparty"], "thirdparty is not a workspace package in node_modules; run npm ci first");

  write(root, "packages/sdk/dist/extra.d.ts", 'export { thing } from "thirdparty";\n');
  write(root, "packages/sdk/dist/index.d.ts", 'export * from "./extra.js";\n');
  fails(["@fx/sdk"], 'packages/sdk/dist/extra.d.ts: re-exports from third-party "thirdparty" are not supported');
  write(root, "packages/sdk/dist/index.d.ts", 'export * from "thirdparty";\n');
  fails(["@fx/sdk"], 'packages/sdk/dist/index.d.ts: re-exports from third-party "thirdparty" are not supported');

  write(root, "packages/sdk/dist/index.d.ts", lines("export declare class Pair {", "}", "export interface Pair {", "}"));
  fails(["@fx/sdk"], "packages/sdk/dist/index.d.ts: Pair merges class and interface declarations, which the extractor does not support");

  write(root, "packages/sdk/package.json", { name: "@fx/sdk", exports: { ".": { types: "./dist/missing.d.ts" } } });
  fails(["@fx/sdk"], "packages/sdk/dist/missing.d.ts is missing; run npm run build first");
  write(root, "packages/sdk/package.json", { name: "@fx/sdk", exports: { ".": "./dist/index.js" } });
  fails(["@fx/sdk"], '@fx/sdk: package.json exports["."] has no "types" condition');
});

test("extractTypeScript follows bases through namespace imports and rejects workspace bases it can't read", t => {
  const root = writeWorkspace(t);
  const client = (...body) => write(root, "packages/sdk/dist/client.d.ts", lines(...body));
  const userClient = () => extractTypeScript({ root, language: "fixture", packages: ["@fx/sdk"] }).packages[0].symbols.find(symbol => symbol.name === "UserClient");
  const fails = message =>
    assert.throws(() => extractTypeScript({ root, packages: ["@fx/sdk"] }), error => {
      assert.ok(error instanceof ExtractError, error.stack);
      assert.equal(error.message, message);
      return true;
    });

  client('import * as core from "@fx/core";', "export declare class UserClient extends core.BaseClient<string> {", "    constructor(token: string);", "}");
  assert.deepEqual(
    userClient().members.map(member => [member.name, member.inherited]),
    [["constructor", undefined], ["ping", "BaseClient"], ["close", "BaseClient"]],
  );
  client('import * as tp from "thirdparty";', "export declare class UserClient extends tp.Thing {", "}", "export declare class Failure extends Error {", "}");
  assert.deepEqual(userClient().members ?? [], [], "third-party and global bases aren't listed");

  const where = "packages/sdk/dist/client.d.ts: UserClient extends";
  client('import * as core from "@fx/core";', "export declare class UserClient extends core.Missing {", "}");
  fails(`${where} core.Missing, but core doesn't export Missing`);
  client('import { BaseClient } from "@fx/core";', "export declare class UserClient extends BaseClient.Inner {", "}");
  fails(`${where} BaseClient.Inner, but BaseClient isn't a namespace import`);
  client('import { BaseClient } from "@fx/core";', "export declare class UserClient extends (BaseClient) {", "}");
  fails(`${where} (BaseClient), which the extractor can't follow; extend a class or interface by name`);
  client('import { BaseClient } from "@fx/core";', "export declare class UserClient extends Mixin(BaseClient) {", "}");
  fails(`${where} Mixin(BaseClient), which the extractor can't follow; extend a class or interface by name`);
  client(
    'import { BaseClient } from "@fx/core";',
    "declare const UserClient_base: {",
    "    new (...args: any[]): {",
    "        retry(): void;",
    "    };",
    "} & typeof BaseClient;",
    "export declare class UserClient extends UserClient_base {",
    "}",
  );
  fails(`${where} UserClient_base, a constant whose members the extractor can't read`);
  client('import type { Options } from "@fx/core";', "type Both = Options & { token: string };", "export interface UserClient extends Both {", "}");
  fails(`${where} Both, a type whose members the extractor can't read`);
});

test("the extractor command takes one language file", () => {
  const result = spawnSync(process.execPath, ["tools/docgen/extractors/typescript.mjs"], { cwd: REPO_ROOT, encoding: "utf8" });
  assert.equal(result.status, 2);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "usage: node tools/docgen/extractors/typescript.mjs <language.json>\n");
});
