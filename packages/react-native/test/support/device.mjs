// A phone for launching an app again and again. AsyncStorage's native storage and the network outlive each launch, as
// does the ConvoHop authority the app talks to. app.mjs is one launch.
import { randomUUID } from "node:crypto";
import { full } from "../../../../test/graphql-fixtures.mjs";
import { operationCatalog } from "../../../core/dist/generated/operations.js";

const operations = new Map(Object.values(operationCatalog).map(operation => [operation.operationName, operation]));
const unreachable = () => new TypeError("Network request failed");
let launches = 0;

/**
 * AsyncStorage's native module, RNAsyncStorage, whose databases outlive launches. Calls complete one at a time, in
 * the order they were made, each in a later turn of the event loop. A killed launch's calls never complete.
 */
class Storage {
  #databases = new Map();
  #queue = [];
  #holds = new Set();
  #scheduled = false;
  /** Database `name`'s values by key. */
  database(name = "convohop") {
    if (!this.#databases.has(name)) this.#databases.set(name, new Map());
    return this.#databases.get(name);
  }
  /**
   * Stops the queue at the first call `matches(method, keys)` accepts, so the calls after it wait too, until
   * `release()`. `held` says whether such a call is waiting.
   */
  hold(matches) {
    const queue = () => this.#queue, hold = {
      matches,
      get held() { const call = queue()[0]; return call !== undefined && matches(call.method, call.keys); },
      release: () => { this.#holds.delete(hold); this.#schedule(); },
    };
    this.#holds.add(hold);
    return hold;
  }
  /** The module `launch` links as RNAsyncStorage. */
  bind(launch) {
    const call = (method, keys, run) => new Promise((resolve, reject) => {
      if (launch.dead) return;
      this.#queue.push({ launch, method, keys, run, resolve, reject });
      this.#schedule();
    });
    const legacy = async () => { throw new Error("The app uses createAsyncStorage, not the legacy storage"); };
    return {
      getValues: (db, keys) => call("getValues", keys, () => keys.map(key => ({ key, value: this.database(db).get(key) ?? null }))),
      setValues: (db, values) => call("setValues", values.map(({ key }) => key), () => {
        for (const { key, value } of values) {
          if (typeof value !== "string" && value !== null) throw new TypeError(`AsyncStorage stores strings, not ${typeof value}`);
          if (value === null) this.database(db).delete(key); else this.database(db).set(key, value);
        }
        return values;
      }),
      removeValues: (db, keys) => call("removeValues", keys, () => { for (const key of keys) this.database(db).delete(key); }),
      getKeys: db => call("getKeys", [], () => [...this.database(db).keys()]),
      clearStorage: db => call("clearStorage", [], () => { this.database(db).clear(); }),
      legacy_multiGet: legacy, legacy_multiSet: legacy, legacy_multiRemove: legacy, legacy_multiMerge: legacy,
      legacy_getAllKeys: legacy, legacy_clear: legacy,
    };
  }
  /** Whether every call made so far has completed. */
  get idle() { return this.#queue.length === 0 && !this.#scheduled; }
  /** Forgets a killed launch's calls, including one a hold stopped at. */
  drop(launch) {
    this.#queue = this.#queue.filter(call => call.launch !== launch);
    this.#schedule();
  }
  #schedule() {
    if (this.#scheduled) return;
    this.#scheduled = true;
    setImmediate(() => {
      this.#scheduled = false;
      const call = this.#queue[0];
      if (!call || [...this.#holds].some(hold => hold.matches(call.method, call.keys))) return;
      this.#queue.shift();
      try { call.resolve(call.run()); } catch (error) { call.reject(error); }
      this.#schedule();
    });
  }
}

/** The device's connection, which NetInfo reports to each launch. */
class Network {
  #listeners = new Set();
  constructor(online) { this.online = online; }
  set(online) {
    this.online = online;
    for (const entry of [...this.#listeners]) if (!entry.launch.dead) entry.listener({ isConnected: online });
  }
  /** NetInfo's default export in `launch`. A new listener gets the state at once, as once NetInfo knows it. */
  bind(launch) {
    return {
      addEventListener: listener => {
        const entry = { launch, listener };
        this.#listeners.add(entry);
        listener({ isConnected: this.online });
        return () => { this.#listeners.delete(entry); };
      },
    };
  }
}

/**
 * A ConvoHop authority that commits each request ID at most once. `onSend(request)` runs as a send arrives, before the
 * authority commits it; a promise it returns holds the reply back.
 */
class Authority {
  sends = [];
  resolves = [];
  /** The message acknowledgement of each committed request ID. */
  committed = new Map();
  onSend = undefined;
  #account; #network; #sequence = 0;
  #inFlight = new Map();
  constructor(account, network) { this.#account = account; this.#network = network; }
  commit(request) {
    const { requestId } = request.variables.context, { conversationId } = request.variables.input;
    if (!this.committed.has(requestId)) {
      const sequence = String(++this.#sequence);
      this.committed.set(requestId, { messageId: randomUUID(), conversationId, sequence, revision: "1", status: "sent",
        cursor: { incarnation: this.#account.incarnation, conversationId, sequence } });
    }
    return this.committed.get(requestId);
  }
  /** React Native's fetch in `launch`, which answers with the members the transport reads. */
  bind(launch) {
    return (url, init) => new Promise((resolve, reject) => {
      if (launch.dead || !this.#network.online) { reject(unreachable()); return; }
      const inFlight = this.#inFlight.get(launch) ?? new Set(), fail = () => reject(unreachable());
      this.#inFlight.set(launch, inFlight.add(fail));
      init.signal?.addEventListener("abort", () => reject(new TypeError("Aborted")), { once: true });
      this.#answer(url, JSON.parse(init.body)).then(resolve, reject).finally(() => inFlight.delete(fail));
    });
  }
  /** Fails a killed launch's requests in flight. */
  drop(launch) {
    for (const fail of this.#inFlight.get(launch) ?? []) fail();
    this.#inFlight.delete(launch);
  }
  async #answer(url, request) {
    const operation = operations.get(request.operationName), now = new Date().toISOString();
    let result;
    if (request.operationName === "CommunicationSendMessage") {
      this.sends.push(request);
      await this.onSend?.(request);
      result = this.commit(request);
    } else if (request.operationName === "CommunicationResolveRequest") {
      this.resolves.push(request);
      const { requestId } = request.variables.input, ack = this.committed.get(requestId);
      result = full("RequestResolution", { state: ack ? "committed" : "notObservedYet", requestId, checkedAt: now,
        resultWithheld: false, receipt: ack ? full("ResolvedReceipt", { status: "committed", requestId, receiptId: randomUUID(),
          committedAt: now, replayed: false, result: full("RetainedResult", { messageAck: ack }) }) : null });
    } else throw new Error(`Unexpected ${request.operationName}`);
    const body = JSON.stringify({ data: { [operation.field]: full(operation.resultType.replace(/!$/, ""), {
      status: operation.kind === "mutation" ? "committed" : "ok", requestId: request.variables.context.requestId,
      serverTime: now, receiptId: randomUUID(), committedAt: now, replayed: false, result }) } });
    return { ok: true, status: 200, redirected: false, url, headers: { get: () => null }, text: async () => body };
  }
}

/**
 * A phone with the app installed and one user's account. `launch()` starts the app with its own modules. Killing a
 * launch ends it at once, without its cleanup: its storage calls and requests in flight never complete.
 */
export function device({ online = true } = {}) {
  const account = { baseUrl: "https://chat.example.test", projectId: randomUUID(), principalId: randomUUID(),
    incarnation: randomUUID(), sessionToken: "fixture-session" };
  const storage = new Storage(), network = new Network(online), authority = new Authority(account, network);
  const user = `${account.projectId}:${account.principalId}`;
  const phone = {
    account, storage, network, authority,
    /** The storage keys of the user's outbox slots and the transport's recovery records. */
    keys: { outbox: `convohop.outbox:${user}`, requests: `convohop.requests:${user}` },
    /** The value stored under `key`, or null. */
    read: key => storage.database().get(key) ?? null,
    async launch() {
      const launch = { dead: false };
      const { start } = await import(`./app.mjs?context=${++launches}`);
      const app = await start(phone, launch);
      let stopped = false;
      const stop = () => { if (!stopped) { stopped = true; app.stop(); } };
      return {
        open: app.open,
        signOut: app.signOut,
        stop,
        kill() {
          launch.dead = true;
          storage.drop(launch);
          authority.drop(launch);
          // A killed process runs no timers; storage and requests are already cut off, so nothing else can happen.
          stop();
        },
      };
    },
  };
  return phone;
}
