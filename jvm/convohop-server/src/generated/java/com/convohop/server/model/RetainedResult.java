// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** Exactly one typed field contains the retained, currently authorized receipt result. */
public final class RetainedResult implements WireValue {
  private final @Nullable BroadcastPermissionChanged broadcastPermissionChanged;
  private final @Nullable Conversation conversation;
  private final @Nullable ConversationMemberBatch conversationMemberBatch;
  private final @Nullable ConversationMute conversationMute;
  private final @Nullable CredentialDeliveryReceipt credentialDeliveryReceipt;
  private final @Nullable DeliveryAck deliveryAck;
  private final @Nullable LiveAlertBatch liveAlertBatch;
  private final @Nullable LiveCredentialIssuance liveCredentialIssuance;
  private final @Nullable LiveSessionEndRequested liveSessionEndRequested;
  private final @Nullable LiveSessionJoined liveSessionJoined;
  private final @Nullable LiveSessionLeft liveSessionLeft;
  private final @Nullable LiveSessionStarted liveSessionStarted;
  private final @Nullable Member member;
  private final @Nullable Message message;
  private final @Nullable MessageAck messageAck;
  private final @Nullable Organization organization;
  private final @Nullable Principal principal;
  private final @Nullable ReadReceipt readReceipt;
  private final @Nullable SessionBootstrap sessionBootstrap;
  private final @Nullable SessionRevocation sessionRevocation;
  private final @Nullable Map<String, @Nullable Object> signedProof;

  private RetainedResult(
      @Nullable BroadcastPermissionChanged broadcastPermissionChanged,
      @Nullable Conversation conversation,
      @Nullable ConversationMemberBatch conversationMemberBatch,
      @Nullable ConversationMute conversationMute,
      @Nullable CredentialDeliveryReceipt credentialDeliveryReceipt,
      @Nullable DeliveryAck deliveryAck,
      @Nullable LiveAlertBatch liveAlertBatch,
      @Nullable LiveCredentialIssuance liveCredentialIssuance,
      @Nullable LiveSessionEndRequested liveSessionEndRequested,
      @Nullable LiveSessionJoined liveSessionJoined,
      @Nullable LiveSessionLeft liveSessionLeft,
      @Nullable LiveSessionStarted liveSessionStarted,
      @Nullable Member member,
      @Nullable Message message,
      @Nullable MessageAck messageAck,
      @Nullable Organization organization,
      @Nullable Principal principal,
      @Nullable ReadReceipt readReceipt,
      @Nullable SessionBootstrap sessionBootstrap,
      @Nullable SessionRevocation sessionRevocation,
      @Nullable Map<String, @Nullable Object> signedProof) {
    this.broadcastPermissionChanged = broadcastPermissionChanged;
    this.conversation = conversation;
    this.conversationMemberBatch = conversationMemberBatch;
    this.conversationMute = conversationMute;
    this.credentialDeliveryReceipt = credentialDeliveryReceipt;
    this.deliveryAck = deliveryAck;
    this.liveAlertBatch = liveAlertBatch;
    this.liveCredentialIssuance = liveCredentialIssuance;
    this.liveSessionEndRequested = liveSessionEndRequested;
    this.liveSessionJoined = liveSessionJoined;
    this.liveSessionLeft = liveSessionLeft;
    this.liveSessionStarted = liveSessionStarted;
    this.member = member;
    this.message = message;
    this.messageAck = messageAck;
    this.organization = organization;
    this.principal = principal;
    this.readReceipt = readReceipt;
    this.sessionBootstrap = sessionBootstrap;
    this.sessionRevocation = sessionRevocation;
    this.signedProof = signedProof;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static RetainedResult fromJson(@Nullable Object value) {
    return Wire.required(RetainedResult::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static RetainedResult decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "RetainedResult");
    Wire.exactlyOneNonNull(object, "RetainedResult");
    return new RetainedResult(
        Wire.field(object, "RetainedResult", "broadcastPermissionChanged", depth, Wire.optional(BroadcastPermissionChanged::decode)),
        Wire.field(object, "RetainedResult", "conversation", depth, Wire.optional(Conversation::decode)),
        Wire.field(object, "RetainedResult", "conversationMemberBatch", depth, Wire.optional(ConversationMemberBatch::decode)),
        Wire.field(object, "RetainedResult", "conversationMute", depth, Wire.optional(ConversationMute::decode)),
        Wire.field(object, "RetainedResult", "credentialDeliveryReceipt", depth, Wire.optional(CredentialDeliveryReceipt::decode)),
        Wire.field(object, "RetainedResult", "deliveryAck", depth, Wire.optional(DeliveryAck::decode)),
        Wire.field(object, "RetainedResult", "liveAlertBatch", depth, Wire.optional(LiveAlertBatch::decode)),
        Wire.field(object, "RetainedResult", "liveCredentialIssuance", depth, Wire.optional(LiveCredentialIssuance::decode)),
        Wire.field(object, "RetainedResult", "liveSessionEndRequested", depth, Wire.optional(LiveSessionEndRequested::decode)),
        Wire.field(object, "RetainedResult", "liveSessionJoined", depth, Wire.optional(LiveSessionJoined::decode)),
        Wire.field(object, "RetainedResult", "liveSessionLeft", depth, Wire.optional(LiveSessionLeft::decode)),
        Wire.field(object, "RetainedResult", "liveSessionStarted", depth, Wire.optional(LiveSessionStarted::decode)),
        Wire.field(object, "RetainedResult", "member", depth, Wire.optional(Member::decode)),
        Wire.field(object, "RetainedResult", "message", depth, Wire.optional(Message::decode)),
        Wire.field(object, "RetainedResult", "messageAck", depth, Wire.optional(MessageAck::decode)),
        Wire.field(object, "RetainedResult", "organization", depth, Wire.optional(Organization::decode)),
        Wire.field(object, "RetainedResult", "principal", depth, Wire.optional(Principal::decode)),
        Wire.field(object, "RetainedResult", "readReceipt", depth, Wire.optional(ReadReceipt::decode)),
        Wire.field(object, "RetainedResult", "sessionBootstrap", depth, Wire.optional(SessionBootstrap::decode)),
        Wire.field(object, "RetainedResult", "sessionRevocation", depth, Wire.optional(SessionRevocation::decode)),
        Wire.field(object, "RetainedResult", "signedProof", depth, Wire.optional(Scalars.SIGNED_PROOF)));
  }

  /** The <code>broadcastPermissionChanged</code> field. */
  public @Nullable BroadcastPermissionChanged getBroadcastPermissionChanged() {
    return this.broadcastPermissionChanged;
  }

  /** The <code>conversation</code> field. */
  public @Nullable Conversation getConversation() {
    return this.conversation;
  }

  /** The <code>conversationMemberBatch</code> field. */
  public @Nullable ConversationMemberBatch getConversationMemberBatch() {
    return this.conversationMemberBatch;
  }

  /** The <code>conversationMute</code> field. */
  public @Nullable ConversationMute getConversationMute() {
    return this.conversationMute;
  }

  /** The <code>credentialDeliveryReceipt</code> field. */
  public @Nullable CredentialDeliveryReceipt getCredentialDeliveryReceipt() {
    return this.credentialDeliveryReceipt;
  }

  /** The <code>deliveryAck</code> field. */
  public @Nullable DeliveryAck getDeliveryAck() {
    return this.deliveryAck;
  }

  /** The <code>liveAlertBatch</code> field. */
  public @Nullable LiveAlertBatch getLiveAlertBatch() {
    return this.liveAlertBatch;
  }

  /** The <code>liveCredentialIssuance</code> field. */
  public @Nullable LiveCredentialIssuance getLiveCredentialIssuance() {
    return this.liveCredentialIssuance;
  }

  /** The <code>liveSessionEndRequested</code> field. */
  public @Nullable LiveSessionEndRequested getLiveSessionEndRequested() {
    return this.liveSessionEndRequested;
  }

  /** The <code>liveSessionJoined</code> field. */
  public @Nullable LiveSessionJoined getLiveSessionJoined() {
    return this.liveSessionJoined;
  }

  /** The <code>liveSessionLeft</code> field. */
  public @Nullable LiveSessionLeft getLiveSessionLeft() {
    return this.liveSessionLeft;
  }

  /** The <code>liveSessionStarted</code> field. */
  public @Nullable LiveSessionStarted getLiveSessionStarted() {
    return this.liveSessionStarted;
  }

  /** The <code>member</code> field. */
  public @Nullable Member getMember() {
    return this.member;
  }

  /** The <code>message</code> field. */
  public @Nullable Message getMessage() {
    return this.message;
  }

  /** The <code>messageAck</code> field. */
  public @Nullable MessageAck getMessageAck() {
    return this.messageAck;
  }

  /** The <code>organization</code> field. */
  public @Nullable Organization getOrganization() {
    return this.organization;
  }

  /** The <code>principal</code> field. */
  public @Nullable Principal getPrincipal() {
    return this.principal;
  }

  /** The <code>readReceipt</code> field. */
  public @Nullable ReadReceipt getReadReceipt() {
    return this.readReceipt;
  }

  /** The <code>sessionBootstrap</code> field. */
  public @Nullable SessionBootstrap getSessionBootstrap() {
    return this.sessionBootstrap;
  }

  /** The <code>sessionRevocation</code> field. */
  public @Nullable SessionRevocation getSessionRevocation() {
    return this.sessionRevocation;
  }

  /** The <code>signedProof</code> field. */
  public @Nullable Map<String, @Nullable Object> getSignedProof() {
    return this.signedProof;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("broadcastPermissionChanged", Wire.json(this.broadcastPermissionChanged));
    json.put("conversation", Wire.json(this.conversation));
    json.put("conversationMemberBatch", Wire.json(this.conversationMemberBatch));
    json.put("conversationMute", Wire.json(this.conversationMute));
    json.put("credentialDeliveryReceipt", Wire.json(this.credentialDeliveryReceipt));
    json.put("deliveryAck", Wire.json(this.deliveryAck));
    json.put("liveAlertBatch", Wire.json(this.liveAlertBatch));
    json.put("liveCredentialIssuance", Wire.json(this.liveCredentialIssuance));
    json.put("liveSessionEndRequested", Wire.json(this.liveSessionEndRequested));
    json.put("liveSessionJoined", Wire.json(this.liveSessionJoined));
    json.put("liveSessionLeft", Wire.json(this.liveSessionLeft));
    json.put("liveSessionStarted", Wire.json(this.liveSessionStarted));
    json.put("member", Wire.json(this.member));
    json.put("message", Wire.json(this.message));
    json.put("messageAck", Wire.json(this.messageAck));
    json.put("organization", Wire.json(this.organization));
    json.put("principal", Wire.json(this.principal));
    json.put("readReceipt", Wire.json(this.readReceipt));
    json.put("sessionBootstrap", Wire.json(this.sessionBootstrap));
    json.put("sessionRevocation", Wire.json(this.sessionRevocation));
    json.put("signedProof", Wire.json(this.signedProof));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof RetainedResult)) {
      return false;
    }
    RetainedResult that = (RetainedResult) other;
    return Objects.equals(this.broadcastPermissionChanged, that.broadcastPermissionChanged)
        && Objects.equals(this.conversation, that.conversation)
        && Objects.equals(this.conversationMemberBatch, that.conversationMemberBatch)
        && Objects.equals(this.conversationMute, that.conversationMute)
        && Objects.equals(this.credentialDeliveryReceipt, that.credentialDeliveryReceipt)
        && Objects.equals(this.deliveryAck, that.deliveryAck)
        && Objects.equals(this.liveAlertBatch, that.liveAlertBatch)
        && Objects.equals(this.liveCredentialIssuance, that.liveCredentialIssuance)
        && Objects.equals(this.liveSessionEndRequested, that.liveSessionEndRequested)
        && Objects.equals(this.liveSessionJoined, that.liveSessionJoined)
        && Objects.equals(this.liveSessionLeft, that.liveSessionLeft)
        && Objects.equals(this.liveSessionStarted, that.liveSessionStarted)
        && Objects.equals(this.member, that.member)
        && Objects.equals(this.message, that.message)
        && Objects.equals(this.messageAck, that.messageAck)
        && Objects.equals(this.organization, that.organization)
        && Objects.equals(this.principal, that.principal)
        && Objects.equals(this.readReceipt, that.readReceipt)
        && Objects.equals(this.sessionBootstrap, that.sessionBootstrap)
        && Objects.equals(this.sessionRevocation, that.sessionRevocation)
        && Objects.equals(this.signedProof, that.signedProof);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.broadcastPermissionChanged, this.conversation, this.conversationMemberBatch, this.conversationMute, this.credentialDeliveryReceipt, this.deliveryAck, this.liveAlertBatch, this.liveCredentialIssuance, this.liveSessionEndRequested, this.liveSessionJoined, this.liveSessionLeft, this.liveSessionStarted, this.member, this.message, this.messageAck, this.organization, this.principal, this.readReceipt, this.sessionBootstrap, this.sessionRevocation, this.signedProof);
  }

  @Override
  public String toString() {
    return "RetainedResult{broadcastPermissionChanged=" + this.broadcastPermissionChanged
        + ", conversation=" + this.conversation
        + ", conversationMemberBatch=" + this.conversationMemberBatch
        + ", conversationMute=" + this.conversationMute
        + ", credentialDeliveryReceipt=" + this.credentialDeliveryReceipt
        + ", deliveryAck=" + this.deliveryAck
        + ", liveAlertBatch=" + this.liveAlertBatch
        + ", liveCredentialIssuance=" + this.liveCredentialIssuance
        + ", liveSessionEndRequested=" + this.liveSessionEndRequested
        + ", liveSessionJoined=" + this.liveSessionJoined
        + ", liveSessionLeft=" + this.liveSessionLeft
        + ", liveSessionStarted=" + this.liveSessionStarted
        + ", member=" + this.member
        + ", message=" + this.message
        + ", messageAck=" + this.messageAck
        + ", organization=" + this.organization
        + ", principal=" + this.principal
        + ", readReceipt=" + this.readReceipt
        + ", sessionBootstrap=" + this.sessionBootstrap
        + ", sessionRevocation=" + this.sessionRevocation
        + ", signedProof=" + Wire.redacted(this.signedProof)
        + "}";
  }
}
