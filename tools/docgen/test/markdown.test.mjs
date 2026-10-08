import test from "node:test";
import assert from "node:assert/strict";
import {
  MarkdownError,
  boldHeadings,
  checkLinks,
  codeBlock,
  codeSpan,
  escapeMdx,
  headingSlug,
  parsePage,
  rebaseLinks,
  resolveLink,
  scanLines,
  slugify,
  tableCell,
  toPlainText,
} from "../lib/markdown.mjs";

const page = (...lines) => `${lines.join("\n")}\n`;
const errorsOf = markdown => parsePage(markdown).errors;

test("heading IDs match GitHub's slugs", () => {
  const cases = [
    ["`ConvoHopClient` class", "convohopclient-class"],
    ["`ServerClient.connect` static method", "serverclientconnect-static-method"],
    ["`[Symbol.asyncIterator]` method", "symbolasynciterator-method"],
    ["What's new?", "whats-new"],
    ["C++ & C#", "c--c"],
    ["snake_case and kebab-case", "snake_case-and-kebab-case"],
    ["Ünïcode Straße", "ünïcode-straße"],
    ["Use [links](x.md) and **bold**", "use-links-and-bold"],
    ["Use [`code` links](x.md)", "use-code-links"],
    ["`list[0](x)` call", "list0x-call"],
    ["`a | b` \\<T>", "a--b-t"],
  ];
  for (const [heading, slug] of cases) assert.equal(headingSlug(heading), slug, heading);
  assert.equal(slugify("Two  spaces"), "two--spaces", "spaces aren't collapsed");
  assert.equal(headingSlug("`a  b` and  c"), "a--b-and--c", "heading text keeps its spaces, as rehype-slug reads it");
  assert.equal(headingSlug("` a`"), "-a", "CommonMark strips code span spaces only in pairs");
  assert.equal(headingSlug("` a ` `` `b` ``"), "a-b");
});

test("toPlainText unwraps code spans, links, emphasis and escapes", () => {
  assert.equal(toPlainText("Call `send()` with [**options**](a.md#b), not \\<T>."), "Call send() with options, not <T>.");
  assert.equal(toPlainText("Index with `list[0](x)`, see [`list`](a.md)."), "Index with list[0](x), see list.");
  assert.equal(toPlainText("`` a`b ``"), "a`b");
  assert.equal(toPlainText("  several\n  lines  "), "several lines");
});

test("parsePage returns the title, description, headings and links of a valid page", () => {
  const result = parsePage(
    page(
      "# The `ping` guide",
      "",
      "Sends a [ping](other.md) and waits",
      "for **the** reply.",
      "",
      "## Send it",
      "",
      "See [below](#wait-for-it) and [the site](https://example.com) \\<T>.",
      "",
      "```ts",
      "# not a heading",
      "const x = <T>{ a: 1 };",
      "```",
      "",
      "| A | B |",
      "| --- | --- |",
      "| `a \\| b` | [c](c.md) |",
      "",
      "---",
      "",
      "### Wait for it",
    ),
  );
  assert.deepEqual(result.errors, []);
  assert.equal(result.title, "The ping guide");
  assert.equal(result.description, "Sends a ping and waits for the reply.");
  assert.deepEqual(result.headings, [
    { level: 1, text: "The `ping` guide", slug: "the-ping-guide", line: 1 },
    { level: 2, text: "Send it", slug: "send-it", line: 6 },
    { level: 3, text: "Wait for it", slug: "wait-for-it", line: 21 },
  ]);
  assert.deepEqual(result.links, [
    { target: "other.md", line: 3 },
    { target: "#wait-for-it", line: 8 },
    { target: "https://example.com", line: 8 },
    { target: "c.md", line: 17 },
  ]);
});

test("parsePage enforces the MDX-safe subset", () => {
  const cases = [
    [page("# Title", "", "Text."), []],
    ["# Title\n\nText.", [{ line: 3, message: "pages end with exactly one newline" }]],
    ["# Title\n\nText.\n\n", [{ line: 5, message: "pages end with exactly one newline" }]],
    [page("Title", "", "Text."), [{ line: 1, message: "pages start with an H1 (`# Title`)" }]],
    [page("# Title", "", "Visit <https://example.com>."), [{ line: 3, message: "escape <, { and } outside code (\\<, \\{, \\})" }]],
    [page("# Title", "", "## Section"), [{ line: 2, message: "follow the H1 with a one-paragraph description" }]],
    [page("# Title", "", "- a list"), [{ line: 2, message: "follow the H1 with a one-paragraph description" }]],
    [page("# Title", "", "Text.", "", "# Again"), [{ line: 5, message: "only the first line is an H1" }]],
    [page("# Title", "", "Text.", "", "```", "code", "```"), [{ line: 5, message: "code fences need a language" }]],
    [page("# Title", "", "Text.", "", "```ts", "code"), [{ line: 5, message: "code fence isn't closed" }]],
    [page("# Title", "", "Text with `code."), [{ line: 3, message: "code span isn't closed on its line" }]],
    [page("# Title", "", "A <div> here."), [{ line: 3, message: "escape <, { and } outside code (\\<, \\{, \\})" }]],
    [page("# Title", "", "An {expression}."), [{ line: 3, message: "escape <, { and } outside code (\\<, \\{, \\})" }]],
    [page("# Title", "", "A \\\\<b> after an escaped backslash."), [{ line: 3, message: "escape <, { and } outside code (\\<, \\{, \\})" }]],
    [page("# Title", "", "Text.", "", "import x from 'y'"), [{ line: 5, message: "MDX reads lines starting with import or export as code; reword the line" }]],
    [page("# Title", "", "Text ![alt](a.png)."), [{ line: 3, message: "images aren't supported" }]],
    [page("# Title", "", "Text.", "", "[ref]: https://example.com"), [{ line: 5, message: "use inline links, not link reference definitions" }]],
    [page("# Title", "", "Text.", "", "Section", "-------"), [{ line: 6, message: "setext headings aren't supported; use `## Title`" }]],
    [page("# Title", "", "Text.", "", "## A [link](x.md)"), [{ line: 5, message: "headings contain only text and code spans" }]],
    [page("# Title", "", "Text.", "", "## *Emphasis*"), [{ line: 5, message: "headings contain only text and code spans" }]],
    [page("# Title", "", "Text.", "", "## ~~Struck~~"), [{ line: 5, message: "headings contain only text and code spans" }]],
    [page("# Title", "", "Text.", "", "## WRONG_REGION, C# and Q&A"), []],
    [page("# Title", "", "Text.", "", "## __init__"), [{ line: 5, message: "underscores in headings join letters or digits; put other names in code spans" }]],
    [page("# Title", "", "Text.", "", "## _private"), [{ line: 5, message: "underscores in headings join letters or digits; put other names in code spans" }]],
    [page("# Title", "", "Text.", "", "## Q&amp;A"), [{ line: 5, message: "headings can't contain character references" }]],
    [page("# Title", "", "Text.", "", "## Closed ##"), [{ line: 5, message: "don't close headings with #" }]],
    [page("# Title", "", "Text.", "", "  ## Indented"), [{ line: 5, message: "headings start in the first column" }]],
    [page("# Title", "", "Text.", "", "## !!!"), [{ line: 5, message: "heading has no ID" }]],
    [page("# Title", "", "Text.", "", "## Same", "", "## same"), [{ line: 7, message: "heading ID #same repeats line 5" }]],
  ];
  for (const [markdown, errors] of cases) assert.deepEqual(errorsOf(markdown), errors, JSON.stringify(markdown));
});

test("parsePage rejects indented code, which MDX doesn't support, and fences CommonMark doesn't read as fences", () => {
  const code = line => ({ line, message: "indented code blocks aren't supported; use a fenced code block with a language" });
  const fence = line => ({ line, message: "indent code fences at most 3 spaces past their container (the page or a list item)" });
  const inItem = line => ({ line, message: "indent fenced code in a list item at least as far as the item's text" });
  const inQuote = line => ({ line, message: "block quotes can't contain code fences" });
  const afterMarker = line => ({ line, message: "start code fences on their own line, not after a list marker" });
  const body = (...lines) => page("# Title", "", "Text.", "", ...lines);
  const cases = [
    [body("    const a = 1;", "", "    const b = 2;", "Text."), [code(5)]],
    [body("\tconst a = 1;"), [code(5)]],
    [body("```ts", "x", "```", "    const a = 1;"), [code(8)]],
    [body("- Item:", "", "      const a = 1;"), [code(7)]],
    [body("-     const a = 1;"), [code(5)]],
    [body("-", "      const a = 1;"), [code(6)]],
    [body("- Item", "", "  - Nested", "", "        const a = 1;"), [code(9)]],
    [body("> Quote:", ">", ">     const a = 1;"), [code(7)]],
    [body("- Item", "", "Text.", "", "      const a = 1;"), [code(9)]],
    [body("* * *", "", "    const a = 1;"), [code(7)]],
    [body("Text", "2. doesn't start a list here", "", "      const a = 1;"), [code(8)]],
    [body("    ```ts", "    x", "    ```"), [fence(5)]],
    [body("Text", "    ```ts", "    x", "    ```"), [fence(6)]],
    [body("1. Step:", "", "       ```ts", "       x", "       ```"), [fence(7)]],
    [body("```sh", "echo hi", "    ```"), [fence(7)]],
    [body("> Quote", "    ```ts", "    x", "    ```"), [fence(6)]],
    [body("1. Step:", "", "   ```sh", "echo hi", "   ```"), [inItem(8)]],
    [body("1. Step:", "", "   ```sh", "   echo hi", "```"), [inItem(9)]],
    [body("> ```ts", "> const a = 1;", "> ```"), [inQuote(5), inQuote(7)]],
    [body("- ```ts", "  const a = 1;", "- ```"), [afterMarker(5), afterMarker(7)]],
    [body("Text that wraps", "    onto an indented line."), []],
    [body("- Item that wraps", "      onto an indented line."), []],
    [body("- Item", "", "  - Nested", "", "      More text in the nested item."), []],
    [body("10.  Ten", "", "     Still ten.", "", "     ```ts", "     x", "     ```"), []],
    [body("1. Step:", "", "   ```ts", "   x", "   ```", "", "2. Next."), []],
    [body("1. Step:", "", "   ```sh", "   echo a", "", "   echo b", "   ```"), []],
    [body("- Item", "```sh", "echo hi", "```"), []],
    [body("> Quote", "    continued lazily."), []],
    [body("| Name | Use |", "| - | - |", "| a | b |", "    | c | d |"), []],
  ];
  for (const [markdown, errors] of cases) assert.deepEqual(errorsOf(markdown), errors, JSON.stringify(markdown));
});

test("parsePage ignores Markdown syntax inside code", () => {
  const markdown = page("# Title", "", "Use `<T>`, `{ a }`, `![x](y)` and ``a ` b``.", "", "~~~sh", "import x", "<div>", "~~~");
  assert.deepEqual(errorsOf(markdown), []);
  assert.deepEqual(parsePage(markdown).links, []);
});

test("scanLines tags fenced code, including longer and tilde fences", () => {
  const { lines, errors } = scanLines("a\n````md\n```ts\n````\n~~~\nb\n~~~");
  assert.deepEqual(errors, []);
  assert.deepEqual(lines.map(line => line.kind), ["text", "open", "code", "close", "open", "code", "close"]);
  assert.deepEqual(lines[1].fence, { info: "md", language: "md", line: 2 });
});

test("escapeMdx escapes <, { and } outside code, links https autolinks and is idempotent", () => {
  const source = ["A <T> and {x} in `<T>{x}`.", "Visit <https://example.com/a?b=c>.", "Keep \\< and \\{.", "```ts", "const a = <T>{};", "```"].join("\n");
  const escaped = escapeMdx(source);
  assert.equal(
    escaped,
    ["A \\<T> and \\{x\\} in `<T>{x}`.", "Visit [https://example.com/a?b=c](https://example.com/a?b=c).", "Keep \\< and \\{.", "```ts", "const a = <T>{};", "```"].join("\n"),
  );
  assert.equal(escapeMdx(escaped), escaped);
  assert.deepEqual(errorsOf(page("# Title", "", escaped)), []);
});

test("boldHeadings turns headings outside code into bold paragraphs", () => {
  assert.equal(boldHeadings("A reply.\n\n## Fields\n\nOnly `at`."), "A reply.\n\n**Fields**\n\nOnly `at`.");
  assert.equal(boldHeadings("Text\n### `C#` usage ###\nMore"), "Text\n\n**`C#` usage**\n\nMore");
  assert.equal(boldHeadings("# Examples\n##\n#hashtag\n```md\n## code\n```"), "**Examples**\n\n#hashtag\n```md\n## code\n```");
  const docs = "First.\n\n## Examples\n\nOne.";
  const page = `# Title\n\nText.\n\n## Examples\n\n${boldHeadings(docs)}\n\n${boldHeadings(docs)}\n`;
  assert.deepEqual(parsePage(page).errors, [], "doc headings can repeat");
});

test("tableCell, codeSpan and codeBlock quote their contents", () => {
  assert.equal(tableCell("a | b \\| c"), "a \\| b \\| c");
  assert.throws(() => tableCell("a\nb"), MarkdownError);
  assert.equal(codeSpan("send()"), "`send()`");
  assert.equal(codeSpan("a`b"), "``a`b``");
  assert.equal(codeSpan("`tick"), "`` `tick ``");
  assert.throws(() => codeSpan("a\nb"), MarkdownError);
  assert.equal(codeBlock("x\n\n", "ts"), "```ts\nx\n```");
  assert.equal(codeBlock("```md\n```", "md"), "````md\n```md\n```\n````");
});

test("resolveLink resolves relative links and rejects other forms", () => {
  assert.deepEqual(resolveLink("ts/quickstarts/server.md", "../reference/server.md#a"), { path: "ts/reference/server.md", anchor: "a" });
  assert.deepEqual(resolveLink("ts/index.md", "#packages"), { path: "ts/index.md", anchor: "packages" });
  assert.deepEqual(resolveLink("ts/index.md", "reference/index.md"), { path: "ts/reference/index.md", anchor: undefined });
  assert.deepEqual(resolveLink("index.md", "https://example.com/a"), { external: true });
  assert.deepEqual(resolveLink("index.md", "mailto:docs@example.com"), { external: true });
  const errors = [
    ["http://example.com", "only https: and mailto: links are allowed: http://example.com"],
    ["javascript:alert(1)", "only https: and mailto: links are allowed: javascript:alert(1)"],
    ["", "empty link"],
    ["/ts/index.md", "use a relative link, not /ts/index.md"],
    ["a.md?x=1", "links can't have queries or backslashes: a.md?x=1"],
    ["a\\b.md", "links can't have queries or backslashes: a\\b.md"],
    ["../../README.md", "link leaves the site: ../../README.md"],
  ];
  for (const [target, error] of errors) assert.deepEqual(resolveLink("ts/index.md", target), { error }, target);
});

test("checkLinks reports missing files and anchors, and anchors on files that aren't pages", () => {
  const pages = new Map([
    ["index.md", parsePage(page("# Home", "", "See [a](a.md#intro), [b](a.md#missing), [c](gone.md), [d](data.json#x), [e](data.json) and [f](https://x.dev).", "", "## Intro"))],
    ["a.md", parsePage(page("# A", "", "Back [home](index.md#intro) or [here](#intro).", "", "## Intro"))],
  ]);
  assert.deepEqual(checkLinks(pages, ["index.md", "a.md", "data.json"]), [
    { path: "index.md", line: 3, message: "anchor doesn't exist: a.md#missing" },
    { path: "index.md", line: 3, message: "link target doesn't exist: gone.md" },
    { path: "index.md", line: 3, message: "only pages have anchors: data.json#x" },
  ]);
});

test("rebaseLinks rewrites relative links for a file in another directory", () => {
  const markdown = [
    "See [a](../reference/a.md#x), [here](#top), [web](https://x.dev) and `[code](b.md)`.",
    "```md",
    "[fenced](b.md)",
    "```",
  ].join("\n");
  assert.equal(
    rebaseLinks(markdown, "ts/quickstarts/server.md", "llms-full.txt"),
    ["See [a](ts/reference/a.md#x), [here](ts/quickstarts/server.md#top), [web](https://x.dev) and `[code](b.md)`.", "```md", "[fenced](b.md)", "```"].join("\n"),
  );
  assert.equal(rebaseLinks("[a](../reference/a.md)", "ts/quickstarts/server.md", "ts/llms-full.txt"), "[a](reference/a.md)");
});
