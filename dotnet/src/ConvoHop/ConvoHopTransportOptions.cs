using System;
using System.Net.Http;

namespace ConvoHop
{
    /// <summary>Options for <see cref="ConvoHopTransport"/>.</summary>
    public sealed class ConvoHopTransportOptions
    {
        /// <summary>
        /// The authority origin: HTTPS, or explicit loopback HTTP for local development. It must not have a path, query,
        /// fragment or user information.
        /// </summary>
        public string BaseUrl { get; set; } = string.Empty;

        /// <summary>
        /// The bearer credential, for example a backend key. Keep it on trusted servers; never send it to browsers or put it in
        /// URLs, logs or recovery storage.
        /// </summary>
        public string? Credential { get; set; }

        /// <summary>
        /// The recovery namespace. Records are stored under <c>convohop.requests:</c> followed by this value, so each credential
        /// scope needs its own namespace.
        /// </summary>
        public string Namespace { get; set; } = string.Empty;

        /// <summary>The project incarnation requests belong to. Null means <c>management</c>, which sends no incarnation.</summary>
        public string? Incarnation { get; set; }

        /// <summary>
        /// Durable storage for mutation recovery records. Null keeps them only in this transport instance, so an uncertain
        /// mutation cannot be recovered after the process restarts.
        /// </summary>
        public IRecoveryStorage? RecoveryStorage { get; set; }

        /// <summary>
        /// The HTTP client to send requests with. It must not follow redirects or add credentials of its own. Null uses a shared
        /// client that never follows redirects or stores cookies.
        /// </summary>
        public HttpClient? HttpClient { get; set; }

        /// <summary>The clock for retry budgets and request timeouts. Null uses <see cref="TimeProvider.System"/>.</summary>
        public TimeProvider? TimeProvider { get; set; }
    }
}
