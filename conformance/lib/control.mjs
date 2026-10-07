// Client for the optional target control API (spec/conformance/targets.md#control-api).
export class ControlError extends Error {
  constructor(message) { super(message); this.name = "ControlError"; }
}

export class ControlClient {
  constructor(baseUrl) { this.baseUrl = baseUrl.replace(/\/+$/, ""); }

  async #call(method, path, body, timeoutMs = 10_000) {
    let response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, { method, signal: AbortSignal.timeout(timeoutMs),
        ...(body === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }) });
    } catch (error) {
      throw new ControlError(`control ${path} failed: ${error instanceof Error ? error.message : error}`);
    }
    const text = await response.text();
    let payload;
    try { payload = text ? JSON.parse(text) : {}; } catch { payload = { error: text.slice(0, 200) }; }
    return { status: response.status, payload };
  }

  async #expectOk(method, path, body, timeoutMs) {
    const { status, payload } = await this.#call(method, path, body, timeoutMs);
    if (status !== 200) throw new ControlError(`control ${path} returned HTTP ${status}: ${JSON.stringify(payload).slice(0, 300)}`);
    return payload;
  }

  reset() { return this.#expectOk("POST", "/reset", {}); }

  fault({ plane, field, action, retryAfterSeconds }) {
    return this.#expectOk("POST", "/fault", { ...(plane === undefined ? {} : { plane }), field, action,
      ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }) });
  }

  async realtimeDrop({ conversationId, code, reason }) {
    const payload = await this.#expectOk("POST", "/realtime/drop", { ...(conversationId === undefined ? {} : { conversationId }),
      ...(code === undefined ? {} : { code }), ...(reason === undefined ? {} : { reason }) });
    if (!Number.isSafeInteger(payload.closed)) throw new ControlError("control /realtime/drop did not report how many sockets closed");
    return { closed: payload.closed };
  }

  async waitLog({ kind, match = {}, count = 1, timeoutMs = 5000 }) {
    const { status, payload } = await this.#call("POST", "/log/wait", { kind, match, count, timeoutMs }, timeoutMs + 5000);
    if (status === 408) {
      const seen = Array.isArray(payload.entries) ? payload.entries.length : 0;
      throw new ControlError(`timed out after ${timeoutMs} ms waiting for ${count} ${kind} log entries matching ` +
        `${JSON.stringify(match)} (saw ${seen})`);
    }
    if (status !== 200 || !Array.isArray(payload.entries))
      throw new ControlError(`control /log/wait returned HTTP ${status}: ${JSON.stringify(payload).slice(0, 300)}`);
    return payload;
  }
}
