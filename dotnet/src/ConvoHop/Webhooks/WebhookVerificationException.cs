using System;

namespace ConvoHop
{
    /// <summary>
    /// Why a webhook delivery failed verification. <see cref="Webhooks"/> runs the checks in this order and stops at the
    /// first failure.
    /// </summary>
    public enum WebhookVerificationCode
    {
        /// <summary>
        /// No secret is given, or one is not <c>whsec_</c> followed by padded standard Base64 of 24 to 64 bytes. This is
        /// your configuration, not the sender.
        /// </summary>
        InvalidSecret,

        /// <summary><c>webhook-id</c>, <c>webhook-timestamp</c> or <c>webhook-signature</c> is absent or empty.</summary>
        MissingHeader,

        /// <summary>One of those headers is repeated.</summary>
        InvalidHeader,

        /// <summary><c>webhook-timestamp</c> is not 1 to 15 ASCII digits (integer Unix seconds).</summary>
        InvalidTimestamp,

        /// <summary>The timestamp is more than the tolerance before now.</summary>
        TimestampExpired,

        /// <summary>The timestamp is more than the tolerance after now.</summary>
        TimestampFuture,

        /// <summary>The body exceeds 4096 bytes.</summary>
        BodyTooLarge,

        /// <summary><c>webhook-signature</c> has more than 8 entries.</summary>
        TooManySignatures,

        /// <summary>No <c>v1</c> entry matches any secret.</summary>
        NoMatchingSignature,

        /// <summary><c>Webhooks.Verify</c> only: the signed body is not a UTF-8 JSON event envelope.</summary>
        InvalidBody,
    }

    /// <summary>A delivery that failed verification. The message never contains secrets, signatures or the body.</summary>
    public sealed class WebhookVerificationException : Exception
    {
        /// <summary>Creates the exception.</summary>
        /// <param name="code">Why verification failed.</param>
        /// <param name="message">The human-readable message.</param>
        public WebhookVerificationException(WebhookVerificationCode code, string message)
            : base(message)
        {
            Code = code;
        }

        /// <summary>Why verification failed.</summary>
        public WebhookVerificationCode Code { get; }
    }
}
