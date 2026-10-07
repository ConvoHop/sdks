import {
  v1Counter, v1Cursor, v1Id, v1String, type CommandOptions, type OperationPayload, type PageOptions, type V1Conversation,
  type V1Graphql, type V1Membership, type V1Message, type V1Record, type V1SendReceipt,
} from "@convohop/core";
import type { LiveSession, LiveSessionPage } from "./live.js";
import type { V1ProjectServerClient } from "./project.js";
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
    get(messageId: string, options?: ActAsOptions): Promise<V1Message>;
    send(message: { text: string; props?: V1Record }, options?: ActAsCommandOptions): Promise<V1SendReceipt>;
    edit(input: Omit<V1Graphql.EditMessageRequestInput, "conversationId">, options?: CommandOptions): Promise<V1Message>;
    delete(input: Omit<V1Graphql.DeleteMessageRequestInput, "conversationId">, options?: CommandOptions): Promise<V1Message>;
  };
  readonly members: {
    list(options?: PageOptions): Promise<MemberPage>;
    add(input: { principalId: string; role: MemberRole; expectedRevision: string }, options?: CommandOptions): Promise<V1Membership>;
    addBatch(members: V1Graphql.MemberBatchEntryInput[], options?: CommandOptions): Promise<V1Membership[]>;
    remove(input: { principalId: string; expectedRevision: string }, options?: CommandOptions): Promise<V1Membership>;
    grantHistory(input: Omit<V1Graphql.HistoryGrantRequestInput, "conversationId">, options?: CommandOptions): Promise<V1Membership>;
    setBroadcastPermission(input: Omit<V1Graphql.SetBroadcastPermissionInput, "conversationId">,
      options?: CommandOptions): Promise<OperationPayload<"communication.setBroadcastPermission">>;
  };
  readonly live: {
    current(): Promise<LiveSession | null>;
    history(options?: PageOptions): Promise<LiveSessionPage>;
  };
  constructor(readonly client: V1ProjectServerClient, readonly conversationId: string) {
    v1Id(conversationId);
    const execute = client.http.execute.bind(client.http), projectId = client.projectId;
    const message = (value: V1Message | null, messageId: string): V1Message => {
      const current = required(value);
      if (current.messageId !== messageId || current.conversationId !== conversationId) throw mismatch("Message");
      return current;
    };
    const member = (value: V1Membership | null, principalId: string): V1Membership => {
      const current = required(value);
      if (current.principalId !== principalId || current.conversationId !== conversationId) throw mismatch("Member");
      return current;
    };
    this.messages = {
      list: async (options = {}) => {
        const page = required((await execute("communication.messages", projectId, { conversationId,
          limit: pageLimit(options.limit), ...actAsInput(options),
          ...(options.beforeSequence === undefined ? {} : { beforeSequence: v1Counter(options.beforeSequence) }) })).result);
        if (page.items.some(item => item.conversationId !== conversationId)) throw mismatch("Message page");
        return page;
      },
      get: async (messageId, options = {}) => message((await execute("communication.getMessage", projectId,
        { conversationId, messageId: v1Id(messageId), ...actAsInput(options) })).result, messageId),
      send: async (input, options = {}) => {
        const receipt = required((await execute("communication.sendMessage", projectId,
          { conversationId, text: v1String(input.text), props: input.props ?? {}, ...actAsInput(options) },
          options.requestId)).result);
        const cursor = v1Cursor(receipt.cursor);
        if (receipt.status !== "sent" || receipt.conversationId !== conversationId || cursor.conversationId !== conversationId ||
            cursor.sequence !== receipt.sequence || cursor.incarnation !== client.http.incarnation)
          throw new TypeError("Invalid send receipt scope");
        return { ...receipt, cursor };
      },
      edit: async (input, options = {}) => message((await execute("communication.editMessage", projectId,
        { ...input, conversationId, messageId: v1Id(input.messageId), expectedRevision: v1Counter(input.expectedRevision) },
        options.requestId)).result, input.messageId),
      delete: async (input, options = {}) => message((await execute("communication.deleteMessage", projectId,
        { ...input, conversationId, messageId: v1Id(input.messageId), expectedRevision: v1Counter(input.expectedRevision) },
        options.requestId)).result, input.messageId),
    };
    this.members = {
      list: async (options = {}) => {
        const page = required((await execute("communication.members", projectId, { conversationId,
          limit: pageLimit(options.limit), ...(options.cursor === undefined ? {} : { cursor: v1String(options.cursor) }) })).result);
        if (page.items.some(item => item.conversationId !== conversationId)) throw mismatch("Member page");
        return page;
      },
      add: async (input, options = {}) => member((await execute("communication.addMember", projectId,
        { conversationId, principalId: v1Id(input.principalId), role: memberRole(input.role),
          expectedRevision: v1Counter(input.expectedRevision) }, options.requestId)).result, input.principalId),
      addBatch: (members, options = {}) => client.addMembers(conversationId, members, options.requestId),
      remove: async (input, options = {}) => member((await execute("communication.removeMember", projectId,
        { conversationId, principalId: v1Id(input.principalId), expectedRevision: v1Counter(input.expectedRevision) },
        options.requestId)).result, input.principalId),
      grantHistory: async (input, options = {}) => member((await execute("communication.historyGrant", projectId,
        { ...input, conversationId, principalId: v1Id(input.principalId), expectedRevision: v1Counter(input.expectedRevision),
          membershipEpoch: v1Counter(input.membershipEpoch), fromSequence: v1Counter(input.fromSequence) },
        options.requestId)).result, input.principalId),
      setBroadcastPermission: async (input, options = {}) => {
        const payload = await execute("communication.setBroadcastPermission", projectId,
          { ...input, conversationId, principalId: v1Id(input.principalId),
            expectedMembershipRevision: v1Counter(input.expectedMembershipRevision) }, options.requestId);
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
  async get(): Promise<V1Conversation> {
    const conversation = required((await this.client.http.execute("communication.getConversation", this.client.projectId,
      { conversationId: this.conversationId })).result);
    if (conversation.conversationId !== this.conversationId) throw mismatch("Conversation");
    return conversation;
  }
  async update(input: Omit<V1Graphql.UpdateConversationRequestInput, "conversationId">,
    options: CommandOptions = {}): Promise<V1Conversation> {
    const conversation = required((await this.client.http.execute("communication.updateConversation", this.client.projectId,
      { ...input, conversationId: this.conversationId, expectedRevision: v1Counter(input.expectedRevision) },
      options.requestId)).result);
    if (conversation.conversationId !== this.conversationId) throw mismatch("Conversation");
    return conversation;
  }
}
