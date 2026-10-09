// React snippets for the client quickstart. They need React Native's renderer, so the tests only typecheck them.

// #region provider
import type { ReactNode } from "react";
import type { ConvoHopClient, Outbox } from "@convohop/client";
import { ConvoHopProvider, useSessionRefresh } from "@convohop/react";

// Wrap the signed-in screens. When the user signs in, create the client with connectUser, passing renewSession as
// sessionRefresh, and the outbox with openOutbox. When they sign out, unmount this, then call signOut.
export function SignedIn({ client, outbox, children }: { client: ConvoHopClient; outbox: Outbox; children: ReactNode }) {
  return (
    <ConvoHopProvider client={client} outbox={outbox}>
      <KeepSessionAlive />
      {children}
    </ConvoHopProvider>
  );
}

// Renews the session before it expires while it's mounted.
function KeepSessionAlive(): null {
  useSessionRefresh({ onError: error => console.warn("Couldn't renew the session", error) });
  return null;
}
// #endregion provider

// #region conversation
import { useState } from "react";
import { Button, FlatList, Text, TextInput, View } from "react-native";
import { useConversation, useTyping } from "@convohop/react";
import { pendingLabel } from "./client.ts";

// typing: whether the project has typing indicators, from (await client.capabilities()).features?.typing.
export function Thread({ conversationId, typing }: { conversationId: string; typing: boolean }) {
  const thread = useConversation(conversationId, { onError: error => console.warn("Conversation error", error) });
  const typingSignal = useTyping(conversationId, { enabled: typing });
  const [draft, setDraft] = useState("");
  if (thread.status === "idle" || thread.status === "loading") return <Text>Loading…</Text>;

  const send = () => {
    typingSignal.stop();
    const text = draft.trim();
    if (text) thread.send(text); // Shows in thread.pending at once.
    setDraft("");
  };
  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={thread.messages}
        keyExtractor={message => message.messageId}
        renderItem={({ item: message }) => <Text>{message.deleted ? "Deleted" : message.text}</Text>}
        ListHeaderComponent={
          thread.hasOlder ? <Button title="Earlier messages" onPress={() => void thread.loadOlder()} /> : undefined
        }
        ListFooterComponent={
          <>
            {thread.pending.map(entry => (
              <Text key={entry.requestId}>
                {entry.text} ({pendingLabel(entry)})
              </Text>
            ))}
          </>
        }
      />
      {thread.resyncRequired && <Button title="Reload" onPress={() => void thread.resync()} />}
      <TextInput
        value={draft}
        onChangeText={text => {
          setDraft(text);
          typingSignal.input();
        }}
      />
      <Button title="Send" onPress={send} />
    </View>
  );
}
// #endregion conversation
