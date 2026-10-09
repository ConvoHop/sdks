using System;
using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Tasks;

namespace ConvoHop
{
    /// <summary>
    /// Durable key-value storage for mutation recovery records. The SDK stores one JSON snapshot per client namespace and
    /// never stores credentials in it.
    /// </summary>
    /// <remarks>
    /// <see cref="SetItemAsync"/> must complete only after the value is durable: the SDK sends a mutation only after the
    /// snapshot that records it was confirmed. The SDK passes <see cref="CancellationToken.None"/> to writes so a caller
    /// cancellation never abandons a snapshot halfway.
    /// </remarks>
    public interface IRecoveryStorage
    {
        /// <summary>Reads the stored value, or null when there is none.</summary>
        /// <param name="key">The storage key.</param>
        /// <param name="cancellationToken">Cancels the read.</param>
        /// <returns>The stored value, or null.</returns>
        Task<string?> GetItemAsync(string key, CancellationToken cancellationToken);

        /// <summary>Durably replaces the stored value.</summary>
        /// <param name="key">The storage key.</param>
        /// <param name="value">The value to store.</param>
        /// <param name="cancellationToken">Cancels the write.</param>
        /// <returns>A task that completes when the value is durable.</returns>
        Task SetItemAsync(string key, string value, CancellationToken cancellationToken);
    }

    /// <summary>
    /// Process-local <see cref="IRecoveryStorage"/>. It survives client re-creation within one process but not a restart, so
    /// it is for tests and short-lived tools; use durable storage in production.
    /// </summary>
    public sealed class InMemoryRecoveryStorage : IRecoveryStorage
    {
        private readonly ConcurrentDictionary<string, string> _items = new ConcurrentDictionary<string, string>(StringComparer.Ordinal);

        /// <inheritdoc />
        public Task<string?> GetItemAsync(string key, CancellationToken cancellationToken)
        {
            if (key == null) throw new ArgumentNullException(nameof(key));
            cancellationToken.ThrowIfCancellationRequested();
            return Task.FromResult(_items.TryGetValue(key, out string? value) ? value : null);
        }

        /// <inheritdoc />
        public Task SetItemAsync(string key, string value, CancellationToken cancellationToken)
        {
            if (key == null) throw new ArgumentNullException(nameof(key));
            if (value == null) throw new ArgumentNullException(nameof(value));
            cancellationToken.ThrowIfCancellationRequested();
            _items[key] = value;
            return Task.CompletedTask;
        }
    }
}
