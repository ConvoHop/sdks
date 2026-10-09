// Serves the browser test page and the built SDK packages, and forwards the page's GraphQL traffic (HTTP and
// graphql-transport-ws) to the mock. The page and its API share one origin, so the mock needs no CORS. The client
// follows a route only to its own origin, so this rewrites the mock's origin in GraphQL responses to this server's.
// The mock's control API stays unreachable from the page.
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createServer, request as httpRequest } from "node:http";
import { connect } from "node:net";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const mounts = [
  ["/packages/core/dist/", resolve(root, "packages/core/dist")],
  ["/packages/client/dist/", resolve(root, "packages/client/dist")],
  ["/", resolve(root, "conformance/browser/app")],
];
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".map": "application/json" };
const hopByHop = new Set(["connection", "content-length", "keep-alive", "transfer-encoding"]);

function file(pathname) {
  const [prefix, directory] = mounts.find(([prefix]) => pathname.startsWith(prefix));
  let relative;
  try { relative = decodeURIComponent(pathname.slice(prefix.length)) || "index.html"; } catch { return undefined; }
  const path = resolve(directory, "." + sep + relative);
  return path.startsWith(directory + sep) && types[extname(path)] ? path : undefined;
}

function requestHead(request, host) {
  const lines = [`${request.method} ${request.url} HTTP/1.1`];
  for (let index = 0; index < request.rawHeaders.length; index += 2) {
    const name = request.rawHeaders[index];
    lines.push(`${name}: ${name.toLowerCase() === "host" ? host : request.rawHeaders[index + 1]}`);
  }
  return lines.join("\r\n") + "\r\n\r\n";
}

/** Starts the page server in front of the mock's communication plane at `target`. */
export async function startPageServer(target) {
  const upstream = new URL(target), sockets = new Set();
  let rewrites;

  async function proxy(request, response) {
    const body = [];
    for await (const chunk of request) body.push(chunk);
    const forwarded = httpRequest({ host: upstream.hostname, port: upstream.port, method: request.method,
      path: request.url, headers: { ...request.headers, host: upstream.host } });
    // The mock drops connections to simulate lost requests and responses; the page sees the same drop.
    forwarded.on("error", () => request.socket.destroy());
    forwarded.on("response", async answer => {
      const chunks = [];
      try { for await (const chunk of answer) chunks.push(chunk); }
      catch { request.socket.destroy(); return; }
      let text = Buffer.concat(chunks).toString("utf8");
      for (const [from, to] of rewrites) text = text.replaceAll(from, to);
      const headers = Object.fromEntries(Object.entries(answer.headers).filter(([name]) => !hopByHop.has(name)));
      response.writeHead(answer.statusCode ?? 502, { ...headers, "content-length": Buffer.byteLength(text) });
      response.end(text);
    });
    forwarded.end(Buffer.concat(body));
  }

  const server = createServer(async (request, response) => {
    const { pathname } = new URL(request.url ?? "/", "http://page");
    if (pathname === "/graphql") return proxy(request, response);
    const path = request.method === "GET" ? file(pathname) : undefined;
    let content;
    try { content = path && await readFile(path); } catch { content = undefined; }
    if (!content) { response.writeHead(404, { "content-type": "text/plain" }); response.end("Not found"); return; }
    response.writeHead(200, { "content-type": types[extname(path)], "cache-control": "no-store" });
    response.end(content);
  });
  server.on("upgrade", (request, socket, start) => {
    if (new URL(request.url ?? "/", "http://page").pathname !== "/graphql") {
      socket.end("HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n");
      return;
    }
    const forwarded = connect(Number(upstream.port), upstream.hostname, () => {
      forwarded.write(requestHead(request, upstream.host));
      if (start.length) forwarded.write(start);
      socket.pipe(forwarded).pipe(socket);
    });
    const pair = [socket, forwarded], destroy = () => { sockets.delete(pair); socket.destroy(); forwarded.destroy(); };
    sockets.add(pair);
    for (const side of pair) { side.on("error", destroy); side.on("close", destroy); }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const origin = `http://127.0.0.1:${server.address().port}`;
  rewrites = [[upstream.origin, origin], [upstream.origin.replace(/^http/, "ws"), origin.replace(/^http/, "ws")]];
  return {
    origin,
    async close() {
      for (const pair of sockets) for (const side of pair) side.destroy();
      server.closeAllConnections();
      await new Promise(resolve => server.close(() => resolve()));
    },
  };
}
