// Server quickstart snippets. test/server.test.ts runs them against the conformance mock.

// #region connect
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
// #endregion connect

// #region bootstrap
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
// #endregion bootstrap

// #region create-conversation
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
// #endregion create-conversation

// #region send-message
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
// #endregion send-message

// #region list-messages
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
// #endregion list-messages

// #region recover
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
// #endregion recover
