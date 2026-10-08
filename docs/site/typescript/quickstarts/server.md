# TypeScript server quickstart

Call ConvoHop from your Node.js backend with `@convohop/server`: connect with a backend key, sign in your users, create a conversation, send and read messages as a member, and recover a send whose response was lost.

## Before you start

You need Node.js 22 or later and `@convohop/server` ([install](../index.md#install)). For your project, you need the Communication API's base URL, the project ID, the project's incarnation and a backend key, which the [`management.issueBackendKey`](../../operations/management/issueBackendKey.md) operation delivers once.

Keep the backend key in your secret store. Its scopes limit what it can do. This quickstart needs `principalManage`, `sessionIssue`, `conversationManage`, `messageRead` and `messageWrite`.

## Connect

`initialize()` looks up your project's route before the first call.

```ts snippet=docs/languages/typescript/examples/src/server.ts#connect
import { ProjectServerClient } from "@convohop/server";

export interface ServerConfig {
  baseUrl: string;
  projectId: string;
  incarnation: string;
  backendKey: string; // From your secret store. Never send it to a browser or an app.
}

export async function connect(config: ServerConfig): Promise<ProjectServerClient> {
  const server = new ProjectServerClient(config);
  await server.initialize();
  return server;
}
```

## Sign in a user

ConvoHop doesn't authenticate your users. After your own login succeeds, map the user to a principal and issue a session for the device. Return the result to the user's app, which passes it to `@convohop/client`, as the [client quickstart](client.md) shows.

```ts snippet=docs/languages/typescript/examples/src/server.ts#bootstrap
import type { SessionBootstrap } from "@convohop/server";

// What your login endpoint returns to the signed-in user's app.
export type UserBootstrap = SessionBootstrap & { baseUrl: string; projectId: string };

// Call this after your own authentication. accountId is your user's ID:
// never trust a principal ID that a browser sends.
export async function bootstrapUser(
  server: ProjectServerClient,
  config: ServerConfig,
  accountId: string,
  deviceId: string,
): Promise<UserBootstrap> {
  const principalId = await server.createPrincipal(accountId); // The same principal on every login.
  const session = await server.issueSession(principalId, deviceId); // Expires in 15 minutes by default.
  return { ...session, baseUrl: config.baseUrl, projectId: config.projectId };
}
```

`createPrincipal` returns the same principal for the same account ID, so call it on every login. A session token acts only as its principal.

## Create a conversation

Commands such as `conversations.create` take a request ID that identifies the action. Create one per action, for example with `crypto.randomUUID()`, and keep it until you know the outcome: [recover a lost response](#recover-a-lost-response) shows why.

```ts snippet=docs/languages/typescript/examples/src/server.ts#create-conversation
export async function createConversation(
  server: ProjectServerClient,
  title: string,
  principalIds: readonly string[],
  requestId: string,
): Promise<string> {
  const conversation = await server.conversations.create(
    { title, props: {}, members: principalIds.map(principalId => ({ principalId, role: "member" })) },
    { requestId },
  );
  return conversation.conversationId;
}
```

## Send and read messages

Your backend isn't a member of the conversation. To send or read as a member, pass `actAs` with the member's principal ID. The authority checks what that member can do and audits the call. Without `actAs`, the backend's own service principal sends the message.

```ts snippet=docs/languages/typescript/examples/src/server.ts#send-message
// Sends as a member. Without actAs, the backend's own principal is the sender.
export async function sendAs(
  server: ProjectServerClient,
  conversationId: string,
  authorId: string,
  text: string,
  requestId: string,
): Promise<string> {
  const receipt = await server.conversation(conversationId).messages.send({ text }, { actAs: authorId, requestId });
  return receipt.messageId;
}
```

```ts snippet=docs/languages/typescript/examples/src/server.ts#list-messages
import type { MessagePage } from "@convohop/server";

// Reads what one member can see, newest first.
export async function latestMessages(
  server: ProjectServerClient,
  conversationId: string,
  readerId: string,
): Promise<MessagePage["items"]> {
  const page = await server.conversation(conversationId).messages.list({ actAs: readerId, limit: 20 });
  return page.items;
}
```

## Recover a lost response

When a connection drops after a command is sent, the SDK can't tell whether the authority committed it, so it throws a `ConvoHopProblem` whose `outcome` is `unknown`. Sending again with a new request ID could post the message twice. Instead, `requests.retry` asks the authority about the original request. It returns the committed result, or resends the original command if the authority never received it.

```ts snippet=docs/languages/typescript/examples/src/server.ts#recover
import { ConvoHopProblem } from "@convohop/server";

// A lost response leaves the outcome unknown: the message may or may not exist. Ask about the
// same request ID instead of sending with a new one, which could post the message twice.
export async function sendOnce(
  server: ProjectServerClient,
  conversationId: string,
  authorId: string,
  text: string,
  requestId: string,
): Promise<string | null> {
  try {
    return await sendAs(server, conversationId, authorId, text, requestId);
  } catch (error) {
    if (!(error instanceof ConvoHopProblem) || error.outcome !== "unknown") throw error;
    // Resolves the request first, and resends the original only if the authority never saw it.
    const resolution = await server.requests.retry(requestId);
    if (resolution.state !== "committed") throw error;
    return resolution.receipt?.result?.messageAck?.messageId ?? null;
  }
}
```

Retry with the same `ProjectServerClient`, which keeps the original request in memory. It sends a request at most three times, within 60 seconds of the first attempt. To retry after a restart, give the client `recoveryStorage` or `asyncRecoveryStorage`, as [asynchronous database recovery storage](https://github.com/ConvoHop/sdks/blob/main/packages/server/README.md#asynchronous-database-recovery-storage) describes. Recovery storage holds request inputs, never tokens or keys.

## Next steps

- [Client quickstart](client.md): use the session in your users' browsers.
- [Webhooks quickstart](webhooks.md): react to events in your backend.
- [`ProjectServerClient` reference](../reference/server.md#projectserverclient-class): every method, with the operation it sends.
