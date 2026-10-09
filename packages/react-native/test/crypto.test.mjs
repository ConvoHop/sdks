import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash, randomBytes as nodeRandomBytes } from "node:crypto";
import { decodeBase64 } from "../dist/base64.js";
import { getRandomValues, installCrypto, randomBytes, randomUUID } from "../dist/random.js";
import { sha256, sha256Digest } from "../dist/sha256.js";
import { linkPlatform } from "./support/native.mjs";

const hex = bytes => Buffer.from(bytes).toString("hex");
const ascii = text => Uint8Array.from(text, character => character.charCodeAt(0));
const filled = byte => ({ getRandomBytes: length => Buffer.alloc(length, byte).toString("base64") });

test("SHA-256 matches the FIPS 180-4 examples and node:crypto across every padding boundary", async () => {
  const examples = [
    ["", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
    ["abc", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"],
    ["abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq", "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1"],
    ["abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu",
      "cf5b16a778af8380036ce59e7b0492370b249b11e8f07a51afac45037afee9d1"],
  ];
  for (const [text, digest] of examples) assert.equal(hex(sha256Digest(ascii(text))), digest, JSON.stringify(text));
  assert.equal(hex(sha256Digest(new Uint8Array(1_000_000).fill(0x61))), "cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0");
  for (let length = 0; length <= 300; length++) {
    const data = nodeRandomBytes(length);
    assert.equal(hex(sha256Digest(data)), createHash("sha256").update(data).digest("hex"), `${length} bytes`);
  }
  const backing = nodeRandomBytes(100), view = new Uint8Array(backing.buffer, backing.byteOffset + 10, 50);
  assert.equal(hex(sha256Digest(view)), createHash("sha256").update(view).digest("hex"), "a view hashes only its own bytes");
  const digest = await sha256(ascii("abc"));
  assert.ok(digest instanceof Uint8Array);
  assert.equal(hex(digest), examples[1][1]);
  for (const value of [ascii("abc").buffer, "abc", [97, 98, 99], null, new DataView(new ArrayBuffer(3))])
    await assert.rejects(sha256(value), { name: "TypeError", message: "sha256 needs a Uint8Array" });
});

test("base64 decoding accepts only canonical, padded standard base64", () => {
  for (let length = 0; length <= 70; length++) {
    const bytes = nodeRandomBytes(length);
    assert.deepEqual(decodeBase64(bytes.toString("base64")), new Uint8Array(bytes), `${length} bytes`);
  }
  assert.deepEqual(decodeBase64("QUI="), ascii("AB"));
  assert.deepEqual(decodeBase64("+/+/"), new Uint8Array([0xfb, 0xff, 0xbf]));
  for (const text of ["A", "QQ", "QQ=", "Q===", "====", "QR==", "QUJ=", "QU=D", "QUJD====", "QUJD\n", " QUJ", "QU-_",
    "QU+-", "\uff31\uff35\uff2a\uff24"])
    assert.throws(() => decodeBase64(text), { name: "TypeError", message: "Invalid base64" }, JSON.stringify(text));
});

test("random bytes come from the native generator, which must return exactly what was asked", () => {
  const platform = linkPlatform();
  assert.equal(randomBytes(32).length, 32);
  assert.equal(randomBytes(65536).length, 65536);
  assert.deepEqual(platform.log, [["getRandomBytes", 32], ["getRandomBytes", 65536]]);
  for (const length of [0, -1, 65537, 1.5, NaN, Infinity, "16", 16n, undefined])
    assert.throws(() => randomBytes(length), { name: "RangeError", message: "length must be 1..65536" }, String(length));
  for (const output of [undefined, null, 42, "", "not base64", "QR==", Buffer.alloc(15).toString("base64"),
    Buffer.alloc(17).toString("base64"), Promise.resolve(Buffer.alloc(16).toString("base64"))]) {
    linkPlatform({ getRandomBytes: () => output });
    assert.throws(() => randomBytes(16), { name: "TypeError", message: "ConvoHopPlatform.getRandomBytes returned malformed bytes" });
  }
});

test("getRandomValues fills integer typed arrays the way Web Crypto does", () => {
  const platform = linkPlatform(filled(0xab));
  for (const Type of [Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array,
    BigInt64Array, BigUint64Array]) {
    const array = new Type(4);
    assert.equal(getRandomValues(array), array);
    assert.deepEqual(new Uint8Array(array.buffer), new Uint8Array(4 * Type.BYTES_PER_ELEMENT).fill(0xab), Type.name);
  }
  const backing = new Uint8Array(12);
  getRandomValues(new Uint32Array(backing.buffer, 4, 1));
  assert.deepEqual([...backing], [0, 0, 0, 0, 0xab, 0xab, 0xab, 0xab, 0, 0, 0, 0], "only the view's bytes change");
  platform.log.length = 0;
  assert.equal(getRandomValues(new Uint8Array(0)).length, 0);
  assert.deepEqual(platform.log, [], "an empty array needs no native call");
  assert.equal(getRandomValues(new Uint16Array(32768)).length, 32768);
  assert.throws(() => getRandomValues(new Uint8Array(65537)),
    error => error.name === "QuotaExceededError" && !(error instanceof TypeError) && /at most 65536 bytes/.test(error.message));
  for (const value of [new Float32Array(4), new Float64Array(4), new DataView(new ArrayBuffer(4)), new ArrayBuffer(4), [1, 2],
    null, undefined])
    assert.throws(() => getRandomValues(value), error => error instanceof TypeError && error.name === "TypeMismatchError");
});

test("random UUIDs are version 4 with the RFC 9562 variant, from secure bytes", () => {
  linkPlatform(filled(0xff));
  assert.equal(randomUUID(), "ffffffff-ffff-4fff-bfff-ffffffffffff");
  linkPlatform(filled(0));
  assert.equal(randomUUID(), "00000000-0000-4000-8000-000000000000");
  const platform = linkPlatform(), seen = new Set();
  for (let index = 0; index < 100; index++) {
    const id = randomUUID();
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    seen.add(id);
  }
  assert.equal(seen.size, 100);
  assert.ok(platform.log.every(([name, length]) => name === "getRandomBytes" && length === 16));
});

/** Replaces the global `crypto` for one test. `undefined` removes it. */
function replaceCrypto(t, value) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "crypto", original);
    else delete globalThis.crypto;
  });
  if (value === undefined) delete globalThis.crypto;
  else Object.defineProperty(globalThis, "crypto", typeof value === "function" ? { get: value, configurable: true }
    : { value, configurable: true, writable: true });
}

test("installCrypto gives a runtime without crypto the secure functions", t => {
  replaceCrypto(t, undefined);
  linkPlatform(filled(0));
  installCrypto();
  assert.equal(globalThis.crypto.getRandomValues, getRandomValues);
  assert.equal(globalThis.crypto.randomUUID, randomUUID);
  assert.equal(globalThis.crypto.randomUUID(), "00000000-0000-4000-8000-000000000000");
  const descriptor = Object.getOwnPropertyDescriptor(globalThis.crypto, "randomUUID");
  assert.equal(descriptor.configurable && descriptor.writable, true, "a later polyfill can still replace it");
});

test("installCrypto keeps existing functions and leaves crypto it can't extend alone", t => {
  const webCrypto = globalThis.crypto, { getRandomValues: nodeValues, randomUUID: nodeUUID } = webCrypto;
  installCrypto();
  assert.equal(globalThis.crypto, webCrypto);
  assert.equal(webCrypto.getRandomValues, nodeValues);
  assert.equal(webCrypto.randomUUID, nodeUUID);

  const existing = () => {}, partial = { getRandomValues: existing };
  replaceCrypto(t, partial);
  installCrypto();
  assert.equal(partial.getRandomValues, existing);
  assert.equal(partial.randomUUID, randomUUID);

  const frozen = Object.freeze({});
  globalThis.crypto = frozen;
  assert.doesNotThrow(installCrypto);
  assert.deepEqual(Object.keys(frozen), []);
  globalThis.crypto = null;
  assert.doesNotThrow(installCrypto);
  assert.equal(globalThis.crypto, null);
  const locked = Object.defineProperty({}, "randomUUID", { value: "not a function", enumerable: true });
  globalThis.crypto = locked;
  assert.doesNotThrow(installCrypto);
  assert.equal(locked.randomUUID, "not a function");
});

test("installCrypto doesn't throw when another polyfill's crypto getter does", t => {
  replaceCrypto(t, () => { throw new Error("polyfill failed"); });
  assert.doesNotThrow(installCrypto);
});
