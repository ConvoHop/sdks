// Minimal RFC 6455 server endpoint speaking graphql-transport-ws for the conformance mock.
// It accepts only masked text frames from clients and supports server-initiated drops so
// scenarios can exercise SDK reconnect and resume behaviour deterministically.
import { createHash } from "node:crypto";
import { PAGE_CAPS, Problem } from "./domain.mjs";
import { prepareSubscription, problemBody } from "./resolvers.mjs";

const ACCEPT_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const MAX_MESSAGE_BYTES = 1 << 20;
const INIT_TIMEOUT_MS = 10000;
const decoder = new TextDecoder("utf-8", { fatal: true });
const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
const closeCode = code => (code >= 1000 && code <= 1003) || (code >= 1007 && code <= 1011) || (code >= 3000 && code <= 4999);

function frame(opcode, payload) {
  const length = payload.length;
  const header = Buffer.alloc(length < 126 ? 2 : length < 65536 ? 4 : 10);
  header[0] = 0x80 | opcode;
  if (length < 126) header[1] = length;
  else if (length < 65536) { header[1] = 126; header.writeUInt16BE(length, 2); }
  else { header[1] = 127; header.writeBigUInt64BE(BigInt(length), 2); }
  return Buffer.concat([header, payload]);
}

class Connection {
  #socket; #domain; #log; #onClosed;
  #buffer = Buffer.alloc(0); #fragments = []; #fragmentBytes = 0;
  #state = "new"; #closing = false; #initTimer; #actor;
  subscriptions = new Map();

  constructor(socket, head, { domain, log, onClosed }) {
    this.#socket = socket; this.#domain = domain; this.#log = log; this.#onClosed = onClosed;
    socket.setNoDelay(true);
    socket.on("data", chunk => this.#receive(chunk));
    socket.on("error", () => socket.destroy());
    socket.on("close", () => this.#closed());
    this.#initTimer = setTimeout(() => this.close(4408, "Connection initialisation timeout"), INIT_TIMEOUT_MS);
    if (head?.length) this.#receive(head);
  }

  get conversationIds() { return new Set([...this.subscriptions.values()].map(entry => entry.conversationId)); }

  close(code, reason = "", initiator = "server") {
    if (this.#closing) return;
    this.#closing = true;
    const conversationIds = [...this.conversationIds];
    this.#stop();
    const text = Buffer.from(reason).subarray(0, 123);
    const payload = Buffer.alloc(2 + text.length);
    payload.writeUInt16BE(code, 0);
    text.copy(payload, 2);
    this.#write(frame(8, payload));
    this.#socket.end();
    setTimeout(() => this.#socket.destroy(), 1000).unref();
    this.#log.add({ kind: "close", code, reason, initiator, conversationIds });
  }

  #stop() {
    clearTimeout(this.#initTimer);
    for (const entry of this.subscriptions.values()) entry.stop();
    this.subscriptions.clear();
  }

  #closed() {
    this.#stop();
    this.#onClosed(this);
  }

  #write(bytes) { if (!this.#socket.destroyed && this.#socket.writable) this.#socket.write(bytes); }
  #send(message) { if (!this.#closing) this.#write(frame(1, Buffer.from(JSON.stringify(message)))); }

  #receive(chunk) {
    this.#buffer = this.#buffer.length ? Buffer.concat([this.#buffer, chunk]) : chunk;
    while (!this.#closing) {
      const next = this.#parse();
      if (!next) return;
      this.#frame(next);
    }
  }

  #parse() {
    const bytes = this.#buffer;
    if (bytes.length < 2) return null;
    const fin = (bytes[0] & 0x80) !== 0, reserved = bytes[0] & 0x70, opcode = bytes[0] & 0x0f;
    let length = bytes[1] & 0x7f, offset = 2;
    if (reserved) return void this.close(1002, "Reserved bits are not negotiated");
    if ((bytes[1] & 0x80) === 0) return void this.close(1002, "Client frames must be masked");
    if (length === 126) {
      if (bytes.length < 4) return null;
      length = bytes.readUInt16BE(2); offset = 4;
    } else if (length === 127) {
      if (bytes.length < 10) return null;
      const declared = bytes.readBigUInt64BE(2);
      if (declared > BigInt(MAX_MESSAGE_BYTES)) return void this.close(1009, "Message too big");
      length = Number(declared); offset = 10;
    }
    if (length > MAX_MESSAGE_BYTES) return void this.close(1009, "Message too big");
    if (bytes.length < offset + 4 + length) return null;
    const mask = bytes.subarray(offset, offset + 4);
    const payload = Buffer.from(bytes.subarray(offset + 4, offset + 4 + length));
    for (let index = 0; index < payload.length; index++) payload[index] ^= mask[index & 3];
    this.#buffer = bytes.subarray(offset + 4 + length);
    return { fin, opcode, payload };
  }

  #frame({ fin, opcode, payload }) {
    if (opcode >= 8) {
      if (!fin || payload.length > 125) return this.close(1002, "Invalid control frame");
      if (opcode === 8) {
        const code = payload.length >= 2 ? payload.readUInt16BE(0) : 1000;
        return this.close(closeCode(code) ? code : 1002, "", "client");
      }
      if (opcode === 9) return this.#write(frame(10, payload));
      if (opcode === 10) return;
      return this.close(1002, "Unknown control opcode");
    }
    if (opcode === 2) return this.close(1003, "Binary frames are not supported");
    if (opcode === 1 ? this.#fragments.length > 0 : opcode !== 0 || this.#fragments.length === 0)
      return this.close(1002, "Invalid frame sequence");
    this.#fragmentBytes += payload.length;
    if (this.#fragmentBytes > MAX_MESSAGE_BYTES) return this.close(1009, "Message too big");
    this.#fragments.push(payload);
    if (!fin) return;
    const data = Buffer.concat(this.#fragments);
    this.#fragments = []; this.#fragmentBytes = 0;
    let text;
    try { text = decoder.decode(data); } catch { return this.close(1007, "Invalid UTF-8"); }
    this.#message(text);
  }

  #message(text) {
    let message;
    try { message = JSON.parse(text); } catch { return this.close(4400, "Invalid message"); }
    if (!isRecord(message) || typeof message.type !== "string") return this.close(4400, "Invalid message");
    switch (message.type) {
      case "connection_init": return this.#init(message.payload);
      case "ping": return this.#send({ type: "pong" });
      case "pong": return;
      case "subscribe": return this.#subscribe(message);
      case "complete": {
        this.subscriptions.get(message.id)?.stop();
        this.subscriptions.delete(message.id);
        return;
      }
      default: return this.close(4400, "Unknown message type");
    }
  }

  #init(payload) {
    if (this.#state !== "new") return this.close(4429, "Too many initialisation requests");
    clearTimeout(this.#initTimer);
    try {
      if (!isRecord(payload) || typeof payload.token !== "string") throw new Problem("UNAUTHENTICATED", 401, "Missing token");
      const actor = this.#domain.authenticate("communication", `Bearer ${payload.token}`);
      if (actor.kind !== "user") throw new Problem("FORBIDDEN", 403, "Realtime requires a user session");
      this.#domain.checkContext("communication", { projectId: payload.projectId, incarnation: payload.incarnation });
      this.#actor = actor;
    } catch {
      return this.close(4403, "Forbidden");
    }
    this.#state = "ready";
    this.#send({ type: "connection_ack" });
  }

  #subscribe(message) {
    if (this.#state !== "ready") return this.close(4401, "Unauthorized");
    if (typeof message.id !== "string" || !message.id || !isRecord(message.payload))
      return this.close(4400, "Invalid subscribe message");
    if (this.subscriptions.has(message.id)) return this.close(4409, `Subscriber for ${message.id} already exists`);
    let prepared;
    try { prepared = prepareSubscription(this.#domain, this.#actor, message.payload); }
    catch (error) {
      const problem = error instanceof Problem ? error
        : new Problem("MOCK_FAILURE", 500, error instanceof Error ? error.message : "Mock failure", { outcome: "unknown" });
      const requestId = message.payload.variables?.context?.requestId;
      return this.#send({ id: message.id, type: "error",
        payload: [problemBody(problem, typeof requestId === "string" ? requestId : undefined)] });
    }
    const { conversation } = prepared;
    let lastSent = prepared.start;
    const flush = () => {
      for (;;) {
        const page = this.#domain.eventPage(conversation, lastSent, PAGE_CAPS.subscription);
        if (!page.items.length) return;
        lastSent = BigInt(page.nextCursor.sequence);
        this.#send({ id: message.id, type: "next", payload: prepared.render(page) });
      }
    };
    const listener = changed => { if (changed === conversation && !this.#closing) flush(); };
    this.#domain.bus.on("event", listener);
    this.subscriptions.set(message.id, { conversationId: conversation.conversationId,
      stop: () => this.#domain.bus.off("event", listener) });
    this.#log.add({ kind: "subscribe", conversationId: conversation.conversationId, principalId: this.#actor.principalId,
      after: message.payload.variables?.input?.after?.sequence ?? null, start: String(prepared.start) });
    flush();
  }
}

export function createRealtime({ domain, log }) {
  const connections = new Set();
  return {
    upgrade(request, socket, head) {
      const path = new URL(request.url ?? "/", "http://mock").pathname;
      const key = request.headers["sec-websocket-key"];
      const protocols = String(request.headers["sec-websocket-protocol"] ?? "").split(",").map(value => value.trim());
      if (request.method !== "GET" || path !== "/graphql" || String(request.headers.upgrade).toLowerCase() !== "websocket" ||
          request.headers["sec-websocket-version"] !== "13" || typeof key !== "string" || !protocols.includes("graphql-transport-ws")) {
        socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
        return;
      }
      const accept = createHash("sha1").update(key + ACCEPT_GUID).digest("base64");
      socket.write("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n" +
        `Sec-WebSocket-Accept: ${accept}\r\nSec-WebSocket-Protocol: graphql-transport-ws\r\n\r\n`);
      connections.add(new Connection(socket, head, { domain, log, onClosed: connection => connections.delete(connection) }));
    },
    drop({ conversationId, code = 1012, reason = "Service restart" } = {}) {
      let closed = 0;
      for (const connection of [...connections]) {
        if (conversationId && !connection.conversationIds.has(conversationId)) continue;
        connection.close(code, reason);
        closed++;
      }
      return closed;
    },
    closeAll(code = 1001) {
      for (const connection of [...connections]) connection.close(code, "Going away");
    },
  };
}
