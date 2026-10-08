import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ConversationStore, TypingIndicator } from "@convohop/client";
import type { ConversationSnapshot, ConvoHopClient, Outbox, OutboxEntry, ProtocolObject, SessionMetadata } from "@convohop/client";
import { useConvoHop, useConvoHopClient, useLatest, useProvidedOutbox } from "./provider.js";

export interface ConversationOptions {
  /** Called after each new event is applied, including call and live-session events the store doesn't track. */
  onEvent?: ((event: ProtocolObject) => void) | undefined;
  /** Called for every error, including realtime interruptions the store recovers from on its own. */
  onError?: ((error: Error) => void) | undefined;
}

/** A conversation's state and the actions on it. Actions reject, and `send` throws, until the conversation's store exists. */
export interface ConversationView extends ConversationSnapshot {
  /** The store following the conversation, or undefined without a conversation ID and before the first effect runs. */
  readonly store: ConversationStore | undefined;
  /** Queues a message in the outbox. It shows in `pending` until it appears in `messages`. */
  send(text: string, props?: ProtocolObject): OutboxEntry;
  /** Reconnects after an error, from the loaded state. */
  open(): Promise<void>;
  /** Discards the replay position and reloads the conversation; needed when `resyncRequired` is set. */
  resync(): Promise<void>;
  /** Loads the previous page of messages. Resolves whether it added any. */
  loadOlder(): Promise<boolean>;
  /** Reports reading through the newest loaded message. Resolves whether a report was needed. */
  markRead(): Promise<boolean>;
  /** Reports delivery through the newest loaded message. Resolves whether a report was needed. */
  markDelivered(): Promise<boolean>;
}

const empty = Object.freeze([]) as readonly never[];
const idle: ConversationSnapshot = Object.freeze({
  status: "idle", conversation: undefined, messages: empty, pending: empty, receipts: empty, hasOlder: false,
  error: undefined, resyncRequired: false,
});
const notOpen = () => new Error("The conversation isn't open");
const noop = () => undefined;

interface Held { readonly store: ConversationStore; readonly client: ConvoHopClient; readonly outbox: Outbox | undefined }

/**
 * Follows a conversation while the component is mounted: it loads the conversation, keeps it live through
 * reconnects and session refreshes, and sends optimistically through the provider's outbox. A new `conversationId`,
 * client or outbox closes the old store and opens a new one; `null` closes it.
 */
export function useConversation(conversationId: string | null | undefined, options: ConversationOptions = {}): ConversationView {
  const { client, outbox, events } = useConvoHop();
  const callbacks = useLatest(options);
  const [held, setHeld] = useState<Held>();
  useEffect(() => {
    if (!conversationId) return;
    const store: ConversationStore = new ConversationStore(client, conversationId, {
      ...(outbox ? { outbox } : {}),
      onEvent: event => { events.emit(client, store.conversationId, event); callbacks.current.onEvent?.(event); },
      onError: error => { callbacks.current.onError?.(error); },
    });
    setHeld({ store, client, outbox });
    // A failed open shows in the snapshot and reaches onError.
    store.open().catch(noop);
    return () => { store.close(); };
  }, [client, outbox, events, conversationId, callbacks]);
  const store = held && held.client === client && held.outbox === outbox && held.store.conversationId === conversationId
    ? held.store : undefined;
  const subscribe = useCallback((listener: () => void) => store ? store.subscribe(listener) : noop, [store]);
  const read = () => store ? store.snapshot : idle;
  const snapshot = useSyncExternalStore(subscribe, read, read);
  return useMemo(() => ({
    ...snapshot, store,
    send(text: string, props?: ProtocolObject) { if (!store) throw notOpen(); return store.send(text, props); },
    open: () => store ? store.open() : Promise.reject(notOpen()),
    resync: () => store ? store.resync() : Promise.reject(notOpen()),
    loadOlder: () => store ? store.loadOlder() : Promise.reject(notOpen()),
    markRead: () => store ? store.markRead() : Promise.reject(notOpen()),
    markDelivered: () => store ? store.markDelivered() : Promise.reject(notOpen()),
  }), [snapshot, store]);
}

/** The entries of `outbox`, or of the provider's outbox, in send order. */
export function useOutbox(outbox?: Outbox): readonly OutboxEntry[] {
  const provided = useProvidedOutbox();
  const target = outbox ?? provided;
  if (!target) throw new Error("Pass an outbox, or give the ConvoHopProvider one");
  const subscribe = useCallback((listener: () => void) => target.subscribe(listener), [target]);
  const read = () => target.entries;
  return useSyncExternalStore(subscribe, read, read);
}

export interface TypingOptions {
  /** The shortest time between typing signals while the user keeps typing, in milliseconds. Default 3000. */
  intervalMs?: number | undefined;
  /** How long after the last input the user stops typing, in milliseconds. Default 5000. */
  idleMs?: number | undefined;
  /** Whether to send signals. Pass `capabilities().features?.typing === true` to skip projects without typing. Default true. */
  enabled?: boolean | undefined;
  onError?: ((error: Error) => void) | undefined;
}
export interface TypingControls {
  /** Call on every edit to the draft. */
  input(): void;
  /** Call when the user sends or clears the draft. */
  stop(): void;
}

/**
 * Sends throttled typing signals for a conversation while the user types. Unmounting, or a new conversation, signals
 * that typing stopped. The returned functions keep their identity.
 */
export function useTyping(conversationId: string | null | undefined, options: TypingOptions = {}): TypingControls {
  const client = useConvoHopClient();
  const latest = useLatest(options);
  const indicator = useRef<TypingIndicator | undefined>(undefined);
  const { intervalMs, idleMs } = options, enabled = options.enabled ?? true;
  useEffect(() => {
    if (!conversationId) return;
    const value = new TypingIndicator(client, conversationId,
      { intervalMs, idleMs, enabled: latest.current.enabled ?? true, onError: error => { latest.current.onError?.(error); } });
    indicator.current = value;
    return () => {
      if (indicator.current === value) indicator.current = undefined;
      value.dispose();
    };
  }, [client, conversationId, intervalMs, idleMs, latest]);
  useEffect(() => { if (indicator.current) indicator.current.enabled = enabled; }, [enabled]);
  return useMemo(() => ({ input: () => { indicator.current?.input(); }, stop: () => { indicator.current?.stop(); } }), []);
}

export interface SessionRefreshOptions {
  /** How long before the session expires to renew it, in milliseconds. Default 60000. */
  leadMs?: number | undefined;
  /** Whether to keep the session renewed. Default true. */
  enabled?: boolean | undefined;
  onRefreshed?: ((session: SessionMetadata) => void) | undefined;
  onError?: ((error: Error) => void) | undefined;
}

/** Renews the provider client's session before it expires while the component is mounted. Needs `sessionRefresh`. */
export function useSessionRefresh(options: SessionRefreshOptions = {}): void {
  const client = useConvoHopClient();
  const latest = useLatest(options);
  const { leadMs } = options, enabled = options.enabled ?? true;
  useEffect(() => {
    if (!enabled) return;
    return client.scheduleSessionRefresh({ leadMs,
      onRefreshed: session => { latest.current.onRefreshed?.(session); },
      onError: error => { latest.current.onError?.(error); } });
  }, [client, leadMs, enabled, latest]);
}
