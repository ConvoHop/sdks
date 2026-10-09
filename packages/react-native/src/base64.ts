const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const values = new Map([...alphabet].map((character, index) => [character, index]));

/** Decodes canonical, padded standard base64, as native code produces it. Throws a `TypeError` for anything else. */
export function decodeBase64(text: string): Uint8Array {
  if (text.length % 4 !== 0) throw new TypeError("Invalid base64");
  const padding = text.endsWith("==") ? 2 : text.endsWith("=") ? 1 : 0;
  const bytes = new Uint8Array(text.length / 4 * 3 - padding);
  let buffer = 0, bits = 0, length = 0;
  for (let index = 0; index < text.length - padding; index++) {
    const value = values.get(text[index]!);
    if (value === undefined) throw new TypeError("Invalid base64");
    buffer = (buffer << 6 | value) & 0xffffff;
    bits += 6;
    if (bits >= 8) { bits -= 8; bytes[length++] = buffer >> bits & 0xff; }
  }
  // Canonical encodings leave the unused low bits of the last character zero.
  if ((buffer & (1 << bits) - 1) !== 0) throw new TypeError("Invalid base64");
  return bytes;
}
