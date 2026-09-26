export type Sequence = string;
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type MessageProps = Record<string, JsonValue>;

export type ThreadState = "active" | "archived";
export type ThreadRole = "owner" | "moderator" | "member" | "viewer";
export type MembershipState = "invited" | "active" | "left" | "removed";
export type HistoryOnJoin = "since_join" | "all_existing";
export type HistoryAfterExit = "revoke" | "previously_visible";

export interface Thread {
  id: string;
  title: string;
  owner: string;
  state: ThreadState;
  historyOnJoin: HistoryOnJoin;
  historyAfterLeave: HistoryAfterExit;
  historyAfterRemove: HistoryAfterExit;
  lastSequence: Sequence;
}

export interface ThreadMember {
  membershipId: string;
  identityId: string;
  role: ThreadRole;
  state: MembershipState;
  joinedSequence: Sequence | null;
  exitedSequence: Sequence | null;
}

export interface ThreadPage {
  items: Thread[];
  nextAfter: string | null;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  sequence: Sequence;
  sender: string;
  clientMessageId: string;
  body: string;
  props: MessageProps;
  createdAt: string;
}

export interface ThreadEvent {
  eventId: string;
  threadId: string;
  sequence: Sequence;
  kind: string;
  actor: string;
  message: ChatMessage | null;
  identityId: string | null;
  callId: string | null;
  createdAt: string;
}

export interface TimelinePage<T> {
  items: T[];
  nextAfter: Sequence;
  cursor: Sequence;
  hasMore: boolean;
}

export type MediaKind = "call" | "broadcast";
export type MediaState = "requested" | "starting" | "live" | "stopping" | "ended" | "failed";
export type MediaRole = "owner" | "publisher" | "viewer";
export type AudiencePolicy = "members" | "project";
export type CallMode = "audio" | "video";

export interface MediaSession {
  id: string;
  projectId: string;
  threadId: string | null;
  mode: CallMode | null;
  kind: MediaKind;
  owner: string;
  title: string;
  audience: AudiencePolicy;
  state: MediaState;
}

export interface MediaMember {
  identityId: string;
  role: MediaRole;
}

export interface MediaParticipant {
  id: string;
  identityId: string;
  role: MediaRole;
  issuedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  connected: boolean;
}

export interface MediaJoin {
  participantId: string;
  serverUrl: string;
  token: string;
  expiresAt: string;
}

export interface CallSummary {
  id: string;
  projectId: string;
  threadId: string;
  mode: CallMode;
  owner: string;
  title: string;
  role: MediaRole;
}

export interface IncomingCall {
  call: CallSummary;
  sequence: Sequence;
  invitedAt: string;
}

export type CallEventKind =
  "call.ringing" | "call.accepted" | "call.declined" | "call.ended" | "call.revoked";

export interface CallEvent {
  eventId: string;
  sequence: Sequence;
  kind: CallEventKind;
  callId: string;
  identityId: string;
  call: CallSummary | null;
  createdAt: string;
}

export interface CallPage {
  items: CallEvent[];
  nextAfter: Sequence;
  hasMore: boolean;
}

export interface IncomingCallsPage {
  items: IncomingCall[];
  nextAfter: Sequence;
  cursor: Sequence;
  hasMore: boolean;
}

export interface BrowserSocket {
  readonly readyState: number;
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  send(data: string): void;
  close(): void;
}

export type SocketFactory = (url: string, protocol: "graphql-transport-ws") => BrowserSocket;
