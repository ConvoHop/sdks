/**
 * Parser for the TypeScript declaration files (`.d.ts`) that tsc emits for the
 * SDK packages. It understands the declaration subset tsc produces and throws
 * `DtsParseError` on anything else, so a new construct fails extraction
 * instead of silently disappearing from the reference.
 *
 * `parseDeclarations(source, file)` returns
 * `{ file, doc, imports, exports, declarations }`:
 * - `imports`: `[{ local, imported, from }]`; `imported` is `"*"` for namespace imports.
 * - `exports`: `{ kind: "named", names: [{ local, exported }], from? }`,
 *   `{ kind: "star", from }` and `{ kind: "namespace", name, from, doc }`.
 * - `declarations`: `{ name, kind, exported, signature, doc, heritage, members? }`
 *   where `kind` is `class`, `interface`, `type`, `constant`, `function` or `enum`.
 * Signatures are source text: dedented, without `export`/`declare`, trailing
 * semicolons or JSDoc. Docs are `{ text, deprecated?, internal }`.
 */
export class DtsParseError extends Error {}

/** `…` marks an elided object type in collapsed signatures, which are tokenized again. */
const SINGLE_PUNCTUATION = new Set("{}()[]<>;,:?=|&.*@!-+~…");
const OPENERS = { "{": "}", "(": ")", "[": "]", "<": ">" };
const CLOSERS = { "}": "{", ")": "(", "]": "[", ">": "<" };
const MEMBER_MODIFIERS = new Set(["public", "private", "protected", "static", "readonly", "abstract", "declare", "override", "accessor"]);
const ID_START = /[\p{ID_Start}_$]/u;
const ID_CONTINUE = /[\p{ID_Continue}_$\u200c\u200d]/u;
const DOC_TAGS = new Set(["internal", "deprecated", "packageDocumentation", "param", "returns", "throws", "remarks", "see", "defaultValue", "default"]);

function lineOf(source, index) {
  let line = 1;
  for (let i = 0; i < index && i < source.length; i++) if (source[i] === "\n") line++;
  return line;
}

function columnOf(source, index) {
  return index - (source.lastIndexOf("\n", index - 1) + 1);
}

function skipString(source, start, fail) {
  const quote = source[start];
  let i = start + 1;
  while (i < source.length) {
    const ch = source[i];
    if (ch === "\\") i += 2;
    else if (ch === quote) return i + 1;
    else if (ch === "\n") break;
    else i++;
  }
  return fail("unterminated string literal", start);
}

/** Skips a template literal type, including `${...}` placeholders that may nest strings and templates. */
function skipTemplate(source, start, fail) {
  let i = start + 1;
  while (i < source.length) {
    const ch = source[i];
    if (ch === "\\") i += 2;
    else if (ch === "`") return i + 1;
    else if (ch === "$" && source[i + 1] === "{") i = skipPlaceholder(source, i + 2, fail);
    else i++;
  }
  return fail("unterminated template literal", start);
}

function skipPlaceholder(source, start, fail) {
  let depth = 1;
  let i = start;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '"' || ch === "'") i = skipString(source, i, fail);
    else if (ch === "`") i = skipTemplate(source, i, fail);
    else if (ch === "{") { depth++; i++; } else if (ch === "}") {
      depth--;
      i++;
      if (depth === 0) return i;
    } else i++;
  }
  return fail("unterminated template placeholder", start);
}

function decodeString(raw) {
  return raw.slice(1, -1).replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/gs, (_, escape) => {
    if (escape[0] === "u") return String.fromCodePoint(parseInt(escape.replace(/[u{}]/g, ""), 16));
    if (escape[0] === "x") return String.fromCharCode(parseInt(escape.slice(1), 16));
    return { n: "\n", t: "\t", r: "\r", b: "\b", f: "\f", v: "\v", 0: "\0" }[escape] ?? escape;
  });
}

/** Tokens: `{ type: "word" | "string" | "template" | "number" | "punct" | "doc", value, start, end }`. */
export function tokenize(source, file = "<source>") {
  const fail = (message, at) => {
    throw new DtsParseError(`${file}:${lineOf(source, at)}: ${message}`);
  };
  const tokens = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    const start = i;
    if (/\s/.test(ch)) {
      i++;
    } else if (source.startsWith("/**", i) && !source.startsWith("/**/", i)) {
      const end = source.indexOf("*/", i + 3);
      if (end < 0) fail("unterminated comment", i);
      i = end + 2;
      tokens.push({ type: "doc", value: source.slice(start, i), start, end: i });
    } else if (source.startsWith("/*", i)) {
      const end = source.indexOf("*/", i + 2);
      if (end < 0) fail("unterminated comment", i);
      i = end + 2;
    } else if (source.startsWith("//", i)) {
      const end = source.indexOf("\n", i);
      i = end < 0 ? source.length : end;
    } else if (ch === '"' || ch === "'") {
      i = skipString(source, i, fail);
      tokens.push({ type: "string", value: decodeString(source.slice(start, i)), start, end: i });
    } else if (ch === "`") {
      i = skipTemplate(source, i, fail);
      tokens.push({ type: "template", value: source.slice(start, i), start, end: i });
    } else if (ID_START.test(ch) || (ch === "#" && ID_START.test(source[i + 1] ?? ""))) {
      i++;
      while (i < source.length && ID_CONTINUE.test(source[i])) i++;
      tokens.push({ type: "word", value: source.slice(start, i), start, end: i });
    } else if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(source[i + 1] ?? ""))) {
      i++;
      while (i < source.length && /[0-9A-Za-z_.]/.test(source[i])) i++;
      tokens.push({ type: "number", value: source.slice(start, i), start, end: i });
    } else if (source.startsWith("=>", i) || source.startsWith("...", i)) {
      i += source[i] === "=" ? 2 : 3;
      tokens.push({ type: "punct", value: source.slice(start, i), start, end: i });
    } else if (SINGLE_PUNCTUATION.has(ch)) {
      i++;
      tokens.push({ type: "punct", value: ch, start, end: i });
    } else {
      fail(`unexpected character ${JSON.stringify(ch)}`, i);
    }
  }
  const stack = [];
  tokens.forEach((token, index) => {
    if (token.type !== "punct") return;
    if (token.value in OPENERS) {
      stack.push(index);
    } else if (token.value in CLOSERS) {
      const open = stack.pop();
      if (open === undefined || tokens[open].value !== CLOSERS[token.value]) fail(`unbalanced ${JSON.stringify(token.value)}`, token.start);
      tokens[open].match = index;
      token.match = open;
    }
  });
  if (stack.length) fail(`unclosed ${JSON.stringify(tokens[stack.at(-1)].value)}`, tokens[stack.at(-1)].start);
  return tokens;
}

/** Removes `column` leading spaces from every line after the first, and trims the result. */
export function dedent(text, column) {
  return text.split("\n").map((line, index) => {
    if (index === 0) return line;
    const indent = line.match(/^ */)[0].length;
    return line.slice(Math.min(indent, column));
  }).join("\n").replace(/\s+$/, "");
}

function convertLinks(text) {
  return text.replace(/\{@link(?:code|plain)?\s+([^}\s|]+)(?:\s*\|\s*|\s+)?([^}]*)\}/g, (_, target, label) => {
    const shown = label.trim();
    if (/^https?:\/\//.test(target)) return `[${shown || target}](${target})`;
    return `\`${shown || target}\``;
  });
}

/** Parses one JSDoc comment into `{ text, deprecated?, internal }`; `text` is Markdown. */
export function parseDoc(raw, where = "<doc>") {
  const lines = raw.slice(3, -2).split("\n").map(line => line.replace(/^\s*\*(?: |(?=\S)|$)/, "").replace(/\s+$/, ""));
  const description = [];
  const tags = [];
  for (const line of lines) {
    const tag = /^\s*@([A-Za-z]+)(?:\s+(.*))?$/.exec(line);
    if (tag) tags.push({ tag: tag[1], lines: [tag[2] ?? ""] });
    else if (tags.length) tags.at(-1).lines.push(line);
    else description.push(line);
  }
  const block = text => convertLinks(text.join("\n").replace(/^\s*\n|\n\s*$/g, "").trim());
  const result = { text: block(description), internal: false };
  const extra = [];
  const parameters = [];
  for (const { tag, lines: tagLines } of tags) {
    if (!DOC_TAGS.has(tag)) {
      throw new DtsParseError(`${where}: unsupported JSDoc tag @${tag}; document it in prose, or put example code in a tested quickstart snippet`);
    }
    const body = block(tagLines);
    if (tag === "internal") result.internal = true;
    else if (tag === "deprecated") result.deprecated = body || true;
    else if (tag === "param") {
      const match = /^(?:\{[^}]*\}\s*)?(\[?[\w.$]+(?:=[^\]]*)?\]?)\s*(?:-\s*)?([\s\S]*)$/.exec(body);
      if (match) parameters.push(`- \`${match[1].replace(/^\[|\]$/g, "").replace(/=.*$/, "")}\`${match[2] ? `: ${match[2]}` : ""}`);
    } else if (tag === "returns") extra.push(`Returns: ${body}`);
    else if (tag === "throws") extra.push(`Throws: ${body}`);
    else if (tag === "remarks") extra.push(body);
    else if (tag === "see") extra.push(`See ${body}`);
    else if (tag === "defaultValue" || tag === "default") extra.push(`Default: ${body}`);
  }
  if (parameters.length) extra.unshift(`Parameters:\n\n${parameters.join("\n")}`);
  result.text = [result.text, ...extra].filter(Boolean).join("\n\n");
  return result;
}

const EMPTY_DOC = Object.freeze({ text: "", internal: false });

class Parser {
  constructor(source, file) {
    this.source = source;
    this.file = file;
    this.tokens = tokenize(source, file);
  }

  fail(message, index = this.index) {
    const token = this.tokens[Math.min(index, this.tokens.length - 1)];
    throw new DtsParseError(`${this.file}:${token ? lineOf(this.source, token.start) : 1}: ${message}`);
  }

  is(index, value) {
    const token = this.tokens[index];
    return token !== undefined && (token.type === "punct" || token.type === "word") && token.value === value;
  }

  word(index) {
    const token = this.tokens[index];
    return token?.type === "word" ? token.value : undefined;
  }

  expect(index, value) {
    if (!this.is(index, value)) this.fail(`expected ${JSON.stringify(value)}, found ${JSON.stringify(this.tokens[index]?.value ?? "end of file")}`, index);
    return index + 1;
  }

  /** Index of the first `terminator` at bracket depth 0 from `index`, or `limit`. */
  findAtDepth(index, terminators, limit = this.tokens.length) {
    let i = index;
    while (i < limit) {
      const token = this.tokens[i];
      if (token.type === "punct" && terminators.includes(token.value)) return i;
      i = token.type === "punct" && token.value in OPENERS ? token.match + 1 : i + 1;
    }
    return limit;
  }

  text(first, last) {
    return this.source.slice(this.tokens[first].start, this.tokens[last].end);
  }

  doc(token, where) {
    return token ? parseDoc(token.value, `${this.file}:${lineOf(this.source, token.start)}${where ? ` (${where})` : ""}`) : EMPTY_DOC;
  }

  parse() {
    const module = { file: this.file, doc: EMPTY_DOC, imports: [], exports: [], declarations: [] };
    let pendingDoc = null;
    this.index = 0;
    while (this.index < this.tokens.length) {
      const token = this.tokens[this.index];
      if (token.type === "doc") {
        pendingDoc = token;
        this.index++;
        continue;
      }
      if (this.is(this.index, ";")) {
        this.index++;
        continue;
      }
      const doc = this.doc(pendingDoc);
      if (pendingDoc && module.imports.length + module.exports.length + module.declarations.length === 0 && /@packageDocumentation\b/.test(pendingDoc.value)) {
        module.doc = doc;
      }
      pendingDoc = null;
      this.statement(module, doc);
    }
    return module;
  }

  statement(module, doc) {
    const start = this.index;
    let i = start;
    if (this.is(i, "import")) return this.importStatement(module);
    let exported = false;
    if (this.is(i, "export")) {
      exported = true;
      i++;
      const typeOnly = this.is(i, "type") && (this.is(i + 1, "{") || this.is(i + 1, "*"));
      const at = typeOnly ? i + 1 : i;
      if (this.is(at, "{")) return this.namedExport(module, at);
      if (this.is(at, "*")) return this.starExport(module, at, doc);
      if (["default", "=", "as", "import"].includes(this.word(i) ?? this.tokens[i]?.value)) this.fail(`unsupported export form "export ${this.tokens[i].value}"`, i);
    }
    if (this.is(i, "declare")) i++;
    let abstract = false;
    if (this.is(i, "abstract")) {
      abstract = true;
      i++;
    }
    const keyword = this.word(i);
    const declaration = (() => {
      switch (keyword) {
        case "class":
        case "interface": return this.classLike(start, i, keyword, abstract);
        case "type": return this.typeAlias(start, i);
        case "const":
          if (this.is(i + 1, "enum")) return this.enumDeclaration(start, i + 1);
          return this.variable(start, i);
        case "let":
        case "var": return this.variable(start, i);
        case "function": return this.functionDeclaration(start, i);
        case "enum": return this.enumDeclaration(start, i);
        default: return this.fail(`unsupported statement starting with ${JSON.stringify(this.tokens[i]?.value ?? "end of file")}`, i);
      }
    })();
    if (doc.internal) return;
    module.declarations.push({ ...declaration, exported, doc });
  }

  importStatement(module) {
    const start = this.index;
    const end = this.findAtDepth(start, [";"]);
    let i = start + 1;
    const from = this.tokens[end - 1];
    if (from?.type !== "string" || !this.is(end - 2, "from")) {
      if (this.tokens[i]?.type === "string") {
        this.index = end + 1;
        return;
      }
      this.fail("unsupported import form", start);
    }
    if (this.is(i, "type") && !this.is(i + 1, "from") && !this.is(i + 1, ",")) i++;
    while (i < end - 2) {
      if (this.is(i, ",")) {
        i++;
      } else if (this.is(i, "{")) {
        for (const spec of this.specifiers(i)) module.imports.push({ local: spec.local, imported: spec.exported, from: from.value });
        i = this.tokens[i].match + 1;
      } else if (this.is(i, "*")) {
        i = this.expect(i + 1, "as");
        module.imports.push({ local: this.word(i), imported: "*", from: from.value });
        i++;
      } else if (this.word(i)) {
        module.imports.push({ local: this.word(i), imported: "default", from: from.value });
        i++;
      } else {
        this.fail("unsupported import form", i);
      }
    }
    this.index = end + 1;
  }

  /** Specifiers in `{ a, type b, c as d }`: `[{ local, exported }]` where `local` is the name before `as`. */
  specifiers(open) {
    const close = this.tokens[open].match;
    const result = [];
    let i = open + 1;
    while (i < close) {
      if (this.is(i, ",")) {
        i++;
        continue;
      }
      if (this.is(i, "type") && this.tokens[i + 1]?.type !== "punct" && !this.is(i + 1, "as")) i++;
      const name = this.tokens[i];
      if (name.type !== "word" && name.type !== "string") this.fail("unsupported export specifier", i);
      let exported = name.value;
      i++;
      if (this.is(i, "as")) {
        exported = this.tokens[i + 1].value;
        i += 2;
      }
      result.push({ local: name.value, exported });
    }
    return result;
  }

  namedExport(module, open) {
    const close = this.tokens[open].match;
    const names = this.specifiers(open);
    let i = close + 1;
    let from;
    if (this.is(i, "from")) {
      from = this.tokens[i + 1]?.type === "string" ? this.tokens[i + 1].value : this.fail("expected module specifier", i + 1);
      i += 2;
    }
    if (names.length) module.exports.push(from === undefined ? { kind: "named", names } : { kind: "named", names, from });
    this.index = this.is(i, ";") ? i + 1 : i;
  }

  starExport(module, star, doc) {
    let i = star + 1;
    let name;
    if (this.is(i, "as")) {
      name = this.word(i + 1) ?? this.fail("expected namespace name", i + 1);
      i += 2;
    }
    i = this.expect(i, "from");
    const from = this.tokens[i]?.type === "string" ? this.tokens[i].value : this.fail("expected module specifier", i);
    module.exports.push(name ? { kind: "namespace", name, from, doc } : { kind: "star", from });
    i++;
    this.index = this.is(i, ";") ? i + 1 : i;
  }

  /** Index just past an optional `<...>` type-parameter list at `index`. */
  afterTypeParameters(index) {
    return this.is(index, "<") ? this.tokens[index].match + 1 : index;
  }

  heritageList(from, limit) {
    const result = [];
    let i = from;
    while (i < limit) {
      const end = this.findAtDepth(i, [","], limit);
      const text = this.text(i, end - 1).replace(/\s+/g, " ");
      const base = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*/.exec(text)?.[0];
      result.push({ text, name: base });
      i = end + 1;
    }
    return result;
  }

  classLike(start, keywordIndex, keyword, abstract) {
    const name = this.word(keywordIndex + 1) ?? this.fail(`expected ${keyword} name`, keywordIndex + 1);
    let i = this.afterTypeParameters(keywordIndex + 2);
    const open = this.findAtDepth(i, ["{"]);
    if (open >= this.tokens.length) this.fail(`expected ${keyword} body`, i);
    const heritage = { extends: [], implements: [] };
    while (i < open) {
      const clause = this.word(i);
      if (clause !== "extends" && clause !== "implements") this.fail(`unexpected ${JSON.stringify(this.tokens[i].value)} in ${keyword} heading`, i);
      const next = this.findAtDepth(i + 1, ["{"], open);
      let end = i + 1;
      while (end < next && !(this.word(end) === "implements" && clause === "extends")) {
        end = this.is(end, "<") || this.is(end, "(") || this.is(end, "[") ? this.tokens[end].match + 1 : end + 1;
      }
      heritage[clause].push(...this.heritageList(i + 1, end));
      i = end;
    }
    const column = columnOf(this.source, this.tokens[start].start);
    const signature = dedent(this.source.slice(this.tokens[abstract ? keywordIndex - 1 : keywordIndex].start, this.tokens[open].start), column);
    const members = this.members(open, keyword);
    this.index = this.tokens[open].match + 1;
    return { name, kind: keyword, signature, heritage, members };
  }

  /** Text between `from` and the next `;` at depth 0, which becomes `this.index`. */
  untilSemicolon(start, from) {
    const end = this.findAtDepth(from, [";"]);
    if (end >= this.tokens.length) this.fail("expected \";\"", from);
    this.index = end + 1;
    return { end, signature: dedent(this.text(from, end - 1), columnOf(this.source, this.tokens[start].start)) };
  }

  /** Members of `{...}` when `[first, last]` is exactly one object type, optionally wrapped in `Readonly<...>`. */
  objectMembers(first, last, where) {
    let open = first;
    if (this.word(first) === "Readonly" && this.is(first + 1, "<") && this.tokens[first + 1].match === last) open = first + 2;
    if (!this.is(open, "{") || this.tokens[open].match !== (open === first ? last : last - 1)) return undefined;
    return { open, members: this.members(open, where) };
  }

  /** Replaces the object body that `objectMembers` expanded with `{ … }`. */
  collapsedAround(text, firstToken, open, column) {
    const close = this.tokens[open].match;
    const before = this.source.slice(this.tokens[firstToken].start, this.tokens[open].start);
    const after = this.source.slice(this.tokens[close].end, this.tokens[firstToken].start + text.length);
    return dedent(`${before}{ … }${after}`, column);
  }

  typeAlias(start, keywordIndex) {
    const name = this.word(keywordIndex + 1) ?? this.fail("expected type name", keywordIndex + 1);
    const equals = this.afterTypeParameters(keywordIndex + 2);
    this.expect(equals, "=");
    const end = this.findAtDepth(equals + 1, [";"]);
    const object = end > equals + 1 ? this.objectMembers(equals + 1, end - 1, "type") : undefined;
    const { signature } = this.untilSemicolon(start, keywordIndex);
    if (!object) return { name, kind: "type", signature };
    const column = columnOf(this.source, this.tokens[start].start);
    return { name, kind: "type", signature: this.collapsedAround(this.text(keywordIndex, end - 1), keywordIndex, object.open, column), members: object.members };
  }

  variable(start, keywordIndex) {
    const name = this.word(keywordIndex + 1) ?? this.fail("expected variable name", keywordIndex + 1);
    const end = this.findAtDepth(keywordIndex + 2, [";"]);
    const object = this.is(keywordIndex + 2, ":") && end > keywordIndex + 3 ? this.objectMembers(keywordIndex + 3, end - 1, "constant") : undefined;
    const { signature } = this.untilSemicolon(start, keywordIndex);
    if (!object) return { name, kind: "constant", signature };
    const column = columnOf(this.source, this.tokens[start].start);
    return { name, kind: "constant", signature: this.collapsedAround(this.text(keywordIndex, end - 1), keywordIndex, object.open, column), members: object.members };
  }

  functionDeclaration(start, keywordIndex) {
    const name = this.word(keywordIndex + 1) ?? this.fail("expected function name", keywordIndex + 1);
    const { signature } = this.untilSemicolon(start, keywordIndex);
    return { name, kind: "function", signature };
  }

  enumDeclaration(start, keywordIndex) {
    const name = this.word(keywordIndex + 1) ?? this.fail("expected enum name", keywordIndex + 1);
    const open = this.expect(keywordIndex + 2, "{") - 1;
    const column = columnOf(this.source, this.tokens[start].start);
    const signature = dedent(this.source.slice(this.tokens[this.is(keywordIndex - 1, "const") ? keywordIndex - 1 : keywordIndex].start, this.tokens[open].start), column);
    const members = this.members(open, "enum");
    this.index = this.tokens[open].match + 1;
    return { name, kind: "enum", signature, heritage: { extends: [], implements: [] }, members };
  }

  /** Members of the body that opens at token `open`. */
  members(open, where) {
    const close = this.tokens[open].match;
    const members = [];
    let i = open + 1;
    let pendingDoc = null;
    while (i < close) {
      const token = this.tokens[i];
      if (token.type === "doc") {
        pendingDoc = token;
        i++;
        continue;
      }
      if (this.is(i, ";") || this.is(i, ",")) {
        i++;
        continue;
      }
      const end = this.findAtDepth(i, where === "enum" ? [","] : [";", ","], close);
      const member = where === "enum" ? this.enumMember(i, end, pendingDoc) : this.member(i, end, pendingDoc);
      if (member) members.push(member);
      pendingDoc = null;
      i = end;
    }
    return mergeMembers(members);
  }

  enumMember(first, end, docToken) {
    const doc = this.doc(docToken);
    if (doc.internal) return null;
    const token = this.tokens[first];
    if (token.type !== "word" && token.type !== "string") this.fail("unsupported enum member", first);
    const signature = dedent(this.text(first, end - 1), columnOf(this.source, token.start));
    return { name: token.value, kind: "case", signatures: [signature], doc };
  }

  /** Whether the token at `index` can start a member name, which makes the word before it a modifier. */
  startsName(index, end) {
    if (index >= end) return false;
    const token = this.tokens[index];
    return token.type === "word" || token.type === "string" || token.type === "number" || this.is(index, "[");
  }

  member(first, end, docToken) {
    const doc = this.doc(docToken);
    if (doc.internal) return null;
    let i = first;
    const modifiers = new Set();
    while (i < end && MEMBER_MODIFIERS.has(this.word(i)) && this.startsName(i + 1, end)) modifiers.add(this.tokens[i++].value);
    if (modifiers.has("private") || modifiers.has("protected")) return null;
    let accessor;
    if ((this.word(i) === "get" || this.word(i) === "set") && this.startsName(i + 1, end)) accessor = this.tokens[i++].value;
    const token = this.tokens[i];
    let name;
    let kind;
    if (token.type === "word" && token.value.startsWith("#")) return null;
    if (token.type === "word" && token.value === "constructor" && this.is(i + 1, "(")) {
      name = "constructor";
      kind = "constructor";
      i++;
    } else if (token.type === "word" && token.value === "new" && (this.is(i + 1, "(") || this.is(i + 1, "<"))) {
      name = "new";
      kind = "constructor";
      i++;
    } else if (this.is(i, "(") || this.is(i, "<")) {
      name = "()";
      kind = "call";
    } else if (this.is(i, "[")) {
      const close = token.match;
      name = this.text(i, close).replace(/\s+/g, " ");
      if (this.word(i + 1) && this.is(i + 2, ":")) kind = "index";
      i = close + 1;
    } else if (token.type === "word" || token.type === "string" || token.type === "number") {
      name = token.value;
      i++;
    } else {
      this.fail(`unsupported member starting with ${JSON.stringify(token.value)}`, i);
    }
    if (this.is(i, "?") || this.is(i, "!")) i++;
    if (!kind) {
      if (this.is(i, "(") || this.is(i, "<")) kind = accessor ? "property" : "method";
      else if (this.is(i, ":") || i === end) kind = "property";
      else this.fail(`unsupported member ${JSON.stringify(name)}`, i);
    }
    const column = columnOf(this.source, this.tokens[first].start);
    const text = this.text(first, end - 1);
    const member = { name, kind, signatures: [dedent(text, column)], doc };
    if (modifiers.has("static")) member.static = true;
    if (kind === "property" && !accessor && this.is(i, ":") && end > i + 1) {
      const object = this.objectMembers(i + 1, end - 1, "type");
      if (object) {
        member.signatures = [this.collapsedAround(text, first, object.open, column)];
        member.members = object.members;
      }
    }
    return member;
  }
}

/** Merges overloads and get/set pairs that share a name and static-ness. */
function mergeMembers(members) {
  const merged = new Map();
  for (const member of members) {
    const key = `${member.static ? "static " : ""}${member.name}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...member, signatures: [...member.signatures] });
      continue;
    }
    existing.signatures.push(...member.signatures);
    if (member.kind === "method") existing.kind = "method";
    if (!existing.doc.text && member.doc.text) existing.doc = member.doc;
    if (member.doc.deprecated && !existing.doc.deprecated) existing.doc = { ...existing.doc, deprecated: member.doc.deprecated };
    if (member.members && !existing.members) existing.members = member.members;
  }
  return [...merged.values()];
}

export function parseDeclarations(source, file = "<source>") {
  return new Parser(source, file).parse();
}
