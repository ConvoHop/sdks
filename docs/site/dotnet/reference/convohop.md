# `ConvoHop`

Server SDK for trusted .NET backends: project and management clients for backend-key calls, typed errors, recovery storage, webhook verification and push payload builders.

**Layer:** Server. **Runtime:** .NET 8 or later. The `netstandard2.0` build also targets .NET Framework 4.7.2 or later, which isn't tested yet. **Source:** `dotnet/src/ConvoHop`.

## Classes

### `ApnsAlertContent` class

```cs
public sealed class ApnsAlertContent
```

An APNs alert's visible text.

#### `ApnsAlertContent.Title` property

```cs
public string? Title { get; }
```

The visible title, possibly shortened to fit.

#### `ApnsAlertContent.Body` property

```cs
public string? Body { get; }
```

The visible body, possibly shortened to fit.

#### `ApnsAlertContent.LocKey` property

```cs
public string? LocKey { get; }
```

Present when there is no body: `CONVOHOP_MESSAGE`, `CONVOHOP_CALL` or `CONVOHOP_MISSED_CALL`, for your app's localized text. The JSON key is `loc-key`.

### `ApnsAlertRequest` class

```cs
public sealed class ApnsAlertRequest
```

An APNs alert. Your APNs client adds `authorization` to `Headers` and sends `PayloadJson` to `/3/device/<token>`.

#### `ApnsAlertRequest.Headers` property

```cs
public IReadOnlyDictionary<string, string> Headers { get; }
```

HTTP/2 headers in order: `apns-push-type` `alert`, `apns-topic` (the bundle ID), `apns-priority` `10`, `apns-expiration` (Unix seconds after which APNs stops trying) and, for calls and missed calls, `apns-collapse-id`, so a missed-call alert replaces the ring's incoming-call alert.

#### `ApnsAlertRequest.Alert` property

```cs
public ApnsAlertContent Alert { get; }
```

The visible alert: `aps.alert`.

#### `ApnsAlertRequest.Sound` property

```cs
public string Sound { get; }
```

The alert sound, `default`: `aps.sound`.

#### `ApnsAlertRequest.MutableContent` property

```cs
public bool MutableContent { get; }
```

Always `true` (`aps.mutable-content` 1), so a notification service extension can rewrite the alert.

#### `ApnsAlertRequest.ThreadId` property

```cs
public string ThreadId { get; }
```

The conversation's ID, grouping its notifications: `aps.thread-id`.

#### `ApnsAlertRequest.Metadata` property

```cs
public PushData Metadata { get; }
```

The `convohop` metadata, without a title or body.

#### `ApnsAlertRequest.PayloadJson` property

```cs
public string PayloadJson { get; }
```

The compact JSON payload, at most 4096 UTF-8 bytes.

### `ApnsPushOptions` class

```cs
public sealed class ApnsPushOptions : PushOptions
```

Options for the APNs builders, which need the app's bundle ID.

#### `ApnsPushOptions` constructor

```cs
public ApnsPushOptions(string bundleId);
```

Creates APNs options.

Parameters:

- `bundleId`: The app's bundle ID.

#### `ApnsPushOptions.BundleId` property

```cs
public string BundleId { get; set; }
```

The app's bundle ID: the `apns-topic` of alerts. VoIP pushes use `<bundleId>.voip`. At most 155 characters of ASCII letters, digits and `-`, in dot-separated segments.

#### `ApnsPushOptions.Title` property

```cs
public string? Title { get; set; }
```

The visible title, such as the sender's or conversation's name. Omitted when null or empty.

Inherited from `PushOptions`.

#### `ApnsPushOptions.Body` property

```cs
public string? Body { get; set; }
```

The visible body. Replaces the message preview. Omitted when null or empty.

Inherited from `PushOptions`.

#### `ApnsPushOptions.Preview` property

```cs
public bool Preview { get; set; }
```

Whether a message event's preview becomes the body when `Body` is empty. Defaults to `true`.

Inherited from `PushOptions`.

#### `ApnsPushOptions.Now` property

```cs
public DateTimeOffset? Now { get; set; }
```

The clock for the TTL and expiration. Defaults to the current time.

Inherited from `PushOptions`.

### `ApnsVoipRequest` class

```cs
public sealed class ApnsVoipRequest
```

An APNs VoIP push. Your APNs client adds `authorization` to `Headers` and sends `PayloadJson` to `/3/device/<token>` with your app's VoIP token.

#### `ApnsVoipRequest.Headers` property

```cs
public IReadOnlyDictionary<string, string> Headers { get; }
```

HTTP/2 headers in order: `apns-push-type` `voip`, `apns-topic` (`<bundleId>.voip`), `apns-priority` `10` and `apns-expiration` (Unix seconds after which APNs stops trying).

#### `ApnsVoipRequest.Metadata` property

```cs
public PushData Metadata { get; }
```

The `convohop` metadata, with the title and body.

#### `ApnsVoipRequest.PayloadJson` property

```cs
public string PayloadJson { get; }
```

The compact JSON payload, at most 5120 UTF-8 bytes.

### `ContextField` class

```cs
public sealed class ContextField
```

One request-context field and how an operation uses it.

#### `ContextField.Name` property

```cs
public string Name { get; }
```

The context field name, for example `requestId`.

#### `ContextField.Use` property

```cs
public ContextFieldUse Use { get; }
```

How the operation uses the field.

### `ConvoHopException` class

```cs
public class ConvoHopException : Exception
```

A classified failure from the authority or the SDK. Classify it by `Code` (see `ErrorCodes`), never by message text.

`Outcome` says what is known about the request: `rejected` means it did not take effect, `committed` or `accepted` mean it did, and `unknown` means resolve the original request ID before sending anything new. Messages never contain credentials.

#### `ConvoHopException` constructor

```cs
public ConvoHopException(string code, string requestId, string outcome, int status, string message, TimeSpan? retryAfter = null, Exception? innerException = null);
```

Creates an exception.

Parameters:

- `code`: The stable error code.
- `requestId`: The request ID the failure belongs to.
- `outcome`: What is known about the request outcome.
- `status`: The HTTP-style status, or 0 when no authority response was observed.
- `message`: The human-readable message.
- `retryAfter`: How long to wait before resending, when the authority sent a delay.
- `innerException`: The underlying failure, if any.

Exceptions:

- `ArgumentOutOfRangeException`: `retryAfter` is negative.

#### `ConvoHopException.Code` property

```cs
public string Code { get; }
```

The stable machine-readable error code.

#### `ConvoHopException.RequestId` property

```cs
public string RequestId { get; }
```

The request ID the failure belongs to.

#### `ConvoHopException.Outcome` property

```cs
public string Outcome { get; }
```

What is known about the outcome: `rejected`, `unknown`, `committed` or `accepted`.

#### `ConvoHopException.Status` property

```cs
public int Status { get; }
```

The HTTP-style status, or 0 when no authority response was observed.

#### `ConvoHopException.RetryAfter` property

```cs
public TimeSpan? RetryAfter { get; }
```

How long to wait before resending the same request, when the authority sent a delay (for example with `RATE_LIMITED`). Read in whole seconds from the error's `extensions.retryAfter`, else from an HTTP `Retry-After` delay in seconds. A delay longer than `TimeSpan.MaxValue` is reported as `TimeSpan.MaxValue`. The SDK never waits or resends on its own because of it.

### `ConvoHopManagementClient` class

```cs
public sealed class ConvoHopManagementClient
```

Operator-token client for organizations, deployments, projects and backend keys. Use it only in trusted operator tooling. Instances are thread-safe.

Mutations accept a `requestId`: after an outcome of `unknown`, call the method again with the same ID and payload, or retry it with `ConvoHopTransport.RetryAsync`. Never send the change again under a new ID.

#### `ConvoHopManagementClient` constructor

```cs
public ConvoHopManagementClient(ConvoHopManagementClientOptions options);
```

Creates a client. Construction sends no request.

Parameters:

- `options`: The client options.

Exceptions:

- `ArgumentException`: An option is invalid. The message never contains the access token.

#### `ConvoHopManagementClient.Transport` property

```cs
public ConvoHopTransport Transport { get; }
```

The transport, for management operations without a typed method and for recovery records.

#### `ConvoHopManagementClient.Management` property

```cs
public ManagementApi Management { get; }
```

Every management query and mutation in the schema, with the generated inputs and replies. Unlike the helpers, it does not check that a result names the resource the request did.

#### `ConvoHopManagementClient.CreateOrganizationAsync` method

```cs
public Task<Organization> CreateOrganizationAsync(string name, string termsRef, string? requestId = null, CancellationToken cancellationToken = default);
```

Creates an organization owned by the operator.

Parameters:

- `name`: The organization name.
- `termsRef`: The reference to the accepted terms.
- `requestId`: The request ID; pass the original ID to resume after an uncertain outcome.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The organization.

Exceptions:

- `ConvoHopException`: The request failed, or its outcome is uncertain.

Sends [`management.createOrganization`](../../operations/management/createOrganization.md).

#### `ConvoHopManagementClient.CreateDeploymentAsync` method

```cs
public Task<CreateDeploymentReply> CreateDeploymentAsync(string orgId, DeploymentOptions? configuration = null, string? requestId = null, CancellationToken cancellationToken = default);
```

Requests a deployment. Without `configuration`, a loopback authority gets the local single-node defaults; any other authority requires it.

Parameters:

- `orgId`: The organization ID.
- `configuration`: The offering, geography, installation profile and consent reference.
- `requestId`: The request ID; pass the original ID to resume after an uncertain outcome.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The receipt; its operation tracks the provisioning.

Exceptions:

- `ArgumentException`: An argument is invalid, or a hosted deployment has no configuration.
- `ConvoHopException`: The request failed, or its outcome is uncertain.

Sends [`management.createDeployment`](../../operations/management/createDeployment.md).

#### `ConvoHopManagementClient.CreateProjectAsync` method

```cs
public Task<CreateProjectReply> CreateProjectAsync(string deploymentId, string name, ProjectOptions? configuration = null, string? requestId = null, CancellationToken cancellationToken = default);
```

Requests a project in a deployment. Without `configuration`, a loopback authority gets the `local` environment and the `application-server` backend principal; any other authority requires it.

Parameters:

- `deploymentId`: The deployment ID.
- `name`: The project name.
- `configuration`: The environment and backend principal name.
- `requestId`: The request ID; pass the original ID to resume after an uncertain outcome.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The receipt; its result carries the project ID and incarnation once committed.

Exceptions:

- `ArgumentException`: An argument is invalid, or a hosted project has no configuration.
- `ConvoHopException`: The request failed, or its outcome is uncertain.

Sends [`management.createProject`](../../operations/management/createProject.md).

#### `ConvoHopManagementClient.GetOperationAsync` method

```cs
public Task<Operation> GetOperationAsync(string operationId, CancellationToken cancellationToken = default);
```

Reads a management operation, such as deployment provisioning.

Parameters:

- `operationId`: The operation ID.
- `cancellationToken`: Stops waiting for the read.

Returns: The operation.

Exceptions:

- `ArgumentException`: The ID is not a canonical UUID.
- `ConvoHopException`: The read failed or its response was malformed.

Sends [`management.getOperation`](../../operations/management/getOperation.md).

#### `ConvoHopManagementClient.IssueBackendKeyAsync` method

```cs
public Task<IssueBackendKeyReply> IssueBackendKeyAsync(string projectId, string name, IReadOnlyList<string> scopes, string expiresAt, string? requestId = null, CancellationToken cancellationToken = default);
```

Issues a backend key. The secret is delivered through a credential delivery, never in this response; see the result's `OperationResult.Delivery`.

Parameters:

- `projectId`: The project ID.
- `name`: The key name.
- `scopes`: The scopes the key grants, such as `messageWrite`.
- `expiresAt`: When the key expires, as an RFC 3339 UTC timestamp.
- `requestId`: The request ID; pass the original ID to resume after an uncertain outcome.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The receipt.

Exceptions:

- `ArgumentException`: An argument is invalid.
- `ConvoHopException`: The request failed, or its outcome is uncertain.

Sends [`management.issueBackendKey`](../../operations/management/issueBackendKey.md).

#### `ConvoHopManagementClient.GetDeliveryPermitAsync` method

```cs
public Task<JsonElement> GetDeliveryPermitAsync(string projectId, string deliveryId, string redemptionRequestId, string? requestId = null, CancellationToken cancellationToken = default);
```

Obtains a single-use permit to redeem a credential delivery. Hand it, with the redemption request ID, to the process that redeems the delivery; treat it as a secret.

Parameters:

- `projectId`: The project ID.
- `deliveryId`: The credential delivery ID.
- `redemptionRequestId`: The request ID the redemption will use.
- `requestId`: The request ID; pass the original ID to resume after an uncertain outcome.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The permit object.

Exceptions:

- `ArgumentException`: An argument is invalid.
- `ConvoHopException`: The request failed, its outcome is uncertain, or the permit is not an object.

Sends [`management.credentialPermit`](../../operations/management/credentialPermit.md).

### `ConvoHopManagementClientOptions` class

```cs
public sealed class ConvoHopManagementClientOptions
```

Options for `ConvoHopManagementClient`.

#### `ConvoHopManagementClientOptions` constructor

```cs
public ConvoHopManagementClientOptions();
```

#### `ConvoHopManagementClientOptions.BaseUrl` property

```cs
public string BaseUrl { get; set; }
```

The authority origin: HTTPS, or explicit loopback HTTP for local development. Requests go to `{BaseUrl}/graphql`.

#### `ConvoHopManagementClientOptions.AccessToken` property

```cs
public string AccessToken { get; set; }
```

The operator access token. Keep it in trusted operator tooling; never log it or send it to clients.

#### `ConvoHopManagementClientOptions.ActorId` property

```cs
public string ActorId { get; set; }
```

The operator's actor ID, a canonical UUID. It scopes the recovery records.

#### `ConvoHopManagementClientOptions.RecoveryStorage` property

```cs
public IRecoveryStorage? RecoveryStorage { get; set; }
```

Durable storage for mutation recovery records, so an uncertain mutation can be resolved after a restart. The records never contain the access token.

#### `ConvoHopManagementClientOptions.HttpClient` property

```cs
public HttpClient? HttpClient { get; set; }
```

The HTTP client to send requests with. It must not follow redirects or add credentials of its own. Null uses a shared client that never follows redirects or stores cookies.

#### `ConvoHopManagementClientOptions.TimeProvider` property

```cs
public TimeProvider? TimeProvider { get; set; }
```

The clock for timeouts and retry budgets. Defaults to `TimeProvider.System`.

### `ConvoHopTransport` class

```cs
public sealed class ConvoHopTransport
```

The GraphQL transport for one credential: generated operations over `/graphql`, response and receipt validation, and mutation recovery.

Instances are thread-safe. A mutation keeps its request ID, payload, incarnation and retry budget across attempts. Transport uncertainty is neither rejection nor commit: when an attempt fails with outcome `unknown`, resolve or retry the original request ID (see `RetryAsync`); never send the change again under a new ID.

Cancelling a call stops waiting for it; it does not prove the authority did not apply a mutation. Recovery records never contain credentials.

#### `ConvoHopTransport` constructor

```cs
public ConvoHopTransport(ConvoHopTransportOptions options);
```

Creates a transport.

Parameters:

- `options`: The transport options.

Exceptions:

- `ArgumentException`: The base URL, namespace or credential is invalid. The message never contains the credential.

#### `ConvoHopTransport.BaseUrl` property

```cs
public string BaseUrl { get; }
```

The authority origin requests are sent to.

#### `ConvoHopTransport.DurableRecovery` property

```cs
public bool DurableRecovery { get; }
```

Whether mutation recovery records are written to `ConvoHopTransportOptions.RecoveryStorage`.

#### `ConvoHopTransport.Incarnation` property

```cs
public string Incarnation { get; }
```

The project incarnation requests belong to, or `management`.

#### `ConvoHopTransport.ServingEpoch` property

```cs
public string? ServingEpoch { get; set; }
```

The serving epoch most recently observed from route initialization. When set, it is sent with each request as `observedServingEpoch` so the authority can reject requests routed from a stale view.

#### `ConvoHopTransport.InitializeRecoveryAsync` method

```cs
public Task InitializeRecoveryAsync(CancellationToken cancellationToken = default);
```

Loads recovery records from `ConvoHopTransportOptions.RecoveryStorage`. Calls that need recovery state load it first, so calling this is optional; call it at startup to surface corrupt storage early.

Parameters:

- `cancellationToken`: Stops waiting; the load itself still completes.

Returns: A task that completes when the records are loaded.

Exceptions:

- `InvalidDataException`: The stored records are malformed. A later call reads the storage again.

#### `ConvoHopTransport.GetRecoveryStatesAsync` method

```cs
public Task<IReadOnlyList<RecoveryState>> GetRecoveryStatesAsync(CancellationToken cancellationToken = default);
```

Returns a snapshot of the mutation recovery records, oldest first.

Parameters:

- `cancellationToken`: Cancels the wait for recovery initialization.

Returns: The recovery records.

#### `ConvoHopTransport.ExecuteAsync` method

```cs
public Task<TResult> ExecuteAsync<TInput, TResult>(OperationDescriptor<TInput, TResult> operation, string? projectId, TInput input, string? requestId = null, JsonElement? credentialDeliveryPermit = null, CancellationToken cancellationToken = default);
```

Executes a generated operation.

Type parameters:

- `TInput`: The operation input model.
- `TResult`: The operation result model.

Parameters:

- `operation`: The operation, from `Operations`.
- `projectId`: The project of a communication operation; null for management operations.
- `input`: The operation input, or `NoInput.Value`. Null is allowed only when the input is optional, and sends an empty input object.
- `requestId`: The request ID. Pass the original ID to resume a mutation after an uncertain outcome; null creates a new one.
- `credentialDeliveryPermit`: A credential delivery permit, only for credential redemption or acknowledgement.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The validated result.

Exceptions:

- `ArgumentNullException`: `input` is null and the operation requires an input.
- `ArgumentException`: `credentialDeliveryPermit` is a default `JsonElement`.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is uncertain.

#### `ConvoHopTransport.RetryAsync` method

```cs
public Task<RequestResolution> RetryAsync(string requestId, CancellationToken cancellationToken = default);
```

Resolves an uncertain mutation by its original request ID and resends the original payload only when the authority has not observed it and the retry budget allows.

Parameters:

- `requestId`: The original request ID.
- `cancellationToken`: Stops waiting. A cancelled resend has an unknown outcome.

Returns: The current resolution: committed, accepted, or not observed yet after a resend.

Exceptions:

- `ArgumentException`: The request ID is not a canonical UUID.
- `InvalidOperationException`: No recovery record exists for the request ID.
- `ConvoHopException`: The request cannot be resent or its resolution failed.

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md) and [`management.resolveRequest`](../../operations/management/resolveRequest.md).

### `ConvoHopTransportOptions` class

```cs
public sealed class ConvoHopTransportOptions
```

Options for `ConvoHopTransport`.

#### `ConvoHopTransportOptions` constructor

```cs
public ConvoHopTransportOptions();
```

#### `ConvoHopTransportOptions.BaseUrl` property

```cs
public string BaseUrl { get; set; }
```

The authority origin: HTTPS, or explicit loopback HTTP for local development. It must not have a path, query, fragment or user information.

#### `ConvoHopTransportOptions.Credential` property

```cs
public string? Credential { get; set; }
```

The bearer credential, for example a backend key. Keep it on trusted servers; never send it to browsers or put it in URLs, logs or recovery storage.

#### `ConvoHopTransportOptions.Namespace` property

```cs
public string Namespace { get; set; }
```

The recovery namespace. Records are stored under `convohop.requests:` followed by this value, so each credential scope needs its own namespace.

#### `ConvoHopTransportOptions.Incarnation` property

```cs
public string? Incarnation { get; set; }
```

The project incarnation requests belong to. Null means `management`, which sends no incarnation.

#### `ConvoHopTransportOptions.RecoveryStorage` property

```cs
public IRecoveryStorage? RecoveryStorage { get; set; }
```

Durable storage for mutation recovery records. Null keeps them only in this transport instance, so an uncertain mutation cannot be recovered after the process restarts.

#### `ConvoHopTransportOptions.HttpClient` property

```cs
public HttpClient? HttpClient { get; set; }
```

The HTTP client to send requests with. It must not follow redirects or add credentials of its own. Null uses a shared client that never follows redirects or stores cookies.

#### `ConvoHopTransportOptions.TimeProvider` property

```cs
public TimeProvider? TimeProvider { get; set; }
```

The clock for retry budgets and request timeouts. Null uses `TimeProvider.System`.

### `DeploymentOptions` class

```cs
public sealed class DeploymentOptions
```

Where and how a hosted deployment runs. Every value is required for a non-loopback authority.

#### `DeploymentOptions` constructor

```cs
public DeploymentOptions();
```

#### `DeploymentOptions.Offering` property

```cs
public string Offering { get; set; }
```

The offering, for example `managedShared`.

#### `DeploymentOptions.GeoId` property

```cs
public string GeoId { get; set; }
```

The geography ID.

#### `DeploymentOptions.InstallationProfileId` property

```cs
public string InstallationProfileId { get; set; }
```

The installation profile ID.

#### `DeploymentOptions.ConsentRef` property

```cs
public string ConsentRef { get; set; }
```

The reference to the recorded consent for this deployment.

### `ErrorCodes` class

```cs
public static class ErrorCodes
```

Stable machine-readable error codes. Classify errors by code, never by message text.

#### `ErrorCodes.AdmissionLimit` static property

```cs
public const string AdmissionLimit = "ADMISSION_LIMIT";
```

A rate, size or concurrency admission limit was reached. Back off, then retry with the same requestId.

#### `ErrorCodes.AlreadyConnected` static property

```cs
public const string AlreadyConnected = "ALREADY_CONNECTED";
```

The participation already has an active media connection.

#### `ErrorCodes.AlreadyExists` static property

```cs
public const string AlreadyExists = "ALREADY_EXISTS";
```

A resource with the same unique key already exists.

#### `ErrorCodes.AuthorityUnavailable` static property

```cs
public const string AuthorityUnavailable = "AUTHORITY_UNAVAILABLE";
```

The authority is temporarily unavailable. Retry with the same requestId.

#### `ErrorCodes.BillingCatalogNotSynced` static property

```cs
public const string BillingCatalogNotSynced = "BILLING_CATALOG_NOT_SYNCED";
```

The billing provider's catalog does not match the configured price book yet. An operator must sync it.

#### `ErrorCodes.BillingCustomerMissing` static property

```cs
public const string BillingCustomerMissing = "BILLING_CUSTOMER_MISSING";
```

The organization has no billing account yet. Start a checkout first.

#### `ErrorCodes.BillingLinkExpired` static property

```cs
public const string BillingLinkExpired = "BILLING_LINK_EXPIRED";
```

The billing link of this request is no longer valid. Send a new request with a new requestId.

#### `ErrorCodes.BillingNotConfigured` static property

```cs
public const string BillingNotConfigured = "BILLING_NOT_CONFIGURED";
```

Billing is not configured in this environment.

#### `ErrorCodes.BillingPlanUnavailable` static property

```cs
public const string BillingPlanUnavailable = "BILLING_PLAN_UNAVAILABLE";
```

The plan is not offered for self-service checkout.

#### `ErrorCodes.BillingProviderChanged` static property

```cs
public const string BillingProviderChanged = "BILLING_PROVIDER_CHANGED";
```

The organization's billing account belongs to a different billing provider.

#### `ErrorCodes.BillingProviderRejected` static property

```cs
public const string BillingProviderRejected = "BILLING_PROVIDER_REJECTED";
```

The billing provider refused the request.

#### `ErrorCodes.BillingSubscriptionActive` static property

```cs
public const string BillingSubscriptionActive = "BILLING_SUBSCRIPTION_ACTIVE";
```

The organization already has a subscription. Change it in the billing portal.

#### `ErrorCodes.BillingSuspended` static property

```cs
public const string BillingSuspended = "BILLING_SUSPENDED";
```

The organization is suspended for an unpaid balance. Update its payment method in the billing portal.

#### `ErrorCodes.CredentialDeliveryExpired` static property

```cs
public const string CredentialDeliveryExpired = "CREDENTIAL_DELIVERY_EXPIRED";
```

The credential delivery expired or can no longer be redeemed.

#### `ErrorCodes.CredentialExpired` static property

```cs
public const string CredentialExpired = "CREDENTIAL_EXPIRED";
```

The credential carried by the stored result has expired. Request a new one.

#### `ErrorCodes.CredentialRefreshRequired` static property

```cs
public const string CredentialRefreshRequired = "CREDENTIAL_REFRESH_REQUIRED";
```

The media credential must be refreshed before connecting.

#### `ErrorCodes.CredentialRequired` static property

```cs
public const string CredentialRequired = "CREDENTIAL_REQUIRED";
```

Delivery-permit requests cannot be resolved by lookup. Obtain a current permit and resubmit the same delivery explicitly.

#### `ErrorCodes.CursorAhead` static property

```cs
public const string CursorAhead = "CURSOR_AHEAD";
```

The cursor is ahead of the committed events of the conversation.

#### `ErrorCodes.CursorExpired` static property

```cs
public const string CursorExpired = "CURSOR_EXPIRED";
```

The cursor is older than retained history. Resynchronize from current state; never reset the cursor silently.

#### `ErrorCodes.CursorInvalid` static property

```cs
public const string CursorInvalid = "CURSOR_INVALID";
```

The cursor is malformed or was not issued for this query.

#### `ErrorCodes.CursorMismatch` static property

```cs
public const string CursorMismatch = "CURSOR_MISMATCH";
```

The cursor does not continue the subscribed stream.

#### `ErrorCodes.CursorScopeMismatch` static property

```cs
public const string CursorScopeMismatch = "CURSOR_SCOPE_MISMATCH";
```

The cursor was issued for a different scope, caller or visibility.

#### `ErrorCodes.DeliveryConsumed` static property

```cs
public const string DeliveryConsumed = "DELIVERY_CONSUMED";
```

The delivery was already redeemed by a different request.

#### `ErrorCodes.DeliveryNotRedeemed` static property

```cs
public const string DeliveryNotRedeemed = "DELIVERY_NOT_REDEEMED";
```

The delivery must be redeemed before it can be acknowledged.

#### `ErrorCodes.DeploymentNotReady` static property

```cs
public const string DeploymentNotReady = "DEPLOYMENT_NOT_READY";
```

The deployment cannot host projects yet.

#### `ErrorCodes.FeatureUnsupported` static property

```cs
public const string FeatureUnsupported = "FEATURE_UNSUPPORTED";
```

The feature is not available in this deployment.

#### `ErrorCodes.Forbidden` static property

```cs
public const string Forbidden = "FORBIDDEN";
```

The credential is valid but not allowed to perform this operation.

#### `ErrorCodes.GenerationConflict` static property

```cs
public const string GenerationConflict = "GENERATION_CONFLICT";
```

The live session generation changed. Read the current generation and retry.

#### `ErrorCodes.GraphqlError` static property

```cs
public const string GraphqlError = "GRAPHQL_ERROR";
```

A GraphQL error arrived without a recognized code.

#### `ErrorCodes.GraphqlInvalidRequest` static property

```cs
public const string GraphqlInvalidRequest = "GRAPHQL_INVALID_REQUEST";
```

The GraphQL request is malformed or fails validation.

#### `ErrorCodes.GraphqlQueryLimit` static property

```cs
public const string GraphqlQueryLimit = "GRAPHQL_QUERY_LIMIT";
```

The GraphQL document exceeds a depth, complexity or size limit.

#### `ErrorCodes.GraphqlResponseLimit` static property

```cs
public const string GraphqlResponseLimit = "GRAPHQL_RESPONSE_LIMIT";
```

The query response exceeds the response limit. Request a smaller page.

#### `ErrorCodes.HttpFailure` static property

```cs
public const string HttpFailure = "HTTP_FAILURE";
```

The HTTP exchange failed without a usable GraphQL error.

#### `ErrorCodes.IdempotencyConflict` static property

```cs
public const string IdempotencyConflict = "IDEMPOTENCY_CONFLICT";
```

The requestId was already used with a different payload or caller.

#### `ErrorCodes.IncarnationMismatch` static property

```cs
public const string IncarnationMismatch = "INCARNATION_MISMATCH";
```

The project incarnation changed. Discard state from the old incarnation and recover explicitly.

#### `ErrorCodes.InvalidReplacement` static property

```cs
public const string InvalidReplacement = "INVALID_REPLACEMENT";
```

The connection to replace is not a current connection of this participation.

#### `ErrorCodes.InvalidRequest` static property

```cs
public const string InvalidRequest = "INVALID_REQUEST";
```

The input or request context failed validation.

#### `ErrorCodes.InvalidResponse` static property

```cs
public const string InvalidResponse = "INVALID_RESPONSE";
```

The response did not match the expected shape or identity. The outcome is unknown.

#### `ErrorCodes.LiveAlertLimit` static property

```cs
public const string LiveAlertLimit = "LIVE_ALERT_LIMIT";
```

The live session reached its alert limit.

#### `ErrorCodes.LiveSessionClosed` static property

```cs
public const string LiveSessionClosed = "LIVE_SESSION_CLOSED";
```

The live session has ended or is ending.

#### `ErrorCodes.LiveSessionExists` static property

```cs
public const string LiveSessionExists = "LIVE_SESSION_EXISTS";
```

The conversation already has an active live session.

#### `ErrorCodes.MediaConnectFailed` static property

```cs
public const string MediaConnectFailed = "MEDIA_CONNECT_FAILED";
```

The native media connection failed. The participation remains; resolve and reconnect, or leave explicitly.

#### `ErrorCodes.MediaFenceRequired` static property

```cs
public const string MediaFenceRequired = "MEDIA_FENCE_REQUIRED";
```

Media cutoff is not enforced yet for this live session. Retry after the cutoff completes.

#### `ErrorCodes.MediaNotReady` static property

```cs
public const string MediaNotReady = "MEDIA_NOT_READY";
```

Media for the live session is not ready yet.

#### `ErrorCodes.MediaRecovering` static property

```cs
public const string MediaRecovering = "MEDIA_RECOVERING";
```

Media for the live session is recovering.

#### `ErrorCodes.MembershipCountInvalid` static property

```cs
public const string MembershipCountInvalid = "MEMBERSHIP_COUNT_INVALID";
```

Membership accounting needs operator reconciliation.

#### `ErrorCodes.MemberLimit` static property

```cs
public const string MemberLimit = "MEMBER_LIMIT";
```

The conversation reached its member limit.

#### `ErrorCodes.MessageDeleted` static property

```cs
public const string MessageDeleted = "MESSAGE_DELETED";
```

The message was deleted.

#### `ErrorCodes.NotASessionRequest` static property

```cs
public const string NotASessionRequest = "NOT_A_SESSION_REQUEST";
```

The requestId does not belong to an issueSession or renewSession request.

#### `ErrorCodes.NotFound` static property

```cs
public const string NotFound = "NOT_FOUND";
```

The resource does not exist or is not visible to the caller.

#### `ErrorCodes.OutcomeUnknown` static property

```cs
public const string OutcomeUnknown = "OUTCOME_UNKNOWN";
```

The mutation may have committed. Retry with the same requestId or resolve it.

#### `ErrorCodes.PageItemTooLarge` static property

```cs
public const string PageItemTooLarge = "PAGE_ITEM_TOO_LARGE";
```

A single item exceeds the page response limit.

#### `ErrorCodes.ParticipationMismatch` static property

```cs
public const string ParticipationMismatch = "PARTICIPATION_MISMATCH";
```

The participation does not belong to the caller or the current live session generation.

#### `ErrorCodes.PermitExpired` static property

```cs
public const string PermitExpired = "PERMIT_EXPIRED";
```

The stored delivery permit has expired. Request a new permit.

#### `ErrorCodes.PlanLimitExceeded` static property

```cs
public const string PlanLimitExceeded = "PLAN_LIMIT_EXCEEDED";
```

The plan does not permit the resource or feature. extensions.planLimit names the limit and extensions.limit holds the plan's value. Change the plan or the limit before trying again.

#### `ErrorCodes.QuotaExceeded` static property

```cs
public const string QuotaExceeded = "QUOTA_EXCEEDED";
```

A hard usage quota refused new work until the quota period ends. extensions.meter, extensions.limit and extensions.periodEnd describe the quota, and extensions.retryAfter (HTTP Retry-After) counts the seconds until it resets. Work already in progress continues.

#### `ErrorCodes.RateLimited` static property

```cs
public const string RateLimited = "RATE_LIMITED";
```

A per-second rate limit refused the request before it had any effect. Wait extensions.retryAfter seconds (HTTP Retry-After), then resend the request with the same requestId.

#### `ErrorCodes.RecoveryStorageFailure` static property

```cs
public const string RecoveryStorageFailure = "RECOVERY_STORAGE_FAILURE";
```

Caller-provided recovery storage did not confirm durability. Keep the original request and its outcome.

#### `ErrorCodes.RequestExpired` static property

```cs
public const string RequestExpired = "REQUEST_EXPIRED";
```

The original request is too old to replay.

#### `ErrorCodes.RequestTooLarge` static property

```cs
public const string RequestTooLarge = "REQUEST_TOO_LARGE";
```

The request body exceeds the size limit.

#### `ErrorCodes.ResolutionRequired` static property

```cs
public const string ResolutionRequired = "RESOLUTION_REQUIRED";
```

The outcome is still unresolved and the retry budget is spent. Resolve the original request before continuing.

#### `ErrorCodes.ResponseTooLarge` static property

```cs
public const string ResponseTooLarge = "RESPONSE_TOO_LARGE";
```

The response exceeds the size limit.

#### `ErrorCodes.ResyncRequired` static property

```cs
public const string ResyncRequired = "RESYNC_REQUIRED";
```

The subscription cannot continue. Replay from the last applied cursor.

#### `ErrorCodes.RetryExhausted` static property

```cs
public const string RetryExhausted = "RETRY_EXHAUSTED";
```

The authority exhausted its internal retry budget. Retry later with the same requestId.

#### `ErrorCodes.RevisionConflict` static property

```cs
public const string RevisionConflict = "REVISION_CONFLICT";
```

The expected revision or epoch is stale. Read the current state and retry with a new request.

#### `ErrorCodes.ScopeRequired` static property

```cs
public const string ScopeRequired = "SCOPE_REQUIRED";
```

The backend key lacks a scope this operation requires. The message names the scope.

#### `ErrorCodes.SessionReceiptBindingMismatch` static property

```cs
public const string SessionReceiptBindingMismatch = "SESSION_RECEIPT_BINDING_MISMATCH";
```

The stored session receipt does not match its binding.

#### `ErrorCodes.SessionReceiptInvalid` static property

```cs
public const string SessionReceiptInvalid = "SESSION_RECEIPT_INVALID";
```

The stored session receipt failed validation.

#### `ErrorCodes.SessionRefreshFailed` static property

```cs
public const string SessionRefreshFailed = "SESSION_REFRESH_FAILED";
```

The application session refresh callback failed.

#### `ErrorCodes.SessionRefreshRejected` static property

```cs
public const string SessionRefreshRejected = "SESSION_REFRESH_REJECTED";
```

The refreshed session was rejected because it does not match the current session.

#### `ErrorCodes.SessionRefreshRequired` static property

```cs
public const string SessionRefreshRequired = "SESSION_REFRESH_REQUIRED";
```

The user session needs renewal and no refresh is configured, or it expired.

#### `ErrorCodes.SessionRefreshUnverified` static property

```cs
public const string SessionRefreshUnverified = "SESSION_REFRESH_UNVERIFIED";
```

The refreshed session could not be verified.

#### `ErrorCodes.TransportUnknown` static property

```cs
public const string TransportUnknown = "TRANSPORT_UNKNOWN";
```

The transport failed after the request may have been sent. Resolve or retry the original request.

#### `ErrorCodes.Unauthenticated` static property

```cs
public const string Unauthenticated = "UNAUTHENTICATED";
```

The credential is missing, invalid or expired.

#### `ErrorCodes.WebhookDestinationDenied` static property

```cs
public const string WebhookDestinationDenied = "WEBHOOK_DESTINATION_DENIED";
```

The webhook URL is not a public HTTPS destination.

#### `ErrorCodes.WebhookEndpointDisabled` static property

```cs
public const string WebhookEndpointDisabled = "WEBHOOK_ENDPOINT_DISABLED";
```

The webhook endpoint is disabled. Enable it, then replay its deliveries.

#### `ErrorCodes.WebhookEndpointLimit` static property

```cs
public const string WebhookEndpointLimit = "WEBHOOK_ENDPOINT_LIMIT";
```

The project reached its webhook endpoint limit.

#### `ErrorCodes.WebhookRotationPending` static property

```cs
public const string WebhookRotationPending = "WEBHOOK_ROTATION_PENDING";
```

A signing-secret rotation is already waiting for acknowledgement.

#### `ErrorCodes.WebhookSecretUnacknowledged` static property

```cs
public const string WebhookSecretUnacknowledged = "WEBHOOK_SECRET_UNACKNOWLEDGED";
```

The endpoint's signing secret has not been acknowledged yet.

#### `ErrorCodes.WrongRegion` static property

```cs
public const string WrongRegion = "WRONG_REGION";
```

The observed serving epoch is stale. Route again, then retry.

### `FcmAndroidConfig` class

```cs
public sealed class FcmAndroidConfig
```

An FCM message's `android` options.

#### `FcmAndroidConfig.Priority` property

```cs
public string Priority { get; }
```

The delivery priority, `HIGH`.

#### `FcmAndroidConfig.Ttl` property

```cs
public string Ttl { get; }
```

How long FCM keeps trying, in the REST form: whole seconds followed by `s`.

#### `FcmAndroidConfig.TtlSeconds` property

```cs
public long TtlSeconds { get; }
```

How long FCM keeps trying, in seconds.

#### `FcmAndroidConfig.CollapseKey` property

```cs
public string? CollapseKey { get; }
```

Calls and cancellations: the ring's collapse key (`collapse_key`).

### `FcmRequest` class

```cs
public sealed class FcmRequest
```

An FCM data message without a target. For the FCM HTTP v1 REST `messages:send`, add `token` or `fid` to `MessageJson`: the device's registration token by default, or its Firebase Installation ID (FID) when the app's manifest sets `firebase_messaging_installation_id_enabled`. Firebase Admin SDKs take `Data` and the `Android` values in their own form, such as a `TimeSpan` TTL. The .NET one, FirebaseAdmin, sends to a FID from 3.6.0.

#### `FcmRequest.Data` property

```cs
public IReadOnlyDictionary<string, string> Data { get; }
```

The message's `data`: `convohop`, the metadata as JSON, with the title and body.

#### `FcmRequest.Android` property

```cs
public FcmAndroidConfig Android { get; }
```

The message's `android` options.

#### `FcmRequest.Metadata` property

```cs
public PushData Metadata { get; }
```

The `convohop` metadata, with the title and body.

#### `FcmRequest.MessageJson` property

```cs
public string MessageJson { get; }
```

The REST message as compact JSON, without a target: add `token` or `fid`. `data` is at most 4096 UTF-8 bytes as JSON.

### `InMemoryRecoveryStorage` class

```cs
public sealed class InMemoryRecoveryStorage : IRecoveryStorage
```

Process-local `IRecoveryStorage`. It survives client re-creation within one process but not a restart, so it is for tests and short-lived tools; use durable storage in production.

#### `InMemoryRecoveryStorage` constructor

```cs
public InMemoryRecoveryStorage();
```

#### `InMemoryRecoveryStorage.GetItemAsync` method

```cs
public Task<string?> GetItemAsync(string key, CancellationToken cancellationToken);
```

Reads the stored value, or null when there is none.

Parameters:

- `key`: The storage key.
- `cancellationToken`: Cancels the read.

Returns: The stored value, or null.

#### `InMemoryRecoveryStorage.SetItemAsync` method

```cs
public Task SetItemAsync(string key, string value, CancellationToken cancellationToken);
```

Durably replaces the stored value.

Parameters:

- `key`: The storage key.
- `value`: The value to store.
- `cancellationToken`: Cancels the write.

Returns: A task that completes when the value is durable.

### `NoInput` class

```cs
public sealed class NoInput
```

The input of an operation that takes no input.

#### `NoInput.Value` static property

```cs
public static NoInput Value { get; }
```

The only instance.

### `OperationDescriptor` class

```cs
public abstract class OperationDescriptor
```

A generated GraphQL operation: its document, input fields, result type and request semantics.

Instances are generated in `Operations`; they cannot be created by callers.

#### `OperationDescriptor.Id` property

```cs
public string Id { get; }
```

The stable operation key, for example `communication.sendMessage`.

#### `OperationDescriptor.Plane` property

```cs
public string Plane { get; }
```

The plane that serves the operation: `communication` or `management`.

#### `OperationDescriptor.Kind` property

```cs
public OperationKind Kind { get; }
```

Whether the operation is a query or a mutation.

#### `OperationDescriptor.Field` property

```cs
public string Field { get; }
```

The GraphQL root field.

#### `OperationDescriptor.OperationName` property

```cs
public string OperationName { get; }
```

The GraphQL operation name sent with the document.

#### `OperationDescriptor.Document` property

```cs
public string Document { get; }
```

The GraphQL document.

#### `OperationDescriptor.ResultType` property

```cs
public string ResultType { get; }
```

The GraphQL result type, for example `SendMessageReply!`.

#### `OperationDescriptor.ContextArgument` property

```cs
public string ContextArgument { get; }
```

The name of the request-context argument.

#### `OperationDescriptor.InputArgument` property

```cs
public string? InputArgument { get; }
```

The name of the input argument, or null when the operation takes no input.

#### `OperationDescriptor.InputRequired` property

```cs
public bool InputRequired { get; }
```

Whether the input argument is required.

#### `OperationDescriptor.InputFields` property

```cs
public IReadOnlyList<string> InputFields { get; }
```

The input fields the operation accepts.

#### `OperationDescriptor.ContextFields` property

```cs
public IReadOnlyList<ContextField> ContextFields { get; }
```

The request-context fields and how the operation uses them.

#### `OperationDescriptor.Idempotency` property

```cs
public string Idempotency { get; }
```

The idempotency class: `safe`, `idempotent` or `permitBound`.

#### `OperationDescriptor.Layer` property

```cs
public string Layer { get; }
```

The SDK layer that may call the operation: `client`, `server` or `both`.

#### `OperationDescriptor.Pagination` property

```cs
public string Pagination { get; }
```

The pagination style: `none`, `cursor`, `sequence` or `bounded`.

#### `OperationDescriptor.InputType` property

```cs
public abstract Type InputType { get; }
```

The CLR type of the operation input.

#### `OperationDescriptor.ResultClrType` property

```cs
public abstract Type ResultClrType { get; }
```

The CLR type of the operation result.

#### `OperationDescriptor.ToString` method

```cs
public override string ToString();
```

Returns `Id`.

Returns: The operation ID.

### `OperationDescriptor<TInput, TResult>` class

```cs
public sealed class OperationDescriptor<TInput, TResult> : OperationDescriptor
```

A generated GraphQL operation with its typed input and result.

Type parameters:

- `TInput`: The input model, or `NoInput`.
- `TResult`: The result model.

#### `OperationDescriptor<TInput, TResult>.InputType` property

```cs
public override Type InputType { get; }
```

The CLR type of the operation input.

#### `OperationDescriptor<TInput, TResult>.ResultClrType` property

```cs
public override Type ResultClrType { get; }
```

The CLR type of the operation result.

#### `OperationDescriptor<TInput, TResult>.Id` property

```cs
public string Id { get; }
```

The stable operation key, for example `communication.sendMessage`.

Inherited from `OperationDescriptor`.

#### `OperationDescriptor<TInput, TResult>.Plane` property

```cs
public string Plane { get; }
```

The plane that serves the operation: `communication` or `management`.

Inherited from `OperationDescriptor`.

#### `OperationDescriptor<TInput, TResult>.Kind` property

```cs
public OperationKind Kind { get; }
```

Whether the operation is a query or a mutation.

Inherited from `OperationDescriptor`.

#### `OperationDescriptor<TInput, TResult>.Field` property

```cs
public string Field { get; }
```

The GraphQL root field.

Inherited from `OperationDescriptor`.

#### `OperationDescriptor<TInput, TResult>.OperationName` property

```cs
public string OperationName { get; }
```

The GraphQL operation name sent with the document.

Inherited from `OperationDescriptor`.

#### `OperationDescriptor<TInput, TResult>.Document` property

```cs
public string Document { get; }
```

The GraphQL document.

Inherited from `OperationDescriptor`.

#### `OperationDescriptor<TInput, TResult>.ResultType` property

```cs
public string ResultType { get; }
```

The GraphQL result type, for example `SendMessageReply!`.

Inherited from `OperationDescriptor`.

#### `OperationDescriptor<TInput, TResult>.ContextArgument` property

```cs
public string ContextArgument { get; }
```

The name of the request-context argument.

Inherited from `OperationDescriptor`.

#### `OperationDescriptor<TInput, TResult>.InputArgument` property

```cs
public string? InputArgument { get; }
```

The name of the input argument, or null when the operation takes no input.

Inherited from `OperationDescriptor`.

#### `OperationDescriptor<TInput, TResult>.InputRequired` property

```cs
public bool InputRequired { get; }
```

Whether the input argument is required.

Inherited from `OperationDescriptor`.

#### `OperationDescriptor<TInput, TResult>.InputFields` property

```cs
public IReadOnlyList<string> InputFields { get; }
```

The input fields the operation accepts.

Inherited from `OperationDescriptor`.

#### `OperationDescriptor<TInput, TResult>.ContextFields` property

```cs
public IReadOnlyList<ContextField> ContextFields { get; }
```

The request-context fields and how the operation uses them.

Inherited from `OperationDescriptor`.

#### `OperationDescriptor<TInput, TResult>.Idempotency` property

```cs
public string Idempotency { get; }
```

The idempotency class: `safe`, `idempotent` or `permitBound`.

Inherited from `OperationDescriptor`.

#### `OperationDescriptor<TInput, TResult>.Layer` property

```cs
public string Layer { get; }
```

The SDK layer that may call the operation: `client`, `server` or `both`.

Inherited from `OperationDescriptor`.

#### `OperationDescriptor<TInput, TResult>.Pagination` property

```cs
public string Pagination { get; }
```

The pagination style: `none`, `cursor`, `sequence` or `bounded`.

Inherited from `OperationDescriptor`.

#### `OperationDescriptor<TInput, TResult>.ToString` method

```cs
public override string ToString();
```

Returns `Id`.

Returns: The operation ID.

Inherited from `OperationDescriptor`.

### `Operations` class

```cs
public static class Operations
```

Descriptors of the generated GraphQL operations.

#### `Operations.All` static property

```cs
public static readonly IReadOnlyList<OperationDescriptor> All;
```

Every operation descriptor, in schema order.

#### `Operations.ResolveOperation` static method

```cs
public static OperationDescriptor? ResolveOperation(string plane);
```

The operation that resolves a request ID on a plane, or null when the plane has none.

Parameters:

- `plane`: The plane name.

### `Operations.Communication` class

```cs
public static class Operations.Communication
```

Conversations, members, messages, receipts, realtime events and live sessions inside one project.

#### `Operations.Communication.Capabilities` static property

```cs
public static readonly OperationDescriptor<NoInput, CapabilitiesReply> Capabilities;
```

Describe the features, limits and API model the authority supports.

#### `Operations.Communication.Route` static property

```cs
public static readonly OperationDescriptor<NoInput, RouteReply> Route;
```

Return the signed route: project incarnation, serving epoch and realtime endpoint. Call it before other communication operations and again after WRONG_REGION.

#### `Operations.Communication.GetPrincipal` static property

```cs
public static readonly OperationDescriptor<GetPrincipalRequestInput, GetPrincipalReply> GetPrincipal;
```

Read a principal (an application user).

#### `Operations.Communication.GetConversation` static property

```cs
public static readonly OperationDescriptor<GetConversationRequestInput, GetConversationReply> GetConversation;
```

Read a conversation.

#### `Operations.Communication.Members` static property

```cs
public static readonly OperationDescriptor<MembersRequestInput, MembersReply> Members;
```

List the members of a conversation.

#### `Operations.Communication.Messages` static property

```cs
public static readonly OperationDescriptor<MessagesRequestInput, MessagesReply> Messages;
```

List the messages of a conversation, newest first. A backend key reads the full history, or the history visible to the member named by actAsPrincipalId.

#### `Operations.Communication.GetMessage` static property

```cs
public static readonly OperationDescriptor<GetMessageRequestInput, GetMessageReply> GetMessage;
```

Read one message. A backend key reads any message, or reads as the member named by actAsPrincipalId.

#### `Operations.Communication.Inbox` static property

```cs
public static readonly OperationDescriptor<InboxRequestInput, InboxReply> Inbox;
```

List the conversations visible to the calling user. A backend key must name that user with actAsPrincipalId.

#### `Operations.Communication.Search` static property

```cs
public static readonly OperationDescriptor<SearchRequestInput, SearchReply> Search;
```

Search the messages visible to the calling user. A backend key searches as the member named by actAsPrincipalId, or within scope.conversationIds.

#### `Operations.Communication.ResolveRequest` static property

```cs
public static readonly OperationDescriptor<ResolveRequestRequestInput, ResolveRequestReply> ResolveRequest;
```

Look up the stored outcome of an earlier communication mutation by its requestId.

#### `Operations.Communication.GetOperation` static property

```cs
public static readonly OperationDescriptor<GetOperationRequestInput, GetOperationReply> GetOperation;
```

Read the state of a long-running communication operation.

#### `Operations.Communication.ConversationMute` static property

```cs
public static readonly OperationDescriptor<ConversationMuteInput, ConversationMuteReply> ConversationMute;
```

Read whether a member has muted message push notifications for a conversation. A backend key must name the member with actAsPrincipalId.

#### `Operations.Communication.CurrentLiveSession` static property

```cs
public static readonly OperationDescriptor<ConversationLiveInput, CurrentLiveSessionReply> CurrentLiveSession;
```

Return the active live session of a conversation, if any.

#### `Operations.Communication.LiveSession` static property

```cs
public static readonly OperationDescriptor<LiveSessionInput, LiveSessionReply> LiveSession;
```

Read a live session.

#### `Operations.Communication.LiveSessions` static property

```cs
public static readonly OperationDescriptor<LiveSessionsInput, LiveSessionPageReply> LiveSessions;
```

List the live sessions of a conversation.

#### `Operations.Communication.LiveSessionParticipants` static property

```cs
public static readonly OperationDescriptor<LiveParticipantsInput, LiveParticipantPageReply> LiveSessionParticipants;
```

List the participants of a live session.

#### `Operations.Communication.LiveSessionOperation` static property

```cs
public static readonly OperationDescriptor<LiveSessionOperationInput, LiveSessionOperationReply> LiveSessionOperation;
```

Read the state of a live session start or end operation.

#### `Operations.Communication.SessionRequestOutcome` static property

```cs
public static readonly OperationDescriptor<SessionRequestOutcomeRequestInput, SessionRequestOutcomeReply> SessionRequestOutcome;
```

Look up the outcome of an earlier issueSession or renewSession request, including the session it produced.

#### `Operations.Communication.CreatePrincipal` static property

```cs
public static readonly OperationDescriptor<CreatePrincipalRequestInput, CreatePrincipalReply> CreatePrincipal;
```

Create a principal for an application user.

#### `Operations.Communication.DisablePrincipal` static property

```cs
public static readonly OperationDescriptor<DisablePrincipalRequestInput, DisablePrincipalReply> DisablePrincipal;
```

Disable a principal.

#### `Operations.Communication.IssueSession` static property

```cs
public static readonly OperationDescriptor<IssueSessionRequestInput, IssueSessionReply> IssueSession;
```

Issue a short-lived user session token for a principal and device.

#### `Operations.Communication.RenewSession` static property

```cs
public static readonly OperationDescriptor<RenewSessionRequestInput, RenewSessionReply> RenewSession;
```

Renew a user session before it expires.

#### `Operations.Communication.RevokeSession` static property

```cs
public static readonly OperationDescriptor<RevokeSessionRequestInput, RevokeSessionReply> RevokeSession;
```

Revoke a user session.

#### `Operations.Communication.CreateConversation` static property

```cs
public static readonly OperationDescriptor<CreateConversationRequestInput, CreateConversationReply> CreateConversation;
```

Create a conversation with its initial members.

#### `Operations.Communication.UpdateConversation` static property

```cs
public static readonly OperationDescriptor<UpdateConversationRequestInput, UpdateConversationReply> UpdateConversation;
```

Update the title or properties of a conversation.

#### `Operations.Communication.AddMember` static property

```cs
public static readonly OperationDescriptor<AddMemberRequestInput, AddMemberReply> AddMember;
```

Add a member, or change the role of an active member.

#### `Operations.Communication.AddMembers` static property

```cs
public static readonly OperationDescriptor<AddMembersInput, AddMembersPayload> AddMembers;
```

Add several members in one request.

#### `Operations.Communication.RemoveMember` static property

```cs
public static readonly OperationDescriptor<RemoveMemberRequestInput, RemoveMemberReply> RemoveMember;
```

Remove a member from a conversation.

#### `Operations.Communication.HistoryGrant` static property

```cs
public static readonly OperationDescriptor<HistoryGrantRequestInput, HistoryGrantReply> HistoryGrant;
```

Expand the history a member can see to an earlier sequence.

#### `Operations.Communication.SendMessage` static property

```cs
public static readonly OperationDescriptor<SendMessageRequestInput, SendMessageReply> SendMessage;
```

Send a message. A backend key sends as its service principal, or as the member named by actAsPrincipalId.

#### `Operations.Communication.EditMessage` static property

```cs
public static readonly OperationDescriptor<EditMessageRequestInput, EditMessageReply> EditMessage;
```

Edit a message.

#### `Operations.Communication.DeleteMessage` static property

```cs
public static readonly OperationDescriptor<DeleteMessageRequestInput, DeleteMessageReply> DeleteMessage;
```

Delete a message.

#### `Operations.Communication.SetBroadcastPermission` static property

```cs
public static readonly OperationDescriptor<SetBroadcastPermissionInput, SetBroadcastPermissionPayload> SetBroadcastPermission;
```

Allow or deny a member to publish media in live sessions.

#### `Operations.Communication.SetConversationMute` static property

```cs
public static readonly OperationDescriptor<SetConversationMuteInput, SetConversationMutePayload> SetConversationMute;
```

Mute or unmute message push notifications for a member of a conversation, optionally until a time. Calls still ring. A backend key must name the member with actAsPrincipalId.

#### `Operations.Communication.AlertLiveSession` static property

```cs
public static readonly OperationDescriptor<AlertLiveSessionInput, AlertLiveSessionPayload> AlertLiveSession;
```

Alert (ring) conversation members about a live session.

#### `Operations.Communication.EndLiveSession` static property

```cs
public static readonly OperationDescriptor<EndLiveSessionInput, EndLiveSessionPayload> EndLiveSession;
```

End a live session for every participant. Completes asynchronously.

#### `Operations.Communication.RedeemCredential` static property

```cs
public static readonly OperationDescriptor<RedeemCredentialRequestInput, RedeemCredentialReply> RedeemCredential;
```

Redeem a delivered credential with its delivery permit.

#### `Operations.Communication.AcknowledgeCredential` static property

```cs
public static readonly OperationDescriptor<AcknowledgeCredentialRequestInput, AcknowledgeCredentialReply> AcknowledgeCredential;
```

Acknowledge that a redeemed credential is stored, closing the delivery.

### `Operations.Management` class

```cs
public static class Operations.Management
```

Organizations, deployments, projects, backend keys and webhooks.

#### `Operations.Management.Capabilities` static property

```cs
public static readonly OperationDescriptor<NoInput, CapabilitiesReply> Capabilities;
```

Describe the management features and limits the authority supports.

#### `Operations.Management.Organizations` static property

```cs
public static readonly OperationDescriptor<NoInput, OrganizationsReply> Organizations;
```

List the organizations the caller can access.

#### `Operations.Management.GetOrganization` static property

```cs
public static readonly OperationDescriptor<GetOrganizationRequestInput, GetOrganizationReply> GetOrganization;
```

Read an organization.

#### `Operations.Management.GetDeployment` static property

```cs
public static readonly OperationDescriptor<GetDeploymentRequestInput, GetDeploymentReply> GetDeployment;
```

Read a deployment.

#### `Operations.Management.GetProject` static property

```cs
public static readonly OperationDescriptor<GetProjectRequestInput, GetProjectReply> GetProject;
```

Read a project.

#### `Operations.Management.DeploymentHealth` static property

```cs
public static readonly OperationDescriptor<DeploymentHealthRequestInput, DeploymentHealthReply> DeploymentHealth;
```

Read the health of a deployment.

#### `Operations.Management.DeploymentUsage` static property

```cs
public static readonly OperationDescriptor<DeploymentUsageRequestInput, DeploymentUsageReply> DeploymentUsage;
```

Read the metered usage of a deployment, summed over its projects. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days.

#### `Operations.Management.ProjectUsage` static property

```cs
public static readonly OperationDescriptor<ProjectUsageRequestInput, ProjectUsageReply> ProjectUsage;
```

Read the metered usage of a project. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days.

#### `Operations.Management.OrganizationUsage` static property

```cs
public static readonly OperationDescriptor<OrganizationUsageRequestInput, OrganizationUsageReply> OrganizationUsage;
```

Read the metered usage of an organization in any status, summed over its projects. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days.

#### `Operations.Management.OrganizationBilling` static property

```cs
public static readonly OperationDescriptor<OrganizationBillingRequestInput, OrganizationBillingReply> OrganizationBilling;
```

Read the billing state of an organization in any status: the plan whose limits apply, whether ConvoHop bills the organization and, when it does, its standing and subscription.

#### `Operations.Management.WebhookEndpoints` static property

```cs
public static readonly OperationDescriptor<WebhookEndpointsRequestInput, WebhookEndpointsReply> WebhookEndpoints;
```

List the webhook endpoints of a project with their status, signing-secret rotation and delivery health.

#### `Operations.Management.WebhookDeliveries` static property

```cs
public static readonly OperationDescriptor<WebhookDeliveriesRequestInput, WebhookDeliveriesReply> WebhookDeliveries;
```

List recent deliveries of a webhook endpoint.

#### `Operations.Management.ResolveRequest` static property

```cs
public static readonly OperationDescriptor<ResolveRequestRequestInput, ResolveRequestReply> ResolveRequest;
```

Look up the stored outcome of an earlier management mutation by its requestId.

#### `Operations.Management.GetOperation` static property

```cs
public static readonly OperationDescriptor<GetOperationRequestInput, GetOperationReply> GetOperation;
```

Read the state of a long-running management operation.

#### `Operations.Management.CreateOrganization` static property

```cs
public static readonly OperationDescriptor<CreateOrganizationRequestInput, CreateOrganizationReply> CreateOrganization;
```

Create an organization.

#### `Operations.Management.CreateDeployment` static property

```cs
public static readonly OperationDescriptor<CreateDeploymentRequestInput, CreateDeploymentReply> CreateDeployment;
```

Create a deployment in an organization. Completes asynchronously.

#### `Operations.Management.CreateProject` static property

```cs
public static readonly OperationDescriptor<CreateProjectRequestInput, CreateProjectReply> CreateProject;
```

Create a project in a ready deployment. Completes asynchronously.

#### `Operations.Management.IssueBackendKey` static property

```cs
public static readonly OperationDescriptor<IssueBackendKeyRequestInput, IssueBackendKeyReply> IssueBackendKey;
```

Issue a scoped backend key. The secret is delivered once through a credential delivery.

#### `Operations.Management.RevokeBackendKey` static property

```cs
public static readonly OperationDescriptor<RevokeBackendKeyRequestInput, RevokeBackendKeyReply> RevokeBackendKey;
```

Revoke a backend key, optionally revoking the sessions it issued.

#### `Operations.Management.ProjectPolicy` static property

```cs
public static readonly OperationDescriptor<ProjectPolicyRequestInput, ProjectPolicyReply> ProjectPolicy;
```

Change the policy of a project.

#### `Operations.Management.CredentialPermit` static property

```cs
public static readonly OperationDescriptor<CredentialPermitRequestInput, CredentialPermitReply> CredentialPermit;
```

Issue a signed permit that authorizes redeeming one credential delivery.

#### `Operations.Management.PauseOperation` static property

```cs
public static readonly OperationDescriptor<PauseOperationRequestInput, PauseOperationReply> PauseOperation;
```

Pause a long-running operation.

#### `Operations.Management.ResumeOperation` static property

```cs
public static readonly OperationDescriptor<ResumeOperationRequestInput, ResumeOperationReply> ResumeOperation;
```

Resume a paused operation.

#### `Operations.Management.CreateBillingCheckoutSession` static property

```cs
public static readonly OperationDescriptor<CreateBillingCheckoutSessionRequestInput, CreateBillingCheckoutSessionReply> CreateBillingCheckoutSession;
```

Create a hosted checkout link that subscribes an active organization to a self-service plan. The link grants access to whoever holds it; a retry with the same requestId returns the same link until it expires.

#### `Operations.Management.CreateBillingPortalSession` static property

```cs
public static readonly OperationDescriptor<CreateBillingPortalSessionRequestInput, CreateBillingPortalSessionReply> CreateBillingPortalSession;
```

Create a hosted billing portal link where an organization manages its payment methods, invoices and subscription. The link grants access to whoever holds it; a retry with the same requestId returns the same link until it expires.

#### `Operations.Management.ConfigureWebhook` static property

```cs
public static readonly OperationDescriptor<ConfigureWebhookRequestInput, ConfigureWebhookReply> ConfigureWebhook;
```

Create a webhook endpoint for project events. The signing secret is delivered once through a credential delivery.

#### `Operations.Management.UpdateWebhook` static property

```cs
public static readonly OperationDescriptor<UpdateWebhookRequestInput, UpdateWebhookReply> UpdateWebhook;
```

Change the event types of a webhook endpoint, or enable or disable it.

#### `Operations.Management.RotateWebhookSecret` static property

```cs
public static readonly OperationDescriptor<RotateWebhookSecretRequestInput, RotateWebhookSecretReply> RotateWebhookSecret;
```

Start rotating the signing secret of a webhook endpoint. The next secret is delivered once through a credential delivery.

#### `Operations.Management.DisableWebhook` static property

```cs
public static readonly OperationDescriptor<DisableWebhookRequestInput, DisableWebhookReply> DisableWebhook;
```

Disable a webhook endpoint.

#### `Operations.Management.ReplayWebhookDeliveries` static property

```cs
public static readonly OperationDescriptor<ReplayWebhookDeliveriesRequestInput, ReplayWebhookDeliveriesReply> ReplayWebhookDeliveries;
```

Redeliver one webhook delivery, or the deliveries of an endpoint in a time range, with their original event IDs.

### `ProjectOptions` class

```cs
public sealed class ProjectOptions
```

The environment and backend principal of a hosted project.

#### `ProjectOptions` constructor

```cs
public ProjectOptions();
```

#### `ProjectOptions.Environment` property

```cs
public string Environment { get; set; }
```

The environment name, for example `production`.

#### `ProjectOptions.BackendPrincipalName` property

```cs
public string BackendPrincipalName { get; set; }
```

The name of the project's backend principal.

### `ProjectServerClient` class

```cs
public sealed class ProjectServerClient
```

Backend-key client for one project. Use it only in trusted server code; never ship a backend key to a browser or a mobile app.

Every backend-key operation has a typed method here; the package README lists each method with the scope it needs. A key without that scope fails with `ScopeRequiredException`. The helpers check that each result names the resource the request did; `Communication` reaches every backend communication operation in the schema without those checks. Message reads and sends accept `actAs` to act as a member principal; the inbox requires it. Handles from `Conversation`, `LiveSession` and `LiveOperation` send nothing until a method is called.

Instances are thread-safe. Mutations accept a `requestId`: after an outcome of `unknown`, resolve or retry that request ID through `Requests`, or call the method again with the same ID and payload. Never send the change again under a new ID.

#### `ProjectServerClient` constructor

```cs
public ProjectServerClient(ProjectServerClientOptions options);
```

Creates a client. Construction sends no request.

Parameters:

- `options`: The client options.

Exceptions:

- `ArgumentException`: An option is invalid. The message never contains the backend key.

#### `ProjectServerClient.ProjectId` property

```cs
public string ProjectId { get; }
```

The project ID.

#### `ProjectServerClient.Transport` property

```cs
public ConvoHopTransport Transport { get; }
```

The transport, for operations without a typed method and for recovery records.

#### `ProjectServerClient.Communication` property

```cs
public CommunicationApi Communication { get; }
```

Every backend communication query and mutation in the schema for this project, with the generated inputs and replies, and the cursor-paginated queries as page sequences. Unlike the helpers, it does not check that a result names the resource the request did.

#### `ProjectServerClient.Conversations` property

```cs
public ServerConversations Conversations { get; }
```

Creates conversations (`conversationManage`).

#### `ProjectServerClient.Principals` property

```cs
public ServerPrincipals Principals { get; }
```

Creates, reads and disables principals, the project's application users.

#### `ProjectServerClient.Sessions` property

```cs
public ServerSessions Sessions { get; }
```

Issues, renews and revokes user sessions.

#### `ProjectServerClient.Requests` property

```cs
public ServerRequests Requests { get; }
```

Resolves and retries mutations whose outcome is uncertain.

#### `ProjectServerClient.Conversation` method

```cs
public ServerConversation Conversation(string conversationId);
```

Returns a handle for one conversation. Creating the handle sends no request.

Parameters:

- `conversationId`: The conversation ID.

Returns: The conversation handle.

Exceptions:

- `ArgumentException`: The ID is not a canonical UUID.

#### `ProjectServerClient.LiveSession` method

```cs
public ServerLiveSession LiveSession(string liveSessionId);
```

Returns a handle for one live session. Creating the handle sends no request.

Parameters:

- `liveSessionId`: The live session ID.

Returns: The live session handle.

Exceptions:

- `ArgumentException`: The ID is not a canonical UUID.

#### `ProjectServerClient.LiveOperation` method

```cs
public ServerLiveOperation LiveOperation(string operationId);
```

Reattaches to a live start or end operation by ID, for example after a restart or a `RESOLUTION_REQUIRED` timeout. Creating the handle sends no request.

Parameters:

- `operationId`: The live operation ID.

Returns: The live operation handle.

Exceptions:

- `ArgumentException`: The ID is not a canonical UUID.

#### `ProjectServerClient.InitializeAsync` method

```cs
public Task InitializeAsync(CancellationToken cancellationToken = default);
```

Reads the project route and stores its serving epoch on `Transport`, so later requests carry it. Call it at startup and again after `WRONG_REGION`.

Parameters:

- `cancellationToken`: Stops waiting for the read.

Returns: A task that completes when the route is stored.

Exceptions:

- `InvalidOperationException`: The route names another project or incarnation. Recover explicitly; do not rebind recovery records.
- `ConvoHopException`: The read failed or its response was malformed.

Sends [`communication.route`](../../operations/communication/route.md).

#### `ProjectServerClient.GetCapabilitiesAsync` method

```cs
public Task<Capabilities> GetCapabilitiesAsync(CancellationToken cancellationToken = default);
```

Describes the features, limits and API model the authority supports.

Parameters:

- `cancellationToken`: Stops waiting for the read.

Returns: The capabilities.

Exceptions:

- `ConvoHopException`: The read failed or its response was malformed.

Sends [`communication.capabilities`](../../operations/communication/capabilities.md).

#### `ProjectServerClient.GetOperationAsync` method

```cs
public Task<Operation> GetOperationAsync(string operationId, CancellationToken cancellationToken = default);
```

Reads an accepted operation's progress.

Parameters:

- `operationId`: The operation ID.
- `cancellationToken`: Stops waiting for the read.

Returns: The operation.

Exceptions:

- `ArgumentException`: The ID is not a canonical UUID.
- `ConvoHopException`: The read failed or its response was malformed.

Sends [`communication.getOperation`](../../operations/communication/getOperation.md).

#### `ProjectServerClient.GetInboxAsync` method

```cs
public Task<InboxPage> GetInboxAsync(string actAs, int? limit = null, string? cursor = null, CancellationToken cancellationToken = default);
```

Lists the conversations visible to a member, as that member's inbox (`messageRead`; audited).

Parameters:

- `actAs`: The member principal whose inbox to read.
- `limit`: The page size, 1 to 100. Defaults to 100.
- `cursor`: The `NextCursor` of the previous page.
- `cancellationToken`: Stops waiting for the read.

Returns: The inbox page.

Exceptions:

- `ArgumentException`: An argument is invalid.
- `ConvoHopException`: The read failed or its response was malformed.

Sends [`communication.inbox`](../../operations/communication/inbox.md).

#### `ProjectServerClient.SearchAsync` method

```cs
public Task<SearchPage> SearchAsync(string query, string? actAs = null, IReadOnlyList<string>? conversationIds = null, int? limit = null, string? cursor = null, CancellationToken cancellationToken = default);
```

Searches messages (`messageRead`) as the `actAs` member, or within `conversationIds` with the backend's own visibility. Pass at least one of them.

Parameters:

- `query`: The search text.
- `actAs`: The member principal to search as.
- `conversationIds`: The conversations to search, at least one.
- `limit`: The page size, 1 to 100. Defaults to 100.
- `cursor`: The `NextCursor` of the previous page.
- `cancellationToken`: Stops waiting for the read.

Returns: The search page. Every hit carries its message.

Exceptions:

- `ArgumentException`: An argument is invalid.
- `ConvoHopException`: The read failed or its response was malformed.

Sends [`communication.search`](../../operations/communication/search.md).

### `ProjectServerClientOptions` class

```cs
public sealed class ProjectServerClientOptions
```

Options for `ProjectServerClient`.

#### `ProjectServerClientOptions` constructor

```cs
public ProjectServerClientOptions();
```

#### `ProjectServerClientOptions.BaseUrl` property

```cs
public string BaseUrl { get; set; }
```

The authority origin: HTTPS, or explicit loopback HTTP for local development. Requests go to `{BaseUrl}/graphql`.

#### `ProjectServerClientOptions.ProjectId` property

```cs
public string ProjectId { get; set; }
```

The project ID, a canonical UUID.

#### `ProjectServerClientOptions.BackendKey` property

```cs
public string BackendKey { get; set; }
```

The secret backend key. Keep it in trusted server configuration; never send it to a browser or a mobile app, and never log it.

#### `ProjectServerClientOptions.Incarnation` property

```cs
public string Incarnation { get; set; }
```

The project incarnation the client is bound to, a canonical UUID.

#### `ProjectServerClientOptions.RecoveryStorage` property

```cs
public IRecoveryStorage? RecoveryStorage { get; set; }
```

Durable storage for mutation recovery records, so an uncertain mutation can be resolved after a restart. The records never contain the backend key.

#### `ProjectServerClientOptions.HttpClient` property

```cs
public HttpClient? HttpClient { get; set; }
```

The HTTP client to send requests with, for example one from `IHttpClientFactory`. It must not follow redirects or add credentials of its own. Null uses a shared client that never follows redirects or stores cookies.

#### `ProjectServerClientOptions.TimeProvider` property

```cs
public TimeProvider? TimeProvider { get; set; }
```

The clock for timeouts, retry budgets and polling. Defaults to `TimeProvider.System`.

### `PushData` class

```cs
public sealed class PushData
```

The `convohop` metadata every payload carries for your app: the event's fields without `subjectRef`, `connected` and `preview`. APNs VoIP, FCM and Web Push payloads also carry the visible title and body here, because they have no visible alert of their own.

#### `PushData.EventId` property

```cs
public string EventId { get; }
```

The event's ID.

#### `PushData.EventType` property

```cs
public string EventType { get; }
```

The event's type, such as `WebhookEventTypes.NotificationMessage`.

#### `PushData.OccurredAt` property

```cs
public string OccurredAt { get; }
```

When the event happened (RFC 3339).

#### `PushData.ProjectId` property

```cs
public string ProjectId { get; }
```

The project's ID.

#### `PushData.RecipientId` property

```cs
public string RecipientId { get; }
```

The principal to notify.

#### `PushData.ConversationId` property

```cs
public string ConversationId { get; }
```

The conversation's ID.

#### `PushData.SenderId` property

```cs
public string SenderId { get; }
```

The principal who sent the message or started the ringing.

#### `PushData.MessageId` property

```cs
public string? MessageId { get; }
```

Messages: the message's ID.

#### `PushData.LiveSessionId` property

```cs
public string? LiveSessionId { get; }
```

Calls and cancellations: the live session's ID.

#### `PushData.AlertId` property

```cs
public string? AlertId { get; }
```

Calls and cancellations: the ring's ID.

#### `PushData.ExpiresAt` property

```cs
public string? ExpiresAt { get; }
```

Calls and cancellations: when the ringing stops (RFC 3339).

#### `PushData.MediaProfile` property

```cs
public string? MediaProfile { get; }
```

Calls and cancellations: the call's media profile.

#### `PushData.Reason` property

```cs
public string? Reason { get; }
```

Cancellations: why the ring stopped.

#### `PushData.Title` property

```cs
public string? Title { get; }
```

APNs VoIP, FCM and Web Push: the visible title, possibly shortened to fit.

#### `PushData.Body` property

```cs
public string? Body { get; }
```

APNs VoIP, FCM and Web Push: the visible body, possibly shortened to fit.

#### `PushData.ToJson` method

```cs
public string ToJson();
```

The compact JSON your app receives, with the fields in the contract's order.

Returns: The JSON text.

### `PushOptions` class

```cs
public class PushOptions
```

Options for `PushPayloads`.

#### `PushOptions` constructor

```cs
public PushOptions();
```

#### `PushOptions.Title` property

```cs
public string? Title { get; set; }
```

The visible title, such as the sender's or conversation's name. Omitted when null or empty.

#### `PushOptions.Body` property

```cs
public string? Body { get; set; }
```

The visible body. Replaces the message preview. Omitted when null or empty.

#### `PushOptions.Preview` property

```cs
public bool Preview { get; set; }
```

Whether a message event's preview becomes the body when `Body` is empty. Defaults to `true`.

#### `PushOptions.Now` property

```cs
public DateTimeOffset? Now { get; set; }
```

The clock for the TTL and expiration. Defaults to the current time.

### `PushPayloadException` class

```cs
public sealed class PushPayloadException : Exception
```

A push payload that couldn't be built. The message names the field but never contains its value.

#### `PushPayloadException` constructor

```cs
public PushPayloadException(PushPayloadCode code, string message);
```

Creates the exception.

Parameters:

- `code`: Why the payload couldn't be built.
- `message`: The human-readable message.

#### `PushPayloadException.Code` property

```cs
public PushPayloadCode Code { get; }
```

Why the payload couldn't be built.

### `PushPayloads` class

```cs
public static class PushPayloads
```

Builds provider requests from per-recipient notification events (`notification.message`, `notification.call` and `notification.callCancelled`), as `Webhooks.Verify` returns them. Each builder validates its options and then the event, throwing `PushPayloadException`, and returns `null` when the event doesn't apply to the platform or is stale. Payloads are metadata-only unless you pass a title or body, or the event carries an opted-in message preview. The contract is `spec/push-payload/`.

The builders are pure functions: they send nothing and hold no credentials. Your push library sends the requests and owns APNs and FCM authentication and Web Push encryption. Builders that take a `JsonElement` validate an event's JSON, such as one your webhook handler queued, against the contract; fields it doesn't define are ignored.

#### `PushPayloads.ApnsAlert` static method

```cs
public static ApnsAlertRequest? ApnsAlert(WebhookNotificationEvent notification, ApnsPushOptions options);
public static ApnsAlertRequest? ApnsAlert(JsonElement notification, ApnsPushOptions options);
```

An APNs alert for a message, an incoming call, or a missed call (a cancellation with reason `ended` or `expired`). At most 4096 bytes.

Parameters:

- `notification` (`WebhookNotificationEvent`): The notification event.
- `notification` (`JsonElement`): The notification event's JSON.
- `options`: The app's bundle ID and the visible text.

Returns: The request, or `null` for other cancellations and stale events.

Exceptions:

- `PushPayloadException`: The options are invalid.
- `PushPayloadException`: The options or the event are invalid.

#### `PushPayloads.ApnsVoip` static method

```cs
public static ApnsVoipRequest? ApnsVoip(WebhookNotificationEvent notification, ApnsPushOptions options);
public static ApnsVoipRequest? ApnsVoip(JsonElement notification, ApnsPushOptions options);
```

An APNs VoIP push for an incoming call. iOS requires you to report every VoIP push to CallKit as a call. At most 5120 bytes.

Parameters:

- `notification` (`WebhookNotificationEvent`): The notification event.
- `notification` (`JsonElement`): The notification event's JSON.
- `options`: The app's bundle ID and the visible text.

Returns: The request, or `null` for other events and stale calls.

Exceptions:

- `PushPayloadException`: The options are invalid.
- `PushPayloadException`: The options or the event are invalid.

#### `PushPayloads.Fcm` static method

```cs
public static FcmRequest? Fcm(WebhookNotificationEvent notification, PushOptions? options = null);
public static FcmRequest? Fcm(JsonElement notification, PushOptions? options = null);
```

An FCM data message for any notification event. At most 4096 bytes of `data` as JSON.

Parameters:

- `notification` (`WebhookNotificationEvent`): The notification event.
- `notification` (`JsonElement`): The notification event's JSON.
- `options`: The visible text, preview choice and clock.

Returns: The request, or `null` for stale events.

Exceptions:

- `PushPayloadException`: The options are invalid.
- `PushPayloadException`: The options or the event are invalid.

#### `PushPayloads.WebPush` static method

```cs
public static WebPushRequest? WebPush(WebhookNotificationEvent notification, PushOptions? options = null);
public static WebPushRequest? WebPush(JsonElement notification, PushOptions? options = null);
```

A Web Push message for any notification event. At most 3993 bytes, the RFC 8291 plaintext limit.

Parameters:

- `notification` (`WebhookNotificationEvent`): The notification event.
- `notification` (`JsonElement`): The notification event's JSON.
- `options`: The visible text, preview choice and clock.

Returns: The request, or `null` for stale events.

Exceptions:

- `PushPayloadException`: The options are invalid.
- `PushPayloadException`: The options or the event are invalid.

### `RecoveryState` class

```cs
public sealed class RecoveryState
```

A snapshot of one mutation recovery record: the original request identity, payload and attempt budget. Use it to resolve or retry the original request after an uncertain outcome; never invent a replacement request ID.

#### `RecoveryState.RequestId` property

```cs
public string RequestId { get; }
```

The original request ID.

#### `RecoveryState.Incarnation` property

```cs
public string Incarnation { get; }
```

The project incarnation the request belongs to, or `management`.

#### `RecoveryState.PayloadFingerprint` property

```cs
public string PayloadFingerprint { get; }
```

The `sha256:` fingerprint of the operation, project and canonical input.

#### `RecoveryState.Operation` property

```cs
public string Operation { get; }
```

The generated operation ID, for example `communication.sendMessage`.

#### `RecoveryState.ProjectId` property

```cs
public string? ProjectId { get; }
```

The project of a communication request; null for management requests.

#### `RecoveryState.Input` property

```cs
public JsonElement Input { get; }
```

The original operation input.

#### `RecoveryState.FirstSubmittedAt` property

```cs
public long FirstSubmittedAt { get; }
```

When the request was first recorded, in Unix milliseconds.

#### `RecoveryState.RetryDeadline` property

```cs
public long RetryDeadline { get; }
```

The last moment a resend is allowed, in Unix milliseconds.

#### `RecoveryState.AttemptCount` property

```cs
public long AttemptCount { get; }
```

How many times the request was submitted.

#### `RecoveryState.LastAttemptAt` property

```cs
public long LastAttemptAt { get; }
```

When the request was last submitted, in Unix milliseconds.

#### `RecoveryState.LastAttemptClassification` property

```cs
public string LastAttemptClassification { get; }
```

How the last attempt ended: `notSubmitted`, `submitted`, `authorityReceipt`, an error code, or `opaqueTransportFailure`.

#### `RecoveryState.ResolutionState` property

```cs
public string ResolutionState { get; }
```

What is known about the outcome: `pending`, `unknown`, `committed` or `accepted`.

#### `RecoveryState.MediaAdmissionAttempted` property

```cs
public bool MediaAdmissionAttempted { get; }
```

Whether a native media admission was attempted with the credentials this request issued.

### `ScopeRequiredException` class

```cs
public sealed class ScopeRequiredException : ConvoHopException
```

`SCOPE_REQUIRED`: the backend key lacks a scope the operation requires (403, rejected, not retryable). Classify it by `Code`; `Scope` is a diagnostic detail.

#### `ScopeRequiredException` constructor

```cs
public ScopeRequiredException(string requestId, string outcome, int status, string message, TimeSpan? retryAfter = null);
```

Creates the exception.

Parameters:

- `requestId`: The request ID the failure belongs to.
- `outcome`: What is known about the request outcome.
- `status`: The HTTP-style status.
- `message`: The authority message.
- `retryAfter`: How long to wait before resending, if sent.

Exceptions:

- `ArgumentOutOfRangeException`: `retryAfter` is negative.

#### `ScopeRequiredException.Scope` property

```cs
public string? Scope { get; }
```

The missing scope, or null when the message does not use the documented wording. A missing read scope is reported as the read scope even where its manage scope would also satisfy the operation.

#### `ScopeRequiredException.Code` property

```cs
public string Code { get; }
```

The stable machine-readable error code.

Inherited from `ConvoHopException`.

#### `ScopeRequiredException.RequestId` property

```cs
public string RequestId { get; }
```

The request ID the failure belongs to.

Inherited from `ConvoHopException`.

#### `ScopeRequiredException.Outcome` property

```cs
public string Outcome { get; }
```

What is known about the outcome: `rejected`, `unknown`, `committed` or `accepted`.

Inherited from `ConvoHopException`.

#### `ScopeRequiredException.Status` property

```cs
public int Status { get; }
```

The HTTP-style status, or 0 when no authority response was observed.

Inherited from `ConvoHopException`.

#### `ScopeRequiredException.RetryAfter` property

```cs
public TimeSpan? RetryAfter { get; }
```

How long to wait before resending the same request, when the authority sent a delay (for example with `RATE_LIMITED`). Read in whole seconds from the error's `extensions.retryAfter`, else from an HTTP `Retry-After` delay in seconds. A delay longer than `TimeSpan.MaxValue` is reported as `TimeSpan.MaxValue`. The SDK never waits or resends on its own because of it.

Inherited from `ConvoHopException`.

### `ServerConversation` class

```cs
public sealed class ServerConversation
```

Backend view of one conversation. Creating the handle sends no request; each method needs the scope named in its documentation. Message reads and sends accept `actAs` to act as a member principal.

#### `ServerConversation.Client` property

```cs
public ProjectServerClient Client { get; }
```

The client this handle sends requests with.

#### `ServerConversation.ConversationId` property

```cs
public string ConversationId { get; }
```

The conversation ID.

#### `ServerConversation.Messages` property

```cs
public ServerMessages Messages { get; }
```

Lists, reads, sends, edits and deletes messages.

#### `ServerConversation.Members` property

```cs
public ServerMembers Members { get; }
```

Lists and manages members, history grants, broadcast permissions and mutes.

#### `ServerConversation.Live` property

```cs
public ServerConversationLive Live { get; }
```

Reads the conversation's live sessions.

#### `ServerConversation.GetAsync` method

```cs
public Task<Conversation> GetAsync(CancellationToken cancellationToken = default);
```

Reads the conversation (`conversationManage`).

Parameters:

- `cancellationToken`: Stops waiting for the read.

Returns: The conversation.

Exceptions:

- `ConvoHopException`: The read failed or its response was malformed.

Sends [`communication.getConversation`](../../operations/communication/getConversation.md).

#### `ServerConversation.UpdateAsync` method

```cs
public Task<Conversation> UpdateAsync(string expectedRevision, string? title = null, JsonElement? props = null, string? requestId = null, CancellationToken cancellationToken = default);
```

Updates the title or properties (`conversationManage`).

Parameters:

- `expectedRevision`: The conversation revision you observed.
- `title`: The new title, or null to keep it.
- `props`: The new properties object, or null to keep them.
- `requestId`: The request ID; pass the original ID to resume after an uncertain outcome.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The updated conversation.

Exceptions:

- `ArgumentException`: An argument is invalid.
- `ConvoHopException`: The request failed, or its outcome is uncertain.

Sends [`communication.updateConversation`](../../operations/communication/updateConversation.md).

### `ServerConversationLive` class

```cs
public sealed class ServerConversationLive
```

Live sessions of one conversation (`callRead` or `callManage`).

#### `ServerConversationLive.GetCurrentAsync` method

```cs
public Task<LiveSession?> GetCurrentAsync(CancellationToken cancellationToken = default);
```

Reads the conversation's current live session.

Parameters:

- `cancellationToken`: Stops waiting for the read.

Returns: The live session, or null when none is live.

Exceptions:

- `ConvoHopException`: The read failed or its response was malformed.

Sends [`communication.currentLiveSession`](../../operations/communication/currentLiveSession.md).

#### `ServerConversationLive.ListHistoryAsync` method

```cs
public Task<LiveSessionPage> ListHistoryAsync(int? limit = null, string? cursor = null, CancellationToken cancellationToken = default);
```

Lists the conversation's live sessions, newest first.

Parameters:

- `limit`: The page size, 1 to 100, or null for the authority's default.
- `cursor`: The `LiveSessionPage.NextCursor` of the previous page.
- `cancellationToken`: Stops waiting for the read.

Returns: The live session page.

Exceptions:

- `ArgumentException`: An argument is invalid.
- `ConvoHopException`: The read failed or its response was malformed.

Sends [`communication.liveSessions`](../../operations/communication/liveSessions.md).

### `ServerConversations` class

```cs
public sealed class ServerConversations
```

Creates conversations (`conversationManage`).

#### `ServerConversations.CreateAsync` method

```cs
public Task<Conversation> CreateAsync(CreateConversationRequestInput input, string? requestId = null, CancellationToken cancellationToken = default);
```

Creates a conversation with its initial members.

Parameters:

- `input`: The title, properties and initial members.
- `requestId`: The request ID; pass the original ID to resume after an uncertain outcome.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The conversation.

Exceptions:

- `ConvoHopException`: The request failed, or its outcome is uncertain.

Sends [`communication.createConversation`](../../operations/communication/createConversation.md).

### `ServerLiveOperation` class

```cs
public sealed class ServerLiveOperation
```

A live start or end operation. The first read locks its live session and kind; later reads must match. Instances are thread-safe.

#### `ServerLiveOperation.Client` property

```cs
public ProjectServerClient Client { get; }
```

The client this handle sends requests with.

#### `ServerLiveOperation.OperationId` property

```cs
public string OperationId { get; }
```

The live operation ID.

#### `ServerLiveOperation.Receipt` property

```cs
public EndLiveSessionPayload? Receipt { get; }
```

The end receipt when this handle came from `ServerLiveSession.EndAsync`; otherwise null.

#### `ServerLiveOperation.GetAsync` method

```cs
public Task<LiveSessionOperation> GetAsync(CancellationToken cancellationToken = default);
```

Reads the operation (`callRead` or `callManage`).

Parameters:

- `cancellationToken`: Stops waiting for the read.

Returns: The operation.

Exceptions:

- `ConvoHopException`: The read failed, or its response was malformed or names another live session or kind (`INVALID_RESPONSE`).

Sends [`communication.liveSessionOperation`](../../operations/communication/liveSessionOperation.md).

#### `ServerLiveOperation.WaitForCompletionAsync` method

```cs
public Task<LiveSessionOperationCompletion> WaitForCompletionAsync(TimeSpan? timeout = null, CancellationToken cancellationToken = default);
```

Polls every 500 ms until the operation completes. An end completion must carry an enforced media cutoff.

Parameters:

- `timeout`: How long to poll, from 1 ms to 300000 ms. Defaults to 45 seconds.
- `cancellationToken`: Stops polling; the operation itself continues.

Returns: The completion.

Exceptions:

- `ArgumentOutOfRangeException`: The timeout is out of range.
- `ConvoHopException`: The operation failed, with its live error code and outcome `accepted`; or the deadline passed, with `RESOLUTION_REQUIRED`, which is not a cutoff (keep the operation ID and query it again); or a response was malformed (`INVALID_RESPONSE`).

Sends [`communication.liveSessionOperation`](../../operations/communication/liveSessionOperation.md).

### `ServerLiveSession` class

```cs
public sealed class ServerLiveSession
```

Backend view of one live session (`callRead` or `callManage` to read; `callManage` to alert or end). Creating the handle sends no request. Mutations take the generation and revision you observed, so a retry with the same `requestId` resends the original payload.

#### `ServerLiveSession.Client` property

```cs
public ProjectServerClient Client { get; }
```

The client this handle sends requests with.

#### `ServerLiveSession.LiveSessionId` property

```cs
public string LiveSessionId { get; }
```

The live session ID.

#### `ServerLiveSession.GetAsync` method

```cs
public Task<LiveSession> GetAsync(CancellationToken cancellationToken = default);
```

Reads the live session.

Parameters:

- `cancellationToken`: Stops waiting for the read.

Returns: The live session.

Exceptions:

- `ConvoHopException`: The read failed or its response was malformed.

Sends [`communication.liveSession`](../../operations/communication/liveSession.md).

#### `ServerLiveSession.ListParticipantsAsync` method

```cs
public Task<LiveParticipantPage> ListParticipantsAsync(int? limit = null, string? cursor = null, CancellationToken cancellationToken = default);
```

Lists the live session's participants.

Parameters:

- `limit`: The page size, 1 to 100, or null for the authority's default.
- `cursor`: The `LiveParticipantPage.NextCursor` of the previous page.
- `cancellationToken`: Stops waiting for the read.

Returns: The participant page.

Exceptions:

- `ArgumentException`: An argument is invalid.
- `ConvoHopException`: The read failed or its response was malformed.

Sends [`communication.liveSessionParticipants`](../../operations/communication/liveSessionParticipants.md).

#### `ServerLiveSession.AlertAsync` method

```cs
public Task<LiveAlertBatch> AlertAsync(string expectedGeneration, IReadOnlyList<string> principalIds, string? requestId = null, CancellationToken cancellationToken = default);
```

Alerts principals to the live session, ringing their devices (`callManage`).

Parameters:

- `expectedGeneration`: The live session generation you observed.
- `principalIds`: The principals to alert.
- `requestId`: The request ID; pass the original ID to resume after an uncertain outcome.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: How many alerts were created and how many were suppressed.

Exceptions:

- `ArgumentException`: An argument is invalid.
- `ConvoHopException`: The request failed, or its outcome is uncertain.

Sends [`communication.alertLiveSession`](../../operations/communication/alertLiveSession.md).

#### `ServerLiveSession.EndAsync` method

```cs
public Task<ServerLiveOperation> EndAsync(string expectedGeneration, string expectedRevision, string? requestId = null, CancellationToken cancellationToken = default);
```

Requests the end (`callManage`). The returned operation completes once the authority has enforced the media cutoff; await `ServerLiveOperation.WaitForCompletionAsync`.

Parameters:

- `expectedGeneration`: The live session generation you observed.
- `expectedRevision`: The live session revision you observed.
- `requestId`: The request ID; pass the original ID to resume after an uncertain outcome.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The end operation, with the commit receipt in `ServerLiveOperation.Receipt`.

Exceptions:

- `ArgumentException`: An argument is invalid.
- `ConvoHopException`: The request failed, or its outcome is uncertain.

Sends [`communication.endLiveSession`](../../operations/communication/endLiveSession.md).

### `ServerMembers` class

```cs
public sealed class ServerMembers
```

Members of one conversation: membership, history grants, broadcast permissions and mutes.

#### `ServerMembers.ListAsync` method

```cs
public Task<MemberPage> ListAsync(int? limit = null, string? cursor = null, CancellationToken cancellationToken = default);
```

Lists members (`membershipManage`).

Parameters:

- `limit`: The page size, 1 to 100. Defaults to 100.
- `cursor`: The `MemberPage.NextCursor` of the previous page.
- `cancellationToken`: Stops waiting for the read.

Returns: The member page.

Exceptions:

- `ArgumentException`: An argument is invalid.
- `ConvoHopException`: The read failed or its response was malformed.

Sends [`communication.members`](../../operations/communication/members.md).

#### `ServerMembers.AddAsync` method

```cs
public Task<Member> AddAsync(string principalId, string role, string expectedRevision, string? requestId = null, CancellationToken cancellationToken = default);
```

Adds a member, or changes a member's role (`membershipManage`).

Parameters:

- `principalId`: The principal ID.
- `role`: `member` or `moderator`.
- `expectedRevision`: The membership revision you observed; `0` when the principal was never a member.
- `requestId`: The request ID; pass the original ID to resume after an uncertain outcome.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The membership.

Exceptions:

- `ArgumentException`: An argument is invalid.
- `ConvoHopException`: The request failed, or its outcome is uncertain.

Sends [`communication.addMember`](../../operations/communication/addMember.md).

#### `ServerMembers.AddBatchAsync` method

```cs
public Task<IReadOnlyList<Member>> AddBatchAsync(IReadOnlyList<MemberBatchEntryInput> members, string? requestId = null, CancellationToken cancellationToken = default);
```

Adds 1 to 100 distinct principals in one atomic batch (`membershipManage`).

Parameters:

- `members`: The principals, roles and the membership revisions you observed.
- `requestId`: The request ID; pass the original ID to resume after an uncertain outcome.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The memberships, one per entry.

Exceptions:

- `ArgumentException`: An argument is invalid.
- `ConvoHopException`: The request failed, or its outcome is uncertain.

Sends [`communication.addMembers`](../../operations/communication/addMembers.md).

#### `ServerMembers.RemoveAsync` method

```cs
public Task<Member> RemoveAsync(string principalId, string expectedRevision, string? requestId = null, CancellationToken cancellationToken = default);
```

Removes a member (`membershipManage`).

Parameters:

- `principalId`: The principal ID.
- `expectedRevision`: The membership revision you observed.
- `requestId`: The request ID; pass the original ID to resume after an uncertain outcome.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The ended membership.

Exceptions:

- `ArgumentException`: An argument is invalid.
- `ConvoHopException`: The request failed, or its outcome is uncertain.

Sends [`communication.removeMember`](../../operations/communication/removeMember.md).

#### `ServerMembers.GrantHistoryAsync` method

```cs
public Task<Member> GrantHistoryAsync(string principalId, string membershipEpoch, string expectedRevision, string fromSequence, string? requestId = null, CancellationToken cancellationToken = default);
```

Lets a member read history from an earlier sequence (`historyManage`).

Parameters:

- `principalId`: The principal ID.
- `membershipEpoch`: The membership epoch you observed.
- `expectedRevision`: The membership revision you observed.
- `fromSequence`: The first sequence the member may read.
- `requestId`: The request ID; pass the original ID to resume after an uncertain outcome.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The membership with its new visibility.

Exceptions:

- `ArgumentException`: An argument is invalid.
- `ConvoHopException`: The request failed, or its outcome is uncertain.

Sends [`communication.historyGrant`](../../operations/communication/historyGrant.md).

#### `ServerMembers.SetBroadcastPermissionAsync` method

```cs
public Task<SetBroadcastPermissionPayload> SetBroadcastPermissionAsync(string principalId, bool allowed, string expectedMembershipRevision, string? requestId = null, CancellationToken cancellationToken = default);
```

Allows or denies a member starting broadcasts (`membershipManage`). Denying cuts off the member's live broadcast; the payload carries that media cutoff.

Parameters:

- `principalId`: The principal ID.
- `allowed`: Whether the member may start broadcasts.
- `expectedMembershipRevision`: The membership revision you observed.
- `requestId`: The request ID; pass the original ID to resume after an uncertain outcome.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The commit receipt with the membership and any media cutoff.

Exceptions:

- `ArgumentException`: An argument is invalid.
- `ConvoHopException`: The request failed, or its outcome is uncertain.

Sends [`communication.setBroadcastPermission`](../../operations/communication/setBroadcastPermission.md).

#### `ServerMembers.GetMuteAsync` method

```cs
public Task<ConversationMute> GetMuteAsync(string principalId, CancellationToken cancellationToken = default);
```

Reads a member's mute, acting as that member (`membershipManage`; audited).

Parameters:

- `principalId`: The member's principal ID.
- `cancellationToken`: Stops waiting for the read.

Returns: The mute.

Exceptions:

- `ArgumentException`: The ID is not a canonical UUID.
- `ConvoHopException`: The read failed or its response was malformed.

Sends [`communication.conversationMute`](../../operations/communication/conversationMute.md).

#### `ServerMembers.SetMuteAsync` method

```cs
public Task<ConversationMute> SetMuteAsync(string principalId, bool muted, string? until = null, string? requestId = null, CancellationToken cancellationToken = default);
```

Mutes or unmutes a member's message push notifications, acting as that member (`membershipManage`; audited). Calls still ring a muted member.

Parameters:

- `principalId`: The member's principal ID.
- `muted`: Whether to mute.
- `until`: An RFC 3339 time in the future when the mute ends; applies only to a mute. Null mutes until unmuted.
- `requestId`: The request ID; pass the original ID to resume after an uncertain outcome.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The mute.

Exceptions:

- `ArgumentException`: An argument is invalid.
- `ConvoHopException`: The request failed, or its outcome is uncertain.

Sends [`communication.setConversationMute`](../../operations/communication/setConversationMute.md).

### `ServerMessages` class

```cs
public sealed class ServerMessages
```

Messages of one conversation.

#### `ServerMessages.ListAsync` method

```cs
public Task<MessagePage> ListAsync(int? limit = null, string? beforeSequence = null, string? actAs = null, CancellationToken cancellationToken = default);
```

Lists messages, newest first (`messageRead`; audited when acting as a member).

Parameters:

- `limit`: The page size, 1 to 100. Defaults to 100.
- `beforeSequence`: Lists messages before this sequence, for the next page.
- `actAs`: The member principal to read as, limiting the page to that member's visibility.
- `cancellationToken`: Stops waiting for the read.

Returns: The message page.

Exceptions:

- `ArgumentException`: An argument is invalid.
- `ConvoHopException`: The read failed or its response was malformed.

Sends [`communication.messages`](../../operations/communication/messages.md).

#### `ServerMessages.GetAsync` method

```cs
public Task<Message> GetAsync(string messageId, string? actAs = null, CancellationToken cancellationToken = default);
```

Reads one message (`messageRead`; audited when acting as a member).

Parameters:

- `messageId`: The message ID.
- `actAs`: The member principal to read as.
- `cancellationToken`: Stops waiting for the read.

Returns: The message.

Exceptions:

- `ArgumentException`: An argument is invalid.
- `ConvoHopException`: The read failed or its response was malformed.

Sends [`communication.getMessage`](../../operations/communication/getMessage.md).

#### `ServerMessages.SendAsync` method

```cs
public Task<MessageAck> SendAsync(string text, JsonElement? props = null, string? actAs = null, string? requestId = null, CancellationToken cancellationToken = default);
```

Sends a message (`messageWrite`; authored by `actAs` when set, audited).

Parameters:

- `text`: The message text.
- `props`: The properties object, or null for none.
- `actAs`: The member principal to send as.
- `requestId`: The request ID; pass the original ID to resume after an uncertain outcome.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The send receipt. `MessageAck.Cursor` is never null.

Exceptions:

- `ArgumentException`: An argument is invalid.
- `ConvoHopException`: The request failed, or its outcome is uncertain.

Sends [`communication.sendMessage`](../../operations/communication/sendMessage.md).

#### `ServerMessages.EditAsync` method

```cs
public Task<Message> EditAsync(string messageId, string expectedRevision, string? text = null, JsonElement? props = null, string? requestId = null, CancellationToken cancellationToken = default);
```

Edits a message's text or properties (`moderation`).

Parameters:

- `messageId`: The message ID.
- `expectedRevision`: The message revision you observed.
- `text`: The new text, or null to keep it.
- `props`: The new properties object, or null to keep them.
- `requestId`: The request ID; pass the original ID to resume after an uncertain outcome.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The edited message.

Exceptions:

- `ArgumentException`: An argument is invalid.
- `ConvoHopException`: The request failed, or its outcome is uncertain.

Sends [`communication.editMessage`](../../operations/communication/editMessage.md).

#### `ServerMessages.DeleteAsync` method

```cs
public Task<Message> DeleteAsync(string messageId, string expectedRevision, string? requestId = null, CancellationToken cancellationToken = default);
```

Deletes a message, leaving a tombstone (`moderation`).

Parameters:

- `messageId`: The message ID.
- `expectedRevision`: The message revision you observed.
- `requestId`: The request ID; pass the original ID to resume after an uncertain outcome.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The deleted message.

Exceptions:

- `ArgumentException`: An argument is invalid.
- `ConvoHopException`: The request failed, or its outcome is uncertain.

Sends [`communication.deleteMessage`](../../operations/communication/deleteMessage.md).

### `ServerPrincipals` class

```cs
public sealed class ServerPrincipals
```

Creates, reads and disables principals, the project's application users.

#### `ServerPrincipals.CreateAsync` method

```cs
public Task<Principal> CreateAsync(string externalUserId, string? requestId = null, CancellationToken cancellationToken = default);
```

Creates the principal for an external user, or returns the existing one (`principalManage`).

Parameters:

- `externalUserId`: Your application's user ID.
- `requestId`: The request ID; pass the original ID to resume after an uncertain outcome.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The principal.

Exceptions:

- `ArgumentException`: An argument is invalid.
- `ConvoHopException`: The request failed, or its outcome is uncertain.

Sends [`communication.createPrincipal`](../../operations/communication/createPrincipal.md).

#### `ServerPrincipals.GetAsync` method

```cs
public Task<Principal> GetAsync(string principalId, CancellationToken cancellationToken = default);
```

Reads a principal (`principalManage`).

Parameters:

- `principalId`: The principal ID.
- `cancellationToken`: Stops waiting for the read.

Returns: The principal.

Exceptions:

- `ArgumentException`: The ID is not a canonical UUID.
- `ConvoHopException`: The read failed or its response was malformed.

Sends [`communication.getPrincipal`](../../operations/communication/getPrincipal.md).

#### `ServerPrincipals.DisableAsync` method

```cs
public Task<Principal> DisableAsync(string principalId, string expectedRevision, string? requestId = null, CancellationToken cancellationToken = default);
```

Disables a principal (`principalManage`).

Parameters:

- `principalId`: The principal ID.
- `expectedRevision`: The principal revision you observed.
- `requestId`: The request ID; pass the original ID to resume after an uncertain outcome.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The disabled principal.

Exceptions:

- `ArgumentException`: An argument is invalid.
- `ConvoHopException`: The request failed, or its outcome is uncertain.

Sends [`communication.disablePrincipal`](../../operations/communication/disablePrincipal.md).

### `ServerRequests` class

```cs
public sealed class ServerRequests
```

Resolves and retries mutations whose outcome is uncertain.

#### `ServerRequests.ResolveAsync` method

```cs
public Task<RequestResolution> ResolveAsync(string requestId, CancellationToken cancellationToken = default);
```

Reads what the authority knows about a request ID, without resending anything.

Parameters:

- `requestId`: The original request ID.
- `cancellationToken`: Stops waiting for the read.

Returns: The resolution: committed, accepted or not observed yet.

Exceptions:

- `ArgumentException`: The ID is not a canonical UUID.
- `ConvoHopException`: The read failed or its response was malformed.

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md).

#### `ServerRequests.RetryAsync` method

```cs
public Task<RequestResolution> RetryAsync(string requestId, CancellationToken cancellationToken = default);
```

Resolves a recorded mutation and resends its original payload only when the authority has not observed it and the retry budget allows. See `ConvoHopTransport.RetryAsync`.

Parameters:

- `requestId`: The original request ID.
- `cancellationToken`: Stops waiting. A cancelled resend has an unknown outcome.

Returns: The resolution after any resend.

Exceptions:

- `ArgumentException`: The ID is not a canonical UUID.
- `InvalidOperationException`: No recovery record exists for the request ID.
- `ConvoHopException`: The request cannot be resent or its resolution failed.

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md).

### `ServerSessions` class

```cs
public sealed class ServerSessions
```

Issues, renews and revokes user sessions, and reads the outcome of an uncertain issue or renewal.

#### `ServerSessions.IssueAsync` method

```cs
public Task<SessionBootstrap> IssueAsync(string principalId, string deviceId, string? requestedTtlMs = null, string? requestId = null, CancellationToken cancellationToken = default);
```

Issues a user session (`sessionIssue`). Hand the session token to that user's app only.

Parameters:

- `principalId`: The principal the session is for.
- `deviceId`: The device the session is for, a UUID your app keeps per installation.
- `requestedTtlMs`: The lifetime in milliseconds, as a decimal string. Defaults to 15 minutes.
- `requestId`: The request ID; pass the original ID to resume after an uncertain outcome.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The session and its token. `SessionBootstrap.Session` is never null.

Exceptions:

- `ArgumentException`: An argument is invalid.
- `ConvoHopException`: The request failed, or its outcome is uncertain.

Sends [`communication.issueSession`](../../operations/communication/issueSession.md).

#### `ServerSessions.RenewAsync` method

```cs
public Task<SessionBootstrap> RenewAsync(string sessionId, string principalId, string deviceId, string expectedRevision, string? requestedTtlMs = null, string? requestId = null, CancellationToken cancellationToken = default);
```

Renews a user session with a new token and lifetime (`sessionIssue`).

Parameters:

- `sessionId`: The session ID.
- `principalId`: The session's principal.
- `deviceId`: The session's device.
- `expectedRevision`: The session revision you observed.
- `requestedTtlMs`: The lifetime in milliseconds, as a decimal string. Defaults to 15 minutes.
- `requestId`: The request ID; pass the original ID to resume after an uncertain outcome.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The renewed session and its token. `SessionBootstrap.Session` is never null.

Exceptions:

- `ArgumentException`: An argument is invalid.
- `ConvoHopException`: The request failed, or its outcome is uncertain.

Sends [`communication.renewSession`](../../operations/communication/renewSession.md).

#### `ServerSessions.RevokeAsync` method

```cs
public Task<SessionRevocation> RevokeAsync(string sessionId, string expectedRevision, string? requestId = null, CancellationToken cancellationToken = default);
```

Revokes a user session (`sessionManage`).

Parameters:

- `sessionId`: The session ID.
- `expectedRevision`: The session revision you observed.
- `requestId`: The request ID; pass the original ID to resume after an uncertain outcome.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The revocation, with the media cutoff of the session's live participation.

Exceptions:

- `ArgumentException`: An argument is invalid.
- `ConvoHopException`: The request failed, or its outcome is uncertain.

Sends [`communication.revokeSession`](../../operations/communication/revokeSession.md).

#### `ServerSessions.GetOutcomeAsync` method

```cs
public Task<SessionRequestOutcome> GetOutcomeAsync(string requestId, CancellationToken cancellationToken = default);
```

Reads the outcome of an issue or renew request by its original request ID (`sessionIssue` and `sessionManage`), without resending it. The read uses its own request ID.

Parameters:

- `requestId`: The original issue or renew request ID.
- `cancellationToken`: Stops waiting for the read.

Returns: The checked outcome.

Exceptions:

- `ArgumentException`: The ID is not a canonical UUID.
- `ConvoHopException`: The read failed, or the outcome is malformed (`INVALID_RESPONSE`); keep the original request and payload.

The outcome is checked against the authority's proof and, when this client recorded the original request, against that record. `SessionRequestOutcome.State` is `notObservedYet` (every other field except `SessionRequestOutcome.RequestId` and `SessionRequestOutcome.CheckedAt` is null) or `committed`, with `SessionRequestOutcome.Operation`, `SessionRequestOutcome.ReceiptId`, `SessionRequestOutcome.CommittedAt`, `SessionRequestOutcome.OriginalSession` and `SessionRequestOutcome.CurrentState` set; `SessionRequestOutcome.CurrentSession` is null only when the current state is `missing`. The outcome never contains a session token.

Sends [`communication.sessionRequestOutcome`](../../operations/communication/sessionRequestOutcome.md).

### `VerifiedWebhookDelivery` class

```cs
public sealed class VerifiedWebhookDelivery : WebhookSignature
```

A verified delivery: its `webhook-id`, `webhook-timestamp` and event. (`ConvoHop.Models.WebhookDelivery` is the management API's delivery record.)

#### `VerifiedWebhookDelivery.Event` property

```cs
public WebhookEvent Event { get; }
```

The delivery's event. Match on its subclass.

#### `VerifiedWebhookDelivery.WebhookId` property

```cs
public string WebhookId { get; }
```

The delivery's `webhook-id`. De-duplicate deliveries on it.

Inherited from `WebhookSignature`.

#### `VerifiedWebhookDelivery.Timestamp` property

```cs
public long Timestamp { get; }
```

The delivery's `webhook-timestamp`, in Unix seconds.

Inherited from `WebhookSignature`.

### `WebPushRequest` class

```cs
public sealed class WebPushRequest
```

A Web Push message. Your Web Push library encrypts `PayloadJson` (RFC 8291) and signs (VAPID).

#### `WebPushRequest.Headers` property

```cs
public IReadOnlyDictionary<string, string> Headers { get; }
```

RFC 8030 headers: `TTL`, `Urgency` and, for calls and cancellations, `Topic`. Where your library sets them from its own options, pass `TtlSeconds`, `Urgency` and `Topic` there, or its defaults replace them.

#### `WebPushRequest.TtlSeconds` property

```cs
public long TtlSeconds { get; }
```

How long the push service keeps trying, in seconds: the `TTL` header.

#### `WebPushRequest.Urgency` property

```cs
public string Urgency { get; }
```

`normal` for messages and `high` for calls and cancellations: the `Urgency` header.

#### `WebPushRequest.Topic` property

```cs
public string? Topic { get; }
```

Calls and cancellations: the ring's collapse key, the `Topic` header.

#### `WebPushRequest.Metadata` property

```cs
public PushData Metadata { get; }
```

The `convohop` metadata, with the title and body.

#### `WebPushRequest.PayloadJson` property

```cs
public string PayloadJson { get; }
```

The compact JSON payload, at most 3993 UTF-8 bytes, the RFC 8291 plaintext limit.

### `WebhookCallCancelReasons` class

```cs
public static class WebhookCallCancelReasons
```

Known reasons a ring stopped. Treat an unknown reason as stop ringing, without a missed-call alert.

#### `WebhookCallCancelReasons.Answered` static property

```cs
public const string Answered = "answered";
```

The recipient answered, on any device. Only stops the ringing.

#### `WebhookCallCancelReasons.Declined` static property

```cs
public const string Declined = "declined";
```

The recipient declined, on any device. Only stops the ringing.

#### `WebhookCallCancelReasons.Ended` static property

```cs
public const string Ended = "ended";
```

The call ended or stopped ringing before the recipient answered: a missed call.

#### `WebhookCallCancelReasons.Expired` static property

```cs
public const string Expired = "expired";
```

Nobody answered by the ring's `expiresAt`: a missed call.

### `WebhookCallCancelledNotificationEvent` class

```cs
public sealed class WebhookCallCancelledNotificationEvent : WebhookNotificationEvent
```

A ring that stopped for the recipient: `notification.callCancelled`. Only recipients of the ring's `notification.call` get it.

#### `WebhookCallCancelledNotificationEvent.LiveSessionId` property

```cs
public string LiveSessionId { get; }
```

The live session's ID.

#### `WebhookCallCancelledNotificationEvent.AlertId` property

```cs
public string AlertId { get; }
```

The `AlertId` of the ring that stopped.

#### `WebhookCallCancelledNotificationEvent.ExpiresAt` property

```cs
public string ExpiresAt { get; }
```

The stopped ring's original deadline (RFC 3339).

#### `WebhookCallCancelledNotificationEvent.MediaProfile` property

```cs
public string MediaProfile { get; }
```

The call's media profile, such as `WebhookCallMediaProfiles.AudioOnly`. Unknown profiles pass through.

#### `WebhookCallCancelledNotificationEvent.Reason` property

```cs
public string Reason { get; }
```

Why the ring stopped, such as `WebhookCallCancelReasons.Answered`. `ended` and `expired` are missed calls. Treat an unknown reason as stop ringing, without a missed-call alert.

#### `WebhookCallCancelledNotificationEvent.Known` property

```cs
public override bool Known { get; }
```

Whether this SDK knows the event. False only for `WebhookUnknownEvent`.

Inherited from `WebhookNotificationEvent`.

#### `WebhookCallCancelledNotificationEvent.RecipientId` property

```cs
public string RecipientId { get; }
```

The principal to notify. Each recipient gets its own event.

Inherited from `WebhookNotificationEvent`.

#### `WebhookCallCancelledNotificationEvent.ConversationId` property

```cs
public string ConversationId { get; }
```

The conversation's ID.

Inherited from `WebhookNotificationEvent`.

#### `WebhookCallCancelledNotificationEvent.SenderId` property

```cs
public string SenderId { get; }
```

The principal who sent the message or started the ringing.

Inherited from `WebhookNotificationEvent`.

#### `WebhookCallCancelledNotificationEvent.Connected` property

```cs
public bool Connected { get; }
```

Whether the recipient had an active realtime connection when the event was produced. It is a hint for your sending policy: it isn't per device, and it can change before you send. The push builders ignore it.

Inherited from `WebhookNotificationEvent`.

#### `WebhookCallCancelledNotificationEvent.EventId` property

```cs
public string EventId { get; }
```

The event's ID.

Inherited from `WebhookEvent`.

#### `WebhookCallCancelledNotificationEvent.EventType` property

```cs
public string EventType { get; }
```

The event type, one of `WebhookEventTypes` unless the event is unknown.

Inherited from `WebhookEvent`.

#### `WebhookCallCancelledNotificationEvent.OccurredAt` property

```cs
public string OccurredAt { get; }
```

When the event happened, as the authority sent it (RFC 3339).

Inherited from `WebhookEvent`.

#### `WebhookCallCancelledNotificationEvent.ProjectId` property

```cs
public string ProjectId { get; }
```

The project's ID.

Inherited from `WebhookEvent`.

#### `WebhookCallCancelledNotificationEvent.SubjectRef` property

```cs
public WebhookSubjectRef SubjectRef { get; }
```

The resource the event is about.

Inherited from `WebhookEvent`.

### `WebhookCallMediaProfiles` class

```cs
public static class WebhookCallMediaProfiles
```

Known call media profiles. Unknown profiles pass through.

#### `WebhookCallMediaProfiles.AudioOnly` static property

```cs
public const string AudioOnly = "AUDIO_ONLY";
```

An audio call.

#### `WebhookCallMediaProfiles.AudioVideo` static property

```cs
public const string AudioVideo = "AUDIO_VIDEO";
```

A video call.

### `WebhookCallNotificationEvent` class

```cs
public sealed class WebhookCallNotificationEvent : WebhookNotificationEvent
```

An incoming call, one ring for the recipient: `notification.call`.

#### `WebhookCallNotificationEvent.LiveSessionId` property

```cs
public string LiveSessionId { get; }
```

The live session's ID.

#### `WebhookCallNotificationEvent.AlertId` property

```cs
public string AlertId { get; }
```

This ring for this recipient. A later ring of the same call has a new `AlertId`.

#### `WebhookCallNotificationEvent.ExpiresAt` property

```cs
public string ExpiresAt { get; }
```

When the ringing stops (RFC 3339).

#### `WebhookCallNotificationEvent.MediaProfile` property

```cs
public string MediaProfile { get; }
```

The call's media profile, such as `WebhookCallMediaProfiles.AudioOnly`. Unknown profiles pass through.

#### `WebhookCallNotificationEvent.Known` property

```cs
public override bool Known { get; }
```

Whether this SDK knows the event. False only for `WebhookUnknownEvent`.

Inherited from `WebhookNotificationEvent`.

#### `WebhookCallNotificationEvent.RecipientId` property

```cs
public string RecipientId { get; }
```

The principal to notify. Each recipient gets its own event.

Inherited from `WebhookNotificationEvent`.

#### `WebhookCallNotificationEvent.ConversationId` property

```cs
public string ConversationId { get; }
```

The conversation's ID.

Inherited from `WebhookNotificationEvent`.

#### `WebhookCallNotificationEvent.SenderId` property

```cs
public string SenderId { get; }
```

The principal who sent the message or started the ringing.

Inherited from `WebhookNotificationEvent`.

#### `WebhookCallNotificationEvent.Connected` property

```cs
public bool Connected { get; }
```

Whether the recipient had an active realtime connection when the event was produced. It is a hint for your sending policy: it isn't per device, and it can change before you send. The push builders ignore it.

Inherited from `WebhookNotificationEvent`.

#### `WebhookCallNotificationEvent.EventId` property

```cs
public string EventId { get; }
```

The event's ID.

Inherited from `WebhookEvent`.

#### `WebhookCallNotificationEvent.EventType` property

```cs
public string EventType { get; }
```

The event type, one of `WebhookEventTypes` unless the event is unknown.

Inherited from `WebhookEvent`.

#### `WebhookCallNotificationEvent.OccurredAt` property

```cs
public string OccurredAt { get; }
```

When the event happened, as the authority sent it (RFC 3339).

Inherited from `WebhookEvent`.

#### `WebhookCallNotificationEvent.ProjectId` property

```cs
public string ProjectId { get; }
```

The project's ID.

Inherited from `WebhookEvent`.

#### `WebhookCallNotificationEvent.SubjectRef` property

```cs
public WebhookSubjectRef SubjectRef { get; }
```

The resource the event is about.

Inherited from `WebhookEvent`.

### `WebhookEndpointDisabledEvent` class

```cs
public sealed class WebhookEndpointDisabledEvent : WebhookEvent
```

One of the project's other webhook endpoints was disabled after repeated failures. `SubjectRef` names it, with kind `webhookEndpoint`.

#### `WebhookEndpointDisabledEvent.Known` property

```cs
public override bool Known { get; }
```

Whether this SDK knows the event. False only for `WebhookUnknownEvent`.

#### `WebhookEndpointDisabledEvent.EventId` property

```cs
public string EventId { get; }
```

The event's ID.

Inherited from `WebhookEvent`.

#### `WebhookEndpointDisabledEvent.EventType` property

```cs
public string EventType { get; }
```

The event type, one of `WebhookEventTypes` unless the event is unknown.

Inherited from `WebhookEvent`.

#### `WebhookEndpointDisabledEvent.OccurredAt` property

```cs
public string OccurredAt { get; }
```

When the event happened, as the authority sent it (RFC 3339).

Inherited from `WebhookEvent`.

#### `WebhookEndpointDisabledEvent.ProjectId` property

```cs
public string ProjectId { get; }
```

The project's ID.

Inherited from `WebhookEvent`.

#### `WebhookEndpointDisabledEvent.SubjectRef` property

```cs
public WebhookSubjectRef SubjectRef { get; }
```

The resource the event is about.

Inherited from `WebhookEvent`.

### `WebhookEvent` class

```cs
public abstract class WebhookEvent
```

A verified delivery's metadata-only event. Fetch the resource through the API when you need its content. Match on the subclass, then on `EventType`.

#### `WebhookEvent.Known` property

```cs
public abstract bool Known { get; }
```

Whether this SDK knows the event. False only for `WebhookUnknownEvent`.

#### `WebhookEvent.EventId` property

```cs
public string EventId { get; }
```

The event's ID.

#### `WebhookEvent.EventType` property

```cs
public string EventType { get; }
```

The event type, one of `WebhookEventTypes` unless the event is unknown.

#### `WebhookEvent.OccurredAt` property

```cs
public string OccurredAt { get; }
```

When the event happened, as the authority sent it (RFC 3339).

#### `WebhookEvent.ProjectId` property

```cs
public string ProjectId { get; }
```

The project's ID.

#### `WebhookEvent.SubjectRef` property

```cs
public WebhookSubjectRef SubjectRef { get; }
```

The resource the event is about.

### `WebhookEventTypes` class

```cs
public static class WebhookEventTypes
```

The webhook event types the authority sends. Compare them with `WebhookEvent.EventType`.

#### `WebhookEventTypes.ConversationCreated` static property

```cs
public const string ConversationCreated = "conversation.created";
```

The `conversation.created` event type.

#### `WebhookEventTypes.ConversationUpdated` static property

```cs
public const string ConversationUpdated = "conversation.updated";
```

The `conversation.updated` event type.

#### `WebhookEventTypes.MemberAdded` static property

```cs
public const string MemberAdded = "member.added";
```

The `member.added` event type.

#### `WebhookEventTypes.MemberRoleChanged` static property

```cs
public const string MemberRoleChanged = "member.roleChanged";
```

The `member.roleChanged` event type.

#### `WebhookEventTypes.MemberHistoryExpanded` static property

```cs
public const string MemberHistoryExpanded = "member.historyExpanded";
```

The `member.historyExpanded` event type.

#### `WebhookEventTypes.MemberRemoved` static property

```cs
public const string MemberRemoved = "member.removed";
```

The `member.removed` event type.

#### `WebhookEventTypes.MemberBroadcastPermissionChanged` static property

```cs
public const string MemberBroadcastPermissionChanged = "member.broadcastPermissionChanged";
```

The `member.broadcastPermissionChanged` event type.

#### `WebhookEventTypes.MessageCreated` static property

```cs
public const string MessageCreated = "message.created";
```

The `message.created` event type.

#### `WebhookEventTypes.MessageEdited` static property

```cs
public const string MessageEdited = "message.edited";
```

The `message.edited` event type.

#### `WebhookEventTypes.MessageDeleted` static property

```cs
public const string MessageDeleted = "message.deleted";
```

The `message.deleted` event type.

#### `WebhookEventTypes.ReceiptReported` static property

```cs
public const string ReceiptReported = "receipt.reported";
```

The `receipt.reported` event type.

#### `WebhookEventTypes.LiveStarted` static property

```cs
public const string LiveStarted = "live.started";
```

The `live.started` event type.

#### `WebhookEventTypes.LiveParticipationChanged` static property

```cs
public const string LiveParticipationChanged = "live.participationChanged";
```

The `live.participationChanged` event type.

#### `WebhookEventTypes.LiveAlerted` static property

```cs
public const string LiveAlerted = "live.alerted";
```

The `live.alerted` event type.

#### `WebhookEventTypes.LiveReady` static property

```cs
public const string LiveReady = "live.ready";
```

The `live.ready` event type.

#### `WebhookEventTypes.LiveConnected` static property

```cs
public const string LiveConnected = "live.connected";
```

The `live.connected` event type.

#### `WebhookEventTypes.LiveEnded` static property

```cs
public const string LiveEnded = "live.ended";
```

The `live.ended` event type.

#### `WebhookEventTypes.WebhookEndpointDisabled` static property

```cs
public const string WebhookEndpointDisabled = "webhook.endpointDisabled";
```

`webhook.endpointDisabled`: one of the project's other webhook endpoints was disabled after repeated failures.

#### `WebhookEventTypes.NotificationMessage` static property

```cs
public const string NotificationMessage = "notification.message";
```

`notification.message`: a message for the recipient.

#### `WebhookEventTypes.NotificationCall` static property

```cs
public const string NotificationCall = "notification.call";
```

`notification.call`: an incoming call, one ring for the recipient.

#### `WebhookEventTypes.NotificationCallCancelled` static property

```cs
public const string NotificationCallCancelled = "notification.callCancelled";
```

`notification.callCancelled`: a ring that stopped for the recipient.

### `WebhookHeaders` class

```cs
public sealed class WebhookHeaders
```

The request headers of a webhook delivery. Names match ASCII case-insensitively. A header that is present more than once fails verification with `WebhookVerificationCode.InvalidHeader`.

ASP.NET Core: `WebhookHeaders.From(request.Headers)`. `HttpRequestMessage`: `WebhookHeaders.From(message.Headers)`. A dictionary: `WebhookHeaders.From(dictionary)`.

#### `WebhookHeaders.From` static method

```cs
public static WebhookHeaders From(IEnumerable<KeyValuePair<string, string>> headers);
public static WebhookHeaders From<TValues>(IEnumerable<KeyValuePair<string, TValues>> headers) where TValues : IEnumerable<string?>;
public static WebhookHeaders From(Func<string, string?> lookup);
```

Headers with one value per entry, such as a `Dictionary<string, string>`.

Headers with several values per entry, such as ASP.NET Core's `IHeaderDictionary` or `System.Net.Http.Headers.HttpHeaders`.

Headers read through a lookup, like the Fetch API's `Headers.get`. Verification calls it with each lowercase header name.

Type parameters:

- `TValues`: The collection of one header's values.

Parameters:

- `headers` (`IEnumerable<KeyValuePair<string, string>>`): The headers. Entries with a null value are ignored.
- `headers` (`IEnumerable<KeyValuePair<string, TValues>>`): The headers. Entries with a null collection are ignored.
- `lookup`: Returns the header's value, or null when it is absent. It decides how repeated headers combine.

Returns: The headers to verify.

A name in more than one entry, in any casing, is a repeated header.

A name in more than one entry, in any casing, or with more than one value, is a repeated header.

### `WebhookMessageNotificationEvent` class

```cs
public sealed class WebhookMessageNotificationEvent : WebhookNotificationEvent
```

A message for the recipient: `notification.message`.

#### `WebhookMessageNotificationEvent.MessageId` property

```cs
public string MessageId { get; }
```

The message's ID.

#### `WebhookMessageNotificationEvent.Preview` property

```cs
public WebhookNotificationPreview? Preview { get; }
```

The start of the message text. Present only when the project opts in to previews and the message has text.

#### `WebhookMessageNotificationEvent.Known` property

```cs
public override bool Known { get; }
```

Whether this SDK knows the event. False only for `WebhookUnknownEvent`.

Inherited from `WebhookNotificationEvent`.

#### `WebhookMessageNotificationEvent.RecipientId` property

```cs
public string RecipientId { get; }
```

The principal to notify. Each recipient gets its own event.

Inherited from `WebhookNotificationEvent`.

#### `WebhookMessageNotificationEvent.ConversationId` property

```cs
public string ConversationId { get; }
```

The conversation's ID.

Inherited from `WebhookNotificationEvent`.

#### `WebhookMessageNotificationEvent.SenderId` property

```cs
public string SenderId { get; }
```

The principal who sent the message or started the ringing.

Inherited from `WebhookNotificationEvent`.

#### `WebhookMessageNotificationEvent.Connected` property

```cs
public bool Connected { get; }
```

Whether the recipient had an active realtime connection when the event was produced. It is a hint for your sending policy: it isn't per device, and it can change before you send. The push builders ignore it.

Inherited from `WebhookNotificationEvent`.

#### `WebhookMessageNotificationEvent.EventId` property

```cs
public string EventId { get; }
```

The event's ID.

Inherited from `WebhookEvent`.

#### `WebhookMessageNotificationEvent.EventType` property

```cs
public string EventType { get; }
```

The event type, one of `WebhookEventTypes` unless the event is unknown.

Inherited from `WebhookEvent`.

#### `WebhookMessageNotificationEvent.OccurredAt` property

```cs
public string OccurredAt { get; }
```

When the event happened, as the authority sent it (RFC 3339).

Inherited from `WebhookEvent`.

#### `WebhookMessageNotificationEvent.ProjectId` property

```cs
public string ProjectId { get; }
```

The project's ID.

Inherited from `WebhookEvent`.

#### `WebhookMessageNotificationEvent.SubjectRef` property

```cs
public WebhookSubjectRef SubjectRef { get; }
```

The resource the event is about.

Inherited from `WebhookEvent`.

### `WebhookNotificationEvent` class

```cs
public abstract class WebhookNotificationEvent : WebhookEvent
```

A per-recipient notification event, for your push notifications, and the input of `PushPayloads`. The contract is `spec/push-payload/`. Instances always match it.

#### `WebhookNotificationEvent.Known` property

```cs
public override bool Known { get; }
```

Whether this SDK knows the event. False only for `WebhookUnknownEvent`.

#### `WebhookNotificationEvent.RecipientId` property

```cs
public string RecipientId { get; }
```

The principal to notify. Each recipient gets its own event.

#### `WebhookNotificationEvent.ConversationId` property

```cs
public string ConversationId { get; }
```

The conversation's ID.

#### `WebhookNotificationEvent.SenderId` property

```cs
public string SenderId { get; }
```

The principal who sent the message or started the ringing.

#### `WebhookNotificationEvent.Connected` property

```cs
public bool Connected { get; }
```

Whether the recipient had an active realtime connection when the event was produced. It is a hint for your sending policy: it isn't per device, and it can change before you send. The push builders ignore it.

#### `WebhookNotificationEvent.EventId` property

```cs
public string EventId { get; }
```

The event's ID.

Inherited from `WebhookEvent`.

#### `WebhookNotificationEvent.EventType` property

```cs
public string EventType { get; }
```

The event type, one of `WebhookEventTypes` unless the event is unknown.

Inherited from `WebhookEvent`.

#### `WebhookNotificationEvent.OccurredAt` property

```cs
public string OccurredAt { get; }
```

When the event happened, as the authority sent it (RFC 3339).

Inherited from `WebhookEvent`.

#### `WebhookNotificationEvent.ProjectId` property

```cs
public string ProjectId { get; }
```

The project's ID.

Inherited from `WebhookEvent`.

#### `WebhookNotificationEvent.SubjectRef` property

```cs
public WebhookSubjectRef SubjectRef { get; }
```

The resource the event is about.

Inherited from `WebhookEvent`.

### `WebhookNotificationPreview` class

```cs
public sealed class WebhookNotificationPreview
```

The start of a message's text.

#### `WebhookNotificationPreview.Text` property

```cs
public string Text { get; }
```

1 to 512 Unicode code points.

#### `WebhookNotificationPreview.Truncated` property

```cs
public bool Truncated { get; }
```

Whether the message text continues after `Text`.

### `WebhookResourceEvent` class

```cs
public sealed class WebhookResourceEvent : WebhookEvent
```

A change to a conversation, member, message, receipt or call. `SubjectRef` names the resource.

#### `WebhookResourceEvent.Known` property

```cs
public override bool Known { get; }
```

Whether this SDK knows the event. False only for `WebhookUnknownEvent`.

#### `WebhookResourceEvent.EventId` property

```cs
public string EventId { get; }
```

The event's ID.

Inherited from `WebhookEvent`.

#### `WebhookResourceEvent.EventType` property

```cs
public string EventType { get; }
```

The event type, one of `WebhookEventTypes` unless the event is unknown.

Inherited from `WebhookEvent`.

#### `WebhookResourceEvent.OccurredAt` property

```cs
public string OccurredAt { get; }
```

When the event happened, as the authority sent it (RFC 3339).

Inherited from `WebhookEvent`.

#### `WebhookResourceEvent.ProjectId` property

```cs
public string ProjectId { get; }
```

The project's ID.

Inherited from `WebhookEvent`.

#### `WebhookResourceEvent.SubjectRef` property

```cs
public WebhookSubjectRef SubjectRef { get; }
```

The resource the event is about.

Inherited from `WebhookEvent`.

### `WebhookSignature` class

```cs
public class WebhookSignature
```

A verified delivery's `webhook-id` and `webhook-timestamp`.

#### `WebhookSignature.WebhookId` property

```cs
public string WebhookId { get; }
```

The delivery's `webhook-id`. De-duplicate deliveries on it.

#### `WebhookSignature.Timestamp` property

```cs
public long Timestamp { get; }
```

The delivery's `webhook-timestamp`, in Unix seconds.

### `WebhookSubjectRef` class

```cs
public sealed class WebhookSubjectRef
```

The resource a webhook event is about.

#### `WebhookSubjectRef.Id` property

```cs
public string Id { get; }
```

The resource's ID.

#### `WebhookSubjectRef.Kind` property

```cs
public string Kind { get; }
```

The resource's kind, such as `message`, `liveSession` or `webhookEndpoint`.

### `WebhookUnknownEvent` class

```cs
public sealed class WebhookUnknownEvent : WebhookEvent
```

An event this SDK does not know, including a `notification.*` event that doesn't match the push payload contract. Acknowledge it; it never makes `Webhooks.Verify` throw.

#### `WebhookUnknownEvent.Known` property

```cs
public override bool Known { get; }
```

Whether this SDK knows the event. False only for `WebhookUnknownEvent`.

#### `WebhookUnknownEvent.EventId` property

```cs
public string EventId { get; }
```

The event's ID.

Inherited from `WebhookEvent`.

#### `WebhookUnknownEvent.EventType` property

```cs
public string EventType { get; }
```

The event type, one of `WebhookEventTypes` unless the event is unknown.

Inherited from `WebhookEvent`.

#### `WebhookUnknownEvent.OccurredAt` property

```cs
public string OccurredAt { get; }
```

When the event happened, as the authority sent it (RFC 3339).

Inherited from `WebhookEvent`.

#### `WebhookUnknownEvent.ProjectId` property

```cs
public string ProjectId { get; }
```

The project's ID.

Inherited from `WebhookEvent`.

#### `WebhookUnknownEvent.SubjectRef` property

```cs
public WebhookSubjectRef SubjectRef { get; }
```

The resource the event is about.

Inherited from `WebhookEvent`.

### `WebhookVerificationException` class

```cs
public sealed class WebhookVerificationException : Exception
```

A delivery that failed verification. The message never contains secrets, signatures or the body.

#### `WebhookVerificationException` constructor

```cs
public WebhookVerificationException(WebhookVerificationCode code, string message);
```

Creates the exception.

Parameters:

- `code`: Why verification failed.
- `message`: The human-readable message.

#### `WebhookVerificationException.Code` property

```cs
public WebhookVerificationCode Code { get; }
```

Why verification failed.

### `Webhooks` class

```cs
public static class Webhooks
```

Verifies ConvoHop webhook deliveries (Standard Webhooks symmetric `v1`). Pass the raw body; respond `2xx` within 5 s, then process; de-duplicate on `webhook-id`. Failures throw `WebhookVerificationException`.

Verification is CPU-only and synchronous: it sends nothing and stores nothing.

#### `Webhooks.DefaultToleranceSeconds` static property

```cs
public const long DefaultToleranceSeconds = 300;
```

The default allowed distance between `webhook-timestamp` and now: 300 seconds.

#### `Webhooks.Verify` static method

```cs
public static VerifiedWebhookDelivery Verify(WebhookHeaders headers, string body, IEnumerable<string> secrets, long toleranceSeconds = 300, DateTimeOffset? now = null);
public static VerifiedWebhookDelivery Verify(WebhookHeaders headers, ReadOnlySpan<byte> body, IEnumerable<string> secrets, long toleranceSeconds = 300, DateTimeOffset? now = null);
```

Verifies the signature and timestamp, then parses the metadata-only event.

Parameters:

- `headers`: The request headers.
- `body` (`string`): The exact request body's UTF-8 decoding. Never re-serialized JSON.
- `body` (`ReadOnlySpan<byte>`): The exact request body bytes. Never re-serialized JSON.
- `secrets`: The endpoint's `whsec_` secrets: the current one and, during a rotation, the next or replaced one.
- `toleranceSeconds`: The allowed distance between `webhook-timestamp` and `now`, in whole seconds, inclusive.
- `now`: The verifier's clock. Defaults to the current time.

Returns: The delivery's `webhook-id`, `webhook-timestamp` and event.

Exceptions:

- `WebhookVerificationException`: The delivery failed verification.
- `ArgumentOutOfRangeException`: `toleranceSeconds` is negative or above 2^53 − 1.

#### `Webhooks.VerifySignature` static method

```cs
public static WebhookSignature VerifySignature(WebhookHeaders headers, string body, IEnumerable<string> secrets, long toleranceSeconds = 300, DateTimeOffset? now = null);
public static WebhookSignature VerifySignature(WebhookHeaders headers, ReadOnlySpan<byte> body, IEnumerable<string> secrets, long toleranceSeconds = 300, DateTimeOffset? now = null);
```

Verifies only the signature and timestamp, for bodies you parse yourself.

Parameters:

- `headers`: The request headers.
- `body` (`string`): The exact request body's UTF-8 decoding. Never re-serialized JSON.
- `body` (`ReadOnlySpan<byte>`): The exact request body bytes. Never re-serialized JSON.
- `secrets`: The endpoint's `whsec_` secrets: the current one and, during a rotation, the next or replaced one.
- `toleranceSeconds`: The allowed distance between `webhook-timestamp` and `now`, in whole seconds, inclusive.
- `now`: The verifier's clock. Defaults to the current time.

Returns: The delivery's `webhook-id` and `webhook-timestamp`.

Exceptions:

- `WebhookVerificationException`: The delivery failed verification.
- `ArgumentOutOfRangeException`: `toleranceSeconds` is negative or above 2^53 − 1.

## Interfaces

### `IRecoveryStorage` interface

```cs
public interface IRecoveryStorage
```

Durable key-value storage for mutation recovery records. The SDK stores one JSON snapshot per client namespace and never stores credentials in it.

`SetItemAsync` must complete only after the value is durable: the SDK sends a mutation only after the snapshot that records it was confirmed. The SDK passes `CancellationToken.None` to writes so a caller cancellation never abandons a snapshot halfway.

#### `IRecoveryStorage.GetItemAsync` method

```cs
Task<string?> GetItemAsync(string key, CancellationToken cancellationToken);
```

Reads the stored value, or null when there is none.

Parameters:

- `key`: The storage key.
- `cancellationToken`: Cancels the read.

Returns: The stored value, or null.

#### `IRecoveryStorage.SetItemAsync` method

```cs
Task SetItemAsync(string key, string value, CancellationToken cancellationToken);
```

Durably replaces the stored value.

Parameters:

- `key`: The storage key.
- `value`: The value to store.
- `cancellationToken`: Cancels the write.

Returns: A task that completes when the value is durable.

## Enums

### `ContextFieldUse` enum

```cs
public enum ContextFieldUse
```

How an operation uses one field of its request context.

#### `ContextFieldUse.Required` case

```cs
Required = 0
```

The field must be sent.

#### `ContextFieldUse.Optional` case

```cs
Optional = 1
```

The field may be sent.

#### `ContextFieldUse.Forbidden` case

```cs
Forbidden = 2
```

The field must not be sent.

### `OperationKind` enum

```cs
public enum OperationKind
```

Whether an operation reads authority state or asks the authority to change it.

#### `OperationKind.Query` case

```cs
Query = 0
```

A read-only GraphQL query.

#### `OperationKind.Mutation` case

```cs
Mutation = 1
```

A GraphQL mutation that needs receipt evidence and request recovery.

### `PushPayloadCode` enum

```cs
public enum PushPayloadCode
```

Why `PushPayloads` couldn't build a push payload. Options are checked before the event.

#### `PushPayloadCode.InvalidEvent` case

```cs
InvalidEvent = 0
```

The event doesn't match the push payload contract (`spec/push-payload/`).

#### `PushPayloadCode.InvalidOptions` case

```cs
InvalidOptions = 1
```

`PushOptions.Title` or `PushOptions.Body` has a lone surrogate, or `ApnsPushOptions.BundleId` isn't an app bundle ID.

### `WebhookVerificationCode` enum

```cs
public enum WebhookVerificationCode
```

Why a webhook delivery failed verification. `Webhooks` runs the checks in this order and stops at the first failure.

#### `WebhookVerificationCode.InvalidSecret` case

```cs
InvalidSecret = 0
```

No secret is given, or one is not `whsec_` followed by padded standard Base64 of 24 to 64 bytes. This is your configuration, not the sender.

#### `WebhookVerificationCode.MissingHeader` case

```cs
MissingHeader = 1
```

`webhook-id`, `webhook-timestamp` or `webhook-signature` is absent or empty.

#### `WebhookVerificationCode.InvalidHeader` case

```cs
InvalidHeader = 2
```

One of those headers is repeated.

#### `WebhookVerificationCode.InvalidTimestamp` case

```cs
InvalidTimestamp = 3
```

`webhook-timestamp` is not 1 to 15 ASCII digits (integer Unix seconds).

#### `WebhookVerificationCode.TimestampExpired` case

```cs
TimestampExpired = 4
```

The timestamp is more than the tolerance before now.

#### `WebhookVerificationCode.TimestampFuture` case

```cs
TimestampFuture = 5
```

The timestamp is more than the tolerance after now.

#### `WebhookVerificationCode.BodyTooLarge` case

```cs
BodyTooLarge = 6
```

The body exceeds 4096 bytes.

#### `WebhookVerificationCode.TooManySignatures` case

```cs
TooManySignatures = 7
```

`webhook-signature` has more than 8 entries.

#### `WebhookVerificationCode.NoMatchingSignature` case

```cs
NoMatchingSignature = 8
```

No `v1` entry matches any secret.

#### `WebhookVerificationCode.InvalidBody` case

```cs
InvalidBody = 9
```

`Webhooks.Verify` only: the signed body is not a UTF-8 JSON event envelope.
