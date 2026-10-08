import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { McpServer, fromJsonSchema, type CallToolResult } from "@modelcontextprotocol/server";
import {
  ConvoHopProblem, ConvoHopTransport, ProjectServerClient, ScopeRequiredProblem, operationCatalog,
  type OperationInput, type OperationKey,
} from "@convohop/server";
import { mcpTools, operationMetaKey, retryToolName, type McpToolDefinition } from "./generated/tools.js";
import { REDACTED, redactObject } from "./redact.js";

export * from "./generated/tools.js";
export { REDACTED, redact, redactObject, redactedFields } from "./redact.js";

/**
 * Configure the management plane, the communication plane of one project, or both. Each plane's tools are registered
 * only when all of its options are set. Run the server only in a trusted runtime: it holds the credentials.
 */
export interface ConvoHopMcpServerOptions {
  /** Management authority origin. Set it with portalToken. */
  managementUrl?: string;
  /** Portal credential that authenticates the management tools. */
  portalToken?: string;
  /** Communication authority origin of the project. Set it with projectId, incarnation and backendKey. */
  communicationUrl?: string;
  projectId?: string;
  incarnation?: string;
  /** Backend key that authenticates the communication tools. Its scopes decide which of them succeed. */
  backendKey?: string;
  /** Registers only the query tools. */
  readOnly?: boolean;
  fetch?: typeof fetch;
}

/** The structuredContent of a failed tool call. */
export type ToolFailure = {
  /** The authority's or the SDK's problem code. Absent for failures that have none, such as local errors. */
  code?: string;
  /** What is known about the request: committed, accepted, rejected or unknown. */
  outcome: string;
  requestId: string;
  status?: number;
  message: string;
  /** Seconds the authority asked to wait before sending again. */
  retryAfter?: number;
  /** For SCOPE_REQUIRED, the scope the backend key lacks, when the authority names it. */
  scope?: string;
  next?: string;
};

interface Plane {
  readonly transport: ConvoHopTransport;
  readonly projectId: string | undefined;
  /** Routes to the project before the first communication request. */
  ready(): Promise<void>;
  /** Forgets the route after WRONG_REGION, so the next call routes again. */
  reroute(): void;
}

function configurePlanes(options: ConvoHopMcpServerOptions): Map<string, Plane> {
  const planes = new Map<string, Plane>();
  const fetch = options.fetch === undefined ? {} : { fetch: options.fetch };
  const { managementUrl, portalToken, communicationUrl, projectId, incarnation, backendKey } = options;
  if (managementUrl !== undefined || portalToken !== undefined) {
    if (!managementUrl || !portalToken) throw new TypeError("Set managementUrl and portalToken together");
    const transport = new ConvoHopTransport({ baseUrl: managementUrl, credential: portalToken, namespace: "mcp:management", ...fetch });
    planes.set("management", { transport, projectId: undefined, ready: () => Promise.resolve(), reroute: () => undefined });
  }
  const communication = [communicationUrl, projectId, incarnation, backendKey];
  if (communication.some(value => value !== undefined)) {
    if (!communicationUrl || !projectId || !incarnation || !backendKey)
      throw new TypeError("Set communicationUrl, projectId, incarnation and backendKey together");
    const client = new ProjectServerClient({ baseUrl: communicationUrl, projectId, incarnation, backendKey, ...fetch });
    let route: Promise<void> | undefined;
    planes.set("communication", {
      transport: client.http,
      projectId: client.projectId,
      ready: () => (route ??= client.initialize().catch((error: unknown) => {
        route = undefined;
        throw error;
      })),
      reroute: () => { route = undefined; },
    });
  }
  if (planes.size === 0) throw new TypeError("Configure the management plane, the communication plane or both");
  return planes;
}

function packageVersion(): string {
  const manifest: unknown = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const version = manifest !== null && typeof manifest === "object" && "version" in manifest ? manifest.version : undefined;
  if (typeof version !== "string") throw new TypeError("The @convohop/mcp package manifest has no version");
  return version;
}

function instructions(readOnly: boolean): string {
  return [
    "Each ConvoHop tool runs one ConvoHop operation with the credential this server was started with.",
    `The tool's _meta["${operationMetaKey}"] carries the operation's annotations: credential, scopes, idempotency, ` +
      "destructiveness, pagination and polling.",
    "Every call sends a new request, and its result or error carries the requestId.",
    ...(readOnly ? ["Only read-only tools are available."] : [
      `When a mutation's outcome is unknown, call ${retryToolName} with its requestId instead of calling the tool again.`,
      "Tools marked destructiveHint delete, revoke, remove, disable or end something. Confirm with the user before calling them.",
    ]),
    `Credentials, secrets and signed proofs in results read ${REDACTED}.`,
  ].join(" ");
}

function catalogKey(tool: McpToolDefinition): OperationKey {
  const id = tool.operation.id;
  const isKey = (value: string): value is OperationKey => Object.hasOwn(operationCatalog, value);
  if (!isKey(id) || operationCatalog[id].plane !== tool.operation.plane || operationCatalog[id].kind !== tool.operation.kind)
    throw new Error(`Tool ${tool.name} does not match the SDK operation catalog; rebuild @convohop/mcp`);
  return id;
}

/** The outcome the transport recorded for a mutation it sent; undefined for queries and unsent requests. */
function recordedOutcome(plane: Plane, requestId: string): string | undefined {
  const state = plane.transport.recoveryStates.find(value => value.requestId === requestId);
  if (!state) return undefined;
  return state.resolutionState === "pending" ? "unknown" : state.resolutionState;
}

function nextStep(failure: ToolFailure, query: boolean, resolvable: boolean): string | undefined {
  const wait = failure.retryAfter === undefined ? "" : `Wait at least ${failure.retryAfter} seconds first. `;
  if (failure.outcome === "unknown") {
    if (query) return `${wait}The tool is read-only, so it is safe to call again.`;
    if (!resolvable) return "Don't call this tool again until you know whether the request took effect.";
    // The retry budget is spent, so retry_request can only look the request up.
    if (failure.code === "RESOLUTION_REQUIRED")
      return `The request can no longer be resent. ${retryToolName} with requestId ${failure.requestId} can still look it up: ` +
        "it reports committed or accepted once the authority has the request.";
    return `${wait}Call ${retryToolName} with requestId ${failure.requestId}. Don't call this tool again: that sends a new request.`;
  }
  if (failure.outcome === "committed" || failure.outcome === "accepted") return "The authority has the request. Don't send it again.";
  return failure.retryAfter === undefined ? undefined : `The authority asked to wait ${failure.retryAfter} seconds before sending again.`;
}

function describe(error: unknown, requestId: string, plane: Plane, query: boolean): ToolFailure {
  const recorded = recordedOutcome(plane, requestId);
  let failure: ToolFailure;
  if (error instanceof ConvoHopProblem) {
    if (error.code === "WRONG_REGION") plane.reroute();
    failure = {
      code: error.code,
      // A problem with another request ID comes from a read that resolves this request, and doesn't decide its outcome.
      outcome: error.requestId === requestId ? error.outcome : recorded ?? "unknown",
      requestId, status: error.status, message: error.message,
      ...(error.retryAfter === undefined ? {} : { retryAfter: error.retryAfter }),
      ...(error instanceof ScopeRequiredProblem && error.scope !== undefined ? { scope: error.scope } : {}),
    };
  } else {
    // The transport records a mutation before sending it, so an unrecorded mutation was never sent.
    failure = { outcome: recorded ?? (query ? "unknown" : "rejected"), requestId,
      message: error instanceof Error ? error.message : "The request failed" };
  }
  const next = nextStep(failure, query, recorded !== undefined);
  return next === undefined ? failure : { ...failure, next };
}

function routeFailure(error: unknown, requestId: string, outcome: string, consequence: string): ToolFailure {
  const problem = error instanceof ConvoHopProblem ? error : undefined;
  return {
    ...(problem ? { code: problem.code, status: problem.status } : {}),
    outcome, requestId,
    message: `Routing to the project failed, so ${consequence}: ${error instanceof Error ? error.message : "no route"}`,
    ...(problem?.retryAfter === undefined ? {} : { retryAfter: problem.retryAfter }),
  };
}

function succeeded(value: object, secrets: readonly string[]): CallToolResult {
  const structuredContent = redactObject(value, secrets);
  return { content: [{ type: "text", text: JSON.stringify(structuredContent) }], structuredContent };
}

function failed(failure: ToolFailure, secrets: readonly string[]): CallToolResult {
  const structuredContent = redactObject(failure, secrets);
  const lines = [
    `ConvoHop ${typeof structuredContent.code === "string" ? structuredContent.code : "error"}: ${String(structuredContent.message)}`,
    `outcome: ${String(structuredContent.outcome)}`,
    `requestId: ${String(structuredContent.requestId)}`,
    ...(typeof structuredContent.next === "string" ? [`next: ${structuredContent.next}`] : []),
  ];
  return { isError: true, content: [{ type: "text", text: lines.join("\n") }], structuredContent };
}

async function invoke(plane: Plane, key: OperationKey, args: unknown, secrets: readonly string[]): Promise<CallToolResult> {
  const requestId = randomUUID();
  const query = operationCatalog[key].kind === "query";
  try {
    await plane.ready();
  } catch (error) {
    return failed(routeFailure(error, requestId, "rejected", "the request was not sent"), secrets);
  }
  try {
    // The MCP server validated args against the tool's input schema, which the generator derives from the operation's
    // input type; the transport rejects any other input field before sending.
    const payload = await plane.transport.execute(key, plane.projectId, (args ?? {}) as OperationInput<OperationKey>, requestId);
    return succeeded(payload, secrets);
  } catch (error) {
    return failed(describe(error, requestId, plane, query), secrets);
  }
}

async function retry(planes: Map<string, Plane>, args: unknown, secrets: readonly string[]): Promise<CallToolResult> {
  const requestId = args !== null && typeof args === "object" && "requestId" in args && typeof args.requestId === "string"
    ? args.requestId : "";
  const plane = [...planes.values()].find(value => value.transport.recoveryStates.some(state => state.requestId === requestId));
  if (!plane) {
    const lookups = [...planes.keys()].map(name => `${name}_resolve_request`).join(" or ");
    return failed({ outcome: "unknown", requestId, message: "This server process sent no mutation with this requestId, " +
      `so it can't resend it. ${lookups} can look the request up.` }, secrets);
  }
  try {
    await plane.ready();
  } catch (error) {
    return failed(routeFailure(error, requestId, recordedOutcome(plane, requestId) ?? "unknown", "the request was not resolved"), secrets);
  }
  try {
    return succeeded(await plane.transport.retry(requestId), secrets);
  } catch (error) {
    return failed(describe(error, requestId, plane, false), secrets);
  }
}

/**
 * An MCP server whose tools run ConvoHop operations: one tool per management or backend-key query and mutation in the
 * schema (see mcpTools), plus retry_request. Connect it to a transport, such as StdioServerTransport.
 */
export function createConvoHopMcpServer(options: ConvoHopMcpServerOptions): McpServer {
  const planes = configurePlanes(options);
  const secrets = [options.portalToken, options.backendKey].filter((value): value is string => !!value);
  const readOnly = options.readOnly === true;
  const server = new McpServer({ name: "convohop", title: "ConvoHop", version: packageVersion() },
    { instructions: instructions(readOnly) });
  for (const tool of mcpTools) {
    const plane = planes.get(tool.operation.plane);
    if (!plane || (readOnly && tool.operation.kind !== "query")) continue;
    const key = catalogKey(tool);
    server.registerTool(tool.name, {
      title: tool.title,
      description: tool.description,
      inputSchema: fromJsonSchema(tool.inputSchema),
      annotations: tool.annotations,
      _meta: { [operationMetaKey]: tool.operation },
    }, args => invoke(plane, key, args, secrets));
  }
  if (!readOnly) {
    server.registerTool(retryToolName, {
      title: "Resolve or resend a request",
      description: "Resolves a mutation that this server sent and whose outcome is unknown, using its requestId. " +
        "When the authority has no record of the request, it resends the same request with the same requestId and " +
        "payload, within the request's retry budget. Returns the request's resolution: state committed, accepted or " +
        "notObservedYet, with the receipt when there is one.",
      inputSchema: fromJsonSchema({
        type: "object",
        properties: { requestId: { type: "string", description: "The requestId from the mutation's result or error." } },
        required: ["requestId"],
        additionalProperties: false,
      }),
      // A resend can carry out a destructive mutation.
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    }, args => retry(planes, args, secrets));
  }
  return server;
}

/**
 * Reads server options from CONVOHOP_MANAGEMENT_URL, CONVOHOP_PORTAL_TOKEN, CONVOHOP_COMMUNICATION_URL,
 * CONVOHOP_PROJECT_ID, CONVOHOP_INCARNATION, CONVOHOP_BACKEND_KEY and CONVOHOP_MCP_READ_ONLY. Instead of
 * CONVOHOP_PORTAL_TOKEN or CONVOHOP_BACKEND_KEY, the matching _FILE variable can name a file that holds the secret.
 * Empty variables count as unset. Throws a TypeError naming the variables to set when a plane is partly configured.
 */
export function serverOptionsFromEnvironment(env: Readonly<Record<string, string | undefined>>): ConvoHopMcpServerOptions {
  const value = (name: string): string | undefined => (env[name] === "" ? undefined : env[name]);
  const secret = (name: string): string | undefined => {
    const inline = value(name), file = value(`${name}_FILE`);
    if (inline !== undefined && file !== undefined) throw new TypeError(`Set ${name} or ${name}_FILE, not both`);
    if (file === undefined) return inline;
    const text = readFileSync(file, "utf8").trim();
    if (!text) throw new TypeError(`${name}_FILE names an empty file`);
    return text;
  };
  const flag = value("CONVOHOP_MCP_READ_ONLY");
  if (flag !== undefined && !["0", "1", "false", "true"].includes(flag))
    throw new TypeError("CONVOHOP_MCP_READ_ONLY must be 1, true, 0 or false");
  const managementUrl = value("CONVOHOP_MANAGEMENT_URL"), portalToken = secret("CONVOHOP_PORTAL_TOKEN");
  const communicationUrl = value("CONVOHOP_COMMUNICATION_URL"), projectId = value("CONVOHOP_PROJECT_ID");
  const incarnation = value("CONVOHOP_INCARNATION"), backendKey = secret("CONVOHOP_BACKEND_KEY");
  const management = [managementUrl, portalToken], communication = [communicationUrl, projectId, incarnation, backendKey];
  if (management.some(item => item !== undefined) && management.includes(undefined))
    throw new TypeError("Set CONVOHOP_MANAGEMENT_URL and CONVOHOP_PORTAL_TOKEN or CONVOHOP_PORTAL_TOKEN_FILE together");
  if (communication.some(item => item !== undefined) && communication.includes(undefined))
    throw new TypeError("Set CONVOHOP_COMMUNICATION_URL, CONVOHOP_PROJECT_ID, CONVOHOP_INCARNATION and " +
      "CONVOHOP_BACKEND_KEY or CONVOHOP_BACKEND_KEY_FILE together");
  if (managementUrl === undefined && communicationUrl === undefined)
    throw new TypeError("Set CONVOHOP_MANAGEMENT_URL, CONVOHOP_COMMUNICATION_URL or both");
  return {
    ...(managementUrl === undefined ? {} : { managementUrl }),
    ...(portalToken === undefined ? {} : { portalToken }),
    ...(communicationUrl === undefined ? {} : { communicationUrl }),
    ...(projectId === undefined ? {} : { projectId }),
    ...(incarnation === undefined ? {} : { incarnation }),
    ...(backendKey === undefined ? {} : { backendKey }),
    ...(flag === "1" || flag === "true" ? { readOnly: true } : {}),
  };
}
