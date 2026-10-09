using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace ConvoHop.Internal
{
    // Sends generated operations. The generated plane APIs delegate every call to one executor, which a client binds to
    // its transport and project.
    internal interface IOperationExecutor
    {
        // Sends one operation. A null input is allowed only when the input is optional; a null request ID creates one. The
        // credential is the value of the operation's context credential field, or null when it has none.
        Task<TResult> ExecuteAsync<TInput, TResult>(OperationDescriptor<TInput, TResult> operation, TInput input, string? requestId,
            object? credential, CancellationToken cancellationToken);

        // Sends one operation whose input Serialize produced, under the given request ID.
        Task<TResult> ExecuteJsonAsync<TInput, TResult>(OperationDescriptor<TInput, TResult> operation, JsonElement input,
            string requestId, CancellationToken cancellationToken);

        // The JSON object an operation input sends: an empty object for no input.
        JsonElement Serialize(object? input);

        // The failure for a reply that decoded but breaks the operation's contract, such as a page that does not advance.
        Exception InvalidResponse(string requestId, string message);
    }
}
