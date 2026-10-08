package com.convohop.server;

import com.convohop.server.api.CommunicationApi;
import com.convohop.server.internal.Wire;
import com.convohop.server.model.Capabilities;
import com.convohop.server.model.CapabilitiesReply;
import com.convohop.server.model.Conversation;
import com.convohop.server.model.CreateConversationReply;
import com.convohop.server.model.CreateConversationRequestInput;
import com.convohop.server.model.CreatePrincipalReply;
import com.convohop.server.model.CreatePrincipalRequestInput;
import com.convohop.server.model.DisablePrincipalReply;
import com.convohop.server.model.DisablePrincipalRequestInput;
import com.convohop.server.model.GetOperationReply;
import com.convohop.server.model.GetOperationRequestInput;
import com.convohop.server.model.GetPrincipalReply;
import com.convohop.server.model.GetPrincipalRequestInput;
import com.convohop.server.model.IssueSessionReply;
import com.convohop.server.model.IssueSessionRequestInput;
import com.convohop.server.model.Operation;
import com.convohop.server.model.Principal;
import com.convohop.server.model.RenewSessionReply;
import com.convohop.server.model.RenewSessionRequestInput;
import com.convohop.server.model.RevokeSessionReply;
import com.convohop.server.model.RevokeSessionRequestInput;
import com.convohop.server.model.RouteReply;
import com.convohop.server.model.Session;
import com.convohop.server.model.SessionBootstrap;
import com.convohop.server.model.SessionRevocation;
import java.net.http.HttpClient;
import java.util.List;
import java.util.Map;
import java.util.function.LongSupplier;
import org.jspecify.annotations.Nullable;

/**
 * Backend-key client for one project. Use it only in trusted server runtimes; never ship a backend key to a browser
 * or a mobile app.
 *
 * <p>The helpers check that each result names the resource the request did. {@link #communication()} reaches every
 * backend operation in the schema without those checks. A key without the scope an operation needs fails with
 * {@link ScopeRequiredProblem}. Handles from {@link #conversation(String)} send nothing until a method is called.
 *
 * <p>Clients are safe for concurrent use. Calls block the calling thread; the {@code convohop-server-kotlin} module
 * adds suspending wrappers. Mutations accept an optional request ID: pass the same ID to repeat a mutation safely,
 * and see {@link #requests()} to recover one whose outcome is unknown.
 */
public final class ProjectServerClient {
  private static final String DEFAULT_TTL_MS = "900000";

  private final Transport transport;
  private final String projectId;
  private final CommunicationApi communication;
  private final Principals principals = new Principals();
  private final Sessions sessions = new Sessions();
  private final Conversations conversations = new Conversations();
  private final Requests requests;

  private ProjectServerClient(Builder builder) {
    String projectId = Checks.id(Wire.present(builder.projectId, "projectId"), "projectId");
    String incarnation = Checks.id(Wire.present(builder.incarnation, "incarnation"), "incarnation");
    this.transport = new Transport(
        Wire.present(builder.baseUrl, "baseUrl"),
        Wire.present(builder.backendKey, "backendKey"),
        projectId,
        incarnation,
        "backend:" + projectId,
        builder.recoveryStorage,
        builder.httpClient,
        builder.clock);
    this.projectId = projectId;
    this.communication = new CommunicationApi(this.transport);
    this.requests = new Requests(this.transport, "communication");
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
   * The project this client acts on.
   *
   * @return the project ID
   */
  public String getProjectId() {
    return this.projectId;
  }

  /**
   * The project incarnation this client was built for. Requests carry it, and the authority rejects them once the
   * project has a different incarnation.
   *
   * @return the incarnation
   */
  public String getIncarnation() {
    return this.transport.incarnation();
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
   * Every backend query and mutation in the schema, with the generated inputs and replies. Results are not checked
   * against the request.
   *
   * @return the communication API over this client's transport
   */
  public CommunicationApi communication() {
    return this.communication;
  }

  /**
   * Principal helpers.
   *
   * @return the principal helpers
   */
  public Principals principals() {
    return this.principals;
  }

  /**
   * User session helpers.
   *
   * @return the session helpers
   */
  public Sessions sessions() {
    return this.sessions;
  }

  /**
   * Conversation creation.
   *
   * @return the conversation helpers
   */
  public Conversations conversations() {
    return this.conversations;
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
   * A handle for one conversation. Creating it sends nothing.
   *
   * @param conversationId the conversation ID
   * @return the handle
   * @throws IllegalArgumentException if the ID is not a canonical nonzero UUID
   */
  public ServerConversation conversation(String conversationId) {
    return new ServerConversation(this.communication, this.transport, Checks.id(conversationId, "conversationId"));
  }

  /**
   * Reads the route of this client's project and records its serving epoch, which later requests carry.
   *
   * @throws IllegalStateException if the project or its incarnation changed; recover explicitly
   * @throws ConvoHopProblem if the authority rejects the read or its reply is malformed
   */
  public void initialize() {
    RouteReply reply = this.communication.route();
    Map<String, @Nullable Object> route = Checks.required(reply.getResult(), reply.getRequestId());
    if (!this.projectId.equals(route.get("projectId")) || !this.transport.incarnation().equals(route.get("incarnation"))) {
      throw new IllegalStateException("Project incarnation changed; explicit recovery required");
    }
    Object epoch = route.get("servingEpoch");
    if (!(epoch instanceof String)) {
      throw new ConvoHopProblem("INVALID_RESPONSE", reply.getRequestId(), "unknown", 503, "Invalid project route");
    }
    this.transport.servingEpoch((String) epoch);
  }

  /**
   * Reads the authority's capabilities and limits.
   *
   * @return the capabilities
   * @throws ConvoHopProblem if the authority rejects the read or its reply is malformed
   */
  public Capabilities capabilities() {
    CapabilitiesReply reply = this.communication.capabilities();
    return Checks.required(reply.getResult(), reply.getRequestId());
  }

  /**
   * Reads a long-running operation.
   *
   * @param operationId the operation ID
   * @return the operation
   * @throws IllegalArgumentException if the ID is not a canonical nonzero UUID
   * @throws ConvoHopProblem if the authority rejects the read or its reply names another operation
   */
  public Operation operation(String operationId) {
    GetOperationReply reply = this.communication.getOperation(
        GetOperationRequestInput.builder().operationId(Checks.id(operationId, "operationId")).build());
    Operation operation = Checks.required(reply.getResult(), reply.getRequestId());
    if (!operation.getOperationId().equals(operationId)) {
      throw Checks.mismatch("Operation", reply.getRequestId());
    }
    return operation;
  }

  private SessionBootstrap session(
      @Nullable SessionBootstrap value, String requestId, String principalId, String deviceId,
      @Nullable String sessionId) {
    SessionBootstrap issued = Checks.required(value, requestId);
    Session session = Checks.required(issued.getSession(), requestId);
    if (!session.getPrincipalId().equals(principalId) || !session.getDeviceId().equals(deviceId)
        || !session.getIncarnation().equals(this.transport.incarnation())
        || (sessionId != null && !session.getSessionId().equals(sessionId))) {
      throw Checks.mismatch("Session", requestId);
    }
    return issued;
  }

  /** Creates, reads and disables principals: the users of a project. */
  public final class Principals {
    private Principals() {}

    /**
     * Creates a principal for an external user ID.
     *
     * @param externalUserId the application's user ID
     * @return the principal
     * @throws ConvoHopProblem if the authority rejects the request or its reply names another user
     */
    public Principal create(String externalUserId) {
      return create(externalUserId, null);
    }

    /**
     * Creates a principal for an external user ID.
     *
     * @param externalUserId the application's user ID
     * @param requestId the request ID to send, or {@code null} for a new one
     * @return the principal
     * @throws ConvoHopProblem if the authority rejects the request or its reply names another user
     */
    public Principal create(String externalUserId, @Nullable String requestId) {
      CreatePrincipalReply reply = communication.createPrincipal(
          CreatePrincipalRequestInput.builder().externalUserId(Wire.nonNull(externalUserId, "externalUserId")).build(),
          requestId);
      Principal principal = Checks.required(reply.getResult(), reply.getRequestId());
      if (!principal.getExternalUserId().equals(externalUserId)) {
        throw Checks.mismatch("Principal", reply.getRequestId());
      }
      return principal;
    }

    /**
     * Reads a principal.
     *
     * @param principalId the principal ID
     * @return the principal
     * @throws ConvoHopProblem if the authority rejects the read or its reply names another principal
     */
    public Principal get(String principalId) {
      GetPrincipalReply reply = communication.getPrincipal(
          GetPrincipalRequestInput.builder().principalId(Checks.id(principalId, "principalId")).build());
      Principal principal = Checks.required(reply.getResult(), reply.getRequestId());
      if (!principal.getPrincipalId().equals(principalId)) {
        throw Checks.mismatch("Principal", reply.getRequestId());
      }
      return principal;
    }

    /**
     * Disables a principal.
     *
     * @param principalId the principal ID
     * @param expectedRevision the principal's current revision
     * @return the disabled principal
     * @throws ConvoHopProblem if the authority rejects the request or its reply names another principal
     */
    public Principal disable(String principalId, String expectedRevision) {
      return disable(principalId, expectedRevision, null);
    }

    /**
     * Disables a principal.
     *
     * @param principalId the principal ID
     * @param expectedRevision the principal's current revision
     * @param requestId the request ID to send, or {@code null} for a new one
     * @return the disabled principal
     * @throws ConvoHopProblem if the authority rejects the request or its reply names another principal
     */
    public Principal disable(String principalId, String expectedRevision, @Nullable String requestId) {
      DisablePrincipalReply reply = communication.disablePrincipal(
          DisablePrincipalRequestInput.builder()
              .principalId(Checks.id(principalId, "principalId"))
              .expectedRevision(Checks.counter(expectedRevision, "expectedRevision"))
              .build(),
          requestId);
      Principal principal = Checks.required(reply.getResult(), reply.getRequestId());
      if (!principal.getPrincipalId().equals(principalId)) {
        throw Checks.mismatch("Principal", reply.getRequestId());
      }
      return principal;
    }
  }

  /**
   * Issues, renews and revokes user sessions. A session token is a credential for one device: hand it only to that
   * device, over an authenticated channel, and never log it.
   */
  public final class Sessions {
    private Sessions() {}

    /**
     * Issues a session that lasts 15 minutes.
     *
     * @param principalId the principal ID
     * @param deviceId the device ID
     * @return the session and its token
     * @throws ConvoHopProblem if the authority rejects the request or its reply names another session
     */
    public SessionBootstrap issue(String principalId, String deviceId) {
      return issue(principalId, deviceId, null, null);
    }

    /**
     * Issues a session.
     *
     * @param principalId the principal ID
     * @param deviceId the device ID
     * @param requestedTtlMs the lifetime in milliseconds as a decimal string, or {@code null} for 15 minutes
     * @param requestId the request ID to send, or {@code null} for a new one
     * @return the session and its token
     * @throws ConvoHopProblem if the authority rejects the request or its reply names another session
     */
    public SessionBootstrap issue(
        String principalId, String deviceId, @Nullable String requestedTtlMs, @Nullable String requestId) {
      IssueSessionReply reply = communication.issueSession(
          IssueSessionRequestInput.builder()
              .principalId(Checks.id(principalId, "principalId"))
              .deviceId(Checks.id(deviceId, "deviceId"))
              .requestedTtlMs(Checks.counter(requestedTtlMs == null ? DEFAULT_TTL_MS : requestedTtlMs, "requestedTtlMs"))
              .build(),
          requestId);
      return session(reply.getResult(), reply.getRequestId(), principalId, deviceId, null);
    }

    /**
     * Renews a session for 15 minutes.
     *
     * @param sessionId the session ID
     * @param principalId the session's principal ID
     * @param deviceId the session's device ID
     * @param expectedRevision the session's current revision
     * @return the renewed session and its new token
     * @throws ConvoHopProblem if the authority rejects the request or its reply names another session
     */
    public SessionBootstrap renew(String sessionId, String principalId, String deviceId, String expectedRevision) {
      return renew(sessionId, principalId, deviceId, expectedRevision, null, null);
    }

    /**
     * Renews a session.
     *
     * @param sessionId the session ID
     * @param principalId the session's principal ID
     * @param deviceId the session's device ID
     * @param expectedRevision the session's current revision
     * @param requestedTtlMs the lifetime in milliseconds as a decimal string, or {@code null} for 15 minutes
     * @param requestId the request ID to send, or {@code null} for a new one
     * @return the renewed session and its new token
     * @throws ConvoHopProblem if the authority rejects the request or its reply names another session
     */
    public SessionBootstrap renew(
        String sessionId,
        String principalId,
        String deviceId,
        String expectedRevision,
        @Nullable String requestedTtlMs,
        @Nullable String requestId) {
      RenewSessionReply reply = communication.renewSession(
          RenewSessionRequestInput.builder()
              .sessionId(Checks.id(sessionId, "sessionId"))
              .principalId(Checks.id(principalId, "principalId"))
              .deviceId(Checks.id(deviceId, "deviceId"))
              .expectedRevision(Checks.counter(expectedRevision, "expectedRevision"))
              .requestedTtlMs(Checks.counter(requestedTtlMs == null ? DEFAULT_TTL_MS : requestedTtlMs, "requestedTtlMs"))
              .build(),
          requestId);
      return session(reply.getResult(), reply.getRequestId(), principalId, deviceId, sessionId);
    }

    /**
     * Revokes a session.
     *
     * @param sessionId the session ID
     * @param expectedRevision the session's current revision
     * @return the revocation
     * @throws ConvoHopProblem if the authority rejects the request or its reply names another session
     */
    public SessionRevocation revoke(String sessionId, String expectedRevision) {
      return revoke(sessionId, expectedRevision, null);
    }

    /**
     * Revokes a session.
     *
     * @param sessionId the session ID
     * @param expectedRevision the session's current revision
     * @param requestId the request ID to send, or {@code null} for a new one
     * @return the revocation
     * @throws ConvoHopProblem if the authority rejects the request or its reply names another session
     */
    public SessionRevocation revoke(String sessionId, String expectedRevision, @Nullable String requestId) {
      RevokeSessionReply reply = communication.revokeSession(
          RevokeSessionRequestInput.builder()
              .sessionId(Checks.id(sessionId, "sessionId"))
              .expectedRevision(Checks.counter(expectedRevision, "expectedRevision"))
              .build(),
          requestId);
      SessionRevocation revocation = Checks.required(reply.getResult(), reply.getRequestId());
      if (!revocation.getSessionId().equals(sessionId)) {
        throw Checks.mismatch("Session revocation", reply.getRequestId());
      }
      return revocation;
    }
  }

  /** Creates conversations. */
  public final class Conversations {
    private Conversations() {}

    /**
     * Creates a conversation.
     *
     * @param input the title, properties and initial members
     * @return the conversation
     * @throws ConvoHopProblem if the authority rejects the request or its reply is malformed
     */
    public Conversation create(CreateConversationRequestInput input) {
      return create(input, null);
    }

    /**
     * Creates a conversation.
     *
     * @param input the title, properties and initial members
     * @param requestId the request ID to send, or {@code null} for a new one
     * @return the conversation
     * @throws ConvoHopProblem if the authority rejects the request or its reply is malformed
     */
    public Conversation create(CreateConversationRequestInput input, @Nullable String requestId) {
      CreateConversationReply reply = communication.createConversation(Wire.nonNull(input, "input"), requestId);
      return Checks.required(reply.getResult(), reply.getRequestId());
    }
  }

  /** Builds a {@link ProjectServerClient}. */
  public static final class Builder {
    private @Nullable String baseUrl;
    private @Nullable String projectId;
    private @Nullable String backendKey;
    private @Nullable String incarnation;
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
     * Sets the project. Required.
     *
     * @param projectId the project ID
     * @return this builder
     */
    public Builder projectId(String projectId) {
      this.projectId = Wire.nonNull(projectId, "projectId");
      return this;
    }

    /**
     * Sets the backend key. Required. Load it from a secret store; never embed it in code or client apps.
     *
     * @param backendKey the backend key
     * @return this builder
     */
    public Builder backendKey(String backendKey) {
      this.backendKey = Wire.nonNull(backendKey, "backendKey");
      return this;
    }

    /**
     * Sets the project incarnation the client acts in. Required.
     *
     * @param incarnation the incarnation
     * @return this builder
     */
    public Builder incarnation(String incarnation) {
      this.incarnation = Wire.nonNull(incarnation, "incarnation");
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
     * Builds the client. Building sends nothing; call {@link ProjectServerClient#initialize()} to check the route.
     *
     * @return the client
     * @throws IllegalStateException if a required setting is missing
     * @throws IllegalArgumentException if a setting is invalid, or stored recovery records are malformed
     */
    public ProjectServerClient build() {
      return new ProjectServerClient(this);
    }
  }
}
