using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using ConvoHop.Models;

namespace ConvoHop
{
    /// <summary>
    /// Backend view of one conversation. Creating the handle sends no request; each method needs the scope named in its
    /// documentation. Message reads and sends accept <c>actAs</c> to act as a member principal.
    /// </summary>
    public sealed class ServerConversation
    {
        internal ServerConversation(ProjectServerClient client, string conversationId)
        {
            Client = client;
            ConversationId = conversationId;
            Messages = new ServerMessages(client, conversationId);
            Members = new ServerMembers(client, conversationId);
            Live = new ServerConversationLive(client, conversationId);
        }

        /// <summary>The client this handle sends requests with.</summary>
        public ProjectServerClient Client { get; }

        /// <summary>The conversation ID.</summary>
        public string ConversationId { get; }

        /// <summary>Lists, reads, sends, edits and deletes messages.</summary>
        public ServerMessages Messages { get; }

        /// <summary>Lists and manages members, history grants, broadcast permissions and mutes.</summary>
        public ServerMembers Members { get; }

        /// <summary>Reads the conversation's live sessions.</summary>
        public ServerConversationLive Live { get; }

        /// <summary>Reads the conversation (<c>conversationManage</c>).</summary>
        /// <param name="cancellationToken">Stops waiting for the read.</param>
        /// <returns>The conversation.</returns>
        /// <exception cref="ConvoHopException">The read failed or its response was malformed.</exception>
        public async Task<Conversation> GetAsync(CancellationToken cancellationToken = default)
        {
            GetConversationReply reply = await Client.ExecuteAsync(Operations.Communication.GetConversation,
                new GetConversationRequestInput(ConversationId), null, cancellationToken).ConfigureAwait(false);
            Conversation conversation = ServerChecks.Required(reply.Result, reply.RequestId);
            if (conversation.ConversationId != ConversationId) throw ServerChecks.Mismatch("Conversation", reply.RequestId);
            return conversation;
        }

        /// <summary>Updates the title or properties (<c>conversationManage</c>).</summary>
        /// <param name="expectedRevision">The conversation revision you observed.</param>
        /// <param name="title">The new title, or null to keep it.</param>
        /// <param name="props">The new properties object, or null to keep them.</param>
        /// <param name="requestId">The request ID; pass the original ID to resume after an uncertain outcome.</param>
        /// <param name="cancellationToken">Stops waiting. A cancelled mutation has an unknown outcome.</param>
        /// <returns>The updated conversation.</returns>
        /// <exception cref="ArgumentException">An argument is invalid.</exception>
        /// <exception cref="ConvoHopException">The request failed, or its outcome is uncertain.</exception>
        public async Task<Conversation> UpdateAsync(string expectedRevision, string? title = null, JsonElement? props = null,
            string? requestId = null, CancellationToken cancellationToken = default)
        {
            var input = new UpdateConversationRequestInput(ConversationId, ServerChecks.Counter(expectedRevision, nameof(expectedRevision)))
            {
                Title = title,
                Props = props,
            };
            UpdateConversationReply reply = await Client.ExecuteAsync(Operations.Communication.UpdateConversation, input, requestId,
                cancellationToken).ConfigureAwait(false);
            Conversation conversation = ServerChecks.Required(reply.Result, reply.RequestId);
            if (conversation.ConversationId != ConversationId) throw ServerChecks.Mismatch("Conversation", reply.RequestId);
            return conversation;
        }
    }

    /// <summary>Messages of one conversation.</summary>
    public sealed class ServerMessages
    {
        private readonly ProjectServerClient _client;
        private readonly string _conversationId;

        internal ServerMessages(ProjectServerClient client, string conversationId)
        {
            _client = client;
            _conversationId = conversationId;
        }

        /// <summary>Lists messages, newest first (<c>messageRead</c>; audited when acting as a member).</summary>
        /// <param name="limit">The page size, 1 to 100. Defaults to 100.</param>
        /// <param name="beforeSequence">Lists messages before this sequence, for the next page.</param>
        /// <param name="actAs">The member principal to read as, limiting the page to that member's visibility.</param>
        /// <param name="cancellationToken">Stops waiting for the read.</param>
        /// <returns>The message page.</returns>
        /// <exception cref="ArgumentException">An argument is invalid.</exception>
        /// <exception cref="ConvoHopException">The read failed or its response was malformed.</exception>
        public async Task<MessagePage> ListAsync(int? limit = null, string? beforeSequence = null, string? actAs = null,
            CancellationToken cancellationToken = default)
        {
            var input = new MessagesRequestInput(_conversationId, ServerChecks.PageLimit(limit, nameof(limit)))
            {
                BeforeSequence = beforeSequence == null ? null : ServerChecks.Counter(beforeSequence, nameof(beforeSequence)),
                ActAsPrincipalId = ServerChecks.OptionalId(actAs, nameof(actAs)),
            };
            MessagesReply reply = await _client.ExecuteAsync(Operations.Communication.Messages, input, null, cancellationToken)
                .ConfigureAwait(false);
            MessagePage page = ServerChecks.Required(reply.Result, reply.RequestId);
            foreach (Message item in page.Items)
            {
                if (item.ConversationId != _conversationId) throw ServerChecks.Mismatch("Message page", reply.RequestId);
            }

            return page;
        }

        /// <summary>Reads one message (<c>messageRead</c>; audited when acting as a member).</summary>
        /// <param name="messageId">The message ID.</param>
        /// <param name="actAs">The member principal to read as.</param>
        /// <param name="cancellationToken">Stops waiting for the read.</param>
        /// <returns>The message.</returns>
        /// <exception cref="ArgumentException">An argument is invalid.</exception>
        /// <exception cref="ConvoHopException">The read failed or its response was malformed.</exception>
        public async Task<Message> GetAsync(string messageId, string? actAs = null, CancellationToken cancellationToken = default)
        {
            var input = new GetMessageRequestInput(_conversationId, ServerChecks.Id(messageId, nameof(messageId)))
            {
                ActAsPrincipalId = ServerChecks.OptionalId(actAs, nameof(actAs)),
            };
            GetMessageReply reply = await _client.ExecuteAsync(Operations.Communication.GetMessage, input, null, cancellationToken)
                .ConfigureAwait(false);
            return Checked(reply.Result, messageId, reply.RequestId);
        }

        /// <summary>Sends a message (<c>messageWrite</c>; authored by <paramref name="actAs"/> when set, audited).</summary>
        /// <param name="text">The message text.</param>
        /// <param name="props">The properties object, or null for none.</param>
        /// <param name="actAs">The member principal to send as.</param>
        /// <param name="requestId">The request ID; pass the original ID to resume after an uncertain outcome.</param>
        /// <param name="cancellationToken">Stops waiting. A cancelled mutation has an unknown outcome.</param>
        /// <returns>The send receipt. <see cref="MessageAck.Cursor"/> is never null.</returns>
        /// <exception cref="ArgumentException">An argument is invalid.</exception>
        /// <exception cref="ConvoHopException">The request failed, or its outcome is uncertain.</exception>
        public async Task<MessageAck> SendAsync(string text, JsonElement? props = null, string? actAs = null, string? requestId = null,
            CancellationToken cancellationToken = default)
        {
            var input = new SendMessageRequestInput(_conversationId, ServerChecks.Text(text, nameof(text)), props ?? ServerChecks.EmptyObject)
            {
                ActAsPrincipalId = ServerChecks.OptionalId(actAs, nameof(actAs)),
            };
            SendMessageReply reply = await _client.ExecuteAsync(Operations.Communication.SendMessage, input, requestId, cancellationToken)
                .ConfigureAwait(false);
            MessageAck receipt = ServerChecks.Required(reply.Result, reply.RequestId);
            Cursor? cursor = receipt.Cursor;
            if (receipt.Status != "sent" || receipt.ConversationId != _conversationId || cursor == null ||
                cursor.ConversationId != _conversationId || cursor.Sequence != receipt.Sequence ||
                cursor.Incarnation != _client.Transport.Incarnation)
            {
                throw ServerChecks.Invalid("Invalid send receipt scope", reply.RequestId);
            }

            return receipt;
        }

        /// <summary>Edits a message's text or properties (<c>moderation</c>).</summary>
        /// <param name="messageId">The message ID.</param>
        /// <param name="expectedRevision">The message revision you observed.</param>
        /// <param name="text">The new text, or null to keep it.</param>
        /// <param name="props">The new properties object, or null to keep them.</param>
        /// <param name="requestId">The request ID; pass the original ID to resume after an uncertain outcome.</param>
        /// <param name="cancellationToken">Stops waiting. A cancelled mutation has an unknown outcome.</param>
        /// <returns>The edited message.</returns>
        /// <exception cref="ArgumentException">An argument is invalid.</exception>
        /// <exception cref="ConvoHopException">The request failed, or its outcome is uncertain.</exception>
        public async Task<Message> EditAsync(string messageId, string expectedRevision, string? text = null, JsonElement? props = null,
            string? requestId = null, CancellationToken cancellationToken = default)
        {
            var input = new EditMessageRequestInput(_conversationId, ServerChecks.Id(messageId, nameof(messageId)),
                ServerChecks.Counter(expectedRevision, nameof(expectedRevision)))
            {
                Text = text,
                Props = props,
            };
            EditMessageReply reply = await _client.ExecuteAsync(Operations.Communication.EditMessage, input, requestId, cancellationToken)
                .ConfigureAwait(false);
            return Checked(reply.Result, messageId, reply.RequestId);
        }

        /// <summary>Deletes a message, leaving a tombstone (<c>moderation</c>).</summary>
        /// <param name="messageId">The message ID.</param>
        /// <param name="expectedRevision">The message revision you observed.</param>
        /// <param name="requestId">The request ID; pass the original ID to resume after an uncertain outcome.</param>
        /// <param name="cancellationToken">Stops waiting. A cancelled mutation has an unknown outcome.</param>
        /// <returns>The deleted message.</returns>
        /// <exception cref="ArgumentException">An argument is invalid.</exception>
        /// <exception cref="ConvoHopException">The request failed, or its outcome is uncertain.</exception>
        public async Task<Message> DeleteAsync(string messageId, string expectedRevision, string? requestId = null,
            CancellationToken cancellationToken = default)
        {
            var input = new DeleteMessageRequestInput(_conversationId, ServerChecks.Id(messageId, nameof(messageId)),
                ServerChecks.Counter(expectedRevision, nameof(expectedRevision)));
            DeleteMessageReply reply = await _client.ExecuteAsync(Operations.Communication.DeleteMessage, input, requestId,
                cancellationToken).ConfigureAwait(false);
            return Checked(reply.Result, messageId, reply.RequestId);
        }

        private Message Checked(Message? value, string messageId, string requestId)
        {
            Message message = ServerChecks.Required(value, requestId);
            if (message.MessageId != messageId || message.ConversationId != _conversationId) throw ServerChecks.Mismatch("Message", requestId);
            return message;
        }
    }
}
