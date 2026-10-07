import {
  parseCounter, parseCursor, parseId, parseString, type CommandOptions, type OperationPayload, type PageOptions, type Conversation,
  type GraphqlTypes, type Membership, type ConversationMessage, type ProtocolObject, type SendReceipt,
} from "@convohop/core";
import type { LiveSession, LiveSessionPage } from "./live.js";
import type { ProjectServerClient } from "./project.js";
import { actAsInput, mismatch, pageInput, pageLimit, required, type ActAsOptions } from "./result.js";

export type MemberRole = "member" | "moderator";
export type MessagePage = NonNullable<OperationPayload<"communication.messages">["result"]>;
export type MemberPage = NonNullable<OperationPayload<"communication.members">["result"]>;
export interface MessageListOptions extends ActAsOptions { beforeSequence?: string; limit?: number }
export interface ActAsCommandOptions extends ActAsOptions, CommandOptions {}

function memberRole(role: string): MemberRole {
  if (role !== "member" && role !== "moderator") throw new TypeError("Invalid membership role");
  return role;
}

/**
 * Backend view of one conversation. Creating the handle sends no request; each method needs the scope named in the
 * README. Message reads and sends accept `actAs` to act as a member principal.
 */
export class ServerConversation {
  readonly messages: {
    list(options?: MessageListOptions): Promise<MessagePage>;
    get(messageId: string, options?: ActAsOptions): Promise<ConversationMessage>;
    send(message: { text: string; props?: ProtocolObject }, options?: ActAsCommandOptions): Promise<SendReceipt>;
    edit(input: Omit<GraphqlTypes.EditMessageRequestInput, "conversationId">, options?: CommandOptions): Promise<ConversationMessage>;
    delete(input: Omit<GraphqlTypes.DeleteMessageRequestInput, "conversationId">, options?: CommandOptions): Promise<ConversationMessage>;
  };
  readonly members: {
    list(options?: PageOptions): Promise<MemberPage>;
    add(input: { principalId: string; role: MemberRole; expectedRevision: string }, options?: CommandOptions): Promise<Membership>;
    addBatch(members: GraphqlTypes.MemberBatchEntryInput[], options?: CommandOptions): Promise<Membership[]>;
    remove(input: { principalId: string; expectedRevision: string }, options?: CommandOptions): Promise<Membership>;
    grantHistory(input: Omit<GraphqlTypes.HistoryGrantRequestInput, "conversationId">, options?: CommandOptions): Promise<Membership>;
    setBroadcastPermission(input: Omit<GraphqlTypes.SetBroadcastPermissionInput, "conversationId">,
      options?: CommandOptions): Promise<OperationPayload<"communication.setBroadcastPermission">>;
  };
  readonly live: {
    current(): Promise<LiveSession | null>;
    history(options?: PageOptions): Promise<LiveSessionPage>;
  };
  constructor(readonly client: ProjectServerClient, readonly conversationId: string) {
    parseId(conversationId);
    const execute = client.http.execute.bind(client.http), projectId = client.projectId;
    const message = (value: ConversationMessage | null, messageId: string): ConversationMessage => {
      const current = required(value);
      if (current.messageId !== messageId || current.conversationId !== conversationId) throw mismatch("Message");
      return current;
    };
    const member = (value: Membership | null, principalId: string): Membership => {
      const current = required(value);
      if (current.principalId !== principalId || current.conversationId !== conversationId) throw mismatch("Member");
      return current;
    };
    this.messages = {
      list: async (options = {}) => {
        const page = required((await execute("communication.messages", projectId, { conversationId,
          limit: pageLimit(options.limit), ...actAsInput(options),
          ...(options.beforeSequence === undefined ? {} : { beforeSequence: parseCounter(options.beforeSequence) }) })).result);
        if (page.items.some(item => item.conversationId !== conversationId)) throw mismatch("Message page");
        return page;
      },
      get: async (messageId, options = {}) => message((await execute("communication.getMessage", projectId,
        { conversationId, messageId: parseId(messageId), ...actAsInput(options) })).result, messageId),
      send: async (input, options = {}) => {
        const receipt = required((await execute("communication.sendMessage", projectId,
          { conversationId, text: parseString(input.text), props: input.props ?? {}, ...actAsInput(options) },
          options.requestId)).result);
        const cursor = parseCursor(receipt.cursor);
        if (receipt.status !== "sent" || receipt.conversationId !== conversationId || cursor.conversationId !== conversationId ||
            cursor.sequence !== receipt.sequence || cursor.incarnation !== client.http.incarnation)
          throw new TypeError("Invalid send receipt scope");
        return { ...receipt, cursor };
      },
      edit: async (input, options = {}) => message((await execute("communication.editMessage", projectId,
        { ...input, conversationId, messageId: parseId(input.messageId), expectedRevision: parseCounter(input.expectedRevision) },
        options.requestId)).result, input.messageId),
      delete: async (input, options = {}) => message((await execute("communication.deleteMessage", projectId,
        { ...input, conversationId, messageId: parseId(input.messageId), expectedRevision: parseCounter(input.expectedRevision) },
        options.requestId)).result, input.messageId),
    };
    this.members = {
      list: async (options = {}) => {
        const page = required((await execute("communication.members", projectId, { conversationId,
          limit: pageLimit(options.limit), ...(options.cursor === undefined ? {} : { cursor: parseString(options.cursor) }) })).result);
        if (page.items.some(item => item.conversationId !== conversationId)) throw mismatch("Member page");
        return page;
      },
      add: async (input, options = {}) => member((await execute("communication.addMember", projectId,
        { conversationId, principalId: parseId(input.principalId), role: memberRole(input.role),
          expectedRevision: parseCounter(input.expectedRevision) }, options.requestId)).result, input.principalId),
      addBatch: (members, options = {}) => client.addMembers(conversationId, members, options.requestId),
      remove: async (input, options = {}) => member((await execute("communication.removeMember", projectId,
        { conversationId, principalId: parseId(input.principalId), expectedRevision: parseCounter(input.expectedRevision) },
        options.requestId)).result, input.principalId),
      grantHistory: async (input, options = {}) => member((await execute("communication.historyGrant", projectId,
        { ...input, conversationId, principalId: parseId(input.principalId), expectedRevision: parseCounter(input.expectedRevision),
          membershipEpoch: parseCounter(input.membershipEpoch), fromSequence: parseCounter(input.fromSequence) },
        options.requestId)).result, input.principalId),
      setBroadcastPermission: async (input, options = {}) => {
        const payload = await execute("communication.setBroadcastPermission", projectId,
          { ...input, conversationId, principalId: parseId(input.principalId),
            expectedMembershipRevision: parseCounter(input.expectedMembershipRevision) }, options.requestId);
        member(payload.result.member, input.principalId);
        return payload;
      },
    };
    this.live = {
      current: async () => {
        const session = (await execute("communication.currentLiveSession", projectId, { conversationId })).result;
        if (session != null && session.conversationId !== conversationId) throw mismatch("Live session");
        return session ?? null;
      },
      history: async (options = {}) => {
        const page = (await execute("communication.liveSessions", projectId, { conversationId, ...pageInput(options) })).result;
        if (page.items.some(item => item.conversationId !== conversationId)) throw mismatch("Live session page");
        return page;
      },
    };
  }
  async get(): Promise<Conversation> {
    const conversation = required((await this.client.http.execute("communication.getConversation", this.client.projectId,
      { conversationId: this.conversationId })).result);
    if (conversation.conversationId !== this.conversationId) throw mismatch("Conversation");
    return conversation;
  }
  async update(input: Omit<GraphqlTypes.UpdateConversationRequestInput, "conversationId">,
    options: CommandOptions = {}): Promise<Conversation> {
    const conversation = required((await this.client.http.execute("communication.updateConversation", this.client.projectId,
      { ...input, conversationId: this.conversationId, expectedRevision: parseCounter(input.expectedRevision) },
      options.requestId)).result);
    if (conversation.conversationId !== this.conversationId) throw mismatch("Conversation");
    return conversation;
  }
}
