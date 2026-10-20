/**
 * Push payload builders for per-recipient notification events, following the contract in {@code spec/push-payload/}.
 *
 * <p>{@link dev.instantrelay.server.push.PushPayloads} turns a {@link dev.instantrelay.server.webhooks.WebhookNotificationEvent}
 * into an APNs, FCM or Web Push request. The builders are pure functions: they send nothing and hold no credentials.
 * Your push library sends the requests and owns APNs and FCM authentication and Web Push encryption.
 */
@NullMarked
package dev.instantrelay.server.push;

import org.jspecify.annotations.NullMarked;
