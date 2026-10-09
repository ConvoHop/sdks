using System;
using System.Net.Http;

namespace ConvoHop
{
    /// <summary>Options for <see cref="ProjectServerClient"/>.</summary>
    public sealed class ProjectServerClientOptions
    {
        /// <summary>
        /// The authority origin: HTTPS, or explicit loopback HTTP for local development. Requests go to
        /// <c>{BaseUrl}/graphql</c>.
        /// </summary>
        public string BaseUrl { get; set; } = string.Empty;

        /// <summary>The project ID, a canonical UUID.</summary>
        public string ProjectId { get; set; } = string.Empty;

        /// <summary>
        /// The secret backend key. Keep it in trusted server configuration; never send it to a browser or a mobile app,
        /// and never log it.
        /// </summary>
        public string BackendKey { get; set; } = string.Empty;

        /// <summary>The project incarnation the client is bound to, a canonical UUID.</summary>
        public string Incarnation { get; set; } = string.Empty;

        /// <summary>
        /// Durable storage for mutation recovery records, so an uncertain mutation can be resolved after a restart. The
        /// records never contain the backend key.
        /// </summary>
        public IRecoveryStorage? RecoveryStorage { get; set; }

        /// <summary>
        /// The HTTP client to send requests with, for example one from <c>IHttpClientFactory</c>. It must not follow
        /// redirects or add credentials of its own. Null uses a shared client that never follows redirects or stores cookies.
        /// </summary>
        public HttpClient? HttpClient { get; set; }

        /// <summary>The clock for timeouts, retry budgets and polling. Defaults to <see cref="System.TimeProvider.System"/>.</summary>
        public TimeProvider? TimeProvider { get; set; }
    }
}
