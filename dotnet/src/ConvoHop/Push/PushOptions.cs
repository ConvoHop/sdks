using System;

namespace ConvoHop
{
    /// <summary>Options for <see cref="PushPayloads"/>.</summary>
    public class PushOptions
    {
        /// <summary>The visible title, such as the sender's or conversation's name. Omitted when null or empty.</summary>
        public string? Title { get; set; }

        /// <summary>The visible body. Replaces the message preview. Omitted when null or empty.</summary>
        public string? Body { get; set; }

        /// <summary>
        /// Whether a message event's preview becomes the body when <see cref="Body"/> is empty. Defaults to <c>true</c>.
        /// </summary>
        public bool Preview { get; set; } = true;

        /// <summary>The clock for the TTL and expiration. Defaults to the current time.</summary>
        public DateTimeOffset? Now { get; set; }
    }

    /// <summary>Options for the APNs builders, which need the app's bundle ID.</summary>
    public sealed class ApnsPushOptions : PushOptions
    {
        /// <summary>Creates APNs options.</summary>
        /// <param name="bundleId">The app's bundle ID.</param>
        public ApnsPushOptions(string bundleId)
        {
            BundleId = bundleId;
        }

        /// <summary>
        /// The app's bundle ID: the <c>apns-topic</c> of alerts. VoIP pushes use <c>&lt;bundleId&gt;.voip</c>. At most 155
        /// characters of ASCII letters, digits and <c>-</c>, in dot-separated segments.
        /// </summary>
        public string BundleId { get; set; }
    }
}
