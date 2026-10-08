/**
 * The Markdown subset that docgen writes and accepts: CommonMark with GFM
 * tables, written so it renders the same as Markdown and as MDX.
 *
 * - Every page has exactly one H1, on its first line, followed by a one-paragraph description.
 * - Headings are ATX (`## Title`) in the first column, without closing #s, and contain only text
 *   and code spans: no emphasis, strikethrough or character references, so every CommonMark parser
 *   reads the same text. Heading IDs are github-slugger slugs of that text, as rehype-slug makes
 *   them, and must be unique within a page.
 * - Fenced code blocks only, each with a language. Code spans stay on one line.
 * - Outside code, `<`, `{` and `}` are backslash-escaped. No HTML, comments, front matter,
 *   autolinks, images, reference-style links or lines starting with `import`/`export`.
 * - Links are https:, mailto: or relative paths to generated files, with optional anchors.
 */
import { posix } from "node:path";

export class MarkdownError extends Error {}

const FENCE = /^(\s*)(`{3,}|~{3,})(.*)$/;
const ASCII_PUNCTUATION = /[!-/:-@[-`{-~]/;
const HEADING = /^(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/;
const SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*:/;
const LINK = /\]\(([^()\s]*)(?:\s+"[^"]*")?\)/g;

/**
 * Splits Markdown into lines tagged as text or as part of a fenced code block.
 * Returns `{ lines: [{ number, text, kind, fence? }], errors }`, where kind is
 * text, open, code or close and `fence` is `{ info, language }`.
 */
export function scanLines(markdown) {
  const lines = [];
  const errors = [];
  let open = null;
  markdown.split("\n").forEach((text, index) => {
    const number = index + 1;
    if (open) {
      const match = FENCE.exec(text);
      if (match && match[2][0] === open.marker[0] && match[2].length >= open.marker.length && match[3].trim() === "") {
        lines.push({ number, text, kind: "close", fence: open.fence });
        open = null;
      } else {
        lines.push({ number, text, kind: "code", fence: open.fence });
      }
      return;
    }
    const match = FENCE.exec(text);
    if (match && !(match[2][0] === "`" && match[3].includes("`"))) {
      const info = match[3].trim();
      const fence = { info, language: info.split(/\s+/)[0] ?? "", line: number };
      open = { marker: match[2], fence };
      lines.push({ number, text, kind: "open", fence });
      return;
    }
    lines.push({ number, text, kind: "text" });
  });
  if (open) errors.push({ line: open.fence.line, message: "code fence isn't closed" });
  return { lines, errors };
}

/**
 * Splits one line into text and code-span segments (`{ code, text }`; code
 * segments keep their backticks). `unclosed` is set when a backtick run has
 * no matching run on the same line.
 */
export function splitCodeSpans(line) {
  const segments = [];
  let unclosed = false;
  let start = 0;
  let i = 0;
  while (i < line.length) {
    if (line[i] === "\\") {
      i += 2;
      continue;
    }
    if (line[i] !== "`") {
      i++;
      continue;
    }
    let j = i;
    while (line[j] === "`") j++;
    const run = j - i;
    let close = -1;
    for (let k = j; k < line.length; ) {
      if (line[k] !== "`") {
        k++;
        continue;
      }
      let m = k;
      while (line[m] === "`") m++;
      if (m - k === run) {
        close = k;
        break;
      }
      k = m;
    }
    if (close < 0) {
      unclosed = true;
      i = j;
      continue;
    }
    if (i > start) segments.push({ code: false, text: line.slice(start, i) });
    segments.push({ code: true, text: line.slice(i, close + run) });
    i = start = close + run;
  }
  if (start < line.length) segments.push({ code: false, text: line.slice(start) });
  return { segments, unclosed };
}

/** The line with code spans replaced by spaces of the same length, so offsets still match. */
function maskCode(line) {
  return splitCodeSpans(line).segments.map(segment => (segment.code ? " ".repeat(segment.text.length) : segment.text)).join("");
}

function escapeInline(text) {
  const linked = text.replace(/<(https:\/\/[^\s<>]+)>/g, "[$1]($1)");
  let out = "";
  for (let i = 0; i < linked.length; i++) {
    const char = linked[i];
    if (char === "\\" && i + 1 < linked.length && ASCII_PUNCTUATION.test(linked[i + 1])) {
      out += char + linked[++i];
    } else {
      out += char === "<" || char === "{" || char === "}" ? `\\${char}` : char;
    }
  }
  return out;
}

/**
 * Escapes Markdown for MDX: backslash-escapes `<`, `{` and `}` outside code
 * and turns https autolinks into links. Idempotent.
 */
export function escapeMdx(markdown) {
  return scanLines(markdown)
    .lines.map(line =>
      line.kind === "text"
        ? splitCodeSpans(line.text).segments.map(segment => (segment.code ? segment.text : escapeInline(segment.text))).join("")
        : line.text,
    )
    .join("\n");
}

/**
 * Turns ATX headings outside code into bold paragraphs. Docs embedded under
 * generated headings then can't repeat heading IDs or add to the page outline.
 */
export function boldHeadings(markdown) {
  const { lines } = scanLines(markdown);
  const out = [];
  lines.forEach((line, index) => {
    const heading = line.kind === "text" && /^ {0,3}#{1,6}(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/.exec(line.text);
    if (!heading) {
      out.push(line.text);
      return;
    }
    if (!heading[1]) return;
    if (out.length && out.at(-1).trim() !== "") out.push("");
    out.push(`**${heading[1]}**`);
    if (lines[index + 1] && lines[index + 1].text.trim() !== "") out.push("");
  });
  return out.join("\n");
}

/** Escapes text for a GFM table cell. */
export function tableCell(markdown) {
  if (markdown.includes("\n")) throw new MarkdownError(`table cells can't span lines: ${JSON.stringify(markdown)}`);
  return markdown.replace(/\\?\|/g, "\\|");
}

/** A code span that holds `text`, which may contain backticks. */
export function codeSpan(text) {
  if (text.includes("\n")) throw new MarkdownError(`code spans can't span lines: ${JSON.stringify(text)}`);
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map(run => run.length));
  const ticks = "`".repeat(longest + 1);
  const pad = text.startsWith("`") || text.endsWith("`") ? " " : "";
  return `${ticks}${pad}${text}${pad}${ticks}`;
}

/** A fenced code block, with a fence longer than any backtick run in `code`. */
export function codeBlock(code, language) {
  const longest = Math.max(0, ...(code.match(/`+/g) ?? []).map(run => run.length));
  const fence = "`".repeat(Math.max(3, longest + 1));
  return `${fence}${language}\n${code.replace(/\n+$/, "")}\n${fence}`;
}

/** Replaces backslash escapes with the characters they escape. */
function unescape(text) {
  return text.replace(/\\([!-/:-@[-`{-~])/g, "$1");
}

/** A code span's text as CommonMark reads it: one space is stripped from each end when both ends have one. */
function codeSpanText(span) {
  const ticks = /^`+/.exec(span)[0].length;
  const content = span.slice(ticks, -ticks);
  return content.startsWith(" ") && content.endsWith(" ") && /[^ ]/.test(content) ? content.slice(1, -1) : content;
}

/** Inline Markdown's text, whitespace kept: code spans unwrapped, links reduced to their text, emphasis and escapes removed. */
function inlineText(markdown) {
  const masked = maskCode(markdown);
  let delinked = "";
  let last = 0;
  for (const match of masked.matchAll(/!?\[((?:[^\]\\]|\\.)*)\]\([^()\s]*(?:\s+"[^"]*")?\)/g)) {
    const text = match.index + match[0].indexOf("[") + 1;
    delinked += markdown.slice(last, match.index) + markdown.slice(text, text + match[1].length);
    last = match.index + match[0].length;
  }
  delinked += markdown.slice(last);
  return splitCodeSpans(delinked)
    .segments.map(segment => (segment.code ? codeSpanText(segment.text) : unescape(segment.text.replace(/(\*\*|__|\*)/g, ""))))
    .join("");
}

/** Inline Markdown as plain text on one line, with whitespace runs collapsed. */
export function toPlainText(markdown) {
  return inlineText(markdown).replace(/\s+/g, " ").trim();
}

/** GitHub's heading ID for heading text (github-slugger without duplicate suffixes). */
export function slugify(text) {
  return text.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, "").replace(/ /g, "-");
}

/**
 * The heading ID of an ATX heading's inline Markdown: github-slugger over the
 * heading's text, as rehype-slug computes it. parsePage rejects headings
 * whose text a CommonMark parser could read differently.
 */
export function headingSlug(markdown) {
  return slugify(inlineText(markdown));
}

/**
 * Parses a page into `{ title, description, headings, links, errors }`, where
 * `headings` are `{ level, text, slug, line }` and `links` are `{ target, line }`.
 * Errors cover the rules in this module's header except link targets, which
 * `checkLinks` resolves once every page is known.
 */
export function parsePage(markdown) {
  const { lines, errors } = scanLines(markdown);
  const error = (line, message) => errors.push({ line, message });
  const headings = [];
  const links = [];
  const slugs = new Map();
  if (!markdown.endsWith("\n") || markdown.endsWith("\n\n")) error(lines.length, "pages end with exactly one newline");
  if (!/^# \S/.test(lines[0]?.text ?? "")) error(1, "pages start with an H1 (`# Title`)");
  let previous = "";
  for (const line of lines) {
    if (line.kind === "open" && !line.fence.language) error(line.number, "code fences need a language");
    if (line.kind !== "text") {
      previous = line.kind === "close" ? "" : previous;
      continue;
    }
    const { text, number } = line;
    const { unclosed } = splitCodeSpans(text);
    if (unclosed) error(number, "code span isn't closed on its line");
    const masked = maskCode(text);
    if (/(^|[^\\])(\\\\)*[<{}]/.test(masked)) error(number, "escape <, { and } outside code (\\<, \\{, \\})");
    if (/^(import|export)\b/.test(text)) error(number, "MDX reads lines starting with import or export as code; reword the line");
    if (/!\[/.test(masked)) error(number, "images aren't supported");
    if (/^ {0,3}\[[^\]]+\]:/.test(masked)) error(number, "use inline links, not link reference definitions");
    if (/^ {0,3}(=+|-+)\s*$/.test(text) && previous.trim() !== "" && !/^ {0,3}(-\s*){3,}$/.test(previous)) {
      error(number, "setext headings aren't supported; use `## Title`");
    }
    if (/^ {1,3}#{1,6}(?:[ \t]|$)/.test(text)) error(number, "headings start in the first column");
    const heading = HEADING.exec(text);
    if (heading) {
      const level = heading[1].length;
      const content = heading[2] ?? "";
      const maskedContent = maskCode(content);
      if (/[*[\]~]/.test(maskedContent)) error(number, "headings contain only text and code spans");
      if (/(?:^|[^\p{L}\p{N}])_|_(?:$|[^\p{L}\p{N}])/u.test(maskedContent)) {
        error(number, "underscores in headings join letters or digits; put other names in code spans");
      }
      if (/&(?:#\d+|#[xX][\dA-Fa-f]+|[A-Za-z][A-Za-z\d]*);/.test(maskedContent)) error(number, "headings can't contain character references");
      if (/(?:^|[ \t])#+$/.test(content)) error(number, "don't close headings with #");
      const slug = headingSlug(content);
      if (!slug) error(number, "heading has no ID");
      else if (slugs.has(slug)) error(number, `heading ID #${slug} repeats line ${slugs.get(slug)}`);
      else slugs.set(slug, number);
      if (level === 1 && number !== 1) error(number, "only the first line is an H1");
      headings.push({ level, text: content, slug, line: number });
    }
    for (const match of masked.matchAll(LINK)) links.push({ target: match[1], line: number });
    previous = text;
  }
  const title = toPlainText((lines[0]?.text ?? "").replace(/^#\s+/, ""));
  const description = describe(lines);
  if (!description) error(2, "follow the H1 with a one-paragraph description");
  return { title, description, headings, links, errors };
}

/** The first paragraph after the H1 as plain text, or "" when the page doesn't start with one. */
function describe(lines) {
  let i = 1;
  while (i < lines.length && lines[i].kind === "text" && lines[i].text.trim() === "") i++;
  const paragraph = [];
  for (; i < lines.length && lines[i].kind === "text" && lines[i].text.trim() !== ""; i++) {
    const text = lines[i].text;
    if (paragraph.length === 0 && /^\s*([#>|]|[-*+]\s|\d+[.)]\s)/.test(text)) return "";
    paragraph.push(text.trim());
  }
  return toPlainText(paragraph.join(" "));
}

/**
 * Resolves a relative link from `page` (a site-relative path). Returns
 * `{ path, anchor }` with `path` site-relative ("" for the same page), or
 * `{ external: true }`, or `{ error }`.
 */
export function resolveLink(page, target) {
  if (SCHEME.test(target)) {
    return /^(https|mailto):/i.test(target) ? { external: true } : { error: `only https: and mailto: links are allowed: ${target}` };
  }
  if (target === "") return { error: "empty link" };
  if (target.startsWith("/")) return { error: `use a relative link, not ${target}` };
  if (/[?\\]/.test(target)) return { error: `links can't have queries or backslashes: ${target}` };
  const hash = target.indexOf("#");
  const path = hash < 0 ? target : target.slice(0, hash);
  const anchor = hash < 0 ? undefined : target.slice(hash + 1);
  if (path === "") return { path: page, anchor };
  const resolved = posix.normalize(posix.join(posix.dirname(page), path));
  if (resolved === ".." || resolved.startsWith("../")) return { error: `link leaves the site: ${target}` };
  return { path: resolved, anchor };
}

/**
 * Checks every page's relative links. `pages` maps site-relative paths to
 * `parsePage` results; `files` is every generated site-relative path.
 * Returns `[{ path, line, message }]`.
 */
export function checkLinks(pages, files) {
  const problems = [];
  const known = new Set(files);
  for (const [path, page] of pages) {
    for (const link of page.links) {
      const resolved = resolveLink(path, link.target);
      if (resolved.external) continue;
      if (resolved.error) {
        problems.push({ path, line: link.line, message: resolved.error });
        continue;
      }
      if (!known.has(resolved.path)) {
        problems.push({ path, line: link.line, message: `link target doesn't exist: ${link.target}` });
        continue;
      }
      if (resolved.anchor === undefined) continue;
      const target = pages.get(resolved.path);
      if (!target) problems.push({ path, line: link.line, message: `only pages have anchors: ${link.target}` });
      else if (!target.headings.some(heading => heading.slug === resolved.anchor)) {
        problems.push({ path, line: link.line, message: `anchor doesn't exist: ${link.target}` });
      }
    }
  }
  return problems;
}

/** Rewrites a page's relative links so they resolve from `file` (both site-relative), for concatenated files. */
export function rebaseLinks(markdown, page, file) {
  const base = posix.dirname(file);
  return scanLines(markdown)
    .lines.map(line => {
      if (line.kind !== "text") return line.text;
      const masked = maskCode(line.text);
      let out = "";
      let last = 0;
      for (const match of masked.matchAll(LINK)) {
        const resolved = resolveLink(page, match[1]);
        if (resolved.external || resolved.error) continue;
        let target = posix.relative(base, resolved.path) || posix.basename(resolved.path);
        if (resolved.anchor !== undefined) target += `#${resolved.anchor}`;
        const start = match.index + 2;
        out += line.text.slice(last, start) + target;
        last = start + match[1].length;
      }
      return out + line.text.slice(last);
    })
    .join("\n");
}
