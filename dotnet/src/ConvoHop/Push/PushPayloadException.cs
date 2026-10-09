using System;

namespace ConvoHop
{
    /// <summary>Why <see cref="PushPayloads"/> couldn't build a push payload. Options are checked before the event.</summary>
    public enum PushPayloadCode
    {
        /// <summary>The event doesn't match the push payload contract (<c>spec/push-payload/</c>).</summary>
        InvalidEvent,

        /// <summary>
        /// <see cref="PushOptions.Title"/> or <see cref="PushOptions.Body"/> has a lone surrogate, or
        /// <see cref="ApnsPushOptions.BundleId"/> isn't an app bundle ID.
        /// </summary>
        InvalidOptions,
    }

    /// <summary>A push payload that couldn't be built. The message names the field but never contains its value.</summary>
    public sealed class PushPayloadException : Exception
    {
        /// <summary>Creates the exception.</summary>
        /// <param name="code">Why the payload couldn't be built.</param>
        /// <param name="message">The human-readable message.</param>
        public PushPayloadException(PushPayloadCode code, string message)
            : base(message)
        {
            Code = code;
        }

        /// <summary>Why the payload couldn't be built.</summary>
        public PushPayloadCode Code { get; }
    }
}
