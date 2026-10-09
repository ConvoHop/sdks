using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace ConvoHop.Internal
{
    // Sends generated operations through a client's transport, for one project or for the management plane.
    internal sealed class TransportExecutor : IOperationExecutor
    {
        private readonly ConvoHopTransport _transport;
        private readonly string? _projectId;

        internal TransportExecutor(ConvoHopTransport transport, string? projectId)
        {
            _transport = transport ?? throw new ArgumentNullException(nameof(transport));
            _projectId = projectId;
        }

        // The only context credential, the credential delivery permit, is a JSON object.
        public Task<TResult> ExecuteAsync<TInput, TResult>(OperationDescriptor<TInput, TResult> operation, TInput input,
            string? requestId, object? credential, CancellationToken cancellationToken) =>
            _transport.ExecuteAsync(operation, _projectId, input, requestId, credential switch
            {
                null => (JsonElement?)null,
                JsonElement permit => permit,
                _ => throw new ArgumentException("Expected a JSON credential delivery permit", nameof(credential)),
            }, cancellationToken);

        public async Task<TResult> ExecuteJsonAsync<TInput, TResult>(OperationDescriptor<TInput, TResult> operation, JsonElement input,
            string requestId, CancellationToken cancellationToken)
        {
            Payload payload = await _transport.ExecuteCoreAsync(operation, _projectId, input, requestId, null, cancellationToken)
                .ConfigureAwait(false);
            return (TResult)payload.Typed;
        }

        public JsonElement Serialize(object? input) =>
            input is null || input is NoInput ? ConvoHopTransport.EmptyObject : ConvoHopTransport.SerializeInput(input);

        public Exception InvalidResponse(string requestId, string message) =>
            new ConvoHopException(ErrorCodes.InvalidResponse, requestId, "unknown", 503, message);
    }
}
