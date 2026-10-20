/**
 * Verification of Relay webhook deliveries (Standard Webhooks symmetric {@code v1}) and their metadata-only
 * events.
 *
 * <p>Build one {@link dev.instantrelay.server.webhooks.WebhookVerifier} per endpoint with its {@code whsec_} secrets,
 * then pass it each request's headers and exact body bytes. Respond {@code 2xx} within 5 seconds and process
 * afterwards; de-duplicate on {@code webhook-id}. The per-recipient {@code notification.*} events are the input of
 * the push payload builders in {@link dev.instantrelay.server.push}.
 */
@NullMarked
package dev.instantrelay.server.webhooks;

import org.jspecify.annotations.NullMarked;
