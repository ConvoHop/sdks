// Client quickstart snippets. test/client.test.ts runs them against the conformance mock.

// #region connect
import { ConvoHopClient, type RecoveryStorage, type SessionBootstrap } from "@convohop/client";

// What your backend's login endpoint returns. See the server quickstart.
export type UserBootstrap = SessionBootstrap & { baseUrl: string; projectId: string };

export async function connectUser(bootstrap: UserBootstrap, storage: RecoveryStorage): Promise<ConvoHopClient> {
  const client = new ConvoHopClient({
    baseUrl: bootstrap.baseUrl,
    projectId: bootstrap.projectId,
    incarnation: bootstrap.session.incarnation,
    principalId: bootstrap.session.principalId,
    sessionToken: bootstrap.sessionToken,
    recoveryStorage: storage, // localStorage in a browser. It keeps unconfirmed sends, never tokens.
  });
  await client.initialize();
  // Finishes sends that an earlier page load left unconfirmed.
  await client.recoverPending(error => console.warn("Couldn't recover an earlier send", error));
  return client;
}
// #endregion connect

// #region watch
import type { ConversationMessage, ConversationStream } from "@convohop/client";

// Renders the latest messages and keeps them current. Close the stream when the view goes away.
export async function watchConversation(
  client: ConvoHopClient,
  conversationId: string,
  render: (messages: ConversationMessage[]) => void,
): Promise<ConversationStream> {
  const refresh = async () => render((await client.messages(conversationId)).items); // Newest first.
  await refresh();
  return client.watch(
    conversationId,
    async events => {
      // Events say what changed, such as message.created. Read the messages again when one did.
      if (events.some(event => String(event.type).startsWith("message."))) await refresh();
    },
    error => console.error("The conversation stream stopped", error),
  );
}
// #endregion watch

// #region send
// Keep requestId with the draft until the send succeeds, and reuse it if you send the draft again.
export async function sendMessage(
  client: ConvoHopClient,
  conversationId: string,
  text: string,
  requestId: string,
): Promise<string> {
  const receipt = await client.send(conversationId, text, requestId);
  return receipt.messageId; // Committed by the authority. Other devices get it through their streams.
}
// #endregion send
