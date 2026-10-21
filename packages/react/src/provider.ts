import { createContext, createElement, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import type { RelayClient, Outbox, ProtocolObject } from "@instantrelay/client";

type EventListener = (event: ProtocolObject) => void;

/** Fans each conversation's events out to the hooks that follow them, so one realtime stream serves them all. */
export class ConversationEvents {
  readonly #listeners = new WeakMap<RelayClient, Map<string, Set<EventListener>>>();
  on(client: RelayClient, conversationId: string, listener: EventListener): () => void {
    let conversations = this.#listeners.get(client);
    if (!conversations) this.#listeners.set(client, conversations = new Map());
    let listeners = conversations.get(conversationId);
    if (!listeners) conversations.set(conversationId, listeners = new Set());
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (!listeners.size && conversations.get(conversationId) === listeners) conversations.delete(conversationId);
    };
  }
  emit(client: RelayClient, conversationId: string, event: ProtocolObject): void {
    for (const listener of [...this.#listeners.get(client)?.get(conversationId) ?? []]) listener(event);
  }
}

interface RelayContextValue {
  readonly client: RelayClient;
  readonly outbox: Outbox | undefined;
  readonly events: ConversationEvents;
}
const RelayContext = createContext<RelayContextValue | null>(null);

export interface RelayProviderProps {
  /** The signed-in user's client. Create it outside the provider, or above it, and close it when the user signs out. */
  readonly client: RelayClient;
  /**
   * The outbox every conversation below sends through. Without one, each conversation's store sends through an outbox
   * of its own, which stops sending when the component unmounts.
   */
  readonly outbox?: Outbox | undefined;
  readonly children?: ReactNode;
}

/** Makes a client, and optionally a shared outbox, available to the hooks below it. It doesn't own or close either. */
export function RelayProvider({ client, outbox, children }: RelayProviderProps): ReactElement {
  if (outbox && outbox.client !== client) throw new TypeError("The outbox belongs to another client");
  const [events] = useState(() => new ConversationEvents());
  const value = useMemo(() => ({ client, outbox, events }), [client, outbox, events]);
  return createElement(RelayContext.Provider, { value }, children);
}

/** @internal */
export function useRelay(): RelayContextValue {
  const value = useContext(RelayContext);
  if (!value) throw new Error("Render this component inside a RelayProvider");
  return value;
}

/** The provider's client. */
export function useRelayClient(): RelayClient {
  return useRelay().client;
}

/** @internal The provider's outbox, if there is a provider. */
export function useProvidedOutbox(): Outbox | undefined {
  return useContext(RelayContext)?.outbox;
}

/** @internal A ref to the latest value, for callbacks that shouldn't restart an effect when they change. */
export function useLatest<T>(value: T): { readonly current: T } {
  const ref = useRef(value);
  useEffect(() => { ref.current = value; });
  return ref;
}

/** @internal */
export function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
