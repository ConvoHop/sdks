// React snippets for the client and calling quickstarts. They need a browser, so the tests only typecheck them.

// #region provider
import type { ReactNode } from "react";
import type { ConvoHopClient, Outbox } from "@convohop/client";
import { ConvoHopProvider, useSessionRefresh } from "@convohop/react";

// Wrap the signed-in part of your app. When the user signs in, create the client with connectUser, passing
// renewSession as sessionRefresh, and the outbox with openOutbox. When they sign out, unmount this, then call signOut.
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
import { useConversation, useTyping } from "@convohop/react";
import { pendingLabel } from "./client.ts";

// typing: whether the project has typing indicators, from (await client.capabilities()).features?.typing.
export function Thread({ conversationId, typing }: { conversationId: string; typing: boolean }) {
  const thread = useConversation(conversationId, { onError: error => console.warn("Conversation error", error) });
  const typingSignal = useTyping(conversationId, { enabled: typing });
  const [draft, setDraft] = useState("");
  if (thread.status === "idle" || thread.status === "loading") return <p>Loading…</p>;

  const send = () => {
    typingSignal.stop();
    const text = draft.trim();
    if (text) thread.send(text); // Shows in thread.pending at once.
    setDraft("");
  };
  return (
    <section>
      {thread.hasOlder && <button onClick={() => void thread.loadOlder()}>Earlier messages</button>}
      {thread.messages.map(message => (
        <p key={message.messageId}>{message.deleted ? "Deleted" : message.text}</p>
      ))}
      {thread.pending.map(entry => (
        <p key={entry.requestId}>
          {entry.text} ({pendingLabel(entry)})
        </p>
      ))}
      {thread.resyncRequired && <button onClick={() => void thread.resync()}>Reload</button>}
      <input
        value={draft}
        onChange={event => {
          setDraft(event.target.value);
          typingSignal.input();
        }}
      />
      <button onClick={send}>Send</button>
    </section>
  );
}
// #endregion conversation

// #region call
import { useCallback } from "react";
import type { LiveParticipationHandle, LiveSessionHandle } from "@convohop/client";
import { useConvoHopClient, useLiveSession, useMediaConnection } from "@convohop/react";

// Starts, joins and leaves a conversation's call. Mount it beside the conversation's Thread: useLiveSession reloads
// on the call events that useConversation receives.
export function CallPanel({ conversationId }: { conversationId: string }) {
  const client = useConvoHopClient();
  const live = useLiveSession(conversationId);
  const media = useMediaConnection();
  const [participation, setParticipation] = useState<LiveParticipationHandle>();

  // Run these from clicks, never from an effect: each connect spends a single-use admission.
  const join = async (session: LiveSessionHandle) => {
    const joined = await session.join();
    setParticipation(joined);
    const connection = await media.connect(joined); // Receiving only.
    if (joined.snapshot.permissions.microphone) await connection.microphone(true); // Asks for permission.
  };
  const start = async () => {
    const started = await client.conversation(conversationId).live.startVoice();
    await join(await started.ready());
  };
  const leave = async (current: LiveParticipationHandle) => {
    await current.leave(); // Disconnects the media first. The call goes on for everyone else.
    setParticipation(undefined);
  };

  if (!participation) {
    const session = live.session;
    if (session === undefined) return null; // Still loading.
    return session ? (
      <button onClick={() => join(session).catch(showError)}>Join the call</button>
    ) : (
      <button onClick={() => start().catch(showError)}>Start a call</button>
    );
  }
  return (
    <section>
      {media.tracks.map(track => (
        <Media key={track.trackId} element={track.element} />
      ))}
      {media.audioBlocked && <button onClick={() => media.enableAudio().catch(showError)}>Play audio</button>}
      {media.status === "disconnected" && <button onClick={() => media.reconnect().catch(showError)}>Reconnect</button>}
      {media.status === "failed" && <button onClick={() => media.connect(participation).catch(showError)}>Retry</button>}
      <button onClick={() => leave(participation).catch(showError)}>Leave</button>
    </section>
  );
}

// Shows one remote track: track.element is an audio or video element.
function Media({ element }: { element: HTMLMediaElement }) {
  const attach = useCallback(
    (node: HTMLDivElement | null) => {
      node?.append(element);
    },
    [element],
  );
  return <div ref={attach} />;
}

function showError(error: unknown) {
  console.error("The call failed", error);
}
// #endregion call
