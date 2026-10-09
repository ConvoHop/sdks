using System;
using System.Text.RegularExpressions;

namespace ConvoHop
{
    /// <summary>
    /// A classified failure from the authority or the SDK. Classify it by <see cref="Code"/> (see <see cref="ErrorCodes"/>),
    /// never by message text.
    /// </summary>
    /// <remarks>
    /// <see cref="Outcome"/> says what is known about the request: <c>rejected</c> means it did not take effect,
    /// <c>committed</c> or <c>accepted</c> mean it did, and <c>unknown</c> means resolve the original request ID before
    /// sending anything new. Messages never contain credentials.
    /// </remarks>
    public class ConvoHopException : Exception
    {
        /// <summary>Creates an exception.</summary>
        /// <param name="code">The stable error code.</param>
        /// <param name="requestId">The request ID the failure belongs to.</param>
        /// <param name="outcome">What is known about the request outcome.</param>
        /// <param name="status">The HTTP-style status, or 0 when no authority response was observed.</param>
        /// <param name="message">The human-readable message.</param>
        /// <param name="retryAfter">How long to wait before resending, when the authority sent a delay.</param>
        /// <param name="innerException">The underlying failure, if any.</param>
        /// <exception cref="ArgumentOutOfRangeException"><paramref name="retryAfter"/> is negative.</exception>
        public ConvoHopException(string code, string requestId, string outcome, int status, string message,
            TimeSpan? retryAfter = null, Exception? innerException = null)
            : base(message, innerException)
        {
            Code = code ?? throw new ArgumentNullException(nameof(code));
            RequestId = requestId ?? throw new ArgumentNullException(nameof(requestId));
            Outcome = outcome ?? throw new ArgumentNullException(nameof(outcome));
            Status = status;
            if (retryAfter < TimeSpan.Zero) throw new ArgumentOutOfRangeException(nameof(retryAfter), "Expected a non-negative delay");
            RetryAfter = retryAfter;
        }

        /// <summary>The stable machine-readable error code.</summary>
        public string Code { get; }

        /// <summary>The request ID the failure belongs to.</summary>
        public string RequestId { get; }

        /// <summary>What is known about the outcome: <c>rejected</c>, <c>unknown</c>, <c>committed</c> or <c>accepted</c>.</summary>
        public string Outcome { get; }

        /// <summary>The HTTP-style status, or 0 when no authority response was observed.</summary>
        public int Status { get; }

        /// <summary>
        /// How long to wait before resending the same request, when the authority sent a delay (for example with
        /// <c>RATE_LIMITED</c>). Read in whole seconds from the error's <c>extensions.retryAfter</c>, else from an HTTP
        /// <c>Retry-After</c> delay in seconds. A delay longer than <see cref="TimeSpan.MaxValue"/> is reported as
        /// <see cref="TimeSpan.MaxValue"/>. The SDK never waits or resends on its own because of it.
        /// </summary>
        public TimeSpan? RetryAfter { get; }

        internal static ConvoHopException FromAuthority(string code, string requestId, string outcome, int status, string message,
            TimeSpan? retryAfter) =>
            code == ErrorCodes.ScopeRequired
                ? new ScopeRequiredException(requestId, outcome, status, message, retryAfter)
                : new ConvoHopException(code, requestId, outcome, status, message, retryAfter);
    }

    /// <summary>
    /// <c>SCOPE_REQUIRED</c>: the backend key lacks a scope the operation requires (403, rejected, not retryable).
    /// Classify it by <see cref="ConvoHopException.Code"/>; <see cref="Scope"/> is a diagnostic detail.
    /// </summary>
    public sealed class ScopeRequiredException : ConvoHopException
    {
        private static readonly Regex ScopePattern =
            new Regex("^The backend key requires the current ([a-z][A-Za-z0-9]{0,63}) scope$", RegexOptions.CultureInvariant);

        /// <summary>Creates the exception.</summary>
        /// <param name="requestId">The request ID the failure belongs to.</param>
        /// <param name="outcome">What is known about the request outcome.</param>
        /// <param name="status">The HTTP-style status.</param>
        /// <param name="message">The authority message.</param>
        /// <param name="retryAfter">How long to wait before resending, if sent.</param>
        /// <exception cref="ArgumentOutOfRangeException"><paramref name="retryAfter"/> is negative.</exception>
        public ScopeRequiredException(string requestId, string outcome, int status, string message, TimeSpan? retryAfter = null)
            : base(ErrorCodes.ScopeRequired, requestId, outcome, status, message, retryAfter)
        {
            Match match = ScopePattern.Match(message ?? string.Empty);
            Scope = match.Success && match.Length == message!.Length ? match.Groups[1].Value : null;
        }

        /// <summary>
        /// The missing scope, or null when the message does not use the documented wording. A missing read scope is
        /// reported as the read scope even where its manage scope would also satisfy the operation.
        /// </summary>
        public string? Scope { get; }
    }
}
