using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using ConvoHop.Models;

namespace ConvoHop
{
    /// <summary>Members of one conversation: membership, history grants, broadcast permissions and mutes.</summary>
    public sealed class ServerMembers
    {
        private readonly ProjectServerClient _client;
        private readonly string _conversationId;

        internal ServerMembers(ProjectServerClient client, string conversationId)
        {
            _client = client;
            _conversationId = conversationId;
        }

        /// <summary>Lists members (<c>membershipManage</c>).</summary>
        /// <param name="limit">The page size, 1 to 100. Defaults to 100.</param>
        /// <param name="cursor">The <see cref="MemberPage.NextCursor"/> of the previous page.</param>
        /// <param name="cancellationToken">Stops waiting for the read.</param>
        /// <returns>The member page.</returns>
        /// <exception cref="ArgumentException">An argument is invalid.</exception>
        /// <exception cref="ConvoHopException">The read failed or its response was malformed.</exception>
        public async Task<MemberPage> ListAsync(int? limit = null, string? cursor = null, CancellationToken cancellationToken = default)
        {
            var input = new MembersRequestInput(_conversationId, ServerChecks.PageLimit(limit, nameof(limit))) { Cursor = cursor };
            MembersReply reply = await _client.ExecuteAsync(Operations.Communication.Members, input, null, cancellationToken)
                .ConfigureAwait(false);
            MemberPage page = ServerChecks.Required(reply.Result, reply.RequestId);
            foreach (Member item in page.Items)
            {
                if (item.ConversationId != _conversationId) throw ServerChecks.Mismatch("Member page", reply.RequestId);
            }

            return page;
        }

        /// <summary>Adds a member, or changes a member's role (<c>membershipManage</c>).</summary>
        /// <param name="principalId">The principal ID.</param>
        /// <param name="role"><c>member</c> or <c>moderator</c>.</param>
        /// <param name="expectedRevision">The membership revision you observed; <c>0</c> when the principal was never a member.</param>
        /// <param name="requestId">The request ID; pass the original ID to resume after an uncertain outcome.</param>
        /// <param name="cancellationToken">Stops waiting. A cancelled mutation has an unknown outcome.</param>
        /// <returns>The membership.</returns>
        /// <exception cref="ArgumentException">An argument is invalid.</exception>
        /// <exception cref="ConvoHopException">The request failed, or its outcome is uncertain.</exception>
        public async Task<Member> AddAsync(string principalId, string role, string expectedRevision, string? requestId = null,
            CancellationToken cancellationToken = default)
        {
            var input = new AddMemberRequestInput(_conversationId, ServerChecks.Id(principalId, nameof(principalId)),
                ServerChecks.Role(role, nameof(role)), ServerChecks.Counter(expectedRevision, nameof(expectedRevision)));
            AddMemberReply reply = await _client.ExecuteAsync(Operations.Communication.AddMember, input, requestId, cancellationToken)
                .ConfigureAwait(false);
            return Checked(reply.Result, principalId, reply.RequestId);
        }

        /// <summary>Adds 1 to 100 distinct principals in one atomic batch (<c>membershipManage</c>).</summary>
        /// <param name="members">The principals, roles and the membership revisions you observed.</param>
        /// <param name="requestId">The request ID; pass the original ID to resume after an uncertain outcome.</param>
        /// <param name="cancellationToken">Stops waiting. A cancelled mutation has an unknown outcome.</param>
        /// <returns>The memberships, one per entry.</returns>
        /// <exception cref="ArgumentException">An argument is invalid.</exception>
        /// <exception cref="ConvoHopException">The request failed, or its outcome is uncertain.</exception>
        public Task<IReadOnlyList<Member>> AddBatchAsync(IReadOnlyList<MemberBatchEntryInput> members, string? requestId = null,
            CancellationToken cancellationToken = default) =>
            _client.AddMembersAsync(_conversationId, members, requestId, cancellationToken);

        /// <summary>Removes a member (<c>membershipManage</c>).</summary>
        /// <param name="principalId">The principal ID.</param>
        /// <param name="expectedRevision">The membership revision you observed.</param>
        /// <param name="requestId">The request ID; pass the original ID to resume after an uncertain outcome.</param>
        /// <param name="cancellationToken">Stops waiting. A cancelled mutation has an unknown outcome.</param>
        /// <returns>The ended membership.</returns>
        /// <exception cref="ArgumentException">An argument is invalid.</exception>
        /// <exception cref="ConvoHopException">The request failed, or its outcome is uncertain.</exception>
        public async Task<Member> RemoveAsync(string principalId, string expectedRevision, string? requestId = null,
            CancellationToken cancellationToken = default)
        {
            var input = new RemoveMemberRequestInput(_conversationId, ServerChecks.Id(principalId, nameof(principalId)),
                ServerChecks.Counter(expectedRevision, nameof(expectedRevision)));
            RemoveMemberReply reply = await _client.ExecuteAsync(Operations.Communication.RemoveMember, input, requestId, cancellationToken)
                .ConfigureAwait(false);
            return Checked(reply.Result, principalId, reply.RequestId);
        }

        /// <summary>Lets a member read history from an earlier sequence (<c>historyManage</c>).</summary>
        /// <param name="principalId">The principal ID.</param>
        /// <param name="membershipEpoch">The membership epoch you observed.</param>
        /// <param name="expectedRevision">The membership revision you observed.</param>
        /// <param name="fromSequence">The first sequence the member may read.</param>
        /// <param name="requestId">The request ID; pass the original ID to resume after an uncertain outcome.</param>
        /// <param name="cancellationToken">Stops waiting. A cancelled mutation has an unknown outcome.</param>
        /// <returns>The membership with its new visibility.</returns>
        /// <exception cref="ArgumentException">An argument is invalid.</exception>
        /// <exception cref="ConvoHopException">The request failed, or its outcome is uncertain.</exception>
        public async Task<Member> GrantHistoryAsync(string principalId, string membershipEpoch, string expectedRevision,
            string fromSequence, string? requestId = null, CancellationToken cancellationToken = default)
        {
            var input = new HistoryGrantRequestInput(_conversationId, ServerChecks.Id(principalId, nameof(principalId)),
                ServerChecks.Counter(membershipEpoch, nameof(membershipEpoch)), ServerChecks.Counter(expectedRevision, nameof(expectedRevision)),
                ServerChecks.Counter(fromSequence, nameof(fromSequence)));
            HistoryGrantReply reply = await _client.ExecuteAsync(Operations.Communication.HistoryGrant, input, requestId, cancellationToken)
                .ConfigureAwait(false);
            return Checked(reply.Result, principalId, reply.RequestId);
        }

        /// <summary>
        /// Allows or denies a member starting broadcasts (<c>membershipManage</c>). Denying cuts off the member's live
        /// broadcast; the payload carries that media cutoff.
        /// </summary>
        /// <param name="principalId">The principal ID.</param>
        /// <param name="allowed">Whether the member may start broadcasts.</param>
        /// <param name="expectedMembershipRevision">The membership revision you observed.</param>
        /// <param name="requestId">The request ID; pass the original ID to resume after an uncertain outcome.</param>
        /// <param name="cancellationToken">Stops waiting. A cancelled mutation has an unknown outcome.</param>
        /// <returns>The commit receipt with the membership and any media cutoff.</returns>
        /// <exception cref="ArgumentException">An argument is invalid.</exception>
        /// <exception cref="ConvoHopException">The request failed, or its outcome is uncertain.</exception>
        public async Task<SetBroadcastPermissionPayload> SetBroadcastPermissionAsync(string principalId, bool allowed,
            string expectedMembershipRevision, string? requestId = null, CancellationToken cancellationToken = default)
        {
            var input = new SetBroadcastPermissionInput(_conversationId, ServerChecks.Id(principalId, nameof(principalId)), allowed,
                ServerChecks.Counter(expectedMembershipRevision, nameof(expectedMembershipRevision)));
            SetBroadcastPermissionPayload payload = await _client.ExecuteAsync(Operations.Communication.SetBroadcastPermission, input,
                requestId, cancellationToken).ConfigureAwait(false);
            Checked(payload.Result?.Member, principalId, payload.RequestId);
            return payload;
        }

        /// <summary>Reads a member's mute, acting as that member (<c>membershipManage</c>; audited).</summary>
        /// <param name="principalId">The member's principal ID.</param>
        /// <param name="cancellationToken">Stops waiting for the read.</param>
        /// <returns>The mute.</returns>
        /// <exception cref="ArgumentException">The ID is not a canonical UUID.</exception>
        /// <exception cref="ConvoHopException">The read failed or its response was malformed.</exception>
        public async Task<ConversationMute> GetMuteAsync(string principalId, CancellationToken cancellationToken = default)
        {
            var input = new ConversationMuteInput(_conversationId) { ActAsPrincipalId = ServerChecks.Id(principalId, nameof(principalId)) };
            ConversationMuteReply reply = await _client.ExecuteAsync(Operations.Communication.ConversationMute, input, null,
                cancellationToken).ConfigureAwait(false);
            return CheckedMute(reply.Result, principalId, reply.RequestId);
        }

        /// <summary>
        /// Mutes or unmutes a member's message push notifications, acting as that member (<c>membershipManage</c>; audited).
        /// Calls still ring a muted member.
        /// </summary>
        /// <param name="principalId">The member's principal ID.</param>
        /// <param name="muted">Whether to mute.</param>
        /// <param name="until">An RFC 3339 time in the future when the mute ends; applies only to a mute. Null mutes until unmuted.</param>
        /// <param name="requestId">The request ID; pass the original ID to resume after an uncertain outcome.</param>
        /// <param name="cancellationToken">Stops waiting. A cancelled mutation has an unknown outcome.</param>
        /// <returns>The mute.</returns>
        /// <exception cref="ArgumentException">An argument is invalid.</exception>
        /// <exception cref="ConvoHopException">The request failed, or its outcome is uncertain.</exception>
        public async Task<ConversationMute> SetMuteAsync(string principalId, bool muted, string? until = null, string? requestId = null,
            CancellationToken cancellationToken = default)
        {
            var input = new SetConversationMuteInput(_conversationId, muted)
            {
                Until = until,
                ActAsPrincipalId = ServerChecks.Id(principalId, nameof(principalId)),
            };
            SetConversationMutePayload payload = await _client.ExecuteAsync(Operations.Communication.SetConversationMute, input, requestId,
                cancellationToken).ConfigureAwait(false);
            return CheckedMute(payload.Result, principalId, payload.RequestId);
        }

        private Member Checked(Member? value, string principalId, string requestId)
        {
            Member member = ServerChecks.Required(value, requestId);
            if (member.PrincipalId != principalId || member.ConversationId != _conversationId) throw ServerChecks.Mismatch("Member", requestId);
            return member;
        }

        private ConversationMute CheckedMute(ConversationMute? value, string principalId, string requestId)
        {
            ConversationMute mute = ServerChecks.Required(value, requestId);
            if (mute.PrincipalId != principalId || mute.ConversationId != _conversationId) throw ServerChecks.Mismatch("Mute", requestId);
            return mute;
        }
    }

    /// <summary>Live sessions of one conversation (<c>callRead</c> or <c>callManage</c>).</summary>
    public sealed class ServerConversationLive
    {
        private readonly ProjectServerClient _client;
        private readonly string _conversationId;

        internal ServerConversationLive(ProjectServerClient client, string conversationId)
        {
            _client = client;
            _conversationId = conversationId;
        }

        /// <summary>Reads the conversation's current live session.</summary>
        /// <param name="cancellationToken">Stops waiting for the read.</param>
        /// <returns>The live session, or null when none is live.</returns>
        /// <exception cref="ConvoHopException">The read failed or its response was malformed.</exception>
        public async Task<LiveSession?> GetCurrentAsync(CancellationToken cancellationToken = default)
        {
            CurrentLiveSessionReply reply = await _client.ExecuteAsync(Operations.Communication.CurrentLiveSession,
                new ConversationLiveInput(_conversationId), null, cancellationToken).ConfigureAwait(false);
            LiveSession? session = reply.Result;
            if (session != null && session.ConversationId != _conversationId) throw ServerChecks.Mismatch("Live session", reply.RequestId);
            return session;
        }

        /// <summary>Lists the conversation's live sessions, newest first.</summary>
        /// <param name="limit">The page size, 1 to 100, or null for the authority's default.</param>
        /// <param name="cursor">The <see cref="LiveSessionPage.NextCursor"/> of the previous page.</param>
        /// <param name="cancellationToken">Stops waiting for the read.</param>
        /// <returns>The live session page.</returns>
        /// <exception cref="ArgumentException">An argument is invalid.</exception>
        /// <exception cref="ConvoHopException">The read failed or its response was malformed.</exception>
        public async Task<LiveSessionPage> ListHistoryAsync(int? limit = null, string? cursor = null,
            CancellationToken cancellationToken = default)
        {
            var input = new LiveSessionsInput(_conversationId) { Limit = ServerChecks.OptionalPageLimit(limit, nameof(limit)), Cursor = cursor };
            LiveSessionPageReply reply = await _client.ExecuteAsync(Operations.Communication.LiveSessions, input, null, cancellationToken)
                .ConfigureAwait(false);
            LiveSessionPage page = ServerChecks.Required(reply.Result, reply.RequestId);
            foreach (LiveSession item in page.Items)
            {
                if (item.ConversationId != _conversationId) throw ServerChecks.Mismatch("Live session page", reply.RequestId);
            }

            return page;
        }
    }
}
