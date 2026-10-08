package com.convohop.server;

import com.convohop.server.api.CommunicationApi;
import com.convohop.server.internal.Wire;
import com.convohop.server.model.AddMemberReply;
import com.convohop.server.model.AddMemberRequestInput;
import com.convohop.server.model.AddMembersInput;
import com.convohop.server.model.AddMembersPayload;
import com.convohop.server.model.Conversation;
import com.convohop.server.model.Cursor;
import com.convohop.server.model.DeleteMessageReply;
import com.convohop.server.model.DeleteMessageRequestInput;
import com.convohop.server.model.EditMessageReply;
import com.convohop.server.model.EditMessageRequestInput;
import com.convohop.server.model.GetConversationReply;
import com.convohop.server.model.GetConversationRequestInput;
import com.convohop.server.model.GetMessageReply;
import com.convohop.server.model.GetMessageRequestInput;
import com.convohop.server.model.Member;
import com.convohop.server.model.MemberBatchEntryInput;
import com.convohop.server.model.MemberPage;
import com.convohop.server.model.MembersReply;
import com.convohop.server.model.MembersRequestInput;
import com.convohop.server.model.Message;
import com.convohop.server.model.MessageAck;
import com.convohop.server.model.MessagePage;
import com.convohop.server.model.MessagesReply;
import com.convohop.server.model.MessagesRequestInput;
import com.convohop.server.model.RemoveMemberReply;
import com.convohop.server.model.RemoveMemberRequestInput;
import com.convohop.server.model.SendMessageReply;
import com.convohop.server.model.SendMessageRequestInput;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.jspecify.annotations.Nullable;

/**
 * Backend view of one conversation, from {@link ProjectServerClient#conversation(String)}. Creating it sends nothing;
 * each method needs the backend key scope its operation names. Message reads and sends accept {@code actAs}, a
 * member principal ID: reads then see what that member sees, sends are authored by it, and the authority audits
 * both.
 */
public final class ServerConversation {
  private final CommunicationApi communication;
  private final Transport transport;
  private final String conversationId;
  private final Messages messages = new Messages();
  private final Members members = new Members();

  ServerConversation(CommunicationApi communication, Transport transport, String conversationId) {
    this.communication = communication;
    this.transport = transport;
    this.conversationId = conversationId;
  }

  /**
   * The conversation this handle acts on.
   *
   * @return the conversation ID
   */
  public String getConversationId() {
    return this.conversationId;
  }

  /**
   * Message helpers.
   *
   * @return the message helpers
   */
  public Messages messages() {
    return this.messages;
  }

  /**
   * Membership helpers.
   *
   * @return the membership helpers
   */
  public Members members() {
    return this.members;
  }

  /**
   * Reads the conversation.
   *
   * @return the conversation
   * @throws ConvoHopProblem if the authority rejects the read or its reply names another conversation
   */
  public Conversation get() {
    GetConversationReply reply = this.communication.getConversation(
        GetConversationRequestInput.builder().conversationId(this.conversationId).build());
    Conversation conversation = Checks.required(reply.getResult(), reply.getRequestId());
    if (!conversation.getConversationId().equals(this.conversationId)) {
      throw Checks.mismatch("Conversation", reply.getRequestId());
    }
    return conversation;
  }

  private Message message(@Nullable Message value, String requestId, String messageId) {
    Message current = Checks.required(value, requestId);
    if (!current.getMessageId().equals(messageId) || !current.getConversationId().equals(this.conversationId)) {
      throw Checks.mismatch("Message", requestId);
    }
    return current;
  }

  private Member member(@Nullable Member value, String requestId, String principalId) {
    Member current = Checks.required(value, requestId);
    if (!current.getPrincipalId().equals(principalId) || !current.getConversationId().equals(this.conversationId)) {
      throw Checks.mismatch("Member", requestId);
    }
    return current;
  }

  private static @Nullable String actAs(@Nullable String actAs) {
    return actAs == null ? null : Checks.id(actAs, "actAs");
  }

  /** Lists, reads, sends, edits and deletes messages. */
  public final class Messages {
    private Messages() {}

    /**
     * Lists the latest messages, up to 100.
     *
     * @return the page
     * @throws ConvoHopProblem if the authority rejects the read or its reply holds another conversation's messages
     */
    public MessagePage list() {
      return list(null, null, null);
    }

    /**
     * Lists messages.
     *
     * @param actAs the member principal to read as, or {@code null} for the backend's own visibility
     * @param beforeSequence list messages before this sequence, or {@code null} for the latest
     * @param limit the page size, 1..100, or {@code null} for 100
     * @return the page
     * @throws IllegalArgumentException if an argument is invalid
     * @throws ConvoHopProblem if the authority rejects the read or its reply holds another conversation's messages
     */
    public MessagePage list(@Nullable String actAs, @Nullable String beforeSequence, @Nullable Integer limit) {
      MessagesReply reply = communication.messages(MessagesRequestInput.builder()
          .conversationId(conversationId)
          .limit(Checks.pageLimit(limit))
          .beforeSequence(beforeSequence == null ? null : Checks.counter(beforeSequence, "beforeSequence"))
          .actAsPrincipalId(actAs(actAs))
          .build());
      MessagePage page = Checks.required(reply.getResult(), reply.getRequestId());
      for (Message item : page.getItems()) {
        if (!item.getConversationId().equals(conversationId)) {
          throw Checks.mismatch("Message page", reply.getRequestId());
        }
      }
      return page;
    }

    /**
     * Reads a message.
     *
     * @param messageId the message ID
     * @return the message
     * @throws ConvoHopProblem if the authority rejects the read or its reply names another message
     */
    public Message get(String messageId) {
      return get(messageId, null);
    }

    /**
     * Reads a message.
     *
     * @param messageId the message ID
     * @param actAs the member principal to read as, or {@code null} for the backend's own visibility
     * @return the message
     * @throws ConvoHopProblem if the authority rejects the read or its reply names another message
     */
    public Message get(String messageId, @Nullable String actAs) {
      GetMessageReply reply = communication.getMessage(GetMessageRequestInput.builder()
          .conversationId(conversationId)
          .messageId(Checks.id(messageId, "messageId"))
          .actAsPrincipalId(actAs(actAs))
          .build());
      return message(reply.getResult(), reply.getRequestId(), messageId);
    }

    /**
     * Sends a message as the project's backend principal.
     *
     * @param text the text
     * @return the receipt
     * @throws ConvoHopProblem if the authority rejects the message or its receipt names another conversation
     */
    public MessageAck send(String text) {
      return send(text, null, null, null);
    }

    /**
     * Sends a message.
     *
     * @param text the text
     * @param props application properties, or {@code null} for none
     * @param actAs the member principal to send as, or {@code null} to send as the backend
     * @param requestId the request ID to send, or {@code null} for a new one
     * @return the receipt, with the message's cursor
     * @throws ConvoHopProblem if the authority rejects the message or its receipt names another conversation
     */
    public MessageAck send(
        String text, @Nullable Map<String, @Nullable Object> props, @Nullable String actAs,
        @Nullable String requestId) {
      SendMessageReply reply = communication.sendMessage(
          SendMessageRequestInput.builder()
              .conversationId(conversationId)
              .text(Wire.nonNull(text, "text"))
              .props(props == null ? Collections.<String, @Nullable Object>emptyMap() : props)
              .actAsPrincipalId(actAs(actAs))
              .build(),
          requestId);
      MessageAck receipt = Checks.required(reply.getResult(), reply.getRequestId());
      Cursor cursor = receipt.getCursor();
      if (cursor == null || !receipt.getStatus().equals("sent") || !receipt.getConversationId().equals(conversationId)
          || !cursor.getConversationId().equals(conversationId) || !cursor.getSequence().equals(receipt.getSequence())
          || !cursor.getIncarnation().equals(transport.incarnation())) {
        throw new ConvoHopProblem("INVALID_RESPONSE", reply.getRequestId(), "unknown", 503, "Invalid send receipt scope");
      }
      return receipt;
    }

    /**
     * Edits a message's text.
     *
     * @param messageId the message ID
     * @param expectedRevision the message's current revision
     * @param text the new text
     * @return the edited message
     * @throws ConvoHopProblem if the authority rejects the edit or its reply names another message
     */
    public Message edit(String messageId, String expectedRevision, String text) {
      return edit(messageId, expectedRevision, Wire.nonNull(text, "text"), null, null);
    }

    /**
     * Edits a message.
     *
     * @param messageId the message ID
     * @param expectedRevision the message's current revision
     * @param text the new text, or {@code null} to keep it
     * @param props the new application properties, or {@code null} to keep them
     * @param requestId the request ID to send, or {@code null} for a new one
     * @return the edited message
     * @throws ConvoHopProblem if the authority rejects the edit or its reply names another message
     */
    public Message edit(
        String messageId, String expectedRevision, @Nullable String text,
        @Nullable Map<String, @Nullable Object> props, @Nullable String requestId) {
      EditMessageReply reply = communication.editMessage(
          EditMessageRequestInput.builder()
              .conversationId(conversationId)
              .messageId(Checks.id(messageId, "messageId"))
              .expectedRevision(Checks.counter(expectedRevision, "expectedRevision"))
              .text(text)
              .props(props)
              .build(),
          requestId);
      return message(reply.getResult(), reply.getRequestId(), messageId);
    }

    /**
     * Deletes a message.
     *
     * @param messageId the message ID
     * @param expectedRevision the message's current revision
     * @return the deleted message
     * @throws ConvoHopProblem if the authority rejects the deletion or its reply names another message
     */
    public Message delete(String messageId, String expectedRevision) {
      return delete(messageId, expectedRevision, null);
    }

    /**
     * Deletes a message.
     *
     * @param messageId the message ID
     * @param expectedRevision the message's current revision
     * @param requestId the request ID to send, or {@code null} for a new one
     * @return the deleted message
     * @throws ConvoHopProblem if the authority rejects the deletion or its reply names another message
     */
    public Message delete(String messageId, String expectedRevision, @Nullable String requestId) {
      DeleteMessageReply reply = communication.deleteMessage(
          DeleteMessageRequestInput.builder()
              .conversationId(conversationId)
              .messageId(Checks.id(messageId, "messageId"))
              .expectedRevision(Checks.counter(expectedRevision, "expectedRevision"))
              .build(),
          requestId);
      return message(reply.getResult(), reply.getRequestId(), messageId);
    }
  }

  /** Lists, adds and removes members. Roles are {@code member} or {@code moderator}. */
  public final class Members {
    private Members() {}

    /**
     * Lists the first members, up to 100.
     *
     * @return the page
     * @throws ConvoHopProblem if the authority rejects the read or its reply holds another conversation's members
     */
    public MemberPage list() {
      return list(null, null);
    }

    /**
     * Lists members.
     *
     * @param limit the page size, 1..100, or {@code null} for 100
     * @param cursor the {@code nextCursor} of the previous page, or {@code null} for the first page
     * @return the page
     * @throws IllegalArgumentException if the page size is invalid
     * @throws ConvoHopProblem if the authority rejects the read or its reply holds another conversation's members
     */
    public MemberPage list(@Nullable Integer limit, @Nullable String cursor) {
      MembersReply reply = communication.members(MembersRequestInput.builder()
          .conversationId(conversationId)
          .limit(Checks.pageLimit(limit))
          .cursor(cursor)
          .build());
      MemberPage page = Checks.required(reply.getResult(), reply.getRequestId());
      for (Member item : page.getItems()) {
        if (!item.getConversationId().equals(conversationId)) {
          throw Checks.mismatch("Member page", reply.getRequestId());
        }
      }
      return page;
    }

    /**
     * Adds a member.
     *
     * @param principalId the principal ID
     * @param role {@code member} or {@code moderator}
     * @param expectedRevision the membership's current revision
     * @return the membership
     * @throws ConvoHopProblem if the authority rejects the request or its reply names another member
     */
    public Member add(String principalId, String role, String expectedRevision) {
      return add(principalId, role, expectedRevision, null);
    }

    /**
     * Adds a member.
     *
     * @param principalId the principal ID
     * @param role {@code member} or {@code moderator}
     * @param expectedRevision the membership's current revision
     * @param requestId the request ID to send, or {@code null} for a new one
     * @return the membership
     * @throws ConvoHopProblem if the authority rejects the request or its reply names another member
     */
    public Member add(String principalId, String role, String expectedRevision, @Nullable String requestId) {
      AddMemberReply reply = communication.addMember(
          AddMemberRequestInput.builder()
              .conversationId(conversationId)
              .principalId(Checks.id(principalId, "principalId"))
              .role(Checks.role(role))
              .expectedRevision(Checks.counter(expectedRevision, "expectedRevision"))
              .build(),
          requestId);
      return member(reply.getResult(), reply.getRequestId(), principalId);
    }

    /**
     * Adds up to 100 members at once.
     *
     * @param members 1..100 entries for distinct principals
     * @return the memberships, one per entry
     * @throws IllegalArgumentException if the batch is empty, too large, repeats a principal or has an invalid entry
     * @throws ConvoHopProblem if the authority rejects the batch or its reply has the wrong number of members
     */
    public List<Member> addBatch(List<MemberBatchEntryInput> members) {
      return addBatch(members, null);
    }

    /**
     * Adds up to 100 members at once.
     *
     * @param members 1..100 entries for distinct principals
     * @param requestId the request ID to send, or {@code null} for a new one
     * @return the memberships, one per entry
     * @throws IllegalArgumentException if the batch is empty, too large, repeats a principal or has an invalid entry
     * @throws ConvoHopProblem if the authority rejects the batch or its reply has the wrong number of members
     */
    public List<Member> addBatch(List<MemberBatchEntryInput> members, @Nullable String requestId) {
      List<MemberBatchEntryInput> entries = new ArrayList<>(Wire.nonNull(members, "members"));
      Set<String> principals = new HashSet<>();
      for (MemberBatchEntryInput entry : entries) {
        principals.add(Wire.nonNull(entry, "member").getPrincipalId());
      }
      if (entries.isEmpty() || entries.size() > 100 || principals.size() != entries.size()) {
        throw new IllegalArgumentException("A membership batch requires 1..100 distinct principals");
      }
      for (MemberBatchEntryInput entry : entries) {
        Checks.role(entry.getRole());
        Checks.id(entry.getPrincipalId(), "principalId");
        Checks.counter(entry.getExpectedRevision(), "expectedRevision");
      }
      AddMembersPayload reply = communication.addMembers(
          AddMembersInput.builder().conversationId(conversationId).members(entries).build(), requestId);
      List<Member> items = reply.getResult().getItems();
      if (items.size() != entries.size()) {
        throw new ConvoHopProblem(
            "INVALID_RESPONSE", reply.getRequestId(), "unknown", 503, "Invalid membership batch result");
      }
      return items;
    }

    /**
     * Removes a member.
     *
     * @param principalId the principal ID
     * @param expectedRevision the membership's current revision
     * @return the membership
     * @throws ConvoHopProblem if the authority rejects the request or its reply names another member
     */
    public Member remove(String principalId, String expectedRevision) {
      return remove(principalId, expectedRevision, null);
    }

    /**
     * Removes a member.
     *
     * @param principalId the principal ID
     * @param expectedRevision the membership's current revision
     * @param requestId the request ID to send, or {@code null} for a new one
     * @return the membership
     * @throws ConvoHopProblem if the authority rejects the request or its reply names another member
     */
    public Member remove(String principalId, String expectedRevision, @Nullable String requestId) {
      RemoveMemberReply reply = communication.removeMember(
          RemoveMemberRequestInput.builder()
              .conversationId(conversationId)
              .principalId(Checks.id(principalId, "principalId"))
              .expectedRevision(Checks.counter(expectedRevision, "expectedRevision"))
              .build(),
          requestId);
      return member(reply.getResult(), reply.getRequestId(), principalId);
    }
  }
}
