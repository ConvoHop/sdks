# Webhook signatures

ConvoHop signs webhook deliveries with the
[Standard Webhooks](https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md)
v1 scheme (HMAC-SHA256). Every server SDK must verify deliveries in the same
way, so the conformance suite has a set of shared test vectors,
[`vectors/webhooks.json`](vectors/webhooks.json), defined by
[`webhook-vectors.schema.json`](webhook-vectors.schema.json). The
`webhooks` suite runs one scenario per vector through each driver's
[`webhooks.verify`](driver-protocol.md#webhooksverify) method. It is
offline: no target or network is involved.

## Scheme

A delivery carries three headers:

| Header | Value |
| --- | --- |
| `webhook-id` | The delivery's unique id. It stays the same when a delivery is retried. |
| `webhook-timestamp` | When the delivery was signed, in Unix seconds. |
| `webhook-signature` | One or more space-separated signatures, each `<version>,<base64 signature>`. |

An endpoint secret is `whsec_` followed by base64. The signing key is the
base64-decoded part after the prefix. The signature is the base64 of
HMAC-SHA256, with that key, over the UTF-8 bytes of

```text
<webhook-id>.<webhook-timestamp>.<raw body>
```

where the raw body is the request body exactly as received. Verify it
before parsing or re-serializing anything, because any change to the bytes
invalidates the signature.

## Verification

Header names compare case-insensitively. Each header must appear once,
with a non-empty value. Verifiers check, in this order, and stop at the
first failure:

| Step | Failure code |
| --- | --- |
| 1. All three headers are present. | `WEBHOOK_HEADERS_MISSING` |
| 2. `webhook-timestamp` is 1 to 15 ASCII digits. | `WEBHOOK_TIMESTAMP_INVALID` |
| 3. The timestamp is at most `toleranceSeconds` before now. | `WEBHOOK_TIMESTAMP_EXPIRED` |
| 4. The timestamp is at most `toleranceSeconds` after now. | `WEBHOOK_TIMESTAMP_FUTURE` |
| 5. At least one `v1` signature matches at least one secret. | `WEBHOOK_SIGNATURE_INVALID` |

A delivery that passes every step is valid: `{"valid": true, "code": null}`.
A failure is `{"valid": false, "code": <failure code>}`.

- **Tolerance.** A timestamp exactly `toleranceSeconds` away from now is
  accepted. SDKs should default to 300 seconds (5 minutes), and verifiers
  should take the clock as an input so it can be fixed in tests.
- **Versions.** Only `v1` signatures count. Entries with any other version,
  or without a comma, are ignored, so a header with no `v1` entry fails
  with `WEBHOOK_SIGNATURE_INVALID`.
- **Multiple secrets.** During secret rotation an endpoint has more than
  one secret, and the delivery may carry a signature from each. The
  delivery is valid if any `v1` signature matches any secret.
- **Constant time.** Compare signatures in constant time, to avoid leaking
  how much of a forged signature is correct.

Verification only proves that ConvoHop sent the delivery recently. Use
`webhook-id` to discard duplicate deliveries.

## Vectors

Every vector has a `payload`, `headers`, one or more `secrets`, the
verifier clock `nowSeconds`, `toleranceSeconds` and the `expected` result.
They share one delivery id (`msg_conformance_0001`), one JSON payload with
non-ASCII text (so verifiers must sign UTF-8 bytes), a clock of
1767225600 (2026-01-01T00:00:00Z) and a tolerance of 300 seconds.

| Vector | Expected | Checks |
| --- | --- | --- |
| `valid-single-secret` | valid | A delivery signed with the only secret. |
| `valid-multiple-signatures` | valid | Two signatures; only the second matches the secret. |
| `valid-at-tolerance-edge` | valid | A timestamp exactly `toleranceSeconds` old. |
| `rotation-new-secret` | valid | Two secrets; the delivery is signed with the new one. |
| `rotation-old-secret` | valid | Two secrets; the delivery is signed with the previous one. |
| `header-names-case-insensitive` | valid | Header names in mixed case. |
| `wrong-secret` | `WEBHOOK_SIGNATURE_INVALID` | Signed with a different secret. |
| `tampered-payload` | `WEBHOOK_SIGNATURE_INVALID` | The body was changed after signing. |
| `expired-timestamp` | `WEBHOOK_TIMESTAMP_EXPIRED` | Correctly signed, one second older than the tolerance. |
| `future-timestamp` | `WEBHOOK_TIMESTAMP_FUTURE` | Correctly signed, one second further ahead than the tolerance. |
| `multiple-secrets-none-match` | `WEBHOOK_SIGNATURE_INVALID` | Two secrets, neither of which signed the delivery. |
| `missing-signature-header` | `WEBHOOK_HEADERS_MISSING` | No `webhook-signature` header. |
| `invalid-timestamp` | `WEBHOOK_TIMESTAMP_INVALID` | A fractional timestamp, even though it is signed. |
| `unknown-signature-version` | `WEBHOOK_SIGNATURE_INVALID` | A correct signature labelled `v2`. |

The secrets are fixture values that protect nothing.

[`conformance/lib/webhooks.mjs`](../../conformance/lib/webhooks.mjs) is the
reference verifier. It is not an SDK: it exists to generate the vectors and
check them. The expected results are written by hand in
[`conformance/lib/webhook-vectors.mjs`](../../conformance/lib/webhook-vectors.mjs),
and the conformance tests check that the reference verifier agrees with
every vector and that the committed file matches the generator. To add or
change a vector, edit the generator, then run:

```sh
npm run generate:conformance
```

## Drivers

A driver that declares the `webhooks.verify` feature passes each vector's
inputs to its SDK's verifier and returns the result. The TypeScript
reference driver uses `webhooks.verifySignature()` from `@convohop/server`.
It maps that SDK's finer
[error codes](../../packages/server/README.md#webhooks) onto the failure
codes above:

| `@convohop/server` code | Failure code |
| --- | --- |
| `MISSING_HEADER`, `INVALID_HEADER` (a repeated header) | `WEBHOOK_HEADERS_MISSING` |
| `INVALID_TIMESTAMP` | `WEBHOOK_TIMESTAMP_INVALID` |
| `TIMESTAMP_EXPIRED` | `WEBHOOK_TIMESTAMP_EXPIRED` |
| `TIMESTAMP_FUTURE` | `WEBHOOK_TIMESTAMP_FUTURE` |
| `NO_MATCHING_SIGNATURE`, `BODY_TOO_LARGE`, `TOO_MANY_SIGNATURES` | `WEBHOOK_SIGNATURE_INVALID` |

The SDK also rejects bodies over 4096 bytes and headers with more than 8
signatures, which ConvoHop never sends, so those deliveries cannot carry a
valid signature. An `INVALID_SECRET` is a configuration error, not a
failed delivery, so the driver reports it as `INVALID_PARAMS`.
