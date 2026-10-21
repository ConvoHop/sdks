// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package dev.instantrelay.server.kotlin

import dev.instantrelay.server.api.CommunicationApi
import dev.instantrelay.server.model.AcknowledgeCredentialReply
import dev.instantrelay.server.model.AcknowledgeCredentialRequestInput
import dev.instantrelay.server.model.AddMemberReply
import dev.instantrelay.server.model.AddMemberRequestInput
import dev.instantrelay.server.model.AddMembersInput
import dev.instantrelay.server.model.AddMembersPayload
import dev.instantrelay.server.model.AlertLiveSessionInput
import dev.instantrelay.server.model.AlertLiveSessionPayload
import dev.instantrelay.server.model.CapabilitiesReply
import dev.instantrelay.server.model.ConversationLiveInput
import dev.instantrelay.server.model.ConversationMuteInput
import dev.instantrelay.server.model.ConversationMuteReply
import dev.instantrelay.server.model.CreateConversationReply
import dev.instantrelay.server.model.CreateConversationRequestInput
import dev.instantrelay.server.model.CreatePrincipalReply
import dev.instantrelay.server.model.CreatePrincipalRequestInput
import dev.instantrelay.server.model.CurrentLiveSessionReply
import dev.instantrelay.server.model.DeleteMessageReply
import dev.instantrelay.server.model.DeleteMessageRequestInput
import dev.instantrelay.server.model.DisablePrincipalReply
import dev.instantrelay.server.model.DisablePrincipalRequestInput
import dev.instantrelay.server.model.EditMessageReply
import dev.instantrelay.server.model.EditMessageRequestInput
import dev.instantrelay.server.model.EndLiveSessionInput
import dev.instantrelay.server.model.EndLiveSessionPayload
import dev.instantrelay.server.model.GetConversationReply
import dev.instantrelay.server.model.GetConversationRequestInput
import dev.instantrelay.server.model.GetMessageReply
import dev.instantrelay.server.model.GetMessageRequestInput
import dev.instantrelay.server.model.GetOperationReply
import dev.instantrelay.server.model.GetOperationRequestInput
import dev.instantrelay.server.model.GetPrincipalReply
import dev.instantrelay.server.model.GetPrincipalRequestInput
import dev.instantrelay.server.model.HistoryGrantReply
import dev.instantrelay.server.model.HistoryGrantRequestInput
import dev.instantrelay.server.model.InboxPage
import dev.instantrelay.server.model.InboxReply
import dev.instantrelay.server.model.InboxRequestInput
import dev.instantrelay.server.model.IssueSessionReply
import dev.instantrelay.server.model.IssueSessionRequestInput
import dev.instantrelay.server.model.LiveParticipantPage
import dev.instantrelay.server.model.LiveParticipantPageReply
import dev.instantrelay.server.model.LiveParticipantsInput
import dev.instantrelay.server.model.LiveSessionInput
import dev.instantrelay.server.model.LiveSessionOperationInput
import dev.instantrelay.server.model.LiveSessionOperationReply
import dev.instantrelay.server.model.LiveSessionPage
import dev.instantrelay.server.model.LiveSessionPageReply
import dev.instantrelay.server.model.LiveSessionReply
import dev.instantrelay.server.model.LiveSessionsInput
import dev.instantrelay.server.model.MemberPage
import dev.instantrelay.server.model.MembersReply
import dev.instantrelay.server.model.MembersRequestInput
import dev.instantrelay.server.model.MessagePage
import dev.instantrelay.server.model.MessagesReply
import dev.instantrelay.server.model.MessagesRequestInput
import dev.instantrelay.server.model.RedeemCredentialReply
import dev.instantrelay.server.model.RedeemCredentialRequestInput
import dev.instantrelay.server.model.RemoveMemberReply
import dev.instantrelay.server.model.RemoveMemberRequestInput
import dev.instantrelay.server.model.RenewSessionReply
import dev.instantrelay.server.model.RenewSessionRequestInput
import dev.instantrelay.server.model.ResolveRequestReply
import dev.instantrelay.server.model.ResolveRequestRequestInput
import dev.instantrelay.server.model.RevokeSessionReply
import dev.instantrelay.server.model.RevokeSessionRequestInput
import dev.instantrelay.server.model.RouteReply
import dev.instantrelay.server.model.SearchPage
import dev.instantrelay.server.model.SearchReply
import dev.instantrelay.server.model.SearchRequestInput
import dev.instantrelay.server.model.SendMessageReply
import dev.instantrelay.server.model.SendMessageRequestInput
import dev.instantrelay.server.model.SessionRequestOutcomeReply
import dev.instantrelay.server.model.SessionRequestOutcomeRequestInput
import dev.instantrelay.server.model.SetBroadcastPermissionInput
import dev.instantrelay.server.model.SetBroadcastPermissionPayload
import dev.instantrelay.server.model.SetConversationMuteInput
import dev.instantrelay.server.model.SetConversationMutePayload
import dev.instantrelay.server.model.UpdateConversationReply
import dev.instantrelay.server.model.UpdateConversationRequestInput
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
