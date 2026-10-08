import {
  getNamedType, isInputObjectType, isListType, isNonNullType, isObjectType, isScalarType, isSpecifiedScalarType,
} from "graphql";
import { createValidator, formatValidationErrors } from "./json-schema.mjs";
import { canonicalJson, formatJson, isPlainObject, own } from "./json.mjs";
import { planeOrder, schemaOperations } from "./sources.mjs";

export const ANNOTATION_DOCS = "CONTRIBUTING.md#annotating-operations";
const PLACEHOLDER = /^<.*>$/s;

export function pointer(...tokens) {
  return "/" + tokens.map(token => String(token).replace(/~/g, "~0").replace(/\//g, "~1")).join("/");
}

export function ruleApplies(rule, operationId) {
  if (rule.only) return rule.only.includes(operationId);
  if (rule.except) return !rule.except.includes(operationId);
  return true;
}

/**
 * Effective use of every request-context field for one operation, in schema
 * order: schema nullability first, then the plane rules in order. A field that
 * carries the only accepted credential (a delivery permit) becomes required.
 */
export function contextFieldUses({ plane, contextType, operationId, auth, credentials }) {
  const carriers = auth.map(entry => own(credentials, entry.credential)).filter(credential => credential?.carrier === "context");
  const soleCarrier = carriers.length === auth.length && new Set(carriers.map(credential => credential.contextField)).size === 1
    ? carriers[0].contextField : undefined;
  return Object.values(contextType.getFields()).map(field => {
    let use = isNonNullType(field.type) ? "required" : "optional";
    for (const rule of plane.context.rules) {
      if (rule.fields.includes(field.name) && ruleApplies(rule, operationId)) use = rule.use;
    }
    if (use === "optional" && field.name === soleCarrier) use = "required";
    return { name: field.name, use };
  });
}

export function inputArgument(operation) {
  return operation.field.args.find(arg => arg.name === "input");
}

export function inputTypeOf(operation) {
  const arg = inputArgument(operation);
  const type = arg ? getNamedType(arg.type) : undefined;
  return isInputObjectType(type) ? type : undefined;
}

/** Follows `pagePath` from the operation's result type. Returns `{ type }` or `{ error }`. */
export function resolvePagePath(operation, pagePath) {
  let type = getNamedType(operation.field.type);
  for (const segment of pagePath) {
    const field = isObjectType(type) ? type.getFields()[segment] : undefined;
    if (!field) return { error: `${type.name} has no field "${segment}"` };
    type = getNamedType(field.type);
  }
  if (!isObjectType(type)) return { error: `${type.name} is not an object type` };
  return { type };
}

/** The operation's documented codes: referenced sets plus explicit codes, sorted. */
export function expandedErrorCodes(annotations, operationAnnotation) {
  const codes = new Set(operationAnnotation.errors.codes);
  for (const name of operationAnnotation.errors.sets) for (const code of own(annotations.errorSets, name)?.codes ?? []) codes.add(code);
  return [...codes].sort();
}

/**
 * Validates the annotations against their JSON Schema, the GraphQL planes and
 * themselves. Returns a structured result; see formatAnnotationReport.
 */
export function checkAnnotations(sources) {
  const { annotations } = sources;
  const schemaErrors = createValidator(sources.annotationsSchema, { label: "annotations.schema.json" })(annotations);
  const operations = schemaOperations(sources.planes, planeOrder(sources.planes, annotations));
  const index = new Map(operations.map(operation => [operation.id, operation]));
  const annotated = isPlainObject(annotations?.operations) ? annotations.operations : {};
  const missingOperations = operations.filter(operation => !Object.hasOwn(annotated, operation.id));
  const unknown = Object.keys(annotated).filter(id => !index.has(id)).map(id => describeUnknown(id, sources.planes, missingOperations));
  const problems = [];
  const firstById = new Map();
  for (const operation of operations) {
    const first = firstById.get(operation.id);
    if (!first) firstById.set(operation.id, operation);
    else {
      problems.push({
        path: operation.schemaPath,
        message: `${operation.kind} field "${operation.field.name}" and ${first.kind} field "${first.field.name}" both map to operation id "${operation.id}"; root field names must be unique within a plane`,
      });
    }
  }
  if (schemaErrors.length === 0) {
    checkSemantics({ annotations, planes: sources.planes, operations, index, report: (path, message) => problems.push({ path, message }) });
  }
  const missing = missingOperations.map(operation => ({
    id: operation.id, plane: operation.plane, kind: operation.kind, schemaPath: operation.schemaPath, stub: starterEntry(operation, annotations),
  }));
  return {
    ok: schemaErrors.length + missing.length + unknown.length + problems.length === 0,
    annotationsPath: sources.annotationsPath,
    planeCount: sources.planes.length,
    operationCount: operations.length,
    schemaErrors,
    missing,
    unknown,
    problems,
  };
}

export function formatAnnotationReport(result) {
  if (result.ok) {
    return `Annotations OK: ${result.operationCount} operations across ${result.planeCount} planes are annotated in ${result.annotationsPath}.`;
  }
  const counts = [
    [result.missing.length, "missing"], [result.unknown.length, "unknown"],
    [result.schemaErrors.length, "invalid"], [result.problems.length, "inconsistent"],
  ].filter(([count]) => count > 0).map(([count, label]) => `${count} ${label}`);
  const lines = [`Annotation check failed for ${result.annotationsPath}: ${counts.join(", ")}.`];
  const width = Math.max(0, ...result.missing.map(item => item.id.length), ...result.unknown.map(item => item.id.length));
  if (result.missing.length) {
    lines.push("", `MISSING: ${result.missing.length} schema operation(s) have no entry under "operations":`);
    for (const item of result.missing) lines.push(`  ${item.id.padEnd(width)}  ${item.kind.padEnd(12)}  ${item.schemaPath}`);
  }
  if (result.unknown.length) {
    lines.push("", `UNKNOWN: ${result.unknown.length} annotation(s) match no schema operation. Remove or rename them:`);
    for (const item of result.unknown) {
      lines.push(`  ${item.id.padEnd(width)}  ${item.reason}${item.suggestion ? ` (renamed to ${item.suggestion}?)` : ""}`);
    }
  }
  if (result.schemaErrors.length) {
    lines.push("", `INVALID: ${result.schemaErrors.length} violation(s) of schema/annotations.schema.json:`);
    lines.push(formatValidationErrors(result.schemaErrors));
  }
  if (result.problems.length) {
    lines.push("", `INCONSISTENT: ${result.problems.length} problem(s):`);
    for (const problem of result.problems) lines.push(`  ${problem.path}: ${problem.message}`);
  }
  if (result.missing.length) {
    lines.push("", "Starter entries for the missing operations. Paste them under \"operations\", replace every <placeholder>,",
      "check each default, then run `npm run check:annotations` again:", "");
    const entries = Object.fromEntries(result.missing.map(item => [item.id, item.stub]));
    lines.push(...formatJson(entries).trimEnd().split("\n").slice(1, -1));
  }
  lines.push("", `How to annotate operations: ${ANNOTATION_DOCS}`);
  return lines.join("\n");
}

function describeUnknown(id, planes, missing) {
  const dot = id.indexOf(".");
  const planeName = id.slice(0, dot);
  const fieldName = id.slice(dot + 1);
  const plane = planes.find(item => item.name === planeName);
  const reason = plane ? `${plane.path} has no root field "${fieldName}"` : `no schema/${planeName}.graphql plane schema exists`;
  const candidates = missing.filter(operation => operation.plane === planeName).map(operation => operation.id);
  return { id, reason, suggestion: closest(id, candidates) };
}

function closest(text, candidates) {
  let best;
  let bestDistance = Math.max(2, Math.floor(text.length / 4)) + 1;
  for (const candidate of candidates) {
    const distance = editDistance(text, candidate);
    if (distance < bestDistance) [best, bestDistance] = [candidate, distance];
  }
  return best;
}

function editDistance(a, b) {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length];
}

/** A deliberately incomplete entry: placeholders fail validation until a person decides them. */
function starterEntry(operation, annotations) {
  const credentials = isPlainObject(annotations?.credentials) ? Object.keys(annotations.credentials) : [];
  const description = operation.field.description?.trim();
  const paged = looksPaged(operation);
  return {
    summary: description && !description.includes("\n") && description.length <= 400
      ? description : "<One sentence that says what the operation does.>",
    layer: "<client|server|both>",
    auth: [{ credential: `<${credentials.join("|") || "credential"}>` }],
    idempotency: operation.kind === "mutation" ? "<idempotent|singleUse|permitBound|ephemeral>" : "safe",
    pagination: paged ? { style: "<cursor|sequence|replay|bounded>", pagePath: paged } : { style: "none" },
    realtime: operation.kind === "subscription" ? { mode: "subscription", channel: "<channel>" } : { mode: "none" },
    errors: { sets: commonErrorSets(operation, annotations), codes: [] },
  };
}

function looksPaged(operation) {
  const isPage = type => isObjectType(type) && type.getFields().items && type.getFields().complete;
  const result = getNamedType(operation.field.type);
  if (isPage(result)) return [];
  if (!isObjectType(result)) return undefined;
  const field = Object.values(result.getFields()).find(child => isPage(getNamedType(child.type)));
  return field ? [field.name] : undefined;
}

function commonErrorSets(operation, annotations) {
  const counts = new Map();
  for (const [id, entry] of Object.entries(isPlainObject(annotations?.operations) ? annotations.operations : {})) {
    if (!id.startsWith(`${operation.plane}.`) || !Array.isArray(entry?.errors?.sets)) continue;
    if (operation.kind === "mutation" ? entry.idempotency === "safe" : entry.idempotency !== "safe") continue;
    const key = JSON.stringify(entry.errors.sets);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best = "[]";
  let bestCount = 0;
  for (const [key, count] of counts) if (count > bestCount) [best, bestCount] = [key, count];
  return JSON.parse(best);
}

function checkSemantics({ annotations, planes, operations, index, report }) {
  const { credentials, scopes, conditions, errorCodes, errorSets, realtime } = annotations;
  const planeByName = new Map(planes.map(plane => [plane.name, plane]));
  const contextTypes = new Map();

  const operationRef = (path, id, { plane, kind } = {}) => {
    const operation = index.get(id);
    if (!operation) {
      report(path, `unknown operation "${id}"`);
      return undefined;
    }
    if (plane && operation.plane !== plane) report(path, `"${id}" must be in the ${plane} plane`);
    if (kind && operation.kind !== kind) report(path, `"${id}" must be a ${kind} (it is a ${operation.kind})`);
    return operation;
  };

  for (const plane of planes) {
    if (!Object.hasOwn(annotations.planes, plane.name)) report(pointer("planes"), `missing entry "${plane.name}" for ${plane.path}`);
  }
  for (const [name, plane] of Object.entries(annotations.planes)) {
    const source = planeByName.get(name);
    if (!source) {
      report(pointer("planes", name), `no schema/${name}.graphql plane schema exists`);
      continue;
    }
    if (plane.schema !== source.file) report(pointer("planes", name, "schema"), `must be "${source.file}"`);
    operationRef(pointer("planes", name, "resolveOperation"), plane.resolveOperation, { plane: name, kind: "query" });
    const contextType = source.schema.getType(plane.context.input);
    if (!isInputObjectType(contextType)) {
      report(pointer("planes", name, "context", "input"), `${plane.context.input} is not an input type in ${source.path}`);
      continue;
    }
    contextTypes.set(name, contextType);
    plane.context.rules.forEach((rule, ruleIndex) => {
      const at = (...tokens) => pointer("planes", name, "context", "rules", ruleIndex, ...tokens);
      rule.fields.forEach((fieldName, fieldIndex) => {
        const field = contextType.getFields()[fieldName];
        if (!field) report(at("fields", fieldIndex), `${contextType.name} has no field "${fieldName}"`);
        else if (rule.use === "forbidden" && isNonNullType(field.type)) report(at("fields", fieldIndex), `cannot forbid non-null field "${fieldName}"`);
      });
      for (const listName of ["only", "except"]) {
        (rule[listName] ?? []).forEach((id, itemIndex) => operationRef(at(listName, itemIndex), id, { plane: name }));
      }
    });
  }

  const declaredScalars = new Map();
  for (const plane of planes) {
    for (const type of Object.values(plane.schema.getTypeMap())) {
      if (isScalarType(type) && !isSpecifiedScalarType(type) && !declaredScalars.has(type.name)) declaredScalars.set(type.name, plane.path);
    }
  }
  for (const [name, path] of declaredScalars) {
    if (!Object.hasOwn(annotations.scalars, name)) report(pointer("scalars"), `missing entry for custom scalar "${name}" declared in ${path}`);
  }
  for (const name of Object.keys(annotations.scalars)) {
    if (!declaredScalars.has(name)) report(pointer("scalars", name), `no plane schema declares scalar "${name}"`);
  }

  for (const [code, definition] of Object.entries(errorCodes)) {
    if (definition.retryable && definition.status !== undefined && definition.status < 500 && definition.status !== 429) {
      report(pointer("errorCodes", code, "retryable"), `cannot be true for status ${definition.status}; a retryable code is transient (429 or 5xx)`);
    }
  }
  for (const [name, set] of Object.entries(errorSets)) {
    set.codes.forEach((code, codeIndex) => {
      if (!Object.hasOwn(errorCodes, code)) report(pointer("errorSets", name, "codes", codeIndex), `unknown error code "${code}"`);
    });
  }

  const envelope = realtime.envelope;
  const envelopePlane = planeByName.get(envelope.plane);
  let envelopeType;
  let payloadType;
  if (!envelopePlane) {
    report(pointer("realtime", "envelope", "plane"), `unknown plane "${envelope.plane}"`);
  } else {
    const type = envelopePlane.schema.getType(envelope.type);
    if (!isObjectType(type)) {
      report(pointer("realtime", "envelope", "type"), `${envelope.type} is not an object type in ${envelopePlane.path}`);
    } else {
      envelopeType = type;
      for (const key of ["discriminator", "payload", "subject"]) {
        if (!type.getFields()[envelope[key]]) report(pointer("realtime", "envelope", key), `${type.name} has no field "${envelope[key]}"`);
      }
      const discriminator = type.getFields()[envelope.discriminator];
      if (discriminator && String(discriminator.type) !== "String!") {
        report(pointer("realtime", "envelope", "discriminator"), `${type.name}.${discriminator.name} must be String!`);
      }
      const payload = type.getFields()[envelope.payload];
      if (payload) {
        if (isObjectType(getNamedType(payload.type))) payloadType = getNamedType(payload.type);
        else report(pointer("realtime", "envelope", "payload"), `${type.name}.${payload.name} must be an object type`);
      }
    }
  }
  for (const [type, event] of Object.entries(realtime.events)) {
    for (const listName of ["required", "optional"]) {
      event.payload[listName].forEach((field, fieldIndex) => {
        if (payloadType && !payloadType.getFields()[field]) {
          report(pointer("realtime", "events", type, "payload", listName, fieldIndex), `${payloadType.name} has no field "${field}"`);
        }
      });
    }
    for (const field of event.payload.required.filter(name => event.payload.optional.includes(name))) {
      report(pointer("realtime", "events", type, "payload"), `"${field}" is both required and optional`);
    }
  }
  for (const [name, channel] of Object.entries(realtime.channels)) {
    const at = (...tokens) => pointer("realtime", "channels", name, ...tokens);
    const subscription = operationRef(at("subscription"), channel.subscription, { plane: envelope.plane, kind: "subscription" });
    const replay = operationRef(at("replay"), channel.replay, { plane: envelope.plane, kind: "query" });
    operationRef(at("endpoint", "operation"), channel.endpoint.operation, { kind: "query" });
    const subscriptionEntry = subscription && annotations.operations[subscription.id];
    if (subscriptionEntry && subscriptionEntry.realtime.channel !== name) {
      report(at("subscription"), `${subscription.id} must declare realtime {"mode": "subscription", "channel": "${name}"}`);
    }
    const pages = [];
    for (const [key, operation] of [["subscription", subscription], ["replay", replay]]) {
      const entry = operation && annotations.operations[operation.id];
      if (!entry) continue;
      if (entry.pagination.style !== "replay") {
        report(at(key), `${operation.id} must use pagination style "replay"`);
        continue;
      }
      const page = resolvePagePath(operation, entry.pagination.pagePath);
      if (!page.type) continue;
      pages.push(page.type.name);
      const items = page.type.getFields().items;
      if (envelopeType && (!items || getNamedType(items.type).name !== envelopeType.name)) {
        report(at(key), `${operation.id} pages must hold ${envelopeType.name} items`);
      }
    }
    if (pages.length === 2 && pages[0] !== pages[1]) report(at("replay"), `must return the same page type as the subscription (${pages[0]}), not ${pages[1]}`);
  }

  for (const operation of operations) {
    checkRootField(operation, annotations, report);
    const entry = annotations.operations[operation.id];
    if (entry) {
      checkOperation({ operation, entry, annotations, contextType: contextTypes.get(operation.plane), operationRef, report });
    }
  }

  function checkOperation({ operation, entry, contextType }) {
    const at = (...tokens) => pointer("operations", operation.id, ...tokens);
    if (PLACEHOLDER.test(entry.summary)) report(at("summary"), "replace the placeholder summary");

    const runtimes = new Set();
    const seen = new Set();
    entry.auth.forEach((requirement, authIndex) => {
      const key = canonicalJson(requirement);
      if (seen.has(key)) report(at("auth", authIndex), "duplicates an earlier entry");
      seen.add(key);
      const credential = own(credentials, requirement.credential);
      if (!credential) {
        report(at("auth", authIndex, "credential"), `unknown credential "${requirement.credential}"`);
        return;
      }
      runtimes.add(credential.runtime);
      if (requirement.scopes) {
        if (!credential.scoped) report(at("auth", authIndex, "scopes"), `${requirement.credential} credentials carry no scopes`);
        requirement.scopes.forEach((scope, scopeIndex) => {
          if (!Object.hasOwn(scopes, scope)) report(at("auth", authIndex, "scopes", scopeIndex), `unknown scope "${scope}"`);
        });
      }
      if (requirement.condition !== undefined && !Object.hasOwn(conditions, requirement.condition)) {
        report(at("auth", authIndex, "condition"), `unknown condition "${requirement.condition}"`);
      }
    });
    if (entry.layer === "client" && runtimes.has("server")) {
      report(at("layer"), `"client" operations accept only client credentials; use "both" when server credentials are also accepted`);
    } else if (entry.layer === "server" && runtimes.has("client")) {
      report(at("layer"), `"server" operations cannot accept client credentials; use "both" or "client"`);
    } else if (entry.layer === "both" && !(runtimes.has("client") && runtimes.has("server"))) {
      report(at("layer"), `"both" requires at least one client credential and one server credential in auth`);
    }

    const plane = own(annotations.planes, operation.plane);
    if (plane && contextType) {
      const uses = new Map(contextFieldUses({ plane, contextType, operationId: operation.id, auth: entry.auth, credentials })
        .map(item => [item.name, item.use]));
      for (const [name, credential] of Object.entries(credentials)) {
        if (credential.carrier !== "context") continue;
        const accepted = entry.auth.some(requirement => requirement.credential === name);
        const field = credential.contextField;
        if (!uses.has(field)) {
          if (accepted) report(at("auth"), `${name} travels in ${plane.context.argument}.${field}, but ${contextType.name} has no such field`);
        } else if (accepted && uses.get(field) === "forbidden") {
          report(at("auth"), `accepts ${name}, but the ${operation.plane} context rules forbid ${field} for this operation`);
        } else if (!accepted && uses.get(field) !== "forbidden") {
          report(pointer("planes", operation.plane, "context", "rules"),
            `${field} carries ${name} credentials, so it must be forbidden for ${operation.id}, which does not accept ${name}`);
        }
      }
    }

    const carried = entry.auth.filter(requirement => own(credentials, requirement.credential)?.carrier === "context").length;
    if (operation.kind !== "mutation" && entry.idempotency !== "safe") {
      report(at("idempotency"), `${operation.kind} operations are read-only and must be "safe"`);
    } else if (operation.kind === "mutation" && entry.idempotency === "safe") {
      report(at("idempotency"), `mutations cannot be "safe"`);
    }
    if (entry.destructive && operation.kind !== "mutation") report(at("destructive"), `${operation.kind} operations are read-only and cannot be destructive`);
    if (entry.idempotency === "permitBound" && carried !== entry.auth.length) {
      report(at("idempotency"), `"permitBound" requires every auth entry to use a context-carried permit credential`);
    } else if (operation.kind === "mutation" && carried > 0 && entry.idempotency !== "permitBound") {
      report(at("idempotency"), `mutations authorized by a context-carried permit must be "permitBound"`);
    }

    const pagination = entry.pagination;
    if (pagination.style !== "none") {
      if (operation.kind === "mutation") report(at("pagination", "style"), "mutations are not paged");
      const inputType = inputTypeOf(operation);
      for (const key of ["limitField", "cursorField"]) {
        if (pagination[key] === undefined) continue;
        if (!inputType) report(at("pagination", key), `${operation.id} has no input argument`);
        else if (!inputType.getFields()[pagination[key]]) report(at("pagination", key), `${inputType.name} has no field "${pagination[key]}"`);
      }
      const page = resolvePagePath(operation, pagination.pagePath);
      if (page.error) {
        report(at("pagination", "pagePath"), page.error);
      } else {
        for (const field of annotations.pagination[pagination.style].pageFields) {
          if (!page.type.getFields()[field]) report(at("pagination", "pagePath"), `${page.type.name} lacks "${field}", which style "${pagination.style}" requires`);
        }
        const items = page.type.getFields().items;
        if (items && !isListType(isNonNullType(items.type) ? items.type.ofType : items.type)) {
          report(at("pagination", "pagePath"), `${page.type.name}.items must be a list`);
        }
      }
    }

    if (entry.realtime.mode === "subscription") {
      if (operation.kind !== "subscription") report(at("realtime", "mode"), `only subscriptions use mode "subscription"`);
      const channel = own(realtime.channels, entry.realtime.channel);
      if (!channel) report(at("realtime", "channel"), `unknown channel "${entry.realtime.channel}"`);
      else if (channel.subscription !== operation.id) report(at("realtime", "channel"), `channel "${entry.realtime.channel}" is served by ${channel.subscription}`);
    } else if (operation.kind === "subscription") {
      report(at("realtime", "mode"), `subscriptions must use mode "subscription"`);
    }
    if (entry.realtime.emits) {
      if (operation.kind !== "mutation") report(at("realtime", "emits"), "only mutations emit events");
      entry.realtime.emits.forEach((type, emitIndex) => {
        if (!Object.hasOwn(realtime.events, type)) report(at("realtime", "emits", emitIndex), `unknown event type "${type}"`);
      });
    }

    if (entry.longRunning) {
      if (operation.kind !== "mutation") report(at("longRunning"), "only mutations start long-running work");
      const poll = operationRef(at("longRunning", "poll"), entry.longRunning.poll, { plane: operation.plane, kind: "query" });
      if (poll && !inputTypeOf(poll)?.getFields().operationId) report(at("longRunning", "poll"), `${poll.id} input must have an operationId field`);
      const result = getNamedType(operation.field.type);
      const ref = isObjectType(result) ? result.getFields()[entry.longRunning.refField] : undefined;
      if (!ref) {
        report(at("longRunning", "refField"), `${result.name} has no field "${entry.longRunning.refField}"`);
      } else {
        const refType = getNamedType(ref.type);
        if (!isObjectType(refType) || !refType.getFields().operationId) report(at("longRunning", "refField"), `${refType.name} must have an operationId field`);
      }
    }

    const included = new Map();
    entry.errors.sets.forEach((name, setIndex) => {
      const set = own(errorSets, name);
      if (!set) {
        report(at("errors", "sets", setIndex), `unknown error set "${name}"`);
        return;
      }
      for (const code of set.codes) if (!included.has(code)) included.set(code, name);
    });
    entry.errors.codes.forEach((code, codeIndex) => {
      if (!Object.hasOwn(errorCodes, code)) report(at("errors", "codes", codeIndex), `unknown error code "${code}"`);
      else if (included.has(code)) report(at("errors", "codes", codeIndex), `"${code}" is already included by error set "${included.get(code)}"`);
    });
  }
}

/** Root fields follow one calling convention: the plane's context argument plus an optional `input` object. */
function checkRootField(operation, annotations, report) {
  const plane = own(annotations.planes, operation.plane);
  if (!plane) return;
  const where = `${operation.schemaPath} ${operation.kind} ${operation.field.name}`;
  const { argument, input } = plane.context;
  const context = operation.field.args.find(arg => arg.name === argument);
  if (!context || String(context.type) !== `${input}!`) report(where, `must take ${argument}: ${input}!`);
  for (const arg of operation.field.args) {
    if (arg.name === argument) continue;
    if (arg.name !== "input") {
      report(where, `unsupported argument "${arg.name}"; root fields take only ${argument} and input`);
      continue;
    }
    const unwrapped = isNonNullType(arg.type) ? arg.type.ofType : arg.type;
    if (!isInputObjectType(unwrapped)) report(where, `input must be an input object type, not ${String(arg.type)}`);
  }
}
