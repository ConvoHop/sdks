# ConvoHop CLI

`convohop` is the command-line interface for ConvoHop project operators. It
logs in to the management authority, shows and creates projects, issues,
redeems and revokes backend keys, follows and replays webhook deliveries,
builds push payloads from a signed notification webhook, and runs any
operation in the schema with `convohop call`. It's built on `@convohop/server`.
`tools/sdkgen` generates its operation catalog from the shared schema and its
annotations.

It runs only in trusted Node.js 22+ runtimes, because it holds a portal token
and backend keys. The package isn't released yet: run it from a checkout of
this repository. License: [Apache-2.0](LICENSE).

## Run it

```sh
npm ci
npm run build -w packages/cli
alias convohop="node $PWD/packages/cli/dist/bin.js"
convohop --help
```

`convohop COMMAND --help` shows a command's options. Data goes to stdout as
JSON, and diagnostics go to stderr.

| Exit code | Meaning |
| --- | --- |
| 0 | Success. |
| 1 | Failure, such as a rejected request. |
| 2 | Usage error: wrong or missing options or settings. |
| 3 | Unknown outcome: the authority may or may not have the request. |
| 130 | Interrupted. |

## Log in

```sh
convohop login --management-url https://management.example.com \
  --communication-url https://communication.example.com
```

`login` reads the portal token at a hidden prompt, or from standard input when
you pipe it in. It checks the token with the management authority (skip that
with `--no-verify`) and saves it for the profile. It never takes the token as
an argument, so the token stays out of shell history and process listings.

The token goes to the OS credential store: the macOS login keychain, or the
Secret Service (GNOME Keyring, KWallet) through `secret-tool` on Linux. Where
neither works, or with `--credential-store file`, it goes to
`credentials.json` in the configuration directory, created readable only by
you. The profile's URLs go to `config.json` in the same directory. That
directory is `CONVOHOP_CONFIG_DIR`, else `$XDG_CONFIG_HOME/convohop`, else
`~/Library/Application Support/convohop` on macOS, `%APPDATA%\convohop` on
Windows and `~/.config/convohop` elsewhere.

`convohop status` shows the profile, its authorities and where the token comes
from, without the token. `convohop logout` removes the profile and its token.
`--profile NAME` or `CONVOHOP_PROFILE` selects a profile.

Environment variables take precedence over the profile:

| Variable | Meaning |
| --- | --- |
| `CONVOHOP_MANAGEMENT_URL` | Management authority origin. |
| `CONVOHOP_COMMUNICATION_URL` | Communication authority origin, which redeeming credentials and `call` with communication operations need. |
| `CONVOHOP_PORTAL_TOKEN` or `CONVOHOP_PORTAL_TOKEN_FILE` | Portal token for management commands, or a file that holds it. |
| `CONVOHOP_BACKEND_KEY` or `CONVOHOP_BACKEND_KEY_FILE` | Backend key for communication operations, or a file that holds it. |
| `CONVOHOP_PROJECT_ID`, `CONVOHOP_INCARNATION` | The project and incarnation of communication operations. |
| `CONVOHOP_WEBHOOK_SECRET` or `CONVOHOP_WEBHOOK_SECRET_FILE` | The endpoint secret that `push test` signs with. |
| `CONVOHOP_PROFILE` | The profile to use. Default: `default`. |
| `CONVOHOP_CONFIG_DIR` | The configuration directory. |

Prefer the `_FILE` variables, which keep secrets out of your environment
listing and shell history.

## Commands

| Command | What it does |
| --- | --- |
| `login`, `logout`, `status` | Save, remove or show a profile's portal token and authorities. |
| `projects get`, `projects create`, `projects usage` | Show a project with its incarnation, create one in a deployment, or show its metered usage. |
| `operation get` | Show a management operation, such as a project creation or a key issue, and its steps. |
| `resolve` | Look up a request whose outcome is unknown, without sending it again. |
| `keys issue`, `keys scopes`, `keys revoke` | Issue a backend key, list the scopes a key can grant, or revoke a key. |
| `redeem` | Redeem a credential delivery into a file and acknowledge it. |
| `webhooks list`, `webhooks deliveries` | List a project's webhook endpoints, or an endpoint's recent deliveries. |
| `webhooks tail` | Follow an endpoint's deliveries as JSON lines. |
| `webhooks replay` | Redeliver one delivery, or the deliveries in a time range. |
| `push test` | Build the push payloads for a signed notification webhook, without sending a push. |
| `call` | Run any operation in the schema by its ID. |

```sh
convohop projects get --project 6f1c2a7e-0b8d-4e5f-9a3c-2d1e0f9b8a7c

# Issue a key and redeem it into a new file that only you can read.
convohop keys issue --project 6f1c2a7e-0b8d-4e5f-9a3c-2d1e0f9b8a7c --name chat-backend \
  --scope conversationManage --scope messageWrite --expires-in 90d --out ./backend-key

convohop webhooks tail --project 6f1c2a7e-0b8d-4e5f-9a3c-2d1e0f9b8a7c \
  --endpoint 0b8d4e5f-9a3c-4d1e-8f9b-8a7c6f1c2a7e
convohop webhooks replay --project 6f1c2a7e-0b8d-4e5f-9a3c-2d1e0f9b8a7c \
  --endpoint 0b8d4e5f-9a3c-4d1e-8f9b-8a7c6f1c2a7e --since 2026-10-08T00:00:00Z

convohop push test --type call --bundle-id com.example.chat
convohop call --list
convohop call management.projectUsage --help
convohop call management.projectUsage --input '{"projectId": "6f1c2a7e-0b8d-4e5f-9a3c-2d1e0f9b8a7c"}'
```

`convohop keys scopes` lists the scopes a key can grant. `convohop call
OPERATION --help` shows an operation's input, credentials, scopes and
idempotency from the schema's annotations.

### Keys and credential deliveries

`keys issue` never prints the key. With `--out FILE`, it waits for the key's
credential delivery, redeems the key into `FILE` and acknowledges the
delivery. `FILE` must not exist; convohop creates it readable only by you.
Without `--out`, it prints the request and the `convohop redeem` command that
redeems the key later. A delivery can be redeemed once.

`keys revoke` and the destructive operations of `call` ask before they run;
`--yes` skips the question. Destructive operations are the ones the schema
annotates `destructive`.

### Webhooks

`webhooks tail` polls the endpoint's deliveries every `--interval` seconds
(default 5) and prints each new or changed delivery as a line of JSON:
`{"change": "new" or "changed", "delivery": ...}`. The first poll prints every
delivery the authority returns. Ctrl-C stops it.

`webhooks replay` needs `--effect` or a time range, so that a replay never
resends every delivery by accident. Replays keep their original event IDs, by
which receivers deduplicate them.

### Push payloads

`push test` signs a sample notification event, or the webhook body that
`--event` names, as a Standard Webhooks delivery. It verifies the delivery with
`webhooks.verify` and builds each platform's push request with the
`@convohop/server` push builders, as your webhook receiver would. It prints the
event, each request and its size, measured as in
[`spec/push-payload`](../../spec/push-payload/README.md). Nothing reaches a
push provider.

Without a secret, it signs with a new secret for the run. With
`--secret-file`, `CONVOHOP_WEBHOOK_SECRET` or `CONVOHOP_WEBHOOK_SECRET_FILE`,
it signs as your endpoint's sender, and `--deliver URL` also posts the signed
delivery to your endpoint: https, or http on localhost. It doesn't follow
redirects and never prints the URL.

### Unknown outcomes

Reads are sent again with a new request ID when their outcome is unknown or
the authority asks to wait. Mutations aren't: when a mutation's outcome is
unknown, convohop looks the request up and resends the same request only while
the authority hasn't seen it, within its retry budget of 3 attempts in 60
seconds. If the outcome stays unknown, convohop exits with code 3 and prints
the request ID. Don't run the command again, which sends a new request: run
`convohop resolve --request ID` instead. convohop keeps no requests after it
exits, so `resolve` looks a request up but can't resend it.

## Secrets

convohop never prints a portal token, backend key, webhook secret or redeemed
credential, and redacts the credential fields of every reply, such as
`sessionToken`, `connectToken` and `secret`. Its errors don't quote the URLs
you give it, which can carry tokens. `call` doesn't run the operations whose
results are credentials, such as `communication.issueSession`;
`keys issue --out` and `redeem` write credentials only to a new file that only
you can read.

## What the schema doesn't offer yet

- No operation lists deployments, projects or backend keys: name them with
  `--deployment`, `--project` and `--key`. `redeem` prints the key's ID.
- No operation returns a backend key's revision, which `keys revoke` needs as
  `--expected-revision`.
- `login` takes a portal token you already have. There is no device or browser
  login flow.
- `webhookDeliveries` takes no cursor, so `webhooks tail` follows the one page
  of recent deliveries that each poll returns. It warns once when a page is
  incomplete.
- No operation returns a delivery's body, or sends a test push from the
  authority, so `push test` signs and builds locally.

## Development

The operation catalog in `src/generated/operations.ts` is generated: change
the schema, `schema/annotations.json` or
`tools/sdkgen/emitters/cli-operations.mjs`, then run
`npm run generate:graphql`. `npm test -w packages/cli` builds the package and
runs its tests, including ones against the conformance mock. The tests use
fake credential store tools, so they don't prove the real macOS keychain or
Secret Service.
