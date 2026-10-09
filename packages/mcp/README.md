# ConvoHop MCP server

`@convohop/mcp` is a [Model Context Protocol](https://modelcontextprotocol.io)
server whose tools run ConvoHop operations. Each management query and mutation,
and each backend-key query and mutation, becomes one tool. `tools/sdkgen`
generates the tool catalog from the shared schema and its annotations, so the
tools follow the schema. The server is built on the official MCP TypeScript SDK
(`@modelcontextprotocol/server`) and on `@convohop/server`.

It runs only in trusted Node.js 22+ runtimes, because it holds a portal
credential, a backend key or both. Anyone who can talk to the server can act
with those credentials, so give it to a local agent you trust, over stdio. The
package isn't released yet: run it from a checkout of this repository.
License: [Apache-2.0](LICENSE).

## Run it

```sh
npm ci
npm run build -w packages/mcp
```

Then register `node <checkout>/packages/mcp/dist/bin.js` with your MCP client.
For clients that read an `mcpServers` map:

```json
{
  "mcpServers": {
    "convohop": {
      "command": "node",
      "args": ["/path/to/sdks/packages/mcp/dist/bin.js"],
      "env": {
        "CONVOHOP_MANAGEMENT_URL": "https://management.example.com",
        "CONVOHOP_PORTAL_TOKEN_FILE": "/path/to/portal-token",
        "CONVOHOP_MCP_READ_ONLY": "1"
      }
    }
  }
}
```

Set the variables of the management plane, the communication plane of one
project, or both. The server lists only the tools of the planes you configure.

| Variable | Meaning |
| --- | --- |
| `CONVOHOP_MANAGEMENT_URL` | Management authority origin. |
| `CONVOHOP_PORTAL_TOKEN` or `CONVOHOP_PORTAL_TOKEN_FILE` | Portal credential for the management tools, or a file that holds it. |
| `CONVOHOP_COMMUNICATION_URL` | Communication authority origin of the project. |
| `CONVOHOP_PROJECT_ID`, `CONVOHOP_INCARNATION` | The project and its current incarnation. |
| `CONVOHOP_BACKEND_KEY` or `CONVOHOP_BACKEND_KEY_FILE` | Backend key for the communication tools, or a file that holds it. Its scopes decide which tools succeed. |
| `CONVOHOP_MCP_READ_ONLY` | `1` or `true` lists only the query tools. |

Prefer the `_FILE` variables, which keep secrets out of client configuration
files, and a backend key with only the scopes the agent needs. Configuration
errors go to stderr, without the secrets, and the process exits with code 1.

To embed the server, pass options instead and connect any MCP transport:

```ts
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { createConvoHopMcpServer, serverOptionsFromEnvironment } from "@convohop/mcp";

const server = createConvoHopMcpServer(serverOptionsFromEnvironment(process.env));
await server.connect(new StdioServerTransport());
```

## Tools

Tool names are `<plane>_<operation field in snake case>`, such as
`management_issue_backend_key` or `communication_send_message`. A tool's input
schema is the JSON Schema of the operation's input type. The server adds the
request context: the request ID, and for the communication plane the project,
incarnation and route.

No tool runs:

- subscriptions, client-only and deprecated operations;
- operations whose results are credentials (`withheldOperations`):
  `communication.issueSession`, `communication.renewSession`,
  `management.credentialPermit`, and the hosted billing links of
  `management.createBillingCheckoutSession` and
  `management.createBillingPortalSession`;
- operations that a delivery permit authorizes instead of a bearer
  credential, such as `communication.redeemCredential`.

Each tool carries the operation's annotations:

- `readOnlyHint` and `idempotentHint` are true for queries.
  `idempotentHint` is false for mutations: the authority deduplicates by
  request ID, but each tool call sends a new request.
- `destructiveHint` is true for the operations that the schema annotates
  `destructive`: `management_revoke_backend_key`,
  `management_rotate_webhook_secret`, `management_disable_webhook`,
  `management_update_webhook`, `communication_disable_principal`,
  `communication_revoke_session`, `communication_remove_member`,
  `communication_delete_message` and `communication_end_live_session`;
  `management_update_webhook` can disable an endpoint. Confirm with the user
  before calling them.
- `openWorldHint` is false: the tools act only on ConvoHop.
- `_meta["com.convohop/operation"]` carries the operation ID, plane, kind, the
  credential the server uses, the accepted credentials with their scopes and
  conditions, the idempotency class, destructiveness, pagination and, for
  long-running operations, the tool to poll. The description repeats them.

## Results and errors

A successful call returns the operation's reply as `structuredContent` and as
JSON text. A failed call has `isError` and `structuredContent` with:

- `code`: the authority's or the SDK's problem code, such as
  `SCOPE_REQUIRED` or `TRANSPORT_UNKNOWN`;
- `outcome`: `committed`, `accepted`, `rejected` or `unknown`;
- `requestId`, `status` and `message`;
- `retryAfter`: seconds to wait, when the authority asks for it;
- `scope`: the scope that the backend key lacks, for `SCOPE_REQUIRED`;
- `next`: what to do next, when there is a safe next step.

When a mutation's outcome is `unknown`, don't call the tool again, which sends
a new request. Call `retry_request` with its `requestId` instead. It looks the
request up, and when the authority never saw it, resends the same request with
the same payload, within the request's retry budget of 3 attempts in 60
seconds. It returns the resolution: `committed`, `accepted` or
`notObservedYet`, with the receipt.

`retry_request` knows only the mutations that this process sent: the server
keeps their recovery records in memory, never on disk. After a restart, the
read-only `management_resolve_request` and `communication_resolve_request`
tools still look a request up by its ID. Each plane keeps up to 128 records.
When it is full, a final record makes room, oldest first: one whose mutation
the authority committed or accepted, or rejected with a problem that isn't
retryable, or whose retry budget is spent. Records of mutations whose outcome
is `unknown`, or that were refused with a retryable problem such as
`RATE_LIMITED`, stay while `retry_request` can still resend them. When 128
such records are held, mutations fail without being sent, with code
`RECOVERY_LIMIT` and outcome `rejected`. Call `retry_request` for the
outstanding mutations: a record becomes final when it reports them committed,
accepted or refused for good. Any record also becomes final once its retry
budget of 3 attempts in 60 seconds is spent, whatever its outcome; the
read-only resolve tools still look its mutation up.

## Secrets

Results and errors never contain the configured portal credential or backend
key. Wherever they appear in a result, the fields in `redactedFields`, which
hold session tokens, connection tokens, admission tickets, forwarding leases,
signed proofs, backend keys and secrets, read `[REDACTED]`. A test checks that
every such field in the schema is redacted.

## Development

The tool catalog in `src/generated/tools.ts` is generated: change the schema,
`schema/annotations.json` or `tools/sdkgen/emitters/mcp-tools.mjs`, then run
`npm run generate:graphql`. `npm test -w packages/mcp` builds the package and
runs its tests, including ones against the conformance mock and over stdio.
