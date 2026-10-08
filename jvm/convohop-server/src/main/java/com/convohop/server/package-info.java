/**
 * The ConvoHop server SDK for trusted JVM backends.
 *
 * <p>{@link com.convohop.server.ProjectServerClient} calls a project with a backend key, and {@link
 * com.convohop.server.ManagementClient} calls the management plane with an operator access token. Both keep
 * credentials out of errors and diagnostics. Never use them, or their credentials, in browser or mobile code.
 *
 * <p>Calls block the calling thread. The {@code convohop-server-kotlin} module adds suspending wrappers.
 */
@NullMarked
package com.convohop.server;

import org.jspecify.annotations.NullMarked;
