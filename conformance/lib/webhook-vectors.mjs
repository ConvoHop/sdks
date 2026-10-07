// Generates spec/conformance/vectors/webhooks.json. Expected results are written by hand below so
// the self-check test (reference verify(vector) == expected) exercises the verifier instead of
// restating it. After editing, run `npm run generate:conformance` and commit the output.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { specFile } from "./files.mjs";
import { sign } from "./webhooks.mjs";

export const VECTOR_FILE = specFile("vectors/webhooks.json");

const NOW = 1767225600; // 2026-01-01T00:00:00Z
const TOLERANCE = 300;
// Fixture-only 32-byte keys (base64 of "fixture-key-a-for-conformance-32", "-b-", "-c-"); they protect nothing.
const SECRETS = Object.freeze({
  a: "whsec_Zml4dHVyZS1rZXktYS1mb3ItY29uZm9ybWFuY2UtMzI=",
  b: "whsec_Zml4dHVyZS1rZXktYi1mb3ItY29uZm9ybWFuY2UtMzI=",
  c: "whsec_Zml4dHVyZS1rZXktYy1mb3ItY29uZm9ybWFuY2UtMzI=",
});
const ID = "msg_conformance_0001";
// Non-ASCII text makes verifiers prove they sign the UTF-8 bytes of the raw body.
const PAYLOAD = JSON.stringify({
  type: "message.created",
  conversationId: "6f1c2a7e-0b8d-4e5f-9a3c-2d1e0f9b8a7c",
  text: "Grüße, 世界 👋",
});
const TAMPERED = PAYLOAD.replace("Grüße", "Grüsse");
const NOW_TEXT = String(NOW);

const VALID = { valid: true, code: null };
const rejected = code => ({ valid: false, code });

const v1 = (secret, { timestamp = NOW_TEXT, payload = PAYLOAD, version = "v1" } = {}) =>
  `${version},${sign({ id: ID, timestamp, payload, secret: SECRETS[secret] })}`;

const headers = (timestamp, signature, names = ["webhook-id", "webhook-timestamp", "webhook-signature"]) => {
  const values = [ID, timestamp, signature];
  return Object.fromEntries(names.flatMap((name, index) => (values[index] === undefined ? [] : [[name, values[index]]])));
};

const DEFINITIONS = [
  {
    id: "valid-single-secret",
    title: "Signed with the only configured secret",
    headers: headers(NOW_TEXT, v1("a")),
    secrets: ["a"],
    expected: VALID,
  },
  {
    id: "valid-multiple-signatures",
    title: "Any one of several space-separated signatures may match",
    headers: headers(NOW_TEXT, `${v1("c")} ${v1("a")}`),
    secrets: ["a"],
    expected: VALID,
  },
  {
    id: "valid-at-tolerance-edge",
    title: "A timestamp exactly toleranceSeconds old is accepted",
    headers: headers(String(NOW - TOLERANCE), v1("a", { timestamp: String(NOW - TOLERANCE) })),
    secrets: ["a"],
    expected: VALID,
  },
  {
    id: "rotation-new-secret",
    title: "During rotation a delivery signed with the new secret verifies",
    headers: headers(NOW_TEXT, v1("b")),
    secrets: ["b", "a"],
    expected: VALID,
  },
  {
    id: "rotation-old-secret",
    title: "During rotation a delivery signed with the previous secret still verifies",
    headers: headers(NOW_TEXT, v1("a")),
    secrets: ["b", "a"],
    expected: VALID,
  },
  {
    id: "header-names-case-insensitive",
    title: "Header names compare case-insensitively",
    headers: headers(NOW_TEXT, v1("a"), ["Webhook-Id", "WEBHOOK-TIMESTAMP", "Webhook-Signature"]),
    secrets: ["a"],
    expected: VALID,
  },
  {
    id: "wrong-secret",
    title: "A signature made with a different secret is rejected",
    headers: headers(NOW_TEXT, v1("a")),
    secrets: ["c"],
    expected: rejected("WEBHOOK_SIGNATURE_INVALID"),
  },
  {
    id: "tampered-payload",
    title: "A body that differs from the signed body is rejected",
    payload: TAMPERED,
    headers: headers(NOW_TEXT, v1("a")),
    secrets: ["a"],
    expected: rejected("WEBHOOK_SIGNATURE_INVALID"),
  },
  {
    id: "expired-timestamp",
    title: "A correctly signed delivery older than the tolerance is rejected",
    headers: headers(String(NOW - TOLERANCE - 1), v1("a", { timestamp: String(NOW - TOLERANCE - 1) })),
    secrets: ["a"],
    expected: rejected("WEBHOOK_TIMESTAMP_EXPIRED"),
  },
  {
    id: "future-timestamp",
    title: "A correctly signed delivery too far in the future is rejected",
    headers: headers(String(NOW + TOLERANCE + 1), v1("a", { timestamp: String(NOW + TOLERANCE + 1) })),
    secrets: ["a"],
    expected: rejected("WEBHOOK_TIMESTAMP_FUTURE"),
  },
  {
    id: "multiple-secrets-none-match",
    title: "Several configured secrets, none of which signed the delivery",
    headers: headers(NOW_TEXT, v1("a")),
    secrets: ["b", "c"],
    expected: rejected("WEBHOOK_SIGNATURE_INVALID"),
  },
  {
    id: "missing-signature-header",
    title: "A delivery without webhook-signature is rejected",
    headers: headers(NOW_TEXT, undefined),
    secrets: ["a"],
    expected: rejected("WEBHOOK_HEADERS_MISSING"),
  },
  {
    id: "invalid-timestamp",
    title: "A non-integer webhook-timestamp is rejected even when signed",
    headers: headers(`${NOW_TEXT}.5`, v1("a", { timestamp: `${NOW_TEXT}.5` })),
    secrets: ["a"],
    expected: rejected("WEBHOOK_TIMESTAMP_INVALID"),
  },
  {
    id: "unknown-signature-version",
    title: "Signatures with an unknown version prefix are ignored",
    headers: headers(NOW_TEXT, v1("a", { version: "v2" })),
    secrets: ["a"],
    expected: rejected("WEBHOOK_SIGNATURE_INVALID"),
  },
];

export function buildWebhookVectors() {
  return {
    $schema: "../webhook-vectors.schema.json",
    description: "Generated by conformance/lib/webhook-vectors.mjs; do not edit by hand. Secrets are fixture-only.",
    scheme: "standard-webhooks-v1",
    vectors: DEFINITIONS.map(definition => ({
      id: definition.id,
      title: definition.title,
      payload: definition.payload ?? PAYLOAD,
      headers: definition.headers,
      secrets: definition.secrets.map(name => SECRETS[name]),
      nowSeconds: NOW,
      toleranceSeconds: TOLERANCE,
      expected: definition.expected,
    })),
  };
}

export const serializeWebhookVectors = document => `${JSON.stringify(document, null, 2)}\n`;

const invokedDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const text = serializeWebhookVectors(buildWebhookVectors());
  if (process.argv.includes("--write")) {
    await mkdir(dirname(VECTOR_FILE), { recursive: true });
    await writeFile(VECTOR_FILE, text);
    process.stdout.write(`wrote ${VECTOR_FILE}\n`);
  } else {
    process.stdout.write(text);
  }
}
