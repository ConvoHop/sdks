import test from "node:test";
import assert from "node:assert/strict";
import { expandIncludes, extractRegion, parseRegions } from "../lib/snippets.mjs";
import { tempRoot, write } from "./helpers.mjs";

const source = (...lines) => `${lines.join("\n")}\n`;
const errorsOf = (text, comment = "//") => parseRegions(text, comment).errors;

test("parseRegions finds nested regions", () => {
  const { regions, errors } = parseRegions(source("a", "// #region outer", "  //#region inner_1", "b", "  // #endregion inner_1", "// #endregion"), "//");
  assert.deepEqual(errors, []);
  assert.deepEqual(Object.fromEntries(regions), { inner_1: { start: 2, end: 4 }, outer: { start: 1, end: 5 } });
});

test("parseRegions reports bad names, repeats and unbalanced or malformed markers", () => {
  const cases = [
    [source("// #region a.b", "// #endregion"), [{ line: 1, message: "region names use letters, digits, _ and -: a.b" }]],
    [source("// #region a", "// #endregion", "// #region a", "// #endregion"), [{ line: 3, message: "region a repeats" }]],
    [source("// #region a", "// #region a", "// #endregion", "// #endregion"), [{ line: 2, message: "region a repeats" }]],
    [source("x", "// #endregion"), [{ line: 2, message: "#endregion without #region" }]],
    [source("// #region a", "// #region b", "// #endregion a", "// #endregion"), [{ line: 3, message: "#endregion a closes region b" }]],
    [source("// #region a", "x"), [{ line: 1, message: "region a isn't closed" }]],
    [source("x(); // #region a"), [{ line: 1, message: "malformed region marker; use // #region <name> and // #endregion" }]],
    [source("// #region a b"), [{ line: 1, message: "malformed region marker; use // #region <name> and // #endregion" }]],
    [
      source("// #region", "// #endregion"),
      [
        { line: 1, message: "malformed region marker; use // #region <name> and // #endregion" },
        { line: 2, message: "#endregion without #region" },
      ],
    ],
  ];
  for (const [text, errors] of cases) assert.deepEqual(errorsOf(text), errors, text);
  assert.deepEqual(errorsOf(source("// #regional office")), [], "only whole-word markers count");
});

test("parseRegions uses the language's line comment, which may be # or empty", () => {
  const python = source("# #region send", "client.send()", "# #endregion send");
  assert.deepEqual(errorsOf(python, "#"), []);
  assert.deepEqual([...parseRegions(python, "#").regions.keys()], ["send"]);
  assert.deepEqual(errorsOf(source("#region send"), "#"), [{ line: 1, message: "malformed region marker; use # #region <name> and # #endregion" }]);
  const csharp = source("#region send", "client.Send();", "#endregion");
  assert.deepEqual(errorsOf(csharp, ""), []);
  assert.deepEqual(errorsOf(source("#region"), ""), [{ line: 1, message: "malformed region marker; use #region <name> and #endregion" }]);
  assert.deepEqual(errorsOf(source("-- #region send", "-- #endregion send"), "--"), []);
});

test("extractRegion drops markers, dedents and trims", () => {
  const file = source(
    "import x",
    "",
    "// #region outer",
    "function f() {",
    "  // #region inner",
    "  ",
    "  return x;   ",
    "  // #endregion inner",
    "}",
    "// #endregion outer",
  );
  assert.deepEqual(extractRegion(file, "//", "inner"), { code: "return x;", errors: [] });
  assert.deepEqual(extractRegion(file, "//", "outer"), { code: "function f() {\n\n  return x;\n}", errors: [] });
  assert.deepEqual(extractRegion(file, "//"), { code: "import x\n\nfunction f() {\n\n  return x;\n}", errors: [] });
  assert.deepEqual(extractRegion(file, "//", "missing"), { errors: [{ line: 1, message: "region missing doesn't exist" }] });
  assert.deepEqual(extractRegion(source("// #region blank", "   ", "// #endregion"), "//", "blank"), { errors: [{ line: 1, message: "region blank is empty" }] });
  assert.deepEqual(extractRegion("\n\n", "//"), { errors: [{ line: 1, message: "file is empty" }] });
  assert.deepEqual(extractRegion(source("x", "// #region a", "y"), "//", "a"), { errors: [{ line: 2, message: "region a isn't closed" }] });
});

const DIRECTORY = "docs/languages/ts";
const PAGE = `${DIRECTORY}/quickstarts/server.md`;
const LANGUAGE = { testedFences: ["ts", "tsx"], snippetRoots: ["examples/src", "examples/web"], regionComment: "//" };
const FILES = {
  "examples/src/server.ts": source('import { x } from "x";', "// #region create", "const a = x(`", "```", "`);", "// #endregion create"),
  "examples/src/bad.ts": source("x", "// #region open", "y"),
  "examples/src/lib/util.ts": source("export const util = 1;"),
  "examples/web/app.tsx": source("export const App = () => <div />;"),
};

function expand(t, markdown) {
  const root = tempRoot(t);
  for (const [path, contents] of Object.entries(FILES)) write(root, `${DIRECTORY}/${path}`, contents);
  return expandIncludes(markdown, { root, language: LANGUAGE, directory: DIRECTORY, file: PAGE });
}

test("expandIncludes replaces include fences with the included code", t => {
  const markdown = source(
    "# Server",
    "",
    "Text.",
    "",
    "```ts include=examples/src/server.ts#create",
    "```",
    "",
    "```sh",
    "npm install x",
    "```",
    "",
    "```tsx include=examples/web/app.tsx",
    "```",
  );
  assert.deepEqual(expand(t, markdown), {
    markdown: source(
      "# Server",
      "",
      "Text.",
      "",
      "````ts snippet=docs/languages/ts/examples/src/server.ts#create",
      "const a = x(`",
      "```",
      "`);",
      "````",
      "",
      "```sh",
      "npm install x",
      "```",
      "",
      "```tsx snippet=docs/languages/ts/examples/web/app.tsx",
      "export const App = () => <div />;",
      "```",
    ),
    includes: [`${DIRECTORY}/examples/src/server.ts#create`, `${DIRECTORY}/examples/web/app.tsx`],
    problems: [],
  });
});

test("expandIncludes reports code that isn't a tested snippet and bad includes", t => {
  const at = (line, message) => `${PAGE}:${line}: ${message}`;
  const outside = "include paths are relative to the language directory, without . or .. segments:";
  const cases = [
    [source("```ts", "const x = 1;", "```"), [at(1, "ts code must come from a tested snippet: ```ts include=<file>#<region>")]],
    [source("```ts include=examples/src/server.ts#create", "const x = 1;", "```"), [at(1, "include fences are empty; the code comes from the included file")]],
    [source("```ts include=examples/src/server.ts#create title=x", "```"), [at(1, "include fences take only a language and include=<file>#<region>")]],
    [source("```ts include=../secret.ts", "```"), [at(1, `${outside} ../secret.ts`)]],
    [source("```ts include=/etc/passwd", "```"), [at(1, `${outside} /etc/passwd`)]],
    [source("```ts include=examples/src/./server.ts", "```"), [at(1, `${outside} examples/src/./server.ts`)]],
    [source("```ts include=examples\\src\\server.ts", "```"), [at(1, `${outside} examples\\src\\server.ts`)]],
    [source("```ts include=#create", "```"), [at(1, `${outside} `)]],
    [source("```ts include=other/server.ts", "```"), [at(1, "included files must be under a snippet root (examples/src, examples/web): other/server.ts")]],
    [source("```ts include=examples/src/missing.ts", "```"), [at(1, `included file doesn't exist: ${DIRECTORY}/examples/src/missing.ts`)]],
    [source("```ts include=examples/src", "```"), [at(1, "included files must be under a snippet root (examples/src, examples/web): examples/src")]],
    [source("```ts include=examples/src/lib", "```"), [at(1, `included file doesn't exist: ${DIRECTORY}/examples/src/lib`)]],
    [source("Text.", "", "```ts include=examples/src/server.ts", "```"), []],
    [source("Text.", "", "```ts include=examples/src/server.ts#nope", "```"), [`${DIRECTORY}/examples/src/server.ts:1: region nope doesn't exist (included by ${PAGE}:3)`]],
    [source("```ts include=examples/src/bad.ts#open", "```"), [`${DIRECTORY}/examples/src/bad.ts:2: region open isn't closed (included by ${PAGE}:1)`]],
    [
      source("Text.", "", "```ts include=examples/src/server.ts#create"),
      [at(3, "code fence isn't closed"), at(3, "include fences are empty; the code comes from the included file")],
    ],
  ];
  for (const [markdown, problems] of cases) assert.deepEqual(expand(t, markdown).problems, problems, markdown);
  assert.equal(expand(t, source("```ts", "x", "```")).markdown, source("```ts", "x", "```"), "rejected code is kept as written");
});
