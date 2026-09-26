# Node server SDK

`@threadwave/server-sdk` is an unpublished Node 24+ TypeScript/ESM source
package in the ConvoHop repository. Its API name remains Threadwave for
compatibility. Its source is licensed under the
[Apache License, Version 2.0](../../LICENSE); no hosted service is included.
It uses two **separate credentials and services**:

| Client | Service | Credential | Allowed calls |
|---|---|---|---|
| `ManagementClient` | Operator-provided loopback Management API | Local `adm_` bootstrap token | Create/list/suspend projects |
| `ProjectServerClient` | Operator-provided Communication API | One project's `pk_` key | Register project identities and issue short-lived `st_` tokens for authenticated application users |
| `ThreadwaveClient` from `@threadwave/browser-sdk` | Communication API | An identity's `st_` token | Threads, JSON message props, GraphQL subscriptions, calls, broadcasts and LiveKit grants |

The server SDK has a Node-only package export, requires root HTTP(S) service
origins (no URL paths, credentials or query strings), allows plain HTTP only on
`localhost`, `127.0.0.1` or `[::1]`, and restricts the Management API to those
loopback hosts even over HTTPS. Requests never follow redirects, omit cookies,
and time out after 30 seconds by default (`timeoutMs` accepts 1-600000).
No services are shipped in this repository. A remote Communication
deployment needs HTTPS and a separately configured secure server.

From the repository root:

```sh
npm ci
npm test --workspace @threadwave/server-sdk
```

All customer operations use `/graphql`; the only native media URL is
bearer-protected `/media/{id}/hls/{name}`. The build compiles its browser-SDK
dependency from this npm workspace. Tests use mocks and a temporary loopback
HTTP server; no external cloud account is needed. For a compatible service
you operate separately, configure `COMMS_API_URL` and
`COMMS_MANAGEMENT_URL` from your service operator, and store
`COMMS_ADMIN_TOKEN` privately. Never expose the Management service publicly.

## Provisioning and token handoff

Run this code **only in a trusted Node backend**. Configure secrets from a
private secret store or environment, not from a browser bundle. Management
returns a project key **only once**: securely persist it for use by your
backend, and do not return it in an HTTP response or log it.

```ts
import { ManagementClient, ProjectServerClient } from "@threadwave/server-sdk";

const management = new ManagementClient({
  baseUrl: process.env.COMMS_MANAGEMENT_URL!,
  adminToken: process.env.COMMS_ADMIN_TOKEN!,
});
const provisioned = await management.createProject("Support");
// Store provisioned.projectKey in a server-only secret store.
const page = await management.listProjects({ limit: 50 });
// Pass page.nextAfter as `after` to fetch the next page until items is empty.

const server = new ProjectServerClient({
  baseUrl: process.env.COMMS_API_URL!,
  projectKey: process.env.COMMS_PROJECT_KEY!,
});
// Authenticate the caller in YOUR application. On first registration,
// persist a non-nil UUID requestId before calling createIdentity.
const identity = await server.createIdentity(requestId);
// Persist identity.id against that authenticated app account; on later
// logins reuse it instead of creating another identity.
const session = await server.mintIdentityToken(identity.id);
// Send ONLY {token: session.token, expiresAt: session.expiresAt} to that account.
```

Later, `await management.suspendProject(provisioned.id)` blocks new
tokens and further requests for that project. Use an active project when
minting them. `createIdentity(requestId)` returns the same project-scoped
opaque `ci_` ID when the same non-nil UUID request ID is retried. A `pk_` key
can impersonate **any registered identity in its own project**, so never accept
a client-supplied identity ID as proof of login: look up the ID bound to your
authenticated account. Tokens expire after 15 minutes; request a new one
from your backend when needed. No SDK call silently refreshes a token.

In the browser, use the **separate browser SDK** with the short-lived token:

```ts
import { ThreadwaveClient } from "@threadwave/browser-sdk";

const user = new ThreadwaveClient({
  baseUrl: publicCommunicationUrl,
  sessionToken: sessionFromYourBackend.token, // st_ only; never a pk_ key
});
const thread = await user.createThread("Support");
await user.sendMessage(thread.id, "Hello", { props: { ticketId: "case-42" } });
const page = await user.threadEvents(thread.id);
const subscription = user.subscribeThread(thread.id, {
  after: page.cursor,
  onEvent: (event) => console.log(event.kind, event.message?.props),
  onError: (error) => console.error(error),
});
const call = await user.createCall(thread.id, "Support", "audio");
await user.startMedia(call.id);
const join = await user.joinMedia(call.id); // a short-lived LiveKit grant
// subscription.close() when done
```

For server-side jobs acting as an authorized identity,
`await server.asIdentity(identity.id)` mints an `st_` token and returns a
`ThreadwaveClient` with the **identity's token only**. Its
`createThread`, `sendMessage`, `threadMessages`, `subscribeThread`, `createCall`,
`joinMedia` and other methods are the browser SDK GraphQL API. Do not send
the server client, `adm_` token or `pk_` key to a client. The server SDK does
not call LiveKit directly and does not implement billing or checkout.

All methods reject invalid inputs. GraphQL execution errors may arrive with
HTTP 200; `ApiError` exposes the HTTP `status`, uppercase GraphQL `code`
(such as `NOT_FOUND`) and `message`. HTTP-layer failures retain their
lowercase code. `InvalidResponseError` exposes the HTTP `status` for
malformed/unexpected responses or redirects; `TransportError` reports network
failures or timeouts without including credentials. The SDK does not log
credentials or place them in URLs.
