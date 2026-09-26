import { GraphQLHttp, requireCursor, requireIdentityId, requireLimit, requireUuid, isRecord } from "./graphql.js";
import type { Room } from "livekit-client";
import {
  expect, isCallEvent, isCallPage, isIncomingPage, isMediaJoin, isMediaMember, isMediaParticipant,
  isMediaSession, isMessage, isThread, isThreadEvent, isThreadMember, isThreadPage, isTimelinePage,
  pageAfter, uuidAfter,
} from "./guards.js";
import { GraphQLSubscription, type SubscriptionOptions } from "./subscriptions.js";
import type { MediaConnectOptions, MediaConnection } from "./media.js";
import type {
  AudiencePolicy, CallEvent, CallMode, CallPage, ChatMessage, HistoryAfterExit, HistoryOnJoin,
  IncomingCallsPage, MediaJoin, MediaMember, MediaParticipant, MediaRole, MediaSession,
  MessageProps, Sequence, SocketFactory, Thread, ThreadEvent, ThreadMember, ThreadPage,
  ThreadRole, TimelinePage,
} from "./types.js";

export { ApiError, GraphQLHttp, InvalidResponseError, TransportError, isIdentityId, requireIdentityId } from "./graphql.js";
export { GraphQLSubscription } from "./subscriptions.js";
export type { SubscriptionOptions } from "./subscriptions.js";
export type { MediaConnectOptions, MediaConnection, RemoteMediaTrack } from "./media.js";
export type * from "./types.js";
export type ThreadSubscription = GraphQLSubscription<ThreadEvent>;
export type CallSubscription = GraphQLSubscription<CallEvent>;

const THREAD = "id title owner state historyOnJoin historyAfterLeave historyAfterRemove lastSequence";
const MEMBER = "membershipId identityId role state joinedSequence exitedSequence";
const MESSAGE = "id threadId sequence sender clientMessageId body props createdAt";
const EVENT = `eventId threadId sequence kind actor identityId callId createdAt message { ${MESSAGE} }`;
const MEDIA = "id projectId threadId mode kind owner title audience state";
const PARTICIPANT = "id identityId role issuedAt expiresAt revokedAt connected";
const CALL = "id projectId threadId mode owner title role";
const CALL_EVENT = `eventId sequence kind callId identityId createdAt call { ${CALL} }`;
const THREAD_EVENTS = `subscription($id:ID!,$after:String){threadEvents(threadId:$id,after:$after){${EVENT}}}`;
const CALL_EVENTS = `subscription($after:String){callEvents(after:$after){${CALL_EVENT}}}`;

const isTrue = (value: unknown): value is true => value === true;
const arrayOf = <T>(guard: (value: unknown) => value is T) =>
  (value: unknown): value is T[] => Array.isArray(value) && value.every(guard);

function requireTitle(title: string): void {
  if (
    typeof title !== "string" || !title.trim() ||
    new TextEncoder().encode(title).length > 128 || /[\u0000-\u001f\u007f]/u.test(title)
  ) {
    throw new TypeError("title must contain text and be at most 128 UTF-8 bytes without controls");
  }
}

function requireBody(body: string): void {
  if (
    typeof body !== "string" || !body.trim() ||
    new TextEncoder().encode(body).length > 32768 || body.includes("\0")
  ) {
    throw new TypeError("body must contain text and be at most 32768 UTF-8 bytes without NUL");
  }
}

export interface ClientOptions {
  baseUrl: string;
  sessionToken: string;
  fetch?: typeof fetch;
  socketFactory?: SocketFactory;
  timeoutMs?: number;
  roomFactory?: () => Room;
}

export interface ThreadPolicies {
  historyOnJoin?: HistoryOnJoin;
  historyAfterLeave?: HistoryAfterExit;
  historyAfterRemove?: HistoryAfterExit;
}

export interface SendMessageOptions {
  clientMessageId?: string;
  props?: MessageProps;
}

export class ConvoHopClient {
  readonly #http: GraphQLHttp;
  #sessionToken: string;
  readonly #socketFactory: SocketFactory;
  readonly #roomFactory: (() => Room) | undefined;
  readonly #subscriptions = new Set<GraphQLSubscription<ThreadEvent> | GraphQLSubscription<CallEvent>>();

  constructor(options: ClientOptions) {
    this.#http = new GraphQLHttp({
      baseUrl: options.baseUrl,
      token: options.sessionToken,
      kind: "st",
      ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
      ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
    });
    if (options.socketFactory !== undefined && typeof options.socketFactory !== "function") {
      throw new TypeError("socketFactory must be a function");
    }
    if (options.roomFactory !== undefined && typeof options.roomFactory !== "function") {
      throw new TypeError("roomFactory must be a function");
    }
    this.#sessionToken = options.sessionToken;
    this.#socketFactory = options.socketFactory ??
      ((url, protocol) => new WebSocket(url, protocol));
    this.#roomFactory = options.roomFactory;
  }

  updateSessionToken(token: string): void {
    if (token === this.#sessionToken) {
      throw new TypeError("A refreshed st_ session token must differ from the current token");
    }
    this.#http.updateToken(token);
    this.#sessionToken = token;
    for (const subscription of this.#subscriptions) subscription.updateToken(token);
  }

  async #field<T>(
    query: string,
    variables: Record<string, unknown>,
    field: string,
    guard: (value: unknown) => value is T,
  ): Promise<T> {
    return expect(await this.#http.execute(query, variables, field), field, guard);
  }

  createThread(title: string, members: string[] = [], policies: ThreadPolicies = {}): Promise<Thread> {
    requireTitle(title);
    if (!Array.isArray(members) || members.length > 100) {
      throw new RangeError("members must have at most 100 identities");
    }
    members.forEach(requireIdentityId);
    return this.#field(
      `mutation($title:String!,$members:[ID!],$onJoin:String,$onLeave:String,$onRemove:String){
        createThread(title:$title,members:$members,historyOnJoin:$onJoin,
          historyAfterLeave:$onLeave,historyAfterRemove:$onRemove){${THREAD}}
      }`,
      { title, members, onJoin: policies.historyOnJoin, onLeave: policies.historyAfterLeave,
        onRemove: policies.historyAfterRemove },
      "createThread", isThread,
    );
  }

  getThread(id: string): Promise<Thread> {
    requireUuid(id, "threadId");
    return this.#field(
      `query($id:ID!){thread(id:$id){${THREAD}}}`, { id }, "thread", isThread,
    );
  }

  async threads(after?: string, limit = 50): Promise<ThreadPage> {
    if (after !== undefined) requireUuid(after, "after");
    requireLimit(limit);
    const result = await this.#field(
      `query($after:ID,$limit:Int){threads(after:$after,limit:$limit){
        items{${THREAD}} nextAfter
      }}`, { after, limit }, "threads", isThreadPage,
    );
    uuidAfter(after, result);
    return result;
  }

  threadInvitations(limit = 50): Promise<Thread[]> {
    requireLimit(limit);
    return this.#field(
      `query($limit:Int){threadInvitations(limit:$limit){${THREAD}}}`,
      { limit }, "threadInvitations", arrayOf(isThread),
    );
  }

  threadMembers(threadId: string): Promise<ThreadMember[]> {
    requireUuid(threadId, "threadId");
    return this.#field(
      `query($threadId:ID!){threadMembers(threadId:$threadId){${MEMBER}}}`,
      { threadId }, "threadMembers", arrayOf(isThreadMember),
    );
  }

  inviteThreadMember(threadId: string, identityId: string, role: Exclude<ThreadRole, "owner"> = "member"):
    Promise<ThreadMember> {
    requireUuid(threadId, "threadId");
    requireIdentityId(identityId);
    return this.#field(
      `mutation($threadId:ID!,$identityId:ID!,$role:String){
        inviteThreadMember(threadId:$threadId,identityId:$identityId,role:$role){${MEMBER}}
      }`, { threadId, identityId, role }, "inviteThreadMember", isThreadMember,
    );
  }

  acceptThreadInvitation(threadId: string): Promise<ThreadMember> {
    requireUuid(threadId, "threadId");
    return this.#field(
      `mutation($threadId:ID!){acceptThreadInvitation(threadId:$threadId){${MEMBER}}}`,
      { threadId }, "acceptThreadInvitation", isThreadMember,
    );
  }

  async leaveThread(threadId: string): Promise<void> {
    requireUuid(threadId, "threadId");
    await this.#field(
      "mutation($threadId:ID!){leaveThread(threadId:$threadId)}",
      { threadId }, "leaveThread", isTrue,
    );
  }

  async removeThreadMember(threadId: string, identityId: string): Promise<void> {
    requireUuid(threadId, "threadId");
    requireIdentityId(identityId);
    await this.#field(
      "mutation($threadId:ID!,$identityId:ID!){removeThreadMember(threadId:$threadId,identityId:$identityId)}",
      { threadId, identityId }, "removeThreadMember", isTrue,
    );
  }

  changeThreadRole(threadId: string, identityId: string, role: Exclude<ThreadRole, "owner">):
    Promise<ThreadMember> {
    requireUuid(threadId, "threadId");
    requireIdentityId(identityId);
    return this.#field(
      `mutation($threadId:ID!,$identityId:ID!,$role:String!){
        changeThreadRole(threadId:$threadId,identityId:$identityId,role:$role){${MEMBER}}
      }`, { threadId, identityId, role }, "changeThreadRole", isThreadMember,
    );
  }

  transferThreadOwner(threadId: string, identityId: string): Promise<Thread> {
    requireUuid(threadId, "threadId");
    requireIdentityId(identityId);
    return this.#field(
      `mutation($threadId:ID!,$identityId:ID!){
        transferThreadOwner(threadId:$threadId,identityId:$identityId){${THREAD}}
      }`, { threadId, identityId }, "transferThreadOwner", isThread,
    );
  }

  archiveThread(threadId: string): Promise<Thread> {
    requireUuid(threadId, "threadId");
    return this.#field(
      `mutation($threadId:ID!){archiveThread(threadId:$threadId){${THREAD}}}`,
      { threadId }, "archiveThread", isThread,
    );
  }

  reopenThread(threadId: string): Promise<Thread> {
    requireUuid(threadId, "threadId");
    return this.#field(
      `mutation($threadId:ID!){reopenThread(threadId:$threadId){${THREAD}}}`,
      { threadId }, "reopenThread", isThread,
    );
  }

  sendMessage(threadId: string, body: string, options: SendMessageOptions = {}): Promise<ChatMessage> {
    requireUuid(threadId, "threadId");
    requireBody(body);
    const clientMessageId = options.clientMessageId ?? crypto.randomUUID();
    requireUuid(clientMessageId, "clientMessageId");
    const props = options.props ?? {};
    if (!isRecord(props)) throw new TypeError("props must be a JSON object");
    return this.#field(
      `mutation($threadId:ID!,$clientMessageId:ID!,$body:String!,$props:JSON){
        sendMessage(threadId:$threadId,clientMessageId:$clientMessageId,body:$body,props:$props){
          ${MESSAGE}
        }
      }`, { threadId, clientMessageId, body, props }, "sendMessage", isMessage,
    );
  }

  async threadMessages(threadId: string, after: Sequence = "0", limit = 50):
    Promise<TimelinePage<ChatMessage>> {
    requireUuid(threadId, "threadId");
    requireCursor(after);
    requireLimit(limit);
    const page = await this.#field(
      `query($threadId:ID!,$after:String,$limit:Int){
        threadMessages(threadId:$threadId,after:$after,limit:$limit){
          items{${MESSAGE}} nextAfter cursor hasMore
        }
      }`, { threadId, after, limit }, "threadMessages",
      (value): value is TimelinePage<ChatMessage> => isTimelinePage(value, isMessage),
    );
    pageAfter(after, page.nextAfter, page.hasMore);
    return page;
  }

  async threadEvents(threadId: string, after: Sequence = "0", limit = 50):
    Promise<TimelinePage<ThreadEvent>> {
    requireUuid(threadId, "threadId");
    requireCursor(after);
    requireLimit(limit);
    const page = await this.#field(
      `query($threadId:ID!,$after:String,$limit:Int){
        threadEvents(threadId:$threadId,after:$after,limit:$limit){
          items{${EVENT}} nextAfter cursor hasMore
        }
      }`, { threadId, after, limit }, "threadEvents",
      (value): value is TimelinePage<ThreadEvent> => isTimelinePage(value, isThreadEvent),
    );
    pageAfter(after, page.nextAfter, page.hasMore);
    return page;
  }

  async revokeSession(): Promise<void> {
    await this.#field("mutation{revokeSession}", {}, "revokeSession", isTrue);
  }

  createCall(threadId: string, title: string, mode: CallMode, publishers: string[] = []):
    Promise<MediaSession> {
    requireUuid(threadId, "threadId");
    requireTitle(title);
    if (mode !== "audio" && mode !== "video") throw new TypeError("mode must be audio or video");
    publishers.forEach(requireIdentityId);
    return this.#field(
      `mutation($threadId:ID!,$title:String!,$mode:String!,$publishers:[ID!]){
        createCall(threadId:$threadId,title:$title,mode:$mode,publishers:$publishers){${MEDIA}}
      }`, { threadId, title, mode, publishers }, "createCall", isMediaSession,
    );
  }

  createBroadcast(title: string, publishers: string[] = [], audience: AudiencePolicy = "members"):
    Promise<MediaSession> {
    requireTitle(title);
    if (audience !== "members" && audience !== "project") {
      throw new TypeError("audience must be members or project");
    }
    publishers.forEach(requireIdentityId);
    return this.#field(
      `mutation($title:String!,$publishers:[ID!],$audience:String){
        createBroadcast(title:$title,publishers:$publishers,audience:$audience){${MEDIA}}
      }`, { title, publishers, audience }, "createBroadcast", isMediaSession,
    );
  }

  getMedia(id: string): Promise<MediaSession> {
    requireUuid(id, "mediaId");
    return this.#field(
      `query($id:ID!){mediaSession(id:$id){${MEDIA}}}`,
      { id }, "mediaSession", isMediaSession,
    );
  }

  startMedia(id: string): Promise<MediaSession> {
    requireUuid(id, "mediaId");
    return this.#field(
      `mutation($id:ID!){startMedia(id:$id){${MEDIA}}}`,
      { id }, "startMedia", isMediaSession,
    );
  }

  stopMedia(id: string): Promise<MediaSession> {
    requireUuid(id, "mediaId");
    return this.#field(
      `mutation($id:ID!){stopMedia(id:$id){${MEDIA}}}`,
      { id }, "stopMedia", isMediaSession,
    );
  }

  mediaMembers(id: string): Promise<MediaMember[]> {
    requireUuid(id, "mediaId");
    return this.#field(
      "query($id:ID!){mediaMembers(id:$id){identityId role}}",
      { id }, "mediaMembers", arrayOf(isMediaMember),
    );
  }

  async setMediaMember(id: string, identityId: string, role: Exclude<MediaRole, "owner">):
    Promise<void> {
    requireUuid(id, "mediaId");
    requireIdentityId(identityId);
    await this.#field(
      "mutation($id:ID!,$identityId:ID!,$role:String!){setMediaMember(id:$id,identityId:$identityId,role:$role)}",
      { id, identityId, role }, "setMediaMember", isTrue,
    );
  }

  async removeMediaMember(id: string, identityId: string): Promise<void> {
    requireUuid(id, "mediaId");
    requireIdentityId(identityId);
    await this.#field(
      "mutation($id:ID!,$identityId:ID!){removeMediaMember(id:$id,identityId:$identityId)}",
      { id, identityId }, "removeMediaMember", isTrue,
    );
  }

  joinMedia(id: string, renewParticipantId?: string): Promise<MediaJoin> {
    requireUuid(id, "mediaId");
    if (renewParticipantId !== undefined) requireUuid(renewParticipantId, "participantId");
    return this.#field(
      `mutation($id:ID!,$renewParticipantId:ID){
        joinMedia(id:$id,renewParticipantId:$renewParticipantId){
          participantId serverUrl token expiresAt
        }
      }`, { id, renewParticipantId }, "joinMedia", isMediaJoin,
    );
  }

  async connectMedia(id: string, options: MediaConnectOptions = {}): Promise<MediaConnection> {
    return this.#connectMedia(id, options);
  }

  async connectCall(id: string, options: MediaConnectOptions = {}): Promise<MediaConnection> {
    return this.#connectMedia(id, options, true);
  }

  async #connectMedia(id: string, options: MediaConnectOptions, callOnly = false): Promise<MediaConnection> {
    const session = await this.getMedia(id);
    if (callOnly && session.kind !== "call") throw new TypeError("connectCall requires a call");
    if (session.state !== "live") throw new Error("Media session must be live before connecting");
    const { MediaConnection } = await import("./media.js");
    return MediaConnection.connect(this, session, options, this.#roomFactory);
  }

  async declineCall(id: string): Promise<void> {
    requireUuid(id, "callId");
    await this.#field(
      "mutation($id:ID!){declineCall(id:$id)}", { id }, "declineCall", isTrue,
    );
  }

  async incomingCalls(after: Sequence = "0", limit = 50): Promise<IncomingCallsPage> {
    requireCursor(after);
    requireLimit(limit);
    const page = await this.#field(
      `query($after:String,$limit:Int){incomingCalls(after:$after,limit:$limit){
        items{call{${CALL}} sequence invitedAt} nextAfter cursor hasMore
      }}`, { after, limit }, "incomingCalls", isIncomingPage,
    );
    pageAfter(after, page.nextAfter, page.hasMore);
    return page;
  }

  async callEvents(after: Sequence = "0", limit = 50): Promise<CallPage> {
    requireCursor(after);
    requireLimit(limit);
    const page = await this.#field(
      `query($after:String,$limit:Int){callEvents(after:$after,limit:$limit){
        items{${CALL_EVENT}} nextAfter hasMore
      }}`, { after, limit }, "callEvents", isCallPage,
    );
    pageAfter(after, page.nextAfter, page.hasMore);
    return page;
  }

  mediaParticipants(id: string): Promise<MediaParticipant[]> {
    requireUuid(id, "mediaId");
    return this.#field(
      `query($id:ID!){mediaParticipants(id:$id){${PARTICIPANT}}}`,
      { id }, "mediaParticipants", arrayOf(isMediaParticipant),
    );
  }

  async removeMediaParticipant(id: string, participantId: string): Promise<void> {
    requireUuid(id, "mediaId");
    requireUuid(participantId, "participantId");
    await this.#field(
      "mutation($id:ID!,$participantId:ID!){removeMediaParticipant(id:$id,participantId:$participantId)}",
      { id, participantId }, "removeMediaParticipant", isTrue,
    );
  }

  async muteMediaParticipant(id: string, participantId: string, trackSid: string, muted: boolean):
    Promise<void> {
    requireUuid(id, "mediaId");
    requireUuid(participantId, "participantId");
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(trackSid)) throw new TypeError("invalid trackSid");
    await this.#field(
      `mutation($id:ID!,$participantId:ID!,$trackSid:String!,$muted:Boolean!){
        muteMediaParticipant(id:$id,participantId:$participantId,trackSid:$trackSid,muted:$muted)
      }`, { id, participantId, trackSid, muted }, "muteMediaParticipant", isTrue,
    );
  }

  playbackRequest(id: string): { url: string; headers: { Authorization: string } } {
    requireUuid(id, "mediaId");
    return this.#http.assetRequest(`media/${id}/hls/master.m3u8`);
  }

  subscribeThread(id: string, options: SubscriptionOptions<ThreadEvent>): ThreadSubscription {
    requireUuid(id, "threadId");
    const subscription: ThreadSubscription = new GraphQLSubscription(
      this.#http.origin, this.#sessionToken,
      THREAD_EVENTS,
      "threadEvents",
      (value) => {
        const event = expect(value, "thread event", isThreadEvent);
        if (event.threadId !== id) throw new Error("GraphQL returned an event from another thread");
        return event;
      },
      this.#socketFactory,
      { ...options, after: options.after ?? "0" },
      { id },
      () => { this.#subscriptions.delete(subscription); },
    );
    this.#subscriptions.add(subscription);
    subscription.start();
    return subscription;
  }

  subscribeCalls(options: SubscriptionOptions<CallEvent>): CallSubscription {
    const subscription: CallSubscription = new GraphQLSubscription(
      this.#http.origin, this.#sessionToken, CALL_EVENTS, "callEvents",
      (value) => expect(value, "call event", isCallEvent),
      this.#socketFactory, options, {},
      () => { this.#subscriptions.delete(subscription); },
    );
    this.#subscriptions.add(subscription);
    subscription.start();
    return subscription;
  }
}
