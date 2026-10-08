// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.kotlin

import com.convohop.server.api.CommunicationApi
import com.convohop.server.model.AcknowledgeCredentialReply
import com.convohop.server.model.AcknowledgeCredentialRequestInput
import com.convohop.server.model.AddMemberReply
import com.convohop.server.model.AddMemberRequestInput
import com.convohop.server.model.AddMembersInput
import com.convohop.server.model.AddMembersPayload
import com.convohop.server.model.AlertLiveSessionInput
import com.convohop.server.model.AlertLiveSessionPayload
import com.convohop.server.model.CapabilitiesReply
import com.convohop.server.model.ConversationLiveInput
import com.convohop.server.model.ConversationMuteInput
import com.convohop.server.model.ConversationMuteReply
import com.convohop.server.model.CreateConversationReply
import com.convohop.server.model.CreateConversationRequestInput
import com.convohop.server.model.CreatePrincipalReply
import com.convohop.server.model.CreatePrincipalRequestInput
import com.convohop.server.model.CurrentLiveSessionReply
import com.convohop.server.model.DeleteMessageReply
import com.convohop.server.model.DeleteMessageRequestInput
import com.convohop.server.model.DisablePrincipalReply
import com.convohop.server.model.DisablePrincipalRequestInput
import com.convohop.server.model.EditMessageReply
import com.convohop.server.model.EditMessageRequestInput
import com.convohop.server.model.EndLiveSessionInput
import com.convohop.server.model.EndLiveSessionPayload
import com.convohop.server.model.GetConversationReply
import com.convohop.server.model.GetConversationRequestInput
import com.convohop.server.model.GetMessageReply
import com.convohop.server.model.GetMessageRequestInput
import com.convohop.server.model.GetOperationReply
import com.convohop.server.model.GetOperationRequestInput
import com.convohop.server.model.GetPrincipalReply
import com.convohop.server.model.GetPrincipalRequestInput
import com.convohop.server.model.HistoryGrantReply
import com.convohop.server.model.HistoryGrantRequestInput
import com.convohop.server.model.InboxPage
import com.convohop.server.model.InboxReply
import com.convohop.server.model.InboxRequestInput
import com.convohop.server.model.IssueSessionReply
import com.convohop.server.model.IssueSessionRequestInput
import com.convohop.server.model.LiveParticipantPage
import com.convohop.server.model.LiveParticipantPageReply
import com.convohop.server.model.LiveParticipantsInput
import com.convohop.server.model.LiveSessionInput
import com.convohop.server.model.LiveSessionOperationInput
import com.convohop.server.model.LiveSessionOperationReply
import com.convohop.server.model.LiveSessionPage
import com.convohop.server.model.LiveSessionPageReply
import com.convohop.server.model.LiveSessionReply
import com.convohop.server.model.LiveSessionsInput
import com.convohop.server.model.MemberPage
import com.convohop.server.model.MembersReply
import com.convohop.server.model.MembersRequestInput
import com.convohop.server.model.MessagePage
import com.convohop.server.model.MessagesReply
import com.convohop.server.model.MessagesRequestInput
import com.convohop.server.model.RedeemCredentialReply
import com.convohop.server.model.RedeemCredentialRequestInput
import com.convohop.server.model.RemoveMemberReply
import com.convohop.server.model.RemoveMemberRequestInput
import com.convohop.server.model.RenewSessionReply
import com.convohop.server.model.RenewSessionRequestInput
import com.convohop.server.model.ResolveRequestReply
import com.convohop.server.model.ResolveRequestRequestInput
import com.convohop.server.model.RevokeSessionReply
import com.convohop.server.model.RevokeSessionRequestInput
import com.convohop.server.model.RouteReply
import com.convohop.server.model.SearchPage
import com.convohop.server.model.SearchReply
import com.convohop.server.model.SearchRequestInput
import com.convohop.server.model.SendMessageReply
import com.convohop.server.model.SendMessageRequestInput
import com.convohop.server.model.SessionRequestOutcomeReply
import com.convohop.server.model.SessionRequestOutcomeRequestInput
import com.convohop.server.model.SetBroadcastPermissionInput
import com.convohop.server.model.SetBroadcastPermissionPayload
import com.convohop.server.model.SetConversationMuteInput
import com.convohop.server.model.SetConversationMutePayload
import com.convohop.server.model.UpdateConversationReply
import com.convohop.server.model.UpdateConversationRequestInput
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow

/**
 * Suspending view of [CommunicationApi]. Each call runs on [dispatcher]. Cancelling the calling
 * coroutine interrupts the blocking request and the call fails with a CancellationException
 * whose cause is the lost-request problem; a mutation stays in the client's recovery journal.
 */
public class CommunicationSuspendApi(
    private val api: CommunicationApi,
    private val dispatcher: CoroutineDispatcher = Dispatchers.IO,
) {
    /** Suspending [CommunicationApi.capabilities]. */
    public suspend fun capabilities(): CapabilitiesReply =
        interruptible(dispatcher) { api.capabilities() }

    /** Suspending [CommunicationApi.route]. */
    public suspend fun route(): RouteReply =
        interruptible(dispatcher) { api.route() }

    /** Suspending [CommunicationApi.getPrincipal]. */
    public suspend fun getPrincipal(input: GetPrincipalRequestInput): GetPrincipalReply =
        interruptible(dispatcher) { api.getPrincipal(input) }

    /** Suspending [CommunicationApi.getConversation]. */
    public suspend fun getConversation(input: GetConversationRequestInput): GetConversationReply =
        interruptible(dispatcher) { api.getConversation(input) }

    /** Suspending [CommunicationApi.members]. */
    public suspend fun members(input: MembersRequestInput): MembersReply =
        interruptible(dispatcher) { api.members(input) }

    /**
     * [CommunicationApi.membersPages] as a cold flow. Each collection starts again from [input], and each page is requested
     * on [dispatcher] when the collector is ready for it.
     */
    public fun membersPages(input: MembersRequestInput): Flow<MemberPage> =
        pageFlow(dispatcher, api.membersPages(input))

    /** Suspending [CommunicationApi.messages]. */
    public suspend fun messages(input: MessagesRequestInput): MessagesReply =
        interruptible(dispatcher) { api.messages(input) }

    /**
     * [CommunicationApi.messagesPages] as a cold flow. Each collection starts again from [input], and each page is requested
     * on [dispatcher] when the collector is ready for it.
     */
    public fun messagesPages(input: MessagesRequestInput): Flow<MessagePage> =
        pageFlow(dispatcher, api.messagesPages(input))

    /** Suspending [CommunicationApi.getMessage]. */
    public suspend fun getMessage(input: GetMessageRequestInput): GetMessageReply =
        interruptible(dispatcher) { api.getMessage(input) }

    /** Suspending [CommunicationApi.inbox]. */
    public suspend fun inbox(input: InboxRequestInput): InboxReply =
        interruptible(dispatcher) { api.inbox(input) }

    /**
     * [CommunicationApi.inboxPages] as a cold flow. Each collection starts again from [input], and each page is requested
     * on [dispatcher] when the collector is ready for it.
     */
    public fun inboxPages(input: InboxRequestInput): Flow<InboxPage> =
        pageFlow(dispatcher, api.inboxPages(input))

    /** Suspending [CommunicationApi.search]. */
    public suspend fun search(input: SearchRequestInput): SearchReply =
        interruptible(dispatcher) { api.search(input) }

    /**
     * [CommunicationApi.searchPages] as a cold flow. Each collection starts again from [input], and each page is requested
     * on [dispatcher] when the collector is ready for it.
     */
    public fun searchPages(input: SearchRequestInput): Flow<SearchPage> =
        pageFlow(dispatcher, api.searchPages(input))

    /** Suspending [CommunicationApi.resolveRequest]. */
    public suspend fun resolveRequest(input: ResolveRequestRequestInput): ResolveRequestReply =
        interruptible(dispatcher) { api.resolveRequest(input) }

    /** Suspending [CommunicationApi.getOperation]. */
    public suspend fun getOperation(input: GetOperationRequestInput): GetOperationReply =
        interruptible(dispatcher) { api.getOperation(input) }

    /** Suspending [CommunicationApi.conversationMute]. */
    public suspend fun conversationMute(input: ConversationMuteInput): ConversationMuteReply =
        interruptible(dispatcher) { api.conversationMute(input) }

    /** Suspending [CommunicationApi.currentLiveSession]. */
    public suspend fun currentLiveSession(input: ConversationLiveInput): CurrentLiveSessionReply =
        interruptible(dispatcher) { api.currentLiveSession(input) }

    /** Suspending [CommunicationApi.liveSession]. */
    public suspend fun liveSession(input: LiveSessionInput): LiveSessionReply =
        interruptible(dispatcher) { api.liveSession(input) }

    /** Suspending [CommunicationApi.liveSessions]. */
    public suspend fun liveSessions(input: LiveSessionsInput): LiveSessionPageReply =
        interruptible(dispatcher) { api.liveSessions(input) }

    /**
     * [CommunicationApi.liveSessionsPages] as a cold flow. Each collection starts again from [input], and each page is requested
     * on [dispatcher] when the collector is ready for it.
     */
    public fun liveSessionsPages(input: LiveSessionsInput): Flow<LiveSessionPage> =
        pageFlow(dispatcher, api.liveSessionsPages(input))

    /** Suspending [CommunicationApi.liveSessionParticipants]. */
    public suspend fun liveSessionParticipants(input: LiveParticipantsInput): LiveParticipantPageReply =
        interruptible(dispatcher) { api.liveSessionParticipants(input) }

    /**
     * [CommunicationApi.liveSessionParticipantsPages] as a cold flow. Each collection starts again from [input], and each page is requested
     * on [dispatcher] when the collector is ready for it.
     */
    public fun liveSessionParticipantsPages(input: LiveParticipantsInput): Flow<LiveParticipantPage> =
        pageFlow(dispatcher, api.liveSessionParticipantsPages(input))

    /** Suspending [CommunicationApi.liveSessionOperation]. */
    public suspend fun liveSessionOperation(input: LiveSessionOperationInput): LiveSessionOperationReply =
        interruptible(dispatcher) { api.liveSessionOperation(input) }

    /** Suspending [CommunicationApi.sessionRequestOutcome]. */
    public suspend fun sessionRequestOutcome(input: SessionRequestOutcomeRequestInput): SessionRequestOutcomeReply =
        interruptible(dispatcher) { api.sessionRequestOutcome(input) }

    /** Suspending [CommunicationApi.createPrincipal]. */
    public suspend fun createPrincipal(input: CreatePrincipalRequestInput, requestId: String? = null): CreatePrincipalReply =
        interruptible(dispatcher) { api.createPrincipal(input, requestId) }

    /** Suspending [CommunicationApi.disablePrincipal]. */
    public suspend fun disablePrincipal(input: DisablePrincipalRequestInput, requestId: String? = null): DisablePrincipalReply =
        interruptible(dispatcher) { api.disablePrincipal(input, requestId) }

    /** Suspending [CommunicationApi.issueSession]. */
    public suspend fun issueSession(input: IssueSessionRequestInput, requestId: String? = null): IssueSessionReply =
        interruptible(dispatcher) { api.issueSession(input, requestId) }

    /** Suspending [CommunicationApi.renewSession]. */
    public suspend fun renewSession(input: RenewSessionRequestInput, requestId: String? = null): RenewSessionReply =
        interruptible(dispatcher) { api.renewSession(input, requestId) }

    /** Suspending [CommunicationApi.revokeSession]. */
    public suspend fun revokeSession(input: RevokeSessionRequestInput, requestId: String? = null): RevokeSessionReply =
        interruptible(dispatcher) { api.revokeSession(input, requestId) }

    /** Suspending [CommunicationApi.createConversation]. */
    public suspend fun createConversation(input: CreateConversationRequestInput, requestId: String? = null): CreateConversationReply =
        interruptible(dispatcher) { api.createConversation(input, requestId) }

    /** Suspending [CommunicationApi.updateConversation]. */
    public suspend fun updateConversation(input: UpdateConversationRequestInput, requestId: String? = null): UpdateConversationReply =
        interruptible(dispatcher) { api.updateConversation(input, requestId) }

    /** Suspending [CommunicationApi.addMember]. */
    public suspend fun addMember(input: AddMemberRequestInput, requestId: String? = null): AddMemberReply =
        interruptible(dispatcher) { api.addMember(input, requestId) }

    /** Suspending [CommunicationApi.addMembers]. */
    public suspend fun addMembers(input: AddMembersInput, requestId: String? = null): AddMembersPayload =
        interruptible(dispatcher) { api.addMembers(input, requestId) }

    /** Suspending [CommunicationApi.removeMember]. */
    public suspend fun removeMember(input: RemoveMemberRequestInput, requestId: String? = null): RemoveMemberReply =
        interruptible(dispatcher) { api.removeMember(input, requestId) }

    /** Suspending [CommunicationApi.historyGrant]. */
    public suspend fun historyGrant(input: HistoryGrantRequestInput, requestId: String? = null): HistoryGrantReply =
        interruptible(dispatcher) { api.historyGrant(input, requestId) }

    /** Suspending [CommunicationApi.sendMessage]. */
    public suspend fun sendMessage(input: SendMessageRequestInput, requestId: String? = null): SendMessageReply =
        interruptible(dispatcher) { api.sendMessage(input, requestId) }

    /** Suspending [CommunicationApi.editMessage]. */
    public suspend fun editMessage(input: EditMessageRequestInput, requestId: String? = null): EditMessageReply =
        interruptible(dispatcher) { api.editMessage(input, requestId) }

    /** Suspending [CommunicationApi.deleteMessage]. */
    public suspend fun deleteMessage(input: DeleteMessageRequestInput, requestId: String? = null): DeleteMessageReply =
        interruptible(dispatcher) { api.deleteMessage(input, requestId) }

    /** Suspending [CommunicationApi.setBroadcastPermission]. */
    public suspend fun setBroadcastPermission(input: SetBroadcastPermissionInput, requestId: String? = null): SetBroadcastPermissionPayload =
        interruptible(dispatcher) { api.setBroadcastPermission(input, requestId) }

    /** Suspending [CommunicationApi.setConversationMute]. */
    public suspend fun setConversationMute(input: SetConversationMuteInput, requestId: String? = null): SetConversationMutePayload =
        interruptible(dispatcher) { api.setConversationMute(input, requestId) }

    /** Suspending [CommunicationApi.alertLiveSession]. */
    public suspend fun alertLiveSession(input: AlertLiveSessionInput, requestId: String? = null): AlertLiveSessionPayload =
        interruptible(dispatcher) { api.alertLiveSession(input, requestId) }

    /** Suspending [CommunicationApi.endLiveSession]. */
    public suspend fun endLiveSession(input: EndLiveSessionInput, requestId: String? = null): EndLiveSessionPayload =
        interruptible(dispatcher) { api.endLiveSession(input, requestId) }

    /** Suspending [CommunicationApi.redeemCredential]. */
    public suspend fun redeemCredential(input: RedeemCredentialRequestInput, credentialDeliveryPermit: Map<String, Any?>, requestId: String? = null): RedeemCredentialReply =
        interruptible(dispatcher) { api.redeemCredential(input, credentialDeliveryPermit, requestId) }

    /** Suspending [CommunicationApi.acknowledgeCredential]. */
    public suspend fun acknowledgeCredential(input: AcknowledgeCredentialRequestInput, credentialDeliveryPermit: Map<String, Any?>, requestId: String? = null): AcknowledgeCredentialReply =
        interruptible(dispatcher) { api.acknowledgeCredential(input, credentialDeliveryPermit, requestId) }
}

/** A suspending view of this plane API whose calls run on [dispatcher]. */
public fun CommunicationApi.suspending(dispatcher: CoroutineDispatcher = Dispatchers.IO): CommunicationSuspendApi =
    CommunicationSuspendApi(this, dispatcher)
