import { EmitterError } from "./emitter.mjs";
import { byName } from "./ir-model.mjs";

/**
 * Selection and wording rules shared by the emitters that expose operations to
 * server-side tooling: the MCP tools (mcp-tools) and the convohop CLI
 * (cli-operations). `where` prefixes error messages with the emitter's name.
 */

/**
 * Operations whose results are credentials. Server tooling never offers them,
 * because an agent or a terminal must never receive these results.
 */
export const CREDENTIAL_OPERATIONS = Object.freeze({
  "communication.issueSession": "returns a user session token",
  "communication.renewSession": "returns a user session token",
  "management.credentialPermit": "returns a credential delivery permit",
  "management.createBillingCheckoutSession": "returns a hosted billing link that grants access to whoever holds it",
  "management.createBillingPortalSession": "returns a hosted billing link that grants access to whoever holds it",
});

export const oneLine = text => text.replace(/\s+/g, " ").trim();
export const list = items => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);

function firstServerBearer(ir, operation, where) {
  const credentials = byName(ir.credentials);
  for (const auth of operation.auth) {
    const credential = credentials.get(auth.credential);
    if (!credential) throw new EmitterError(`${where}: ${operation.id}: the IR does not define credential ${auth.credential}`);
    if (credential.runtime === "server" && credential.carrier === "bearer") return credential.name;
  }
  return undefined;
}

/**
 * The one credential server tooling sends to a plane: the first server credential sent as a bearer token that the
 * plane's resolveOperation accepts, so tooling can settle the unknown outcome of any request it sends. Undefined
 * when the resolveOperation accepts none.
 */
export function planeCredential(ir, planeName, where) {
  const plane = byName(ir.planes).get(planeName);
  if (!plane) throw new EmitterError(`${where}: the IR does not define plane ${planeName}`);
  const resolver = ir.operations.find(operation => operation.id === plane.resolveOperation);
  if (!resolver) throw new EmitterError(`${where}: plane ${planeName} resolves requests with ${plane.resolveOperation}, which the IR does not define`);
  return firstServerBearer(ir, resolver, where);
}

/** The operation's plane credential (see planeCredential) when the operation accepts it; undefined otherwise. */
export function serverCredential(ir, operation, where) {
  const credential = planeCredential(ir, operation.plane, where);
  return credential !== undefined && operation.auth.some(auth => auth.credential === credential) ? credential : undefined;
}

/**
 * The queries and mutations server tooling can call with its plane credentials, in IR order. Subscriptions,
 * client-only and deprecated operations, CREDENTIAL_OPERATIONS and the operations that need another credential,
 * such as anonymous ones, are left out.
 */
export function serverOperations(ir, where) {
  return ir.operations.filter(operation => (operation.kind === "query" || operation.kind === "mutation") &&
    operation.layer !== "client" && !operation.deprecated && !Object.hasOwn(CREDENTIAL_OPERATIONS, operation.id) &&
    serverCredential(ir, operation, where) !== undefined);
}

/** The operation's authorization alternatives with one credential, such as `key with scope a (condition owner: …)`. */
export function authText(ir, operation, credential, where) {
  const conditions = byName(ir.conditions);
  return operation.auth.filter(auth => auth.credential === credential).map(auth => {
    let text = credential;
    if (auth.scopes?.length) text += ` with scope${auth.scopes.length > 1 ? "s" : ""} ${list(auth.scopes)}`;
    if (auth.condition) {
      const summary = conditions.get(auth.condition)?.summary;
      if (!summary) throw new EmitterError(`${where}: ${operation.id}: the IR does not define condition ${auth.condition}`);
      text += ` (condition ${auth.condition}: ${oneLine(summary).replace(/\.$/, "")})`;
    }
    return text;
  }).join(", or ");
}

/** How a paged operation pages, as a sentence; undefined for operations that don't page. */
export function paginationText(ir, pagination, where) {
  if (pagination.style === "none") return undefined;
  const style = byName(ir.pagination).get(pagination.style);
  if (!style) throw new EmitterError(`${where}: the IR does not define pagination style ${pagination.style}`);
  const inputs = [];
  if (pagination.cursorField) inputs.push(`cursor input ${pagination.cursorField}`);
  if (pagination.limitField) inputs.push(`page size input ${pagination.limitField}`);
  return `Paged (${pagination.style}): ${oneLine(style.summary)}${inputs.length ? ` Uses ${list(inputs)}.` : ""}`;
}
