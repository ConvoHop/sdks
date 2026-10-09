import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { ConversationMessage, OutboxEntry } from "@convohop/client";
import { useConversation, useTyping } from "@convohop/react";
import type { ProjectFeatures, Session } from "../session";
import { Banner, Busy, Button, colors, errorMessage, MessageText, useForeground } from "../ui";

type Row =
  | { readonly kind: "message"; readonly key: string; readonly message: Readonly<ConversationMessage> }
  | { readonly kind: "pending"; readonly key: string; readonly entry: OutboxEntry };

function pendingStatus(entry: OutboxEntry): string {
  switch (entry.status) {
    case "queued": return "Waiting to send. Hold to delete.";
    case "sending": return "Sending…";
    case "unknown": return "Checking whether it was sent…";
    case "sent": return "Sent";
    case "failed": return entry.unconfirmed === true
      ? "It may not have been sent. Tap to send it again, or hold to delete."
      : "Not sent. Tap to try again, or hold to delete.";
  }
}

function useFeatures(session: Session, onError: (error: unknown) => void): ProjectFeatures | undefined {
  const [features, setFeatures] = useState<ProjectFeatures>();
  useEffect(() => {
    let current = true;
    void session.features().then(value => {
      if (current) setFeatures(value);
    }, onError);
    return () => {
      current = false;
    };
  }, [session, onError]);
  return features;
}

export interface ConversationScreenProps {
  readonly session: Session;
  readonly conversationId: string;
  /** What to show until the conversation loads. */
  readonly title: string | undefined;
  readonly onBack: () => void;
  readonly onError: (error: unknown) => void;
}

export function ConversationScreen({ session, conversationId, title, onBack, onError }: ConversationScreenProps) {
  const view = useConversation(conversationId, { onError });
  const { store } = view;
  const features = useFeatures(session, onError);
  const typing = useTyping(conversationId, { enabled: features?.typing === true, onError });
  const foreground = useForeground();
  const [draft, setDraft] = useState("");
  const loadingOlder = useRef(false);
  const name = view.conversation?.title ?? title ?? "Conversation";
  const me = session.client.principalId;

  // Newest first: the list is inverted, so the newest shows at the bottom.
  const rows = useMemo(() => [
    ...[...view.pending].reverse().map((entry): Row => ({ kind: "pending", key: entry.requestId, entry })),
    ...[...view.messages].reverse().map((message): Row => ({ kind: "message", key: message.messageId, message })),
  ], [view.pending, view.messages]);

  // Reports reading while the user can see the conversation.
  const live = view.status === "live";
  const newest = view.messages.at(-1)?.messageId;
  useEffect(() => {
    if (store === undefined || !live || !foreground || newest === undefined) return;
    // The report saves a recovery record, so signing out waits for it.
    void session.track(store.markRead()).catch(onError);
  }, [session, store, live, foreground, newest, onError]);

  const loadOlder = () => {
    if (store === undefined || !view.hasOlder || loadingOlder.current) return;
    loadingOlder.current = true;
    void store.loadOlder().catch(onError).finally(() => {
      loadingOlder.current = false;
    });
  };

  const send = () => {
    const text = draft.trim();
    if (text === "") return;
    try {
      view.send(text);
    } catch (error) {
      // The outbox refuses a message while 100 are unsent.
      onError(error);
      return;
    }
    setDraft("");
    typing.stop();
  };

  const retry = (entry: OutboxEntry) => {
    const resend = () => {
      try {
        session.outbox.resend(entry.requestId);
      } catch (error) {
        onError(error);
      }
    };
    if (entry.unconfirmed !== true) {
      resend();
      return;
    }
    Alert.alert("Send it again?", "It may have been sent already, so it could show twice.", [
      { text: "Cancel", style: "cancel" },
      { text: "Send again", onPress: resend },
    ]);
  };

  const remove = (entry: OutboxEntry) => {
    Alert.alert("Delete this message?", entry.unconfirmed === true
      ? "It may have been sent already. Deleting it here doesn't unsend it."
      : "It won't be sent.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          try {
            session.outbox.discard(entry.requestId);
          } catch (error) {
            onError(error);
          }
        },
      },
    ]);
  };

  const renderRow = ({ item }: { readonly item: Row }) => {
    if (item.kind === "message") {
      const { message } = item;
      return (
        <View style={[styles.bubble, message.authorId === me ? styles.mine : styles.theirs]}>
          <MessageText message={message} />
          {message.editedAt !== null && !message.deleted && <Text style={styles.status}>Edited</Text>}
        </View>
      );
    }
    const { entry } = item;
    return (
      <Pressable
        onLongPress={() => {
          if (entry.status === "queued" || entry.status === "failed") remove(entry);
        }}
        onPress={() => {
          if (entry.status === "failed") retry(entry);
        }}
        style={[styles.bubble, styles.mine, styles.pending]}
      >
        <Text>{entry.text}</Text>
        <Text style={entry.status === "failed" ? styles.failed : styles.status}>{pendingStatus(entry)}</Text>
      </Pressable>
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.screen}>
      <View style={styles.header}>
        <Button kind="plain" onPress={onBack} title="‹ Inbox" />
        <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>{name}</Text>
        <Button
          disabled={store === undefined || features?.liveSessions !== true}
          kind="plain"
          onPress={() => { session.calls.startCall(conversationId, name); }}
          title="Call"
        />
      </View>
      {view.resyncRequired ? (
        <Banner
          action={{ title: "Reload", onPress: () => { void view.resync().catch(onError); } }}
          text="This conversation has to load again from the server."
        />
      ) : view.status === "error" ? (
        <Banner action={{ title: "Retry", onPress: () => { void view.open().catch(onError); } }} text={errorMessage(view.error)} />
      ) : view.status === "reconnecting" ? (
        <Text style={styles.notice}>Reconnecting…</Text>
      ) : null}
      {view.status === "loading" && rows.length === 0 ? <Busy text="Loading…" /> : (
        <FlatList
          contentContainerStyle={styles.messages}
          data={rows}
          inverted
          keyExtractor={row => row.key}
          onEndReached={loadOlder}
          renderItem={renderRow}
          style={styles.list}
        />
      )}
      <View style={styles.composer}>
        <TextInput
          accessibilityLabel="Message"
          multiline
          onChangeText={text => {
            setDraft(text);
            if (text === "") typing.stop();
            else typing.input();
          }}
          placeholder="Message"
          style={styles.input}
          value={draft}
        />
        <Button disabled={store === undefined || draft.trim() === ""} onPress={send} title="Send" />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", paddingVertical: 4 },
  title: { flex: 1, fontSize: 17, fontWeight: "600", textAlign: "center" },
  notice: { color: colors.muted, padding: 8, textAlign: "center" },
  list: { flex: 1 },
  messages: { gap: 6, padding: 12 },
  bubble: { borderRadius: 14, gap: 2, maxWidth: "80%", paddingHorizontal: 12, paddingVertical: 8 },
  mine: { alignSelf: "flex-end", backgroundColor: "#dbeafe" },
  theirs: { alignSelf: "flex-start", backgroundColor: "#f3f4f6" },
  pending: { opacity: 0.8 },
  status: { color: colors.muted, fontSize: 12 },
  failed: { color: colors.danger, fontSize: 12 },
  composer: { alignItems: "flex-end", borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 8, padding: 8 },
  input: { borderColor: colors.border, borderRadius: 18, borderWidth: 1, flex: 1, fontSize: 16, maxHeight: 120, paddingHorizontal: 14, paddingVertical: 8 },
});
