package com.convohop.server;

import com.convohop.server.api.ManagementApi;
import com.convohop.server.internal.Wire;
import com.convohop.server.model.IssueBackendKeyReply;
import com.convohop.server.model.IssueBackendKeyRequestInput;
import java.net.http.HttpClient;
import java.util.List;
import java.util.function.LongSupplier;
import org.jspecify.annotations.Nullable;

/**
 * Operator client for organizations, deployments, projects and backend keys. Its access token is an operator
 * credential: use it only in trusted tooling, never in application servers that serve users, browsers or apps.
 *
 * <p>Clients are safe for concurrent use, and calls block the calling thread.
 */
public final class ManagementClient {
  private final Transport transport;
  private final ManagementApi management;
  private final Requests requests;

  private ManagementClient(Builder builder) {
    String actorId = Checks.id(Wire.present(builder.actorId, "actorId"), "actorId");
    this.transport = new Transport(
        Wire.present(builder.baseUrl, "baseUrl"),
        Wire.present(builder.accessToken, "accessToken"),
        null,
        Transport.MANAGEMENT,
        "management:" + actorId,
        builder.recoveryStorage,
        builder.httpClient,
        builder.clock);
    this.management = new ManagementApi(this.transport);
    this.requests = new Requests(this.transport, "management");
  }

  /**
   * Starts a client.
   *
   * @return a builder
   */
  public static Builder builder() {
    return new Builder();
  }

  /**
   * Every management query and mutation in the schema, with the generated inputs and replies.
   *
   * @return the management API over this client's transport
   */
  public ManagementApi management() {
    return this.management;
  }

  /**
   * Request resolution and retry.
   *
   * @return the request helpers
   */
  public Requests requests() {
    return this.requests;
  }

  /**
   * Snapshots of the mutation recovery records this client holds, oldest first.
   *
   * @return an unmodifiable list
   */
  public List<RecoveryState> getRecoveryStates() {
    return this.transport.recoveryStates();
  }

  /**
   * Requests a backend key for a project. The authority accepts the request as an operation and hands the key over
   * once, through credential delivery, never as an ordinary result.
   *
   * @param projectId the project ID
   * @param name a name for the key
   * @param scopes the scopes the key grants
   * @param expiresAt when the key expires, as an RFC 3339 timestamp
   * @return the reply
   * @throws ConvoHopProblem if the authority rejects the request
   */
  public IssueBackendKeyReply issueBackendKey(String projectId, String name, List<String> scopes, String expiresAt) {
    return issueBackendKey(projectId, name, scopes, expiresAt, null);
  }

  /**
   * Requests a backend key for a project. The authority accepts the request as an operation and hands the key over
   * once, through credential delivery, never as an ordinary result.
   *
   * @param projectId the project ID
   * @param name a name for the key
   * @param scopes the scopes the key grants
   * @param expiresAt when the key expires, as an RFC 3339 timestamp
   * @param requestId the request ID to send, or {@code null} for a new one
   * @return the reply
   * @throws ConvoHopProblem if the authority rejects the request
   */
  public IssueBackendKeyReply issueBackendKey(
      String projectId, String name, List<String> scopes, String expiresAt, @Nullable String requestId) {
    return this.management.issueBackendKey(
        IssueBackendKeyRequestInput.builder()
            .projectId(Checks.id(projectId, "projectId"))
            .name(Wire.nonNull(name, "name"))
            .scopes(Wire.nonNull(scopes, "scopes"))
            .expiresAt(Wire.nonNull(expiresAt, "expiresAt"))
            .build(),
        requestId);
  }

  /** Builds a {@link ManagementClient}. */
  public static final class Builder {
    private @Nullable String baseUrl;
    private @Nullable String accessToken;
    private @Nullable String actorId;
    private @Nullable RecoveryStorage recoveryStorage;
    private @Nullable HttpClient httpClient;
    private LongSupplier clock = System::currentTimeMillis;

    private Builder() {}

    /**
     * Sets the authority origin: HTTPS, or HTTP on a loopback host for local development. Required.
     *
     * @param baseUrl the origin, such as {@code https://api.example.com}
     * @return this builder
     */
    public Builder baseUrl(String baseUrl) {
      this.baseUrl = Wire.nonNull(baseUrl, "baseUrl");
      return this;
    }

    /**
     * Sets the operator access token. Required. Load it from a secret store; never embed it in code.
     *
     * @param accessToken the access token
     * @return this builder
     */
    public Builder accessToken(String accessToken) {
      this.accessToken = Wire.nonNull(accessToken, "accessToken");
      return this;
    }

    /**
     * Sets the operator the token belongs to, which scopes the recovery records. Required.
     *
     * @param actorId the operator's principal ID
     * @return this builder
     */
    public Builder actorId(String actorId) {
      this.actorId = Wire.nonNull(actorId, "actorId");
      return this;
    }

    /**
     * Keeps mutation recovery records in storage the caller approves, so a new client can resolve or retry them.
     * Records hold request inputs, never credentials.
     *
     * @param recoveryStorage the storage, or {@code null} to keep records in memory only
     * @return this builder
     */
    public Builder recoveryStorage(@Nullable RecoveryStorage recoveryStorage) {
      this.recoveryStorage = recoveryStorage;
      return this;
    }

    /**
     * Sets the HTTP client. It must not follow redirects.
     *
     * @param httpClient the client, or {@code null} for a default one
     * @return this builder
     */
    public Builder httpClient(@Nullable HttpClient httpClient) {
      this.httpClient = httpClient;
      return this;
    }

    Builder clock(LongSupplier clock) {
      this.clock = Wire.nonNull(clock, "clock");
      return this;
    }

    /**
     * Builds the client. Building sends nothing.
     *
     * @return the client
     * @throws IllegalStateException if a required setting is missing
     * @throws IllegalArgumentException if a setting is invalid, or stored recovery records are malformed
     */
    public ManagementClient build() {
      return new ManagementClient(this);
    }
  }
}
