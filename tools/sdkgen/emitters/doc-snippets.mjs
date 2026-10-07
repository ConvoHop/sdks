import { defineEmitter, EmitterError } from "../lib/emitter.mjs";
import { byName, printTypeRef, requireType } from "../lib/ir-model.mjs";
import { formatJson } from "../lib/json.mjs";

/**
 * Per-operation reference snippets for the docs pipeline.
 *
 * Snippets are CommonMark with GFM tables and nothing else: no HTML, comments
 * or front matter, and every MDX-significant character in prose is escaped, so
 * the same files render as Markdown and as MDX. index.json lists them.
 */
export const DEFAULT_DIRECTORY = "docs/snippets/v1";
export const SNIPPETS_VERSION = 1;

const LAYERS = { client: "client SDKs", server: "server SDKs", both: "client and server SDKs" };
const ERROR_ORIGINS = [["server", "Returned by the authority"], ["both", "Returned by the authority or raised by SDKs"], ["sdk", "Raised by SDKs"]];
// What a transient (retryable) error means for an operation depends on the retry policy of its idempotency class.
const TRANSIENT_ADVICE = {
  repeat: "Transient, so repeating the request may succeed",
  sameRequest: `Transient, so a retry with the same ${code("requestId")} and input may succeed`,
  none: "Transient, but this operation is never retried; send a fresh request",
};

/** Escapes prose for Markdown and MDX. Underscores inside identifiers such as WRONG_REGION stay readable. */
export function escapeMarkdown(text) {
  return text.replace(/[\\`*{}[\]<>#~&]|(?<![A-Za-z0-9])_|_(?![A-Za-z0-9])/g, char => `\\${char}`);
}

/** Inline code that tolerates backticks in its content. */
export function code(text) {
  const longest = Math.max(0, ...(String(text).match(/`+/g) ?? []).map(run => run.length));
  const fence = "`".repeat(longest + 1);
  const pad = /^`|`$/.test(text) ? " " : "";
  return `${fence}${pad}${text}${pad}${fence}`;
}

const oneLine = text => text.replace(/\s+/g, " ").trim();
// Block markers at the start of a paragraph would otherwise turn prose into lists, quotes or headings.
const escapeBlockStart = text => text.replace(/^(\d+)([.)])/, "$1\\$2").replace(/^([-+=])/, "\\$1");

function paragraphs(text) {
  return text.split(/\n\s*\n/).map(oneLine).filter(Boolean).map(part => escapeBlockStart(escapeMarkdown(part)));
}

function table(headers, rows) {
  const row = cells => `| ${cells.map(cell => cell.replaceAll("|", "\\|")).join(" | ")} |`;
  return [row(headers), `| ${headers.map(() => "---").join(" | ")} |`, ...rows.map(row)].join("\n");
}

const list = (items, joiner = "and") => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} ${joiner} ${items.at(-1)}`);

function fenced(language, text) {
  const longest = Math.max(2, ...(text.match(/`+/g) ?? []).map(run => run.length));
  const fence = "`".repeat(longest + 1);
  return `${fence}${language}\n${text}\n${fence}`;
}

function fieldNotes(field) {
  const notes = [];
  if (field.description) notes.push(escapeMarkdown(oneLine(field.description)));
  if (field.deprecated) notes.push(`Deprecated${field.deprecated.reason ? `: ${escapeMarkdown(oneLine(field.deprecated.reason))}` : "."}`);
  return notes.join(" ");
}

function fieldTable(fields, columns) {
  const withDefault = fields.some(field => field.defaultValue !== undefined);
  const withNotes = fields.some(field => field.description || field.deprecated);
  const headers = ["Field", "Type", ...columns.map(column => column.header)];
  if (withDefault) headers.push("Default");
  if (withNotes) headers.push("Description");
  return table(headers, fields.map(field => {
    const cells = [code(field.name), code(printTypeRef(field.type)), ...columns.map(column => column.cell(field))];
    if (withDefault) cells.push(field.defaultValue === undefined ? "" : code(JSON.stringify(field.defaultValue)));
    if (withNotes) cells.push(fieldNotes(field));
    return cells;
  }));
}

function createRenderer(ir) {
  const types = byName(ir.types);
  const conditions = byName(ir.conditions);
  const idempotency = byName(ir.idempotency);
  const pagination = byName(ir.pagination);
  const channels = byName(ir.realtime.channels);
  const events = new Map(ir.realtime.events.map(event => [event.type, event]));
  const errorCodes = byName(ir.errors.codes);
  const lookup = (catalog, name, what, where) => {
    const entry = catalog.get(name);
    if (!entry) throw new EmitterError(`doc-snippets: ${where} references unknown ${what} ${JSON.stringify(name)}`);
    return entry;
  };

  function authLine(auth, where) {
    let line = code(auth.credential);
    if (auth.scopes) line += ` with ${auth.scopes.length === 1 ? "scope" : "all of the scopes"} ${list(auth.scopes.map(code))}`;
    if (auth.condition) {
      const condition = lookup(conditions, auth.condition, "condition", where);
      line += `, when ${code(auth.condition)}: ${escapeMarkdown(condition.summary)}`;
    }
    return /[.!?]$/.test(line) ? line : `${line}.`;
  }

  function facts(operation) {
    const where = operation.id;
    const layer = LAYERS[operation.layer];
    if (!layer) throw new EmitterError(`doc-snippets: ${where} has unknown layer ${JSON.stringify(operation.layer)}`);
    const lines = [
      `- **Operation:** ${code(operation.id)}, a ${operation.kind} sent as ${code(operation.operationName)}.`,
      `- **Layer:** ${operation.layer} (${layer}).`,
    ];
    if (operation.auth.length === 1) lines.push(`- **Authorization:** ${authLine(operation.auth[0], where)}`);
    else lines.push("- **Authorization** (any one of):", ...operation.auth.map(auth => `  - ${authLine(auth, where)}`));
    lines.push(`- **Idempotency:** ${code(operation.idempotency)}. ${escapeMarkdown(lookup(idempotency, operation.idempotency, "idempotency class", where).summary)}`);
    const page = operation.pagination;
    if (page.style !== "none") {
      const details = [`page ${code(page.pageType)} at ${code([operation.field, ...page.pagePath].join("."))}`, `items ${code(page.itemType)}`];
      if (page.limitField) details.push(`page size ${code(`input.${page.limitField}`)}`);
      if (page.cursorField) details.push(`cursor ${code(`input.${page.cursorField}`)}`);
      lines.push(`- **Pagination:** ${code(page.style)}. ${escapeMarkdown(lookup(pagination, page.style, "pagination style", where).summary)} Uses ${list(details)}.`);
    }
    if (operation.realtime.mode === "subscription") {
      const channel = lookup(channels, operation.realtime.channel, "realtime channel", where);
      lines.push(`- **Realtime:** subscription on the ${code(channel.name)} channel. ${escapeMarkdown(channel.summary)}`);
    }
    if (operation.realtime.emits) {
      lines.push("- **Emits:**", ...operation.realtime.emits.map(type => `  - ${code(type)}: ${escapeMarkdown(lookup(events, type, "event", where).summary)}`));
    }
    if (operation.longRunning) {
      const { poll, refField } = operation.longRunning;
      lines.push(`- **Long-running:** poll ${code(poll)} with ${code("input.operationId")} set to ${code(`${operation.field}.${refField}.operationId`)} from the result until the work completes.`);
    }
    return lines.join("\n");
  }

  function errorList(operation) {
    const where = operation.id;
    const definitions = operation.errors.codes.map(name => lookup(errorCodes, name, "error code", where));
    const names = predicate => definitions.filter(predicate).map(definition => code(definition.name)).join(", ");
    const lines = [];
    for (const [origin, label] of ERROR_ORIGINS) {
      const group = names(definition => definition.origin === origin);
      if (group) lines.push(`- ${label}: ${group}.`);
    }
    const retryable = names(definition => definition.retryable);
    if (retryable) {
      const { retry } = lookup(idempotency, operation.idempotency, "idempotency class", where);
      if (!Object.hasOwn(TRANSIENT_ADVICE, retry)) throw new EmitterError(`doc-snippets: ${where} has unknown retry policy ${JSON.stringify(retry)}`);
      lines.push(`- ${TRANSIENT_ADVICE[retry]}: ${retryable}.`);
    }
    if (operation.errors.sets.length) lines.push(`- Error sets: ${operation.errors.sets.map(code).join(", ")}.`);
    return lines.join("\n");
  }

  function sections(operation) {
    const where = operation.id;
    const blocks = [];
    const contextType = requireType(types, operation.context.type, where);
    const uses = new Map(operation.context.fields.map(field => [field.name, field.use]));
    blocks.push(`**Context** (${code(`${operation.context.argument}: ${printTypeRef(operation.arguments.find(arg => arg.role === "context").type)}`)})`);
    blocks.push(fieldTable(contextType.fields, [{ header: "Use", cell: field => lookup(uses, field.name, "context field use for", where) }]));
    if (operation.input) {
      const inputArgument = operation.arguments.find(arg => arg.role === "input");
      blocks.push(`**Input** (${code(`${operation.input.argument}: ${printTypeRef(inputArgument.type)}`)})`);
      blocks.push(fieldTable(requireType(types, operation.input.type, where).fields, []));
    }
    const resultRef = operation.result.type;
    blocks.push(`**Result** (${code(printTypeRef(resultRef))})`);
    const named = resultRef.kind === "list" ? null : requireType(types, resultRef.name, where);
    if (named?.kind === "object") blocks.push(fieldTable(named.fields, []));
    blocks.push("**Errors**", errorList(operation));
    blocks.push("**GraphQL**", fenced("graphql", operation.document.text));
    return blocks;
  }

  return function render(operation) {
    const blocks = [`## ${code(operation.field)}`, ...paragraphs(operation.summary)];
    if (operation.description) blocks.push(...paragraphs(operation.description));
    if (operation.deprecated) blocks.push(`**Deprecated.**${operation.deprecated.reason ? ` ${escapeMarkdown(oneLine(operation.deprecated.reason))}` : ""}`);
    blocks.push(facts(operation), ...sections(operation));
    return `${blocks.join("\n\n")}\n`;
  };
}

const README = `# Operation reference snippets

Generated from ${code("schema/v1-ir.json")} by the ${code("doc-snippets")} emitter in ${code("tools/sdkgen")}. Do not edit these files. Change the GraphQL schema or ${code("schema/v1-annotations.json")}, then run ${code("npm run generate:graphql")}.

- ${code("index.json")} lists every operation with the path of its snippet, relative to this directory.
- ${code("<plane>/<field>.md")} documents one operation: summary, layer, authorization, idempotency, pagination, realtime behavior, context, input, result, errors and the GraphQL document.

Snippets use CommonMark with GFM tables only. They contain no HTML, comments or front matter, and prose escapes MDX-significant characters, so they render both as Markdown and as MDX. Each snippet starts with a level-2 heading; shift heading levels when you embed it.
`;

export default defineEmitter({
  name: "doc-snippets",
  description: "Framework-neutral Markdown reference snippets per operation, with a JSON index",
  owns: [DEFAULT_DIRECTORY],
  emit(ir) {
    const render = createRenderer(ir);
    const entries = ir.operations.map(operation => ({
      id: operation.id,
      plane: operation.plane,
      kind: operation.kind,
      field: operation.field,
      operationName: operation.operationName,
      summary: operation.summary,
      layer: operation.layer,
      ...(operation.deprecated ? { deprecated: true } : {}),
      path: `${operation.plane}/${operation.field}.md`,
    }));
    const index = { snippetsVersion: SNIPPETS_VERSION, irVersion: ir.irVersion, source: "schema/v1-ir.json", operations: entries };
    return [
      { path: `${DEFAULT_DIRECTORY}/README.md`, contents: README },
      { path: `${DEFAULT_DIRECTORY}/index.json`, contents: formatJson(index) },
      ...ir.operations.map((operation, i) => ({ path: `${DEFAULT_DIRECTORY}/${entries[i].path}`, contents: render(operation) })),
    ];
  },
});
