/**
 * The Relay server SDK for trusted JVM backends.
 *
 * <p>{@link dev.instantrelay.server.ProjectServerClient} calls a project with a backend key, and {@link
 * dev.instantrelay.server.ManagementClient} calls the management plane with an operator access token. Both keep
 * credentials out of errors and diagnostics. Never use them, or their credentials, in browser or mobile code.
 *
 * <p>Calls block the calling thread. The {@code relay-server-kotlin} module adds suspending wrappers.
 */
@NullMarked
package dev.instantrelay.server;

import org.jspecify.annotations.NullMarked;
