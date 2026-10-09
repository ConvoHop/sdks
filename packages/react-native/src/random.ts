import { decodeBase64 } from "./base64.js";
import { platformModule } from "./native.js";

const maxBytes = 65536;

/** `length` (1–65536) bytes from the platform's cryptographically secure generator. */
export function randomBytes(length: number): Uint8Array {
  if (!Number.isInteger(length) || length < 1 || length > maxBytes) throw new RangeError(`length must be 1..${maxBytes}`);
  const encoded: unknown = platformModule().getRandomBytes(length);
  let bytes: Uint8Array | undefined;
  try { if (typeof encoded === "string") bytes = decodeBase64(encoded); } catch { bytes = undefined; }
  if (bytes?.length !== length) throw new TypeError("ConvoHopPlatform.getRandomBytes returned malformed bytes");
  return bytes;
}

type IntegerArray = Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array |
  BigInt64Array | BigUint64Array;
const integerArrays: Function[] = [Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array];
for (const name of ["BigInt64Array", "BigUint64Array"] as const) {
  const type = (globalThis as Record<string, unknown>)[name];
  if (typeof type === "function") integerArrays.push(type);
}

function named<E extends Error>(error: E, name: string): E {
  Object.defineProperty(error, "name", { value: name, configurable: true, writable: true });
  return error;
}

/**
 * Fills an integer typed array with secure random values, as Web Crypto's `getRandomValues` does. Hermes has no
 * `DOMException`, so the errors are a `TypeError` named `TypeMismatchError` and an `Error` named `QuotaExceededError`.
 */
export function getRandomValues<T extends ArrayBufferView>(array: T): T {
  if (!integerArrays.some(type => array instanceof type))
    throw named(new TypeError("getRandomValues needs an integer typed array"), "TypeMismatchError");
  const target = array as unknown as IntegerArray;
  if (target.byteLength > maxBytes) throw named(new Error(`getRandomValues fills at most ${maxBytes} bytes`), "QuotaExceededError");
  if (target.byteLength > 0) new Uint8Array(target.buffer, target.byteOffset, target.byteLength).set(randomBytes(target.byteLength));
  return array;
}

/** A random (version 4) UUID in canonical lowercase form. */
export function randomUUID(): string {
  const bytes = randomBytes(16);
  bytes[6] = bytes[6]! & 0x0f | 0x40;
  bytes[8] = bytes[8]! & 0x3f | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Gives the global `crypto` the secure `getRandomValues` and `randomUUID` where the runtime lacks them. LiveKit's
 * React Native globals otherwise fill `crypto.randomUUID` from `Math.random`. Existing functions are kept.
 */
export function installCrypto(): void {
  const scope = globalThis as { crypto?: unknown };
  try {
    if (scope.crypto === undefined)
      Object.defineProperty(globalThis, "crypto", { value: {}, configurable: true, writable: true });
    const crypto = scope.crypto as Record<string, unknown> | null | undefined;
    if (crypto === null || typeof crypto !== "object" || !Object.isExtensible(crypto)) return;
    for (const [name, value] of [["getRandomValues", getRandomValues], ["randomUUID", randomUUID]] as const)
      if (typeof crypto[name] !== "function")
        Object.defineProperty(crypto, name, { value, configurable: true, writable: true });
  } catch {
    // A frozen or accessor-defined `crypto` belongs to another polyfill; leave it as it is.
  }
}
