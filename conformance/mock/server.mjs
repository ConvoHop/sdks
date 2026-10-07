// Deterministic conformance target: GraphQL over HTTP, graphql-transport-ws realtime and a
// loopback-only control API that scenarios use to inject faults and observe the authority.
import { createServer } from "node:http";
import { once } from "node:events";
import { Domain, Problem } from "./domain.mjs";
import { createGraphqlHandler, problemBody } from "./resolvers.mjs";
import { createRealtime } from "./websocket.mjs";

const MAX_BODY_BYTES = 1 << 20;
const FAULT_ACTIONS = new Set(["rateLimit", "dropBeforeCommit", "dropAfterCommit"]);
export const MOCK_CAPABILITIES = Object.freeze(["auth.shortSessionTtl", "control.fault", "control.realtimeDrop",
  "control.reset", "control.waitLog", "pagination.serverCappedPages"]);

function createFaults() {
  const queues = new Map();
  return {
    add({ plane = "communication", field, action, retryAfterSeconds }) {
      const key = `${plane}:${field}`;
      queues.set(key, [...(queues.get(key) ?? []), { action, retryAfterSeconds }]);
    },
    take(plane, field) {
      const queue = queues.get(`${plane}:${field}`);
      const fault = queue?.shift();
      if (queue && !queue.length) queues.delete(`${plane}:${field}`);
      return fault;
    },
    clear() { queues.clear(); },
  };
}

function createLog(limit = 2000) {
  let entries = [], sequence = 0;
  const waiters = new Set();
  const matches = (entry, kind, match) => entry.kind === kind && Object.entries(match).every(([key, value]) =>
    entry[key] === value || (Array.isArray(entry[key]) && entry[key].includes(value)));
  const select = (kind, match) => entries.filter(entry => matches(entry, kind, match));
  return {
    add(entry) {
      entries.push({ sequence: ++sequence, at: new Date().toISOString(), ...entry });
      if (entries.length > limit) entries = entries.slice(-limit);
      for (const waiter of [...waiters]) waiter();
    },
    entries: () => structuredClone(entries),
    clear() { entries = []; },
    wait({ kind, match = {}, count = 1, timeoutMs = 5000 }) {
      return new Promise(resolve => {
        const check = () => {
          const found = select(kind, match);
          if (found.length < count) return false;
          waiters.delete(check); clearTimeout(timer);
          resolve({ entries: structuredClone(found) });
          return true;
        };
        const timer = setTimeout(() => {
          waiters.delete(check);
          resolve({ entries: structuredClone(select(kind, match)), timedOut: true });
        }, timeoutMs);
        if (!check()) waiters.add(check);
      });
    },
  };
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Problem("REQUEST_TOO_LARGE", 413, "Request body exceeds 1 MiB");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function readJson(request) {
  const text = await readBody(request);
  if (!text) return {};
  try { return JSON.parse(text); } catch { throw new Problem("GRAPHQL_INVALID_REQUEST", 400, "Body must be JSON"); }
}

function send(response, status, body, headers = {}) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers });
  response.end(body === undefined ? undefined : JSON.stringify(body));
}

const isLoopback = address => address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";

export async function startMockTarget({ seed, host = "127.0.0.1" } = {}) {
  const domain = new Domain(seed === undefined ? {} : { seed });
  const faults = createFaults();
  const log = createLog();
  let communicationUrl;
  const handle = createGraphqlHandler(domain, {
    routeTarget: () => ({ communicationBase: communicationUrl, wssUrl: `${communicationUrl.replace(/^http/, "ws")}/graphql` }),
    faults, log,
  });
  const realtime = createRealtime({ domain, log });

  async function graphql(plane, request, response) {
    if (request.method !== "POST") return send(response, 405, { errors: [problemBody(new Problem("METHOD_NOT_ALLOWED", 405, "Use POST"))] }, { allow: "POST" });
    if (!/^application\/json(\s*;|$)/i.test(String(request.headers["content-type"] ?? "")))
      return send(response, 415, { errors: [problemBody(new Problem("UNSUPPORTED_MEDIA_TYPE", 415, "Use application/json"))] });
    let body;
    try { body = await readJson(request); }
    catch (error) {
      const problem = error instanceof Problem ? error : new Problem("GRAPHQL_INVALID_REQUEST", 400, "Unreadable body");
      return send(response, problem.status, { errors: [problemBody(problem)] });
    }
    const result = handle(plane, body, request.headers.authorization);
    if (result.drop) { request.socket.destroy(); return; }
    send(response, result.status, result.body, result.headers);
  }

  async function control(path, request, response) {
    if (!isLoopback(request.socket.remoteAddress)) return send(response, 403, { error: "control API is loopback-only" });
    const body = request.method === "POST" ? await readJson(request) : {};
    switch (`${request.method} ${path}`) {
      case "POST /reset":
        domain.reset(); faults.clear(); log.clear(); realtime.closeAll(1012);
        return send(response, 200, { ok: true });
      case "POST /fault": {
        if (typeof body.field !== "string" || !FAULT_ACTIONS.has(body.action) ||
            (body.plane !== undefined && body.plane !== "communication" && body.plane !== "management") ||
            (body.action === "rateLimit" && !(Number.isSafeInteger(body.retryAfterSeconds) && body.retryAfterSeconds > 0)))
          return send(response, 400, { error: "fault requires field, a known action and retryAfterSeconds for rateLimit" });
        faults.add(body);
        return send(response, 200, { ok: true });
      }
      case "POST /realtime/drop":
        return send(response, 200, { closed: realtime.drop(body) });
      case "GET /log":
        return send(response, 200, { entries: log.entries() });
      case "POST /log/wait": {
        if (typeof body.kind !== "string") return send(response, 400, { error: "kind is required" });
        const result = await log.wait({ kind: body.kind, match: body.match ?? {}, count: body.count ?? 1,
          timeoutMs: Math.min(body.timeoutMs ?? 5000, 30000) });
        return send(response, result.timedOut ? 408 : 200, result);
      }
      default:
        return send(response, 404, { error: "unknown control endpoint" });
    }
  }

  function listener(plane) {
    return async (request, response) => {
      try {
        const path = new URL(request.url ?? "/", "http://mock").pathname;
        if (path === "/graphql") return await graphql(plane, request, response);
        if (plane === "communication" && path.startsWith("/__conformance/"))
          return await control(path.slice("/__conformance".length), request, response);
        send(response, 404, { errors: [problemBody(new Problem("NOT_FOUND", 404, "Unknown path"))] });
      } catch (error) {
        if (!response.headersSent) send(response, 500, { errors: [problemBody(new Problem("MOCK_FAILURE", 500,
          error instanceof Error ? error.message : "Mock failure", { outcome: "unknown" }))] });
        else response.destroy();
      }
    };
  }

  const communication = createServer(listener("communication"));
  const management = createServer(listener("management"));
  communication.on("upgrade", (request, socket, head) => realtime.upgrade(request, socket, head));
  management.on("upgrade", (_request, socket) => socket.end("HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n"));
  communication.listen(0, host); management.listen(0, host);
  await Promise.all([once(communication, "listening"), once(management, "listening")]);
  const address = server => `http://${host}:${server.address().port}`;
  communicationUrl = address(communication);
  const descriptor = Object.freeze({
    name: "mock",
    communicationUrl,
    managementUrl: address(management),
    projectId: domain.projectId,
    incarnation: domain.incarnation,
    managementActorId: domain.managementActorId,
    credentials: { ...domain.credentials },
    control: `${communicationUrl}/__conformance`,
    capabilities: [...MOCK_CAPABILITIES],
  });
  return {
    descriptor,
    async close() {
      realtime.closeAll();
      for (const server of [communication, management]) server.closeAllConnections();
      await Promise.all([communication, management].map(server => new Promise(resolve => server.close(() => resolve()))));
    },
  };
}
