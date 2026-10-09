using System.Threading;
using System.Threading.Tasks;

namespace ConvoHop.Internal
{
    internal static class TaskWaiting
    {
        internal static Task DelayAsync(System.TimeProvider time, System.TimeSpan delay, CancellationToken cancellationToken) =>
#if NET
            Task.Delay(delay, time, cancellationToken);
#else
            time.Delay(delay, cancellationToken);
#endif

        // Stops waiting when the token is cancelled; the awaited work itself keeps running.
        internal static async Task<T> WaitAsync<T>(Task<T> task, CancellationToken cancellationToken)
        {
            if (!cancellationToken.CanBeCanceled || task.IsCompleted) return await task.ConfigureAwait(false);
#if NET
            return await task.WaitAsync(cancellationToken).ConfigureAwait(false);
#else
            await WhenCompletedOrCancelledAsync(task, cancellationToken).ConfigureAwait(false);
            return await task.ConfigureAwait(false);
#endif
        }

        internal static async Task WaitAsync(Task task, CancellationToken cancellationToken)
        {
            if (!cancellationToken.CanBeCanceled || task.IsCompleted)
            {
                await task.ConfigureAwait(false);
                return;
            }
#if NET
            await task.WaitAsync(cancellationToken).ConfigureAwait(false);
#else
            await WhenCompletedOrCancelledAsync(task, cancellationToken).ConfigureAwait(false);
            await task.ConfigureAwait(false);
#endif
        }

#if !NET
        private static async Task WhenCompletedOrCancelledAsync(Task task, CancellationToken cancellationToken)
        {
            var cancelled = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
            using (cancellationToken.Register(state => ((TaskCompletionSource<bool>)state!).TrySetResult(true), cancelled))
            {
                if (await Task.WhenAny(task, cancelled.Task).ConfigureAwait(false) != task)
                    throw new System.OperationCanceledException(cancellationToken);
            }
        }
#endif
    }
}
