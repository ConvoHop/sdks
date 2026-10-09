import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, FlatList, Linking, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import type { InboxItem, InboxPage } from "@convohop/client";
import {
  canUseFullScreenIntent, getPushPermission, openFullScreenIntentSettings, requestPushPermission, type PushPermission,
} from "@convohop/react-native";
import type { Session } from "../session";
import { Banner, Button, colors, MessageText, useForeground } from "../ui";

const PAGE_SIZE = 50;

interface Loaded {
  readonly items: readonly InboxItem[];
  readonly cursor: string | undefined;
  /** The inbox has conversations it can't list. */
  readonly partial: boolean;
}
const NOTHING: Loaded = { items: [], cursor: undefined, partial: false };

function append(loaded: Loaded, page: InboxPage): Loaded {
  // New activity can move a conversation to an earlier page while the pages load.
  const listed = new Set(loaded.items.map(item => item.conversationId));
  return {
    items: [...loaded.items, ...page.items.filter(item => !listed.has(item.conversationId))],
    cursor: typeof page.nextCursor === "string" ? page.nextCursor : undefined,
    partial: page.partialReason !== undefined,
  };
}

/** Asks for notification permission once, then reads it whenever the app returns to the foreground. */
function usePushPermission(foreground: boolean, onError: (error: unknown) => void): PushPermission | undefined {
  const [permission, setPermission] = useState<PushPermission>();
  const asked = useRef(false);
  useEffect(() => {
    if (!foreground) return;
    let current = true;
    const reading = asked.current ? getPushPermission() : requestPushPermission();
    asked.current = true;
    void reading.then(value => {
      if (current) setPermission(value);
    }, onError);
    return () => {
      current = false;
    };
  }, [foreground, onError]);
  return permission;
}

/** Android 14 and later: whether incoming calls can ring full screen. Read whenever the app returns to the foreground. */
function useFullScreenCalls(foreground: boolean, onError: (error: unknown) => void): boolean {
  const [allowed, setAllowed] = useState(true);
  useEffect(() => {
    if (Platform.OS !== "android" || !foreground) return;
    let current = true;
    void canUseFullScreenIntent().then(value => {
      if (current) setAllowed(value);
    }, onError);
    return () => {
      current = false;
    };
  }, [foreground, onError]);
  return allowed;
}

export interface InboxScreenProps {
  readonly session: Session;
  /** Changes when a push arrives, so the inbox loads again. */
  readonly version: number;
  readonly onOpen: (conversationId: string, title: string) => void;
  readonly onSignOut: () => void;
  readonly onError: (error: unknown) => void;
}

export function InboxScreen({ session, version, onOpen, onSignOut, onError }: InboxScreenProps) {
  const { client } = session;
  const foreground = useForeground();
  const permission = usePushPermission(foreground, onError);
  const fullScreenCalls = useFullScreenCalls(foreground, onError);
  const [loaded, setLoaded] = useState<Loaded>(NOTHING);
  const [refreshing, setRefreshing] = useState(false);
  const [checking, setChecking] = useState(false);
  /** Counts loads from the first page. A page from an earlier load is dropped. */
  const generation = useRef(0);
  const loadingMore = useRef(false);

  const reload = useCallback(() => {
    const current = ++generation.current;
    setRefreshing(true);
    void client.inbox({ limit: PAGE_SIZE }).then(page => {
      if (current === generation.current) setLoaded(append(NOTHING, page));
    }, onError).finally(() => {
      if (current === generation.current) setRefreshing(false);
    });
  }, [client, onError]);

  // On mount, on each push, and on returning to the foreground.
  useEffect(() => {
    if (foreground) reload();
  }, [foreground, version, reload]);

  const loadMore = () => {
    const { cursor } = loaded;
    if (cursor === undefined || loadingMore.current) return;
    loadingMore.current = true;
    const current = generation.current;
    void client.inbox({ cursor, limit: PAGE_SIZE }).then(page => {
      if (current !== generation.current) return;
      // The cursor no longer fits the inbox: start again from the first page.
      if (page.refreshRequired) reload();
      else setLoaded(previous => append(previous, page));
    }, onError).finally(() => {
      loadingMore.current = false;
    });
  };

  const signOut = () => {
    const confirm = () => {
      Alert.alert("Sign out?", "Messages that weren't sent will be deleted from this device.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign out", style: "destructive", onPress: onSignOut },
      ]);
    };
    setChecking(true);
    void session.hasUnsent().then(unsent => {
      if (unsent) confirm();
      else onSignOut();
    }, (error: unknown) => {
      onError(error);
      confirm();
    }).finally(() => {
      setChecking(false);
    });
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>Inbox</Text>
        <Button disabled={checking} kind="plain" onPress={signOut} title="Sign out" />
      </View>
      {permission === "denied" && (
        <Banner
          action={{ title: "Settings", onPress: () => { void Linking.openSettings().catch(onError); } }}
          text="Notifications are off. New messages and missed calls won't show while the app is closed."
        />
      )}
      {!fullScreenCalls && (
        <Banner
          action={{ title: "Allow", onPress: () => { void openFullScreenIntentSettings().catch(onError); } }}
          text="Incoming calls ring as a notification instead of full screen."
        />
      )}
      <FlatList
        data={loaded.items}
        keyExtractor={item => item.conversationId}
        ListEmptyComponent={refreshing ? undefined : <Text style={styles.note}>No conversations yet.</Text>}
        ListFooterComponent={loaded.partial ? <Text style={styles.note}>Some conversations aren't listed.</Text> : undefined}
        onEndReached={loadMore}
        refreshControl={<RefreshControl onRefresh={reload} refreshing={refreshing} />}
        renderItem={({ item }) => <Row item={item} onOpen={onOpen} />}
        style={styles.list}
      />
    </View>
  );
}

function Row({ item, onOpen }: { readonly item: InboxItem; readonly onOpen: InboxScreenProps["onOpen"] }) {
  const message = item.latestVisibleMessage;
  return (
    <Pressable
      accessibilityLabel={item.hasUnread ? `${item.title}, unread` : item.title}
      accessibilityRole="button"
      onPress={() => { onOpen(item.conversationId, item.title); }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.rowText}>
        <Text numberOfLines={1} style={item.hasUnread ? styles.unread : styles.read}>{item.title}</Text>
        {message !== null && <MessageText lines={1} message={message} />}
      </View>
      {item.hasUnread && <View style={styles.dot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", padding: 12 },
  title: { fontSize: 24, fontWeight: "700" },
  list: { flex: 1 },
  note: { color: colors.muted, padding: 24, textAlign: "center" },
  row: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 12, padding: 14 },
  pressed: { backgroundColor: colors.border },
  rowText: { flex: 1, gap: 4 },
  read: { fontSize: 16 },
  unread: { fontSize: 16, fontWeight: "700" },
  dot: { backgroundColor: colors.accent, borderRadius: 5, height: 10, width: 10 },
});
