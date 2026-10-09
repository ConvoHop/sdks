# `github.com/ConvoHop/sdks/go`

Server SDK for trusted Go backends: backend-key data-plane calls and operator management calls, with typed problems, request retries and recovery storage.

**Layer:** Server. **Runtime:** Go 1.26 or later. **Source:** `go`.

## Structs

### `AcknowledgeCredentialReply` struct

```go
type AcknowledgeCredentialReply struct {
	Status      string        `json:"status"`
	RequestID   UUID          `json:"requestId"`
	ServerTime  *string       `json:"serverTime"`
	ReceiptID   *UUID         `json:"receiptId"`
	CommittedAt *string       `json:"committedAt"`
	Replayed    *bool         `json:"replayed"`
	Operation   *OperationRef `json:"operation"`
	ResourceRef *ResourceRef  `json:"resourceRef"`
	Result      *DeliveryAck  `json:"result"`
}
```

AcknowledgeCredentialReply is the GraphQL object AcknowledgeCredentialReply.

### `AcknowledgeCredentialRequestInput` struct

```go
type AcknowledgeCredentialRequestInput struct {
	DeliveryID UUID `json:"deliveryId"`
}
```

AcknowledgeCredentialRequestInput is the GraphQL input AcknowledgeCredentialRequestInput.

### `ActorRef` struct

```go
type ActorRef struct {
	TenantID string `json:"tenantId"`
	ObjectID string `json:"objectId"`
}
```

ActorRef is the GraphQL object ActorRef.

### `AddMemberReply` struct

```go
type AddMemberReply struct {
	Status      string        `json:"status"`
	RequestID   UUID          `json:"requestId"`
	ServerTime  *string       `json:"serverTime"`
	ReceiptID   *UUID         `json:"receiptId"`
	CommittedAt *string       `json:"committedAt"`
	Replayed    *bool         `json:"replayed"`
	Operation   *OperationRef `json:"operation"`
	ResourceRef *ResourceRef  `json:"resourceRef"`
	Result      *Member       `json:"result"`
}
```

AddMemberReply is the GraphQL object AddMemberReply.

### `AddMemberRequestInput` struct

```go
type AddMemberRequestInput struct {
	ConversationID   UUID    `json:"conversationId"`
	PrincipalID      UUID    `json:"principalId"`
	Role             string  `json:"role"`
	ExpectedRevision Decimal `json:"expectedRevision"`
}
```

AddMemberRequestInput is the GraphQL input AddMemberRequestInput.

### `AddMembersInput` struct

```go
type AddMembersInput struct {
	ConversationID UUID                    `json:"conversationId"`
	Members        []MemberBatchEntryInput `json:"members"`
}
```

AddMembersInput is the GraphQL input AddMembersInput.

### `AddMembersPayload` struct

```go
type AddMembersPayload struct {
	Status      string                  `json:"status"`
	RequestID   UUID                    `json:"requestId"`
	ReceiptID   UUID                    `json:"receiptId"`
	CommittedAt string                  `json:"committedAt"`
	Replayed    bool                    `json:"replayed"`
	Result      ConversationMemberBatch `json:"result"`
}
```

AddMembersPayload is the GraphQL object AddMembersPayload.

### `AlertLiveSessionInput` struct

```go
type AlertLiveSessionInput struct {
	LiveSessionID      UUID    `json:"liveSessionId"`
	ExpectedGeneration Decimal `json:"expectedGeneration"`
	PrincipalIDs       []UUID  `json:"principalIds"`
}
```

AlertLiveSessionInput is the GraphQL input AlertLiveSessionInput.

### `AlertLiveSessionPayload` struct

```go
type AlertLiveSessionPayload struct {
	Status      string         `json:"status"`
	RequestID   UUID           `json:"requestId"`
	ReceiptID   UUID           `json:"receiptId"`
	CommittedAt string         `json:"committedAt"`
	Replayed    bool           `json:"replayed"`
	Result      LiveAlertBatch `json:"result"`
}
```

AlertLiveSessionPayload is the GraphQL object AlertLiveSessionPayload.

### `BillingCheckoutSession` struct

```go
type BillingCheckoutSession struct {
	OrgID     UUID   `json:"orgId"`
	PlanID    string `json:"planId"`
	URL       string `json:"url"`
	ExpiresAt string `json:"expiresAt"`
}
```

BillingCheckoutSession is the GraphQL object BillingCheckoutSession.

### `BillingPortalSession` struct

```go
type BillingPortalSession struct {
	OrgID     UUID    `json:"orgId"`
	URL       string  `json:"url"`
	ExpiresAt *string `json:"expiresAt"`
}
```

BillingPortalSession is the GraphQL object BillingPortalSession.

### `BroadcastPermissionChanged` struct

```go
type BroadcastPermissionChanged struct {
	Member      Member           `json:"member"`
	MediaCutoff *LiveMediaCutoff `json:"mediaCutoff"`
}
```

BroadcastPermissionChanged is the GraphQL object BroadcastPermissionChanged.

### `Capabilities` struct

```go
type Capabilities struct {
	ServerRelease         string       `json:"serverRelease"`
	CapabilityRevision    Decimal      `json:"capabilityRevision"`
	LimitsRevision        Decimal      `json:"limitsRevision"`
	Features              *Features    `json:"features"`
	Limits                []LimitEntry `json:"limits"`
	Environment           string       `json:"environment"`
	ProductionQualified   bool         `json:"productionQualified"`
	MediaPolicy           *MediaPolicy `json:"mediaPolicy"`
	GeoControlAuthorityID *string      `json:"geoControlAuthorityId"`
	Offerings             []string     `json:"offerings"`
	Geos                  []string     `json:"geos"`
	InstallationProfiles  []string     `json:"installationProfiles"`
	PortalIdentity        *string      `json:"portalIdentity"`
}
```

Capabilities is the GraphQL object Capabilities.

### `CapabilitiesReply` struct

```go
type CapabilitiesReply struct {
	Status      string        `json:"status"`
	RequestID   UUID          `json:"requestId"`
	ServerTime  *string       `json:"serverTime"`
	ReceiptID   *UUID         `json:"receiptId"`
	CommittedAt *string       `json:"committedAt"`
	Replayed    *bool         `json:"replayed"`
	Operation   *OperationRef `json:"operation"`
	ResourceRef *ResourceRef  `json:"resourceRef"`
	Result      *Capabilities `json:"result"`
}
```

CapabilitiesReply is the GraphQL object CapabilitiesReply.

### `ConfigureWebhookReply` struct

```go
type ConfigureWebhookReply struct {
	Status      string           `json:"status"`
	RequestID   UUID             `json:"requestId"`
	ServerTime  *string          `json:"serverTime"`
	ReceiptID   *UUID            `json:"receiptId"`
	CommittedAt *string          `json:"committedAt"`
	Replayed    *bool            `json:"replayed"`
	Operation   *OperationRef    `json:"operation"`
	ResourceRef *ResourceRef     `json:"resourceRef"`
	Result      *OperationResult `json:"result"`
}
```

ConfigureWebhookReply is the GraphQL object ConfigureWebhookReply.

### `ConfigureWebhookRequestInput` struct

```go
type ConfigureWebhookRequestInput struct {
	ProjectID  UUID     `json:"projectId"`
	URL        string   `json:"url"`
	EventTypes []string `json:"eventTypes"`
	ConsentRef string   `json:"consentRef"`
}
```

ConfigureWebhookRequestInput is the GraphQL input ConfigureWebhookRequestInput.

### `Conversation` struct

```go
type Conversation struct {
	ConversationID UUID       `json:"conversationId"`
	Revision       Decimal    `json:"revision"`
	Title          string     `json:"title"`
	Props          Properties `json:"props"`
	LatestSequence Decimal    `json:"latestSequence"`
	Membership     *Member    `json:"membership"`
}
```

Conversation is the GraphQL object Conversation.

### `ConversationLiveInput` struct

```go
type ConversationLiveInput struct {
	ConversationID UUID `json:"conversationId"`
}
```

ConversationLiveInput is the GraphQL input ConversationLiveInput.

### `ConversationMemberBatch` struct

```go
type ConversationMemberBatch struct {
	Items []Member `json:"items"`
}
```

ConversationMemberBatch is the GraphQL object ConversationMemberBatch.

### `ConversationMute` struct

```go
type ConversationMute struct {
	ConversationID UUID    `json:"conversationId"`
	PrincipalID    UUID    `json:"principalId"`
	Muted          bool    `json:"muted"`
	Until          *string `json:"until"`
}
```

ConversationMute is the GraphQL object ConversationMute.

### `ConversationMuteInput` struct

```go
type ConversationMuteInput struct {
	ConversationID   UUID  `json:"conversationId"`
	ActAsPrincipalID *UUID `json:"actAsPrincipalId,omitzero"`
}
```

ConversationMuteInput is the GraphQL input ConversationMuteInput.

### `ConversationMuteReply` struct

```go
type ConversationMuteReply struct {
	Status     string           `json:"status"`
	RequestID  UUID             `json:"requestId"`
	ServerTime string           `json:"serverTime"`
	Result     ConversationMute `json:"result"`
}
```

ConversationMuteReply is the GraphQL object ConversationMuteReply.

### `CreateBillingCheckoutSessionReply` struct

```go
type CreateBillingCheckoutSessionReply struct {
	Status      string                  `json:"status"`
	RequestID   UUID                    `json:"requestId"`
	ServerTime  *string                 `json:"serverTime"`
	ReceiptID   *UUID                   `json:"receiptId"`
	CommittedAt *string                 `json:"committedAt"`
	Replayed    *bool                   `json:"replayed"`
	Operation   *OperationRef           `json:"operation"`
	ResourceRef *ResourceRef            `json:"resourceRef"`
	Result      *BillingCheckoutSession `json:"result"`
}
```

CreateBillingCheckoutSessionReply is the GraphQL object CreateBillingCheckoutSessionReply.

### `CreateBillingCheckoutSessionRequestInput` struct

```go
type CreateBillingCheckoutSessionRequestInput struct {
	OrgID  UUID   `json:"orgId"`
	PlanID string `json:"planId"`
}
```

CreateBillingCheckoutSessionRequestInput is the GraphQL input CreateBillingCheckoutSessionRequestInput.

### `CreateBillingPortalSessionReply` struct

```go
type CreateBillingPortalSessionReply struct {
	Status      string                `json:"status"`
	RequestID   UUID                  `json:"requestId"`
	ServerTime  *string               `json:"serverTime"`
	ReceiptID   *UUID                 `json:"receiptId"`
	CommittedAt *string               `json:"committedAt"`
	Replayed    *bool                 `json:"replayed"`
	Operation   *OperationRef         `json:"operation"`
	ResourceRef *ResourceRef          `json:"resourceRef"`
	Result      *BillingPortalSession `json:"result"`
}
```

CreateBillingPortalSessionReply is the GraphQL object CreateBillingPortalSessionReply.

### `CreateBillingPortalSessionRequestInput` struct

```go
type CreateBillingPortalSessionRequestInput struct {
	OrgID UUID `json:"orgId"`
}
```

CreateBillingPortalSessionRequestInput is the GraphQL input CreateBillingPortalSessionRequestInput.

### `CreateConversationReply` struct

```go
type CreateConversationReply struct {
	Status      string        `json:"status"`
	RequestID   UUID          `json:"requestId"`
	ServerTime  *string       `json:"serverTime"`
	ReceiptID   *UUID         `json:"receiptId"`
	CommittedAt *string       `json:"committedAt"`
	Replayed    *bool         `json:"replayed"`
	Operation   *OperationRef `json:"operation"`
	ResourceRef *ResourceRef  `json:"resourceRef"`
	Result      *Conversation `json:"result"`
}
```

CreateConversationReply is the GraphQL object CreateConversationReply.

### `CreateConversationRequestInput` struct

```go
type CreateConversationRequestInput struct {
	Title   string             `json:"title"`
	Props   Properties         `json:"props"`
	Members []MemberInputInput `json:"members"`
}
```

CreateConversationRequestInput is the GraphQL input CreateConversationRequestInput.

### `CreateDeploymentReply` struct

```go
type CreateDeploymentReply struct {
	Status      string           `json:"status"`
	RequestID   UUID             `json:"requestId"`
	ServerTime  *string          `json:"serverTime"`
	ReceiptID   *UUID            `json:"receiptId"`
	CommittedAt *string          `json:"committedAt"`
	Replayed    *bool            `json:"replayed"`
	Operation   *OperationRef    `json:"operation"`
	ResourceRef *ResourceRef     `json:"resourceRef"`
	Result      *OperationResult `json:"result"`
}
```

CreateDeploymentReply is the GraphQL object CreateDeploymentReply.

### `CreateDeploymentRequestInput` struct

```go
type CreateDeploymentRequestInput struct {
	OrgID                 UUID   `json:"orgId"`
	Offering              string `json:"offering"`
	GeoID                 string `json:"geoId"`
	InstallationProfileID string `json:"installationProfileId"`
	ConsentRef            string `json:"consentRef"`
}
```

CreateDeploymentRequestInput is the GraphQL input CreateDeploymentRequestInput.

### `CreateOrganizationReply` struct

```go
type CreateOrganizationReply struct {
	Status      string        `json:"status"`
	RequestID   UUID          `json:"requestId"`
	ServerTime  *string       `json:"serverTime"`
	ReceiptID   *UUID         `json:"receiptId"`
	CommittedAt *string       `json:"committedAt"`
	Replayed    *bool         `json:"replayed"`
	Operation   *OperationRef `json:"operation"`
	ResourceRef *ResourceRef  `json:"resourceRef"`
	Result      *Organization `json:"result"`
}
```

CreateOrganizationReply is the GraphQL object CreateOrganizationReply.

### `CreateOrganizationRequestInput` struct

```go
type CreateOrganizationRequestInput struct {
	Name     string `json:"name"`
	TermsRef string `json:"termsRef"`
}
```

CreateOrganizationRequestInput is the GraphQL input CreateOrganizationRequestInput.

### `CreatePrincipalReply` struct

```go
type CreatePrincipalReply struct {
	Status      string        `json:"status"`
	RequestID   UUID          `json:"requestId"`
	ServerTime  *string       `json:"serverTime"`
	ReceiptID   *UUID         `json:"receiptId"`
	CommittedAt *string       `json:"committedAt"`
	Replayed    *bool         `json:"replayed"`
	Operation   *OperationRef `json:"operation"`
	ResourceRef *ResourceRef  `json:"resourceRef"`
	Result      *Principal    `json:"result"`
}
```

CreatePrincipalReply is the GraphQL object CreatePrincipalReply.

### `CreatePrincipalRequestInput` struct

```go
type CreatePrincipalRequestInput struct {
	ExternalUserID string `json:"externalUserId"`
}
```

CreatePrincipalRequestInput is the GraphQL input CreatePrincipalRequestInput.

### `CreateProjectReply` struct

```go
type CreateProjectReply struct {
	Status      string           `json:"status"`
	RequestID   UUID             `json:"requestId"`
	ServerTime  *string          `json:"serverTime"`
	ReceiptID   *UUID            `json:"receiptId"`
	CommittedAt *string          `json:"committedAt"`
	Replayed    *bool            `json:"replayed"`
	Operation   *OperationRef    `json:"operation"`
	ResourceRef *ResourceRef     `json:"resourceRef"`
	Result      *OperationResult `json:"result"`
}
```

CreateProjectReply is the GraphQL object CreateProjectReply.

### `CreateProjectRequestInput` struct

```go
type CreateProjectRequestInput struct {
	DeploymentID         UUID   `json:"deploymentId"`
	Name                 string `json:"name"`
	Environment          string `json:"environment"`
	BackendPrincipalName string `json:"backendPrincipalName"`
}
```

CreateProjectRequestInput is the GraphQL input CreateProjectRequestInput.

### `CredentialCapsule` struct

```go
type CredentialCapsule struct {
	Kind               string  `json:"kind"`
	KeyID              *string `json:"keyId"`
	BackendPrincipalID *string `json:"backendPrincipalId"`
	BackendKey         *string `json:"backendKey"`
	ExpiresAt          *string `json:"expiresAt"`
	EndpointID         *UUID   `json:"endpointId"`
	SecretVersion      *string `json:"secretVersion"`
	Secret             *string `json:"secret"`
}
```

CredentialCapsule is the GraphQL object CredentialCapsule.

### `CredentialDelivery` struct

```go
type CredentialDelivery struct {
	DeliveryID        UUID         `json:"deliveryId"`
	Kind              string       `json:"kind"`
	ProjectID         UUID         `json:"projectId"`
	InstallationID    string       `json:"installationId"`
	ResourceRef       *ResourceRef `json:"resourceRef"`
	ExpiresAt         string       `json:"expiresAt"`
	PayloadDigest     string       `json:"payloadDigest"`
	RecipientActorRef *ActorRef    `json:"recipientActorRef"`
}
```

CredentialDelivery is the GraphQL object CredentialDelivery.

### `CredentialDeliveryReceipt` struct

```go
type CredentialDeliveryReceipt struct {
	DeliveryID UUID `json:"deliveryId"`
}
```

CredentialDeliveryReceipt is the GraphQL object CredentialDeliveryReceipt.

### `CredentialPermitReply` struct

```go
type CredentialPermitReply struct {
	Status      string        `json:"status"`
	RequestID   UUID          `json:"requestId"`
	ServerTime  *string       `json:"serverTime"`
	ReceiptID   *UUID         `json:"receiptId"`
	CommittedAt *string       `json:"committedAt"`
	Replayed    *bool         `json:"replayed"`
	Operation   *OperationRef `json:"operation"`
	ResourceRef *ResourceRef  `json:"resourceRef"`
	Result      SignedProof   `json:"result"`
}
```

CredentialPermitReply is the GraphQL object CredentialPermitReply.

### `CredentialPermitRequestInput` struct

```go
type CredentialPermitRequestInput struct {
	ProjectID           UUID `json:"projectId"`
	DeliveryID          UUID `json:"deliveryId"`
	RedemptionRequestID UUID `json:"redemptionRequestId"`
}
```

CredentialPermitRequestInput is the GraphQL input CredentialPermitRequestInput.

### `CurrentLiveSessionReply` struct

```go
type CurrentLiveSessionReply struct {
	Status     string       `json:"status"`
	RequestID  UUID         `json:"requestId"`
	ServerTime string       `json:"serverTime"`
	Result     *LiveSession `json:"result"`
}
```

CurrentLiveSessionReply is the GraphQL object CurrentLiveSessionReply.

### `Cursor` struct

```go
type Cursor struct {
	Incarnation    UUID    `json:"incarnation"`
	ConversationID UUID    `json:"conversationId"`
	Sequence       Decimal `json:"sequence"`
}
```

Cursor is the GraphQL object Cursor.

### `CutoffScope` struct

```go
type CutoffScope struct {
	Kind        string `json:"kind"`
	PrincipalID *UUID  `json:"principalId"`
	SessionID   *UUID  `json:"sessionId"`
	DeviceID    *UUID  `json:"deviceId"`
	CallID      *UUID  `json:"callId"`
}
```

CutoffScope is the GraphQL object CutoffScope.

### `DeleteMessageReply` struct

```go
type DeleteMessageReply struct {
	Status      string        `json:"status"`
	RequestID   UUID          `json:"requestId"`
	ServerTime  *string       `json:"serverTime"`
	ReceiptID   *UUID         `json:"receiptId"`
	CommittedAt *string       `json:"committedAt"`
	Replayed    *bool         `json:"replayed"`
	Operation   *OperationRef `json:"operation"`
	ResourceRef *ResourceRef  `json:"resourceRef"`
	Result      *Message      `json:"result"`
}
```

DeleteMessageReply is the GraphQL object DeleteMessageReply.

### `DeleteMessageRequestInput` struct

```go
type DeleteMessageRequestInput struct {
	ConversationID   UUID    `json:"conversationId"`
	MessageID        UUID    `json:"messageId"`
	ExpectedRevision Decimal `json:"expectedRevision"`
}
```

DeleteMessageRequestInput is the GraphQL input DeleteMessageRequestInput.

### `DeliveryAck` struct

```go
type DeliveryAck struct {
	DeliveryID   UUID `json:"deliveryId"`
	Acknowledged bool `json:"acknowledged"`
}
```

DeliveryAck is the GraphQL object DeliveryAck.

### `Deployment` struct

```go
type Deployment struct {
	DeploymentID    UUID     `json:"deploymentId"`
	OrgID           UUID     `json:"orgId"`
	Offering        string   `json:"offering"`
	GeoID           string   `json:"geoId"`
	InstallationID  string   `json:"installationId"`
	ResourceOwner   string   `json:"resourceOwner"`
	ApprovedRegions []string `json:"approvedRegions"`
	Readiness       string   `json:"readiness"`
	Revision        Decimal  `json:"revision"`
	ConsentRef      string   `json:"consentRef"`
	Environment     string   `json:"environment"`
}
```

Deployment is the GraphQL object Deployment.

### `DeploymentHealth` struct

```go
type DeploymentHealth struct {
	DeploymentID UUID                 `json:"deploymentId"`
	Readiness    string               `json:"readiness"`
	ObservedAt   string               `json:"observedAt"`
	Services     []ServiceObservation `json:"services"`
}
```

DeploymentHealth is the GraphQL object DeploymentHealth.

### `DeploymentHealthReply` struct

```go
type DeploymentHealthReply struct {
	Status      string            `json:"status"`
	RequestID   UUID              `json:"requestId"`
	ServerTime  *string           `json:"serverTime"`
	ReceiptID   *UUID             `json:"receiptId"`
	CommittedAt *string           `json:"committedAt"`
	Replayed    *bool             `json:"replayed"`
	Operation   *OperationRef     `json:"operation"`
	ResourceRef *ResourceRef      `json:"resourceRef"`
	Result      *DeploymentHealth `json:"result"`
}
```

DeploymentHealthReply is the GraphQL object DeploymentHealthReply.

### `DeploymentHealthRequestInput` struct

```go
type DeploymentHealthRequestInput struct {
	DeploymentID UUID `json:"deploymentId"`
}
```

DeploymentHealthRequestInput is the GraphQL input DeploymentHealthRequestInput.

### `DeploymentUsage` struct

```go
type DeploymentUsage struct {
	DeploymentID      UUID         `json:"deploymentId"`
	Source            string       `json:"source"`
	ObservedAt        string       `json:"observedAt"`
	Complete          bool         `json:"complete"`
	Reason            string       `json:"reason"`
	From              string       `json:"from"`
	To                string       `json:"to"`
	Meters            []UsageMeter `json:"meters"`
	AggregatedThrough *string      `json:"aggregatedThrough"`
}
```

DeploymentUsage is the GraphQL object DeploymentUsage.

### `DeploymentUsageReply` struct

```go
type DeploymentUsageReply struct {
	Status      string           `json:"status"`
	RequestID   UUID             `json:"requestId"`
	ServerTime  *string          `json:"serverTime"`
	ReceiptID   *UUID            `json:"receiptId"`
	CommittedAt *string          `json:"committedAt"`
	Replayed    *bool            `json:"replayed"`
	Operation   *OperationRef    `json:"operation"`
	ResourceRef *ResourceRef     `json:"resourceRef"`
	Result      *DeploymentUsage `json:"result"`
}
```

DeploymentUsageReply is the GraphQL object DeploymentUsageReply.

### `DeploymentUsageRequestInput` struct

```go
type DeploymentUsageRequestInput struct {
	DeploymentID UUID    `json:"deploymentId"`
	From         *string `json:"from,omitzero"`
	To           *string `json:"to,omitzero"`
}
```

DeploymentUsageRequestInput is the GraphQL input DeploymentUsageRequestInput.

### `DisablePrincipalReply` struct

```go
type DisablePrincipalReply struct {
	Status      string        `json:"status"`
	RequestID   UUID          `json:"requestId"`
	ServerTime  *string       `json:"serverTime"`
	ReceiptID   *UUID         `json:"receiptId"`
	CommittedAt *string       `json:"committedAt"`
	Replayed    *bool         `json:"replayed"`
	Operation   *OperationRef `json:"operation"`
	ResourceRef *ResourceRef  `json:"resourceRef"`
	Result      *Principal    `json:"result"`
}
```

DisablePrincipalReply is the GraphQL object DisablePrincipalReply.

### `DisablePrincipalRequestInput` struct

```go
type DisablePrincipalRequestInput struct {
	PrincipalID      UUID    `json:"principalId"`
	ExpectedRevision Decimal `json:"expectedRevision"`
}
```

DisablePrincipalRequestInput is the GraphQL input DisablePrincipalRequestInput.

### `DisableWebhookReply` struct

```go
type DisableWebhookReply struct {
	Status      string           `json:"status"`
	RequestID   UUID             `json:"requestId"`
	ServerTime  *string          `json:"serverTime"`
	ReceiptID   *UUID            `json:"receiptId"`
	CommittedAt *string          `json:"committedAt"`
	Replayed    *bool            `json:"replayed"`
	Operation   *OperationRef    `json:"operation"`
	ResourceRef *ResourceRef     `json:"resourceRef"`
	Result      *OperationResult `json:"result"`
}
```

DisableWebhookReply is the GraphQL object DisableWebhookReply.

### `DisableWebhookRequestInput` struct

```go
type DisableWebhookRequestInput struct {
	ProjectID        UUID    `json:"projectId"`
	EndpointID       UUID    `json:"endpointId"`
	ExpectedRevision Decimal `json:"expectedRevision"`
}
```

DisableWebhookRequestInput is the GraphQL input DisableWebhookRequestInput.

### `EditMessageReply` struct

```go
type EditMessageReply struct {
	Status      string        `json:"status"`
	RequestID   UUID          `json:"requestId"`
	ServerTime  *string       `json:"serverTime"`
	ReceiptID   *UUID         `json:"receiptId"`
	CommittedAt *string       `json:"committedAt"`
	Replayed    *bool         `json:"replayed"`
	Operation   *OperationRef `json:"operation"`
	ResourceRef *ResourceRef  `json:"resourceRef"`
	Result      *Message      `json:"result"`
}
```

EditMessageReply is the GraphQL object EditMessageReply.

### `EditMessageRequestInput` struct

```go
type EditMessageRequestInput struct {
	ConversationID   UUID       `json:"conversationId"`
	MessageID        UUID       `json:"messageId"`
	ExpectedRevision Decimal    `json:"expectedRevision"`
	Text             *string    `json:"text,omitzero"`
	Props            Properties `json:"props,omitzero"`
}
```

EditMessageRequestInput is the GraphQL input EditMessageRequestInput.

### `EndLiveSessionInput` struct

```go
type EndLiveSessionInput struct {
	LiveSessionID      UUID    `json:"liveSessionId"`
	ExpectedGeneration Decimal `json:"expectedGeneration"`
	ExpectedRevision   Decimal `json:"expectedRevision"`
}
```

EndLiveSessionInput is the GraphQL input EndLiveSessionInput.

### `EndLiveSessionPayload` struct

```go
type EndLiveSessionPayload struct {
	Status      string                  `json:"status"`
	RequestID   UUID                    `json:"requestId"`
	ReceiptID   UUID                    `json:"receiptId"`
	CommittedAt string                  `json:"committedAt"`
	Replayed    bool                    `json:"replayed"`
	Operation   OperationRef            `json:"operation"`
	Result      LiveSessionEndRequested `json:"result"`
}
```

EndLiveSessionPayload is the GraphQL object EndLiveSessionPayload.

### `Features` struct

```go
type Features struct {
	Chat          bool `json:"chat"`
	Inbox         bool `json:"inbox"`
	LexicalSearch bool `json:"lexicalSearch"`
	Typing        bool `json:"typing"`
	Webhooks      bool `json:"webhooks"`
	LiveSessions  bool `json:"liveSessions"`
	LiveBroadcast bool `json:"liveBroadcast"`
}
```

Features is the GraphQL object Features.

### `GetConversationReply` struct

```go
type GetConversationReply struct {
	Status      string        `json:"status"`
	RequestID   UUID          `json:"requestId"`
	ServerTime  *string       `json:"serverTime"`
	ReceiptID   *UUID         `json:"receiptId"`
	CommittedAt *string       `json:"committedAt"`
	Replayed    *bool         `json:"replayed"`
	Operation   *OperationRef `json:"operation"`
	ResourceRef *ResourceRef  `json:"resourceRef"`
	Result      *Conversation `json:"result"`
}
```

GetConversationReply is the GraphQL object GetConversationReply.

### `GetConversationRequestInput` struct

```go
type GetConversationRequestInput struct {
	ConversationID UUID `json:"conversationId"`
}
```

GetConversationRequestInput is the GraphQL input GetConversationRequestInput.

### `GetDeploymentReply` struct

```go
type GetDeploymentReply struct {
	Status      string        `json:"status"`
	RequestID   UUID          `json:"requestId"`
	ServerTime  *string       `json:"serverTime"`
	ReceiptID   *UUID         `json:"receiptId"`
	CommittedAt *string       `json:"committedAt"`
	Replayed    *bool         `json:"replayed"`
	Operation   *OperationRef `json:"operation"`
	ResourceRef *ResourceRef  `json:"resourceRef"`
	Result      *Deployment   `json:"result"`
}
```

GetDeploymentReply is the GraphQL object GetDeploymentReply.

### `GetDeploymentRequestInput` struct

```go
type GetDeploymentRequestInput struct {
	DeploymentID UUID `json:"deploymentId"`
}
```

GetDeploymentRequestInput is the GraphQL input GetDeploymentRequestInput.

### `GetMessageReply` struct

```go
type GetMessageReply struct {
	Status      string        `json:"status"`
	RequestID   UUID          `json:"requestId"`
	ServerTime  *string       `json:"serverTime"`
	ReceiptID   *UUID         `json:"receiptId"`
	CommittedAt *string       `json:"committedAt"`
	Replayed    *bool         `json:"replayed"`
	Operation   *OperationRef `json:"operation"`
	ResourceRef *ResourceRef  `json:"resourceRef"`
	Result      *Message      `json:"result"`
}
```

GetMessageReply is the GraphQL object GetMessageReply.

### `GetMessageRequestInput` struct

```go
type GetMessageRequestInput struct {
	ConversationID   UUID  `json:"conversationId"`
	MessageID        UUID  `json:"messageId"`
	ActAsPrincipalID *UUID `json:"actAsPrincipalId,omitzero"`
}
```

GetMessageRequestInput is the GraphQL input GetMessageRequestInput.

### `GetOperationReply` struct

```go
type GetOperationReply struct {
	Status      string        `json:"status"`
	RequestID   UUID          `json:"requestId"`
	ServerTime  *string       `json:"serverTime"`
	ReceiptID   *UUID         `json:"receiptId"`
	CommittedAt *string       `json:"committedAt"`
	Replayed    *bool         `json:"replayed"`
	Operation   *OperationRef `json:"operation"`
	ResourceRef *ResourceRef  `json:"resourceRef"`
	Result      *Operation    `json:"result"`
}
```

GetOperationReply is the GraphQL object GetOperationReply.

### `GetOperationRequestInput` struct

```go
type GetOperationRequestInput struct {
	OperationID UUID `json:"operationId"`
}
```

GetOperationRequestInput is the GraphQL input GetOperationRequestInput.

### `GetOrganizationReply` struct

```go
type GetOrganizationReply struct {
	Status      string        `json:"status"`
	RequestID   UUID          `json:"requestId"`
	ServerTime  *string       `json:"serverTime"`
	ReceiptID   *UUID         `json:"receiptId"`
	CommittedAt *string       `json:"committedAt"`
	Replayed    *bool         `json:"replayed"`
	Operation   *OperationRef `json:"operation"`
	ResourceRef *ResourceRef  `json:"resourceRef"`
	Result      *Organization `json:"result"`
}
```

GetOrganizationReply is the GraphQL object GetOrganizationReply.

### `GetOrganizationRequestInput` struct

```go
type GetOrganizationRequestInput struct {
	OrgID UUID `json:"orgId"`
}
```

GetOrganizationRequestInput is the GraphQL input GetOrganizationRequestInput.

### `GetPrincipalReply` struct

```go
type GetPrincipalReply struct {
	Status      string        `json:"status"`
	RequestID   UUID          `json:"requestId"`
	ServerTime  *string       `json:"serverTime"`
	ReceiptID   *UUID         `json:"receiptId"`
	CommittedAt *string       `json:"committedAt"`
	Replayed    *bool         `json:"replayed"`
	Operation   *OperationRef `json:"operation"`
	ResourceRef *ResourceRef  `json:"resourceRef"`
	Result      *Principal    `json:"result"`
}
```

GetPrincipalReply is the GraphQL object GetPrincipalReply.

### `GetPrincipalRequestInput` struct

```go
type GetPrincipalRequestInput struct {
	PrincipalID UUID `json:"principalId"`
}
```

GetPrincipalRequestInput is the GraphQL input GetPrincipalRequestInput.

### `GetProjectReply` struct

```go
type GetProjectReply struct {
	Status      string        `json:"status"`
	RequestID   UUID          `json:"requestId"`
	ServerTime  *string       `json:"serverTime"`
	ReceiptID   *UUID         `json:"receiptId"`
	CommittedAt *string       `json:"committedAt"`
	Replayed    *bool         `json:"replayed"`
	Operation   *OperationRef `json:"operation"`
	ResourceRef *ResourceRef  `json:"resourceRef"`
	Result      *Project      `json:"result"`
}
```

GetProjectReply is the GraphQL object GetProjectReply.

### `GetProjectRequestInput` struct

```go
type GetProjectRequestInput struct {
	ProjectID UUID `json:"projectId"`
}
```

GetProjectRequestInput is the GraphQL input GetProjectRequestInput.

### `HistoryGrantReply` struct

```go
type HistoryGrantReply struct {
	Status      string        `json:"status"`
	RequestID   UUID          `json:"requestId"`
	ServerTime  *string       `json:"serverTime"`
	ReceiptID   *UUID         `json:"receiptId"`
	CommittedAt *string       `json:"committedAt"`
	Replayed    *bool         `json:"replayed"`
	Operation   *OperationRef `json:"operation"`
	ResourceRef *ResourceRef  `json:"resourceRef"`
	Result      *Member       `json:"result"`
}
```

HistoryGrantReply is the GraphQL object HistoryGrantReply.

### `HistoryGrantRequestInput` struct

```go
type HistoryGrantRequestInput struct {
	ConversationID   UUID    `json:"conversationId"`
	PrincipalID      UUID    `json:"principalId"`
	MembershipEpoch  Decimal `json:"membershipEpoch"`
	ExpectedRevision Decimal `json:"expectedRevision"`
	FromSequence     Decimal `json:"fromSequence"`
}
```

HistoryGrantRequestInput is the GraphQL input HistoryGrantRequestInput.

### `InboxItem` struct

```go
type InboxItem struct {
	ConversationID       UUID     `json:"conversationId"`
	Title                string   `json:"title"`
	ActivityAt           *string  `json:"activityAt"`
	VisibilityEpoch      Decimal  `json:"visibilityEpoch"`
	LatestVisibleMessage *Message `json:"latestVisibleMessage"`
	HasUnread            bool     `json:"hasUnread"`
}
```

InboxItem is the GraphQL object InboxItem.

### `InboxPage` struct

```go
type InboxPage struct {
	Items           []InboxItem `json:"items"`
	Complete        bool        `json:"complete"`
	RefreshRequired bool        `json:"refreshRequired"`
	NextCursor      *string     `json:"nextCursor"`
	PartialReason   *string     `json:"partialReason"`
}
```

InboxPage is the GraphQL object InboxPage.

### `InboxReply` struct

```go
type InboxReply struct {
	Status      string        `json:"status"`
	RequestID   UUID          `json:"requestId"`
	ServerTime  *string       `json:"serverTime"`
	ReceiptID   *UUID         `json:"receiptId"`
	CommittedAt *string       `json:"committedAt"`
	Replayed    *bool         `json:"replayed"`
	Operation   *OperationRef `json:"operation"`
	ResourceRef *ResourceRef  `json:"resourceRef"`
	Result      *InboxPage    `json:"result"`
}
```

InboxReply is the GraphQL object InboxReply.

### `InboxRequestInput` struct

```go
type InboxRequestInput struct {
	Limit            PageSize `json:"limit"`
	Cursor           *string  `json:"cursor,omitzero"`
	ActAsPrincipalID *UUID    `json:"actAsPrincipalId,omitzero"`
}
```

InboxRequestInput is the GraphQL input InboxRequestInput.

### `IssueBackendKeyReply` struct

```go
type IssueBackendKeyReply struct {
	Status      string           `json:"status"`
	RequestID   UUID             `json:"requestId"`
	ServerTime  *string          `json:"serverTime"`
	ReceiptID   *UUID            `json:"receiptId"`
	CommittedAt *string          `json:"committedAt"`
	Replayed    *bool            `json:"replayed"`
	Operation   *OperationRef    `json:"operation"`
	ResourceRef *ResourceRef     `json:"resourceRef"`
	Result      *OperationResult `json:"result"`
}
```

IssueBackendKeyReply is the GraphQL object IssueBackendKeyReply.

### `IssueBackendKeyRequestInput` struct

```go
type IssueBackendKeyRequestInput struct {
	ProjectID UUID     `json:"projectId"`
	Name      string   `json:"name"`
	Scopes    []string `json:"scopes"`
	ExpiresAt string   `json:"expiresAt"`
}
```

IssueBackendKeyRequestInput is the GraphQL input IssueBackendKeyRequestInput.

### `IssueSessionReply` struct

```go
type IssueSessionReply struct {
	Status      string            `json:"status"`
	RequestID   UUID              `json:"requestId"`
	ServerTime  *string           `json:"serverTime"`
	ReceiptID   *UUID             `json:"receiptId"`
	CommittedAt *string           `json:"committedAt"`
	Replayed    *bool             `json:"replayed"`
	Operation   *OperationRef     `json:"operation"`
	ResourceRef *ResourceRef      `json:"resourceRef"`
	Result      *SessionBootstrap `json:"result"`
}
```

IssueSessionReply is the GraphQL object IssueSessionReply.

### `IssueSessionRequestInput` struct

```go
type IssueSessionRequestInput struct {
	PrincipalID    UUID    `json:"principalId"`
	DeviceID       UUID    `json:"deviceId"`
	RequestedTTLMs Decimal `json:"requestedTtlMs"`
}
```

IssueSessionRequestInput is the GraphQL input IssueSessionRequestInput.

### `Limit` struct

```go
type Limit struct {
	Maximum      *Decimal `json:"maximum"`
	Unit         *string  `json:"unit"`
	Scope        *string  `json:"scope"`
	Milliseconds *Decimal `json:"milliseconds"`
	PolicyID     *string  `json:"policyId"`
	Revision     *Decimal `json:"revision"`
}
```

Limit is the GraphQL object Limit.

### `LimitEntry` struct

```go
type LimitEntry struct {
	Key   string `json:"key"`
	Value Limit  `json:"value"`
}
```

LimitEntry is the GraphQL object LimitEntry.

### `LiveAlertBatch` struct

```go
type LiveAlertBatch struct {
	LiveSessionID UUID    `json:"liveSessionId"`
	Created       Decimal `json:"created"`
	Suppressed    Decimal `json:"suppressed"`
}
```

LiveAlertBatch is the GraphQL object LiveAlertBatch.

### `LiveCredentialIssuance` struct

```go
type LiveCredentialIssuance struct {
	LiveSessionID      UUID    `json:"liveSessionId"`
	ParticipationID    UUID    `json:"participationId"`
	Generation         Decimal `json:"generation"`
	LeaseID            UUID    `json:"leaseId"`
	GrantOrdinal       Decimal `json:"grantOrdinal"`
	AdmissionExpiresAt string  `json:"admissionExpiresAt"`
	LeaseExpiresAt     string  `json:"leaseExpiresAt"`
}
```

LiveCredentialIssuance is the GraphQL object LiveCredentialIssuance.

### `LiveCutoffScope` struct

```go
type LiveCutoffScope struct {
	Kind            LiveCutoffScopeKind `json:"kind"`
	LiveSessionID   UUID                `json:"liveSessionId"`
	Generation      Decimal             `json:"generation"`
	ParticipationID *UUID               `json:"participationId"`
}
```

LiveCutoffScope is the GraphQL object LiveCutoffScope.

### `LiveMediaCutoff` struct

```go
type LiveMediaCutoff struct {
	State       LiveCutoffState     `json:"state"`
	Scope       LiveCutoffScope     `json:"scope"`
	Evidence    *LiveCutoffEvidence `json:"evidence"`
	EnforcedAt  *string             `json:"enforcedAt"`
	OperationID *UUID               `json:"operationId"`
}
```

LiveMediaCutoff is the GraphQL object LiveMediaCutoff.

### `LiveMediaPermissions` struct

```go
type LiveMediaPermissions struct {
	Microphone bool `json:"microphone"`
	Camera     bool `json:"camera"`
	Subscribe  bool `json:"subscribe"`
}
```

LiveMediaPermissions is the GraphQL object LiveMediaPermissions.

### `LiveOperationFailure` struct

```go
type LiveOperationFailure struct {
	Code    LiveErrorCode `json:"code"`
	Message string        `json:"message"`
}
```

LiveOperationFailure is the GraphQL object LiveOperationFailure.

### `LiveParticipantPage` struct

```go
type LiveParticipantPage struct {
	Items           []LiveParticipation `json:"items"`
	NextCursor      *string             `json:"nextCursor"`
	Complete        bool                `json:"complete"`
	PartialReason   *string             `json:"partialReason"`
	RefreshRequired bool                `json:"refreshRequired"`
}
```

LiveParticipantPage is the GraphQL object LiveParticipantPage.

### `LiveParticipantPageReply` struct

```go
type LiveParticipantPageReply struct {
	Status     string              `json:"status"`
	RequestID  UUID                `json:"requestId"`
	ServerTime string              `json:"serverTime"`
	Result     LiveParticipantPage `json:"result"`
}
```

LiveParticipantPageReply is the GraphQL object LiveParticipantPageReply.

### `LiveParticipantsInput` struct

```go
type LiveParticipantsInput struct {
	LiveSessionID UUID      `json:"liveSessionId"`
	Limit         *PageSize `json:"limit,omitzero"`
	Cursor        *string   `json:"cursor,omitzero"`
}
```

LiveParticipantsInput is the GraphQL input LiveParticipantsInput.

### `LiveParticipation` struct

```go
type LiveParticipation struct {
	ParticipationID      UUID                   `json:"participationId"`
	PrincipalID          UUID                   `json:"principalId"`
	MembershipEpoch      Decimal                `json:"membershipEpoch"`
	Role                 LiveRole               `json:"role"`
	State                LiveParticipationState `json:"state"`
	Permissions          LiveMediaPermissions   `json:"permissions"`
	ReservationExpiresAt *string                `json:"reservationExpiresAt"`
	NativeConnectionID   *UUID                  `json:"nativeConnectionId"`
	MediaCutoff          *LiveMediaCutoff       `json:"mediaCutoff"`
}
```

LiveParticipation is the GraphQL object LiveParticipation.

### `LiveSession` struct

```go
type LiveSession struct {
	LiveSessionID   UUID               `json:"liveSessionId"`
	ConversationID  UUID               `json:"conversationId"`
	CreatorID       UUID               `json:"creatorId"`
	Kind            LiveSessionKind    `json:"kind"`
	MediaProfile    LiveMediaProfile   `json:"mediaProfile"`
	State           LiveSessionState   `json:"state"`
	Generation      Decimal            `json:"generation"`
	Revision        Decimal            `json:"revision"`
	CreatedAt       string             `json:"createdAt"`
	ExpiresAt       string             `json:"expiresAt"`
	MyParticipation *LiveParticipation `json:"myParticipation"`
	MediaCutoff     *LiveMediaCutoff   `json:"mediaCutoff"`
}
```

LiveSession is the GraphQL object LiveSession.

### `LiveSessionEndRequested` struct

```go
type LiveSessionEndRequested struct {
	LiveSessionID UUID            `json:"liveSessionId"`
	OperationID   UUID            `json:"operationId"`
	MediaCutoff   LiveMediaCutoff `json:"mediaCutoff"`
}
```

LiveSessionEndRequested is the GraphQL object LiveSessionEndRequested.

### `LiveSessionInput` struct

```go
type LiveSessionInput struct {
	LiveSessionID UUID `json:"liveSessionId"`
}
```

LiveSessionInput is the GraphQL input LiveSessionInput.

### `LiveSessionJoined` struct

```go
type LiveSessionJoined struct {
	LiveSessionID UUID              `json:"liveSessionId"`
	Generation    Decimal           `json:"generation"`
	Participation LiveParticipation `json:"participation"`
}
```

LiveSessionJoined is the GraphQL object LiveSessionJoined.

### `LiveSessionLeft` struct

```go
type LiveSessionLeft struct {
	LiveSessionID   UUID            `json:"liveSessionId"`
	ParticipationID UUID            `json:"participationId"`
	MediaCutoff     LiveMediaCutoff `json:"mediaCutoff"`
}
```

LiveSessionLeft is the GraphQL object LiveSessionLeft.

### `LiveSessionOperation` struct

```go
type LiveSessionOperation struct {
	OperationID   UUID                            `json:"operationId"`
	RequestID     UUID                            `json:"requestId"`
	LiveSessionID UUID                            `json:"liveSessionId"`
	Kind          LiveOperationKind               `json:"kind"`
	State         LiveOperationState              `json:"state"`
	Revision      Decimal                         `json:"revision"`
	RequestedAt   string                          `json:"requestedAt"`
	CompletedAt   *string                         `json:"completedAt"`
	Completion    *LiveSessionOperationCompletion `json:"completion"`
	Failure       *LiveOperationFailure           `json:"failure"`
}
```

LiveSessionOperation is the GraphQL object LiveSessionOperation.

### `LiveSessionOperationCompletion` struct

```go
type LiveSessionOperationCompletion struct {
	LiveSessionID UUID             `json:"liveSessionId"`
	Generation    Decimal          `json:"generation"`
	State         LiveSessionState `json:"state"`
	Revision      Decimal          `json:"revision"`
	CompletedAt   string           `json:"completedAt"`
	MediaCutoff   *LiveMediaCutoff `json:"mediaCutoff"`
}
```

LiveSessionOperationCompletion is the GraphQL object LiveSessionOperationCompletion.

### `LiveSessionOperationInput` struct

```go
type LiveSessionOperationInput struct {
	OperationID UUID `json:"operationId"`
}
```

LiveSessionOperationInput is the GraphQL input LiveSessionOperationInput.

### `LiveSessionOperationReply` struct

```go
type LiveSessionOperationReply struct {
	Status     string               `json:"status"`
	RequestID  UUID                 `json:"requestId"`
	ServerTime string               `json:"serverTime"`
	Result     LiveSessionOperation `json:"result"`
}
```

LiveSessionOperationReply is the GraphQL object LiveSessionOperationReply.

### `LiveSessionPage` struct

```go
type LiveSessionPage struct {
	Items           []LiveSession `json:"items"`
	NextCursor      *string       `json:"nextCursor"`
	Complete        bool          `json:"complete"`
	PartialReason   *string       `json:"partialReason"`
	RefreshRequired bool          `json:"refreshRequired"`
}
```

LiveSessionPage is the GraphQL object LiveSessionPage.

### `LiveSessionPageReply` struct

```go
type LiveSessionPageReply struct {
	Status     string          `json:"status"`
	RequestID  UUID            `json:"requestId"`
	ServerTime string          `json:"serverTime"`
	Result     LiveSessionPage `json:"result"`
}
```

LiveSessionPageReply is the GraphQL object LiveSessionPageReply.

### `LiveSessionReply` struct

```go
type LiveSessionReply struct {
	Status     string      `json:"status"`
	RequestID  UUID        `json:"requestId"`
	ServerTime string      `json:"serverTime"`
	Result     LiveSession `json:"result"`
}
```

LiveSessionReply is the GraphQL object LiveSessionReply.

### `LiveSessionStarted` struct

```go
type LiveSessionStarted struct {
	LiveSessionID  UUID             `json:"liveSessionId"`
	ConversationID UUID             `json:"conversationId"`
	Kind           LiveSessionKind  `json:"kind"`
	MediaProfile   LiveMediaProfile `json:"mediaProfile"`
	OperationID    UUID             `json:"operationId"`
}
```

LiveSessionStarted is the GraphQL object LiveSessionStarted.

### `LiveSessionsInput` struct

```go
type LiveSessionsInput struct {
	ConversationID UUID      `json:"conversationId"`
	Limit          *PageSize `json:"limit,omitzero"`
	Cursor         *string   `json:"cursor,omitzero"`
}
```

LiveSessionsInput is the GraphQL input LiveSessionsInput.

### `ManagementClient` struct

```go
type ManagementClient struct {
	// contains filtered or unexported fields
}
```

ManagementClient calls the management plane. Organizations, deployments, projects, backend keys and webhooks.

Bearer credential: portalCredential. Operator credential for the management plane. Server runtimes only.

#### `ManagementClient.Retry` method

```go
func (c *ManagementClient) Retry(ctx context.Context, requestID string) (*RequestResolution, error)
```

Retry settles a mutation this client recorded with an unknown outcome. It reads the request's resolution and returns it once the authority has observed the request. Otherwise it sends the request again with its original request ID and payload, within the operation's retry budget, and returns the resolution read afterwards. It never sends a request under a new identity. It fails with a plain error, not a `*Problem`, when the client has no record of requestID.

Sends [`management.resolveRequest`](../../operations/management/resolveRequest.md).

#### `ManagementClient.RecoveryRecords` method

```go
func (c *ManagementClient) RecoveryRecords(ctx context.Context) ([]RecoveryRecord, error)
```

RecoveryRecords returns copies of the client's recovery records, oldest first.

#### `ManagementClient.Capabilities` method

```go
func (c *ManagementClient) Capabilities(ctx context.Context, opts ...CallOption) (*CapabilitiesReply, error)
```

Capabilities calls the management.capabilities query. Describe the management features and limits the authority supports.

Idempotency: safe. Read-only. Repeat freely; each attempt may use a new requestId. Authorized by portalCredential.

Sends [`management.capabilities`](../../operations/management/capabilities.md).

#### `ManagementClient.Organizations` method

```go
func (c *ManagementClient) Organizations(ctx context.Context, opts ...CallOption) (*OrganizationsReply, error)
```

Organizations calls the management.organizations query. List the organizations the caller can access.

Idempotency: safe. Read-only. Repeat freely; each attempt may use a new requestId. Pagination: bounded. One bounded page without a cursor input. complete reports whether every item fit. Authorized by portalCredential.

Sends [`management.organizations`](../../operations/management/organizations.md).

#### `ManagementClient.GetOrganization` method

```go
func (c *ManagementClient) GetOrganization(ctx context.Context, input GetOrganizationRequestInput, opts ...CallOption) (*GetOrganizationReply, error)
```

GetOrganization calls the management.getOrganization query. Read an organization.

Idempotency: safe. Read-only. Repeat freely; each attempt may use a new requestId. Authorized by portalCredential (condition: owner).

Sends [`management.getOrganization`](../../operations/management/getOrganization.md).

#### `ManagementClient.GetDeployment` method

```go
func (c *ManagementClient) GetDeployment(ctx context.Context, input GetDeploymentRequestInput, opts ...CallOption) (*GetDeploymentReply, error)
```

GetDeployment calls the management.getDeployment query. Read a deployment.

Idempotency: safe. Read-only. Repeat freely; each attempt may use a new requestId. Authorized by portalCredential (condition: owner).

Sends [`management.getDeployment`](../../operations/management/getDeployment.md).

#### `ManagementClient.GetProject` method

```go
func (c *ManagementClient) GetProject(ctx context.Context, input GetProjectRequestInput, opts ...CallOption) (*GetProjectReply, error)
```

GetProject calls the management.getProject query. Read a project.

Idempotency: safe. Read-only. Repeat freely; each attempt may use a new requestId. Authorized by portalCredential (condition: owner).

Sends [`management.getProject`](../../operations/management/getProject.md).

#### `ManagementClient.DeploymentHealth` method

```go
func (c *ManagementClient) DeploymentHealth(ctx context.Context, input DeploymentHealthRequestInput, opts ...CallOption) (*DeploymentHealthReply, error)
```

DeploymentHealth calls the management.deploymentHealth query. Read the health of a deployment.

Idempotency: safe. Read-only. Repeat freely; each attempt may use a new requestId. Authorized by portalCredential (condition: owner).

Sends [`management.deploymentHealth`](../../operations/management/deploymentHealth.md).

#### `ManagementClient.DeploymentUsage` method

```go
func (c *ManagementClient) DeploymentUsage(ctx context.Context, input DeploymentUsageRequestInput, opts ...CallOption) (*DeploymentUsageReply, error)
```

DeploymentUsage calls the management.deploymentUsage query. Read the metered usage of a deployment, summed over its projects. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days.

Idempotency: safe. Read-only. Repeat freely; each attempt may use a new requestId. Authorized by portalCredential (condition: owner).

Sends [`management.deploymentUsage`](../../operations/management/deploymentUsage.md).

#### `ManagementClient.ProjectUsage` method

```go
func (c *ManagementClient) ProjectUsage(ctx context.Context, input ProjectUsageRequestInput, opts ...CallOption) (*ProjectUsageReply, error)
```

ProjectUsage calls the management.projectUsage query. Read the metered usage of a project. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days.

Idempotency: safe. Read-only. Repeat freely; each attempt may use a new requestId. Authorized by portalCredential (condition: owner).

Sends [`management.projectUsage`](../../operations/management/projectUsage.md).

#### `ManagementClient.OrganizationUsage` method

```go
func (c *ManagementClient) OrganizationUsage(ctx context.Context, input OrganizationUsageRequestInput, opts ...CallOption) (*OrganizationUsageReply, error)
```

OrganizationUsage calls the management.organizationUsage query. Read the metered usage of an organization in any status, summed over its projects. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days.

Idempotency: safe. Read-only. Repeat freely; each attempt may use a new requestId. Authorized by portalCredential (condition: owner).

Sends [`management.organizationUsage`](../../operations/management/organizationUsage.md).

#### `ManagementClient.OrganizationBilling` method

```go
func (c *ManagementClient) OrganizationBilling(ctx context.Context, input OrganizationBillingRequestInput, opts ...CallOption) (*OrganizationBillingReply, error)
```

OrganizationBilling calls the management.organizationBilling query. Read the billing state of an organization in any status: the plan whose limits apply, whether ConvoHop bills the organization and, when it does, its standing and subscription.

Idempotency: safe. Read-only. Repeat freely; each attempt may use a new requestId. Authorized by portalCredential (condition: owner).

#### `ManagementClient.WebhookEndpoints` method

```go
func (c *ManagementClient) WebhookEndpoints(ctx context.Context, input WebhookEndpointsRequestInput, opts ...CallOption) (*WebhookEndpointsReply, error)
```

WebhookEndpoints calls the management.webhookEndpoints query. List the webhook endpoints of a project with their status, signing-secret rotation and delivery health.

Idempotency: safe. Read-only. Repeat freely; each attempt may use a new requestId. Pagination: bounded. One bounded page without a cursor input. complete reports whether every item fit. Authorized by portalCredential (condition: owner).

Sends [`management.webhookEndpoints`](../../operations/management/webhookEndpoints.md).

#### `ManagementClient.WebhookDeliveries` method

```go
func (c *ManagementClient) WebhookDeliveries(ctx context.Context, input WebhookDeliveriesRequestInput, opts ...CallOption) (*WebhookDeliveriesReply, error)
```

WebhookDeliveries calls the management.webhookDeliveries query. List recent deliveries of a webhook endpoint.

Idempotency: safe. Read-only. Repeat freely; each attempt may use a new requestId. Pagination: bounded. One bounded page without a cursor input. complete reports whether every item fit. Authorized by portalCredential (condition: owner).

Sends [`management.webhookDeliveries`](../../operations/management/webhookDeliveries.md).

#### `ManagementClient.ResolveRequest` method

```go
func (c *ManagementClient) ResolveRequest(ctx context.Context, input ResolveRequestRequestInput, opts ...CallOption) (*ResolveRequestReply, error)
```

ResolveRequest calls the management.resolveRequest query. Look up the stored outcome of an earlier management mutation by its requestId.

Idempotency: safe. Read-only. Repeat freely; each attempt may use a new requestId. Authorized by portalCredential (condition: ownRequest).

Sends [`management.resolveRequest`](../../operations/management/resolveRequest.md).

#### `ManagementClient.GetOperation` method

```go
func (c *ManagementClient) GetOperation(ctx context.Context, input GetOperationRequestInput, opts ...CallOption) (*GetOperationReply, error)
```

GetOperation calls the management.getOperation query. Read the state of a long-running management operation.

Idempotency: safe. Read-only. Repeat freely; each attempt may use a new requestId. Authorized by portalCredential (condition: owner).

Sends [`management.getOperation`](../../operations/management/getOperation.md).

#### `ManagementClient.CreateOrganization` method

```go
func (c *ManagementClient) CreateOrganization(ctx context.Context, input CreateOrganizationRequestInput, opts ...CallOption) (*CreateOrganizationReply, error)
```

CreateOrganization calls the management.createOrganization mutation. Create an organization.

Idempotency: idempotent. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest. Retry budget: 3 attempts within 60 seconds. Authorized by portalCredential.

Sends [`management.createOrganization`](../../operations/management/createOrganization.md).

#### `ManagementClient.CreateDeployment` method

```go
func (c *ManagementClient) CreateDeployment(ctx context.Context, input CreateDeploymentRequestInput, opts ...CallOption) (*CreateDeploymentReply, error)
```

CreateDeployment calls the management.createDeployment mutation. Create a deployment in an organization. Completes asynchronously.

Idempotency: idempotent. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest. Retry budget: 3 attempts within 60 seconds. Long-running: poll `ManagementClient.GetOperation` with the reply's Operation reference until the work completes. Authorized by portalCredential (condition: owner).

Sends [`management.createDeployment`](../../operations/management/createDeployment.md).

#### `ManagementClient.CreateProject` method

```go
func (c *ManagementClient) CreateProject(ctx context.Context, input CreateProjectRequestInput, opts ...CallOption) (*CreateProjectReply, error)
```

CreateProject calls the management.createProject mutation. Create a project in a ready deployment. Completes asynchronously.

Idempotency: idempotent. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest. Retry budget: 3 attempts within 60 seconds. Long-running: poll `ManagementClient.GetOperation` with the reply's Operation reference until the work completes. Authorized by portalCredential (condition: owner).

Sends [`management.createProject`](../../operations/management/createProject.md).

#### `ManagementClient.IssueBackendKey` method

```go
func (c *ManagementClient) IssueBackendKey(ctx context.Context, input IssueBackendKeyRequestInput, opts ...CallOption) (*IssueBackendKeyReply, error)
```

IssueBackendKey calls the management.issueBackendKey mutation. Issue a scoped backend key. The secret is delivered once through a credential delivery.

Idempotency: idempotent. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest. Retry budget: 3 attempts within 60 seconds. Long-running: poll `ManagementClient.GetOperation` with the reply's Operation reference until the work completes. Authorized by portalCredential (condition: owner).

Sends [`management.issueBackendKey`](../../operations/management/issueBackendKey.md).

#### `ManagementClient.RevokeBackendKey` method

```go
func (c *ManagementClient) RevokeBackendKey(ctx context.Context, input RevokeBackendKeyRequestInput, opts ...CallOption) (*RevokeBackendKeyReply, error)
```

RevokeBackendKey calls the management.revokeBackendKey mutation. Revoke a backend key, optionally revoking the sessions it issued.

Idempotency: idempotent. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest. Retry budget: 3 attempts within 60 seconds. Long-running: poll `ManagementClient.GetOperation` with the reply's Operation reference until the work completes. Authorized by portalCredential (condition: owner).

Sends [`management.revokeBackendKey`](../../operations/management/revokeBackendKey.md).

#### `ManagementClient.ProjectPolicy` method

```go
func (c *ManagementClient) ProjectPolicy(ctx context.Context, input ProjectPolicyRequestInput, opts ...CallOption) (*ProjectPolicyReply, error)
```

ProjectPolicy calls the management.projectPolicy mutation. Change the policy of a project.

Idempotency: idempotent. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest. Retry budget: 3 attempts within 60 seconds. Long-running: poll `ManagementClient.GetOperation` with the reply's Operation reference until the work completes. Authorized by portalCredential (condition: owner).

Sends [`management.projectPolicy`](../../operations/management/projectPolicy.md).

#### `ManagementClient.CredentialPermit` method

```go
func (c *ManagementClient) CredentialPermit(ctx context.Context, input CredentialPermitRequestInput, opts ...CallOption) (*CredentialPermitReply, error)
```

CredentialPermit calls the management.credentialPermit mutation. Issue a signed permit that authorizes redeeming one credential delivery.

Idempotency: idempotent. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest. Retry budget: 3 attempts within 60 seconds. Authorized by portalCredential (condition: owner).

Sends [`management.credentialPermit`](../../operations/management/credentialPermit.md).

#### `ManagementClient.PauseOperation` method

```go
func (c *ManagementClient) PauseOperation(ctx context.Context, input PauseOperationRequestInput, opts ...CallOption) (*PauseOperationReply, error)
```

PauseOperation calls the management.pauseOperation mutation. Pause a long-running operation.

Idempotency: idempotent. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest. Retry budget: 3 attempts within 60 seconds. Authorized by portalCredential (condition: owner).

Sends [`management.pauseOperation`](../../operations/management/pauseOperation.md).

#### `ManagementClient.ResumeOperation` method

```go
func (c *ManagementClient) ResumeOperation(ctx context.Context, input ResumeOperationRequestInput, opts ...CallOption) (*ResumeOperationReply, error)
```

ResumeOperation calls the management.resumeOperation mutation. Resume a paused operation.

Idempotency: idempotent. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest. Retry budget: 3 attempts within 60 seconds. Authorized by portalCredential (condition: owner).

Sends [`management.resumeOperation`](../../operations/management/resumeOperation.md).

#### `ManagementClient.CreateBillingCheckoutSession` method

```go
func (c *ManagementClient) CreateBillingCheckoutSession(ctx context.Context, input CreateBillingCheckoutSessionRequestInput, opts ...CallOption) (*CreateBillingCheckoutSessionReply, error)
```

CreateBillingCheckoutSession calls the management.createBillingCheckoutSession mutation. Create a hosted checkout link that subscribes an active organization to a self-service plan. The link grants access to whoever holds it; a retry with the same requestId returns the same link until it expires.

Idempotency: singleUse. Like idempotent, but the result carries a short-lived credential for one connection. Request a new one instead of reusing an expired result. Retry budget: 3 attempts within 60 seconds. Authorized by portalCredential (condition: owner).

#### `ManagementClient.CreateBillingPortalSession` method

```go
func (c *ManagementClient) CreateBillingPortalSession(ctx context.Context, input CreateBillingPortalSessionRequestInput, opts ...CallOption) (*CreateBillingPortalSessionReply, error)
```

CreateBillingPortalSession calls the management.createBillingPortalSession mutation. Create a hosted billing portal link where an organization manages its payment methods, invoices and subscription. The link grants access to whoever holds it; a retry with the same requestId returns the same link until it expires.

Idempotency: singleUse. Like idempotent, but the result carries a short-lived credential for one connection. Request a new one instead of reusing an expired result. Retry budget: 3 attempts within 60 seconds. Authorized by portalCredential (condition: owner).

#### `ManagementClient.ConfigureWebhook` method

```go
func (c *ManagementClient) ConfigureWebhook(ctx context.Context, input ConfigureWebhookRequestInput, opts ...CallOption) (*ConfigureWebhookReply, error)
```

ConfigureWebhook calls the management.configureWebhook mutation. Create a webhook endpoint for project events. The signing secret is delivered once through a credential delivery.

Idempotency: idempotent. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest. Retry budget: 3 attempts within 60 seconds. Long-running: poll `ManagementClient.GetOperation` with the reply's Operation reference until the work completes. Authorized by portalCredential (condition: owner).

Sends [`management.configureWebhook`](../../operations/management/configureWebhook.md).

#### `ManagementClient.UpdateWebhook` method

```go
func (c *ManagementClient) UpdateWebhook(ctx context.Context, input UpdateWebhookRequestInput, opts ...CallOption) (*UpdateWebhookReply, error)
```

UpdateWebhook calls the management.updateWebhook mutation. Change the event types of a webhook endpoint, or enable or disable it.

Idempotency: idempotent. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest. Retry budget: 3 attempts within 60 seconds. Long-running: poll `ManagementClient.GetOperation` with the reply's Operation reference until the work completes. Authorized by portalCredential (condition: owner).

Sends [`management.updateWebhook`](../../operations/management/updateWebhook.md).

#### `ManagementClient.RotateWebhookSecret` method

```go
func (c *ManagementClient) RotateWebhookSecret(ctx context.Context, input RotateWebhookSecretRequestInput, opts ...CallOption) (*RotateWebhookSecretReply, error)
```

RotateWebhookSecret calls the management.rotateWebhookSecret mutation. Start rotating the signing secret of a webhook endpoint. The next secret is delivered once through a credential delivery.

Idempotency: idempotent. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest. Retry budget: 3 attempts within 60 seconds. Long-running: poll `ManagementClient.GetOperation` with the reply's Operation reference until the work completes. Authorized by portalCredential (condition: owner).

Sends [`management.rotateWebhookSecret`](../../operations/management/rotateWebhookSecret.md).

#### `ManagementClient.DisableWebhook` method

```go
func (c *ManagementClient) DisableWebhook(ctx context.Context, input DisableWebhookRequestInput, opts ...CallOption) (*DisableWebhookReply, error)
```

DisableWebhook calls the management.disableWebhook mutation. Disable a webhook endpoint.

Idempotency: idempotent. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest. Retry budget: 3 attempts within 60 seconds. Long-running: poll `ManagementClient.GetOperation` with the reply's Operation reference until the work completes. Authorized by portalCredential (condition: owner).

Sends [`management.disableWebhook`](../../operations/management/disableWebhook.md).

#### `ManagementClient.ReplayWebhookDeliveries` method

```go
func (c *ManagementClient) ReplayWebhookDeliveries(ctx context.Context, input ReplayWebhookDeliveriesRequestInput, opts ...CallOption) (*ReplayWebhookDeliveriesReply, error)
```

ReplayWebhookDeliveries calls the management.replayWebhookDeliveries mutation. Redeliver one webhook delivery, or the deliveries of an endpoint in a time range, with their original event IDs.

Idempotency: idempotent. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest. Retry budget: 3 attempts within 60 seconds. Long-running: poll `ManagementClient.GetOperation` with the reply's Operation reference until the work completes. Authorized by portalCredential (condition: owner).

Sends [`management.replayWebhookDeliveries`](../../operations/management/replayWebhookDeliveries.md).

### `ManagementConfig` struct

```go
type ManagementConfig struct {
	BaseURL     string
	AccessToken string
	ActorID     string
}
```

ManagementConfig configures a `ManagementClient`.

#### `ManagementConfig.BaseURL` property

```go
BaseURL string
```

BaseURL is the authority origin, such as `https://api.example.com`. HTTP is accepted only for localhost, 127.0.0.1 and \[::1\].

#### `ManagementConfig.AccessToken` property

```go
AccessToken string
```

AccessToken is an operator access token. Keep it in trusted server runtimes; never ship it to a browser or a mobile app.

#### `ManagementConfig.ActorID` property

```go
ActorID string
```

ActorID identifies the operator, a canonical lowercase UUID. It names the client's recovery records in a `RecoveryStore`.

### `MediaCutoff` struct

```go
type MediaCutoff struct {
	State string       `json:"state"`
	Scope *CutoffScope `json:"scope"`
}
```

MediaCutoff is the GraphQL object MediaCutoff.

### `MediaPolicy` struct

```go
type MediaPolicy struct {
	LeasePolicyID    string  `json:"leasePolicyId"`
	MaxLeaseMs       Decimal `json:"maxLeaseMs"`
	RenewAttemptMs   Decimal `json:"renewAttemptMs"`
	PreludeMaxBytes  string  `json:"preludeMaxBytes"`
	PreludeTimeoutMs string  `json:"preludeTimeoutMs"`
	ClockProfileID   string  `json:"clockProfileId"`
}
```

MediaPolicy is the GraphQL object MediaPolicy.

### `Member` struct

```go
type Member struct {
	ConversationID      UUID    `json:"conversationId"`
	PrincipalID         UUID    `json:"principalId"`
	Role                string  `json:"role"`
	Status              string  `json:"status"`
	MembershipEpoch     Decimal `json:"membershipEpoch"`
	VisibilityEpoch     Decimal `json:"visibilityEpoch"`
	Revision            Decimal `json:"revision"`
	VisibleFromSequence Decimal `json:"visibleFromSequence"`
	CanStartBroadcast   bool    `json:"canStartBroadcast"`
}
```

Member is the GraphQL object Member.

### `MemberBatchEntryInput` struct

```go
type MemberBatchEntryInput struct {
	PrincipalID      UUID    `json:"principalId"`
	Role             string  `json:"role"`
	ExpectedRevision Decimal `json:"expectedRevision"`
}
```

MemberBatchEntryInput is the GraphQL input MemberBatchEntryInput.

### `MemberInputInput` struct

```go
type MemberInputInput struct {
	PrincipalID UUID   `json:"principalId"`
	Role        string `json:"role"`
}
```

MemberInputInput is the GraphQL input MemberInputInput.

### `MemberPage` struct

```go
type MemberPage struct {
	Items           []Member `json:"items"`
	Complete        bool     `json:"complete"`
	RefreshRequired bool     `json:"refreshRequired"`
	NextCursor      *string  `json:"nextCursor"`
}
```

MemberPage is the GraphQL object MemberPage.

### `MembersReply` struct

```go
type MembersReply struct {
	Status      string        `json:"status"`
	RequestID   UUID          `json:"requestId"`
	ServerTime  *string       `json:"serverTime"`
	ReceiptID   *UUID         `json:"receiptId"`
	CommittedAt *string       `json:"committedAt"`
	Replayed    *bool         `json:"replayed"`
	Operation   *OperationRef `json:"operation"`
	ResourceRef *ResourceRef  `json:"resourceRef"`
	Result      *MemberPage   `json:"result"`
}
```

MembersReply is the GraphQL object MembersReply.

### `MembersRequestInput` struct

```go
type MembersRequestInput struct {
	ConversationID UUID     `json:"conversationId"`
	Limit          PageSize `json:"limit"`
	Cursor         *string  `json:"cursor,omitzero"`
}
```

MembersRequestInput is the GraphQL input MembersRequestInput.

### `MemoryRecoveryStore` struct

```go
type MemoryRecoveryStore struct {
	// contains filtered or unexported fields
}
```

MemoryRecoveryStore is a `RecoveryStore` in process memory. It keeps a client's recovery records when you replace the client within one process; it does not survive a restart. The zero value is ready to use.

#### `MemoryRecoveryStore.Load` method

```go
func (s *MemoryRecoveryStore) Load(_ context.Context, key string) ([]byte, error)
```

Load returns a copy of the data stored under key.

#### `MemoryRecoveryStore.Store` method

```go
func (s *MemoryRecoveryStore) Store(_ context.Context, key string, data []byte) error
```

Store keeps a copy of data under key.

### `Message` struct

```go
type Message struct {
	MessageID        UUID       `json:"messageId"`
	ConversationID   UUID       `json:"conversationId"`
	AuthorID         string     `json:"authorId"`
	Sequence         Decimal    `json:"sequence"`
	Revision         Decimal    `json:"revision"`
	RevisionSequence Decimal    `json:"revisionSequence"`
	CreatedAt        string     `json:"createdAt"`
	Deleted          bool       `json:"deleted"`
	Text             *string    `json:"text"`
	Props            Properties `json:"props"`
	EditedAt         *string    `json:"editedAt"`
}
```

Message is the GraphQL object Message.

### `MessageAck` struct

```go
type MessageAck struct {
	MessageID      UUID    `json:"messageId"`
	ConversationID UUID    `json:"conversationId"`
	Sequence       Decimal `json:"sequence"`
	Revision       Decimal `json:"revision"`
	Status         string  `json:"status"`
	Cursor         *Cursor `json:"cursor"`
}
```

MessageAck is the GraphQL object MessageAck.

### `MessagePage` struct

```go
type MessagePage struct {
	Items           []Message `json:"items"`
	Complete        bool      `json:"complete"`
	RefreshRequired bool      `json:"refreshRequired"`
	NextCursor      *string   `json:"nextCursor"`
}
```

MessagePage is the GraphQL object MessagePage.

### `MessagesReply` struct

```go
type MessagesReply struct {
	Status      string        `json:"status"`
	RequestID   UUID          `json:"requestId"`
	ServerTime  *string       `json:"serverTime"`
	ReceiptID   *UUID         `json:"receiptId"`
	CommittedAt *string       `json:"committedAt"`
	Replayed    *bool         `json:"replayed"`
	Operation   *OperationRef `json:"operation"`
	ResourceRef *ResourceRef  `json:"resourceRef"`
	Result      *MessagePage  `json:"result"`
}
```

MessagesReply is the GraphQL object MessagesReply.

### `MessagesRequestInput` struct

```go
type MessagesRequestInput struct {
	ConversationID   UUID     `json:"conversationId"`
	Limit            PageSize `json:"limit"`
	BeforeSequence   *Decimal `json:"beforeSequence,omitzero"`
	ActAsPrincipalID *UUID    `json:"actAsPrincipalId,omitzero"`
}
```

MessagesRequestInput is the GraphQL input MessagesRequestInput.

### `Operation` struct

```go
type Operation struct {
	OperationID   UUID             `json:"operationId"`
	Kind          string           `json:"kind"`
	TargetRef     *ResourceRef     `json:"targetRef"`
	State         string           `json:"state"`
	Revision      Decimal          `json:"revision"`
	RequestedAt   string           `json:"requestedAt"`
	UpdatedAt     string           `json:"updatedAt"`
	Steps         []OperationStep  `json:"steps"`
	Result        *OperationResult `json:"result"`
	BlockedReason *string          `json:"blockedReason"`
}
```

Operation is the GraphQL object Operation.

### `OperationRef` struct

```go
type OperationRef struct {
	OperationID UUID   `json:"operationId"`
	Owner       string `json:"owner"`
	Href        string `json:"href"`
	State       string `json:"state"`
}
```

OperationRef is the GraphQL object OperationRef.

### `OperationResult` struct

```go
type OperationResult struct {
	ProjectID             *UUID                           `json:"projectId"`
	Incarnation           *UUID                           `json:"incarnation"`
	Status                *string                         `json:"status"`
	Backend               *string                         `json:"backend"`
	Environment           *string                         `json:"environment"`
	PolicyRevision        *Decimal                        `json:"policyRevision"`
	ExpiresAt             *string                         `json:"expiresAt"`
	Kind                  *string                         `json:"kind"`
	ResourceRef           *ResourceRef                    `json:"resourceRef"`
	Delivery              *CredentialDelivery             `json:"delivery"`
	KeyID                 *string                         `json:"keyId"`
	EndpointID            *UUID                           `json:"endpointId"`
	Enabled               *bool                           `json:"enabled"`
	LiveSessionCompletion *LiveSessionOperationCompletion `json:"liveSessionCompletion"`
	ReplayedDeliveries    *int64                          `json:"replayedDeliveries"`
	SkippedDeliveries     *int64                          `json:"skippedDeliveries"`
	MessagePreview        *bool                           `json:"messagePreview"`
}
```

OperationResult is the GraphQL object OperationResult.

### `OperationStep` struct

```go
type OperationStep struct {
	StepID string `json:"stepId"`
	State  string `json:"state"`
}
```

OperationStep is the GraphQL object OperationStep.

### `Organization` struct

```go
type Organization struct {
	OrgID    UUID    `json:"orgId"`
	Name     string  `json:"name"`
	Status   string  `json:"status"`
	Revision Decimal `json:"revision"`
}
```

Organization is the GraphQL object Organization.

### `OrganizationBilling` struct

```go
type OrganizationBilling struct {
	OrgID              UUID    `json:"orgId"`
	PlanID             *string `json:"planId"`
	Standing           *string `json:"standing"`
	GraceUntil         *string `json:"graceUntil"`
	SubscriptionStatus *string `json:"subscriptionStatus"`
	CurrentPeriodEnd   *string `json:"currentPeriodEnd"`
	CancelAtPeriodEnd  bool    `json:"cancelAtPeriodEnd"`
	CatalogVersion     string  `json:"catalogVersion"`
	Configured         bool    `json:"configured"`
	Billed             bool    `json:"billed"`
}
```

OrganizationBilling is the GraphQL object OrganizationBilling.

### `OrganizationBillingReply` struct

```go
type OrganizationBillingReply struct {
	Status      string               `json:"status"`
	RequestID   UUID                 `json:"requestId"`
	ServerTime  *string              `json:"serverTime"`
	ReceiptID   *UUID                `json:"receiptId"`
	CommittedAt *string              `json:"committedAt"`
	Replayed    *bool                `json:"replayed"`
	Operation   *OperationRef        `json:"operation"`
	ResourceRef *ResourceRef         `json:"resourceRef"`
	Result      *OrganizationBilling `json:"result"`
}
```

OrganizationBillingReply is the GraphQL object OrganizationBillingReply.

### `OrganizationBillingRequestInput` struct

```go
type OrganizationBillingRequestInput struct {
	OrgID UUID `json:"orgId"`
}
```

OrganizationBillingRequestInput is the GraphQL input OrganizationBillingRequestInput.

### `OrganizationPage` struct

```go
type OrganizationPage struct {
	Items           []Organization `json:"items"`
	Complete        bool           `json:"complete"`
	RefreshRequired bool           `json:"refreshRequired"`
	NextCursor      *string        `json:"nextCursor"`
}
```

OrganizationPage is the GraphQL object OrganizationPage.

### `OrganizationUsage` struct

```go
type OrganizationUsage struct {
	OrgID             UUID         `json:"orgId"`
	Source            string       `json:"source"`
	ObservedAt        string       `json:"observedAt"`
	Complete          bool         `json:"complete"`
	Reason            string       `json:"reason"`
	From              string       `json:"from"`
	To                string       `json:"to"`
	Meters            []UsageMeter `json:"meters"`
	AggregatedThrough *string      `json:"aggregatedThrough"`
}
```

OrganizationUsage is the GraphQL object OrganizationUsage.

### `OrganizationUsageReply` struct

```go
type OrganizationUsageReply struct {
	Status      string             `json:"status"`
	RequestID   UUID               `json:"requestId"`
	ServerTime  *string            `json:"serverTime"`
	ReceiptID   *UUID              `json:"receiptId"`
	CommittedAt *string            `json:"committedAt"`
	Replayed    *bool              `json:"replayed"`
	Operation   *OperationRef      `json:"operation"`
	ResourceRef *ResourceRef       `json:"resourceRef"`
	Result      *OrganizationUsage `json:"result"`
}
```

OrganizationUsageReply is the GraphQL object OrganizationUsageReply.

### `OrganizationUsageRequestInput` struct

```go
type OrganizationUsageRequestInput struct {
	OrgID UUID    `json:"orgId"`
	From  *string `json:"from,omitzero"`
	To    *string `json:"to,omitzero"`
}
```

OrganizationUsageRequestInput is the GraphQL input OrganizationUsageRequestInput.

### `OrganizationsReply` struct

```go
type OrganizationsReply struct {
	Status      string            `json:"status"`
	RequestID   UUID              `json:"requestId"`
	ServerTime  *string           `json:"serverTime"`
	ReceiptID   *UUID             `json:"receiptId"`
	CommittedAt *string           `json:"committedAt"`
	Replayed    *bool             `json:"replayed"`
	Operation   *OperationRef     `json:"operation"`
	ResourceRef *ResourceRef      `json:"resourceRef"`
	Result      *OrganizationPage `json:"result"`
}
```

OrganizationsReply is the GraphQL object OrganizationsReply.

### `PauseOperationReply` struct

```go
type PauseOperationReply struct {
	Status      string        `json:"status"`
	RequestID   UUID          `json:"requestId"`
	ServerTime  *string       `json:"serverTime"`
	ReceiptID   *UUID         `json:"receiptId"`
	CommittedAt *string       `json:"committedAt"`
	Replayed    *bool         `json:"replayed"`
	Operation   *OperationRef `json:"operation"`
	ResourceRef *ResourceRef  `json:"resourceRef"`
	Result      *Operation    `json:"result"`
}
```

PauseOperationReply is the GraphQL object PauseOperationReply.

### `PauseOperationRequestInput` struct

```go
type PauseOperationRequestInput struct {
	OperationID      UUID    `json:"operationId"`
	ExpectedRevision Decimal `json:"expectedRevision"`
}
```

PauseOperationRequestInput is the GraphQL input PauseOperationRequestInput.

### `PolicyChangeInput` struct

```go
type PolicyChangeInput struct {
	Kind   string  `json:"kind"`
	Reason *string `json:"reason,omitzero"`
	HoldID *string `json:"holdId,omitzero"`
}
```

PolicyChangeInput is the GraphQL input PolicyChangeInput.

### `Principal` struct

```go
type Principal struct {
	PrincipalID    UUID    `json:"principalId"`
	ExternalUserID string  `json:"externalUserId"`
	Status         string  `json:"status"`
	Revision       Decimal `json:"revision"`
}
```

Principal is the GraphQL object Principal.

### `Problem` struct

```go
type Problem struct {
	Code      ErrorCode
	RequestID string
	Outcome   Outcome
	Status    int
	Message   string
	// contains filtered or unexported fields
}
```

Problem is a failed request. Classify it by Code and Outcome, never by Message: messages are diagnostics and may change.

#### `Problem.Code` property

```go
Code ErrorCode
```

Code is the stable error code.

#### `Problem.RequestID` property

```go
RequestID string
```

RequestID identifies the request that failed. Resolve it when Outcome is OutcomeUnknown.

#### `Problem.Outcome` property

```go
Outcome Outcome
```

Outcome reports whether the request took effect.

#### `Problem.Status` property

```go
Status int
```

Status is the HTTP status, or 0 when no authority response was read.

#### `Problem.Message` property

```go
Message string
```

Message is a human-readable diagnostic.

#### `Problem.Error` method

```go
func (p *Problem) Error() string
```

Error describes the problem without credentials.

#### `Problem.Unwrap` method

```go
func (p *Problem) Unwrap() error
```

Unwrap returns the underlying cause, such as a context error, if any.

#### `Problem.Is` method

```go
func (p *Problem) Is(target error) bool
```

Is reports whether target is the problem's `ErrorCode`.

#### `Problem.RetryAfter` method

```go
func (p *Problem) RetryAfter() (time.Duration, bool)
```

RetryAfter returns the delay the authority asked for before the same request is sent again, for example with RATE_LIMITED. It reads the error's extensions.retryAfter, else an HTTP Retry-After delay in seconds. The SDK never waits or resends on its own because of it.

#### `Problem.Scope` method

```go
func (p *Problem) Scope() (scope string, ok bool)
```

Scope returns the scope a SCOPE_REQUIRED problem names. The authority names it only in the message, so ok is false when the message does not match the documented wording. A missing read scope is reported as the read scope even where its manage scope would also satisfy the operation.

### `Project` struct

```go
type Project struct {
	ProjectID      UUID    `json:"projectId"`
	DeploymentID   UUID    `json:"deploymentId"`
	Name           string  `json:"name"`
	Environment    string  `json:"environment"`
	Incarnation    UUID    `json:"incarnation"`
	ServingRegion  string  `json:"servingRegion"`
	ServingEpoch   Decimal `json:"servingEpoch"`
	Status         string  `json:"status"`
	Revision       Decimal `json:"revision"`
	PolicyRevision Decimal `json:"policyRevision"`
	MessagePreview bool    `json:"messagePreview"`
}
```

Project is the GraphQL object Project.

### `ProjectClient` struct

```go
type ProjectClient struct {
	// contains filtered or unexported fields
}
```

ProjectClient calls the communication plane. Conversations, members, messages, receipts, realtime events and live sessions inside one project.

Bearer credential: backendKey. Scoped project backend key. Server runtimes only; never ship it to clients. Context credential: deliveryPermit. Signed permit from management.credentialPermit, sent in the request context of a request without a bearer token.

#### `ProjectClient.Capabilities` method

```go
func (c *ProjectClient) Capabilities(ctx context.Context, opts ...CallOption) (*CapabilitiesReply, error)
```

Capabilities calls the communication.capabilities query. Describe the features, limits and API model the authority supports.

Idempotency: safe. Read-only. Repeat freely; each attempt may use a new requestId. Authorized by backendKey.

Sends [`communication.capabilities`](../../operations/communication/capabilities.md).

#### `ProjectClient.Route` method

```go
func (c *ProjectClient) Route(ctx context.Context, opts ...CallOption) (*RouteReply, error)
```

Route calls the communication.route query. Return the signed route: project incarnation, serving epoch and realtime endpoint. Call it before other communication operations and again after WRONG_REGION.

Idempotency: safe. Read-only. Repeat freely; each attempt may use a new requestId. Authorized by backendKey.

Sends [`communication.route`](../../operations/communication/route.md).

#### `ProjectClient.GetPrincipal` method

```go
func (c *ProjectClient) GetPrincipal(ctx context.Context, input GetPrincipalRequestInput, opts ...CallOption) (*GetPrincipalReply, error)
```

GetPrincipal calls the communication.getPrincipal query. Read a principal (an application user).

Idempotency: safe. Read-only. Repeat freely; each attempt may use a new requestId. Authorized by backendKey with scope principalManage.

Sends [`communication.getPrincipal`](../../operations/communication/getPrincipal.md).

#### `ProjectClient.GetConversation` method

```go
func (c *ProjectClient) GetConversation(ctx context.Context, input GetConversationRequestInput, opts ...CallOption) (*GetConversationReply, error)
```

GetConversation calls the communication.getConversation query. Read a conversation.

Idempotency: safe. Read-only. Repeat freely; each attempt may use a new requestId. Authorized by backendKey with scope conversationManage.

Sends [`communication.getConversation`](../../operations/communication/getConversation.md).

#### `ProjectClient.Members` method

```go
func (c *ProjectClient) Members(ctx context.Context, input MembersRequestInput, opts ...CallOption) (*MembersReply, error)
```

Members calls the communication.members query. List the members of a conversation.

Idempotency: safe. Read-only. Repeat freely; each attempt may use a new requestId. Pagination: cursor. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. `ProjectClient.MembersPages` iterates over the pages. Authorized by backendKey with scope membershipManage.

Sends [`communication.members`](../../operations/communication/members.md).

#### `ProjectClient.MembersPages` method

```go
func (c *ProjectClient) MembersPages(ctx context.Context, input MembersRequestInput) iter.Seq2[*MemberPage, error]
```

MembersPages iterates over the pages of `ProjectClient.Members`, starting at input.Cursor. Each page is a new request with a new request ID. Iteration stops after the complete page or at the first error. A page that requires a refresh yields `ErrRefreshRequired` and stops. An incomplete page whose next cursor is missing, malformed or doesn't advance yields an INVALID_RESPONSE `Problem` in place of the page and stops.

Sends [`communication.members`](../../operations/communication/members.md).

#### `ProjectClient.Messages` method

```go
func (c *ProjectClient) Messages(ctx context.Context, input MessagesRequestInput, opts ...CallOption) (*MessagesReply, error)
```

Messages calls the communication.messages query. List the messages of a conversation, newest first. A backend key reads the full history, or the history visible to the member named by actAsPrincipalId.

Idempotency: safe. Read-only. Repeat freely; each attempt may use a new requestId. Pagination: sequence. Newest first. Pass nextCursor back as the sequence cursor input to read older items until complete is true. `ProjectClient.MessagesPages` iterates over the pages. Authorized by backendKey with scope messageRead.

Sends [`communication.messages`](../../operations/communication/messages.md).

#### `ProjectClient.MessagesPages` method

```go
func (c *ProjectClient) MessagesPages(ctx context.Context, input MessagesRequestInput) iter.Seq2[*MessagePage, error]
```

MessagesPages iterates over the pages of `ProjectClient.Messages`, starting at input.BeforeSequence. Each page is a new request with a new request ID. Iteration stops after the complete page or at the first error. A page that requires a refresh yields `ErrRefreshRequired` and stops. An incomplete page whose next cursor is missing, malformed or doesn't advance yields an INVALID_RESPONSE `Problem` in place of the page and stops.

Sends [`communication.messages`](../../operations/communication/messages.md).

#### `ProjectClient.GetMessage` method

```go
func (c *ProjectClient) GetMessage(ctx context.Context, input GetMessageRequestInput, opts ...CallOption) (*GetMessageReply, error)
```

GetMessage calls the communication.getMessage query. Read one message. A backend key reads any message, or reads as the member named by actAsPrincipalId.

Idempotency: safe. Read-only. Repeat freely; each attempt may use a new requestId. Authorized by backendKey with scope messageRead.

Sends [`communication.getMessage`](../../operations/communication/getMessage.md).

#### `ProjectClient.Inbox` method

```go
func (c *ProjectClient) Inbox(ctx context.Context, input InboxRequestInput, opts ...CallOption) (*InboxReply, error)
```

Inbox calls the communication.inbox query. List the conversations visible to the calling user. A backend key must name that user with actAsPrincipalId.

Idempotency: safe. Read-only. Repeat freely; each attempt may use a new requestId. Pagination: cursor. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. `ProjectClient.InboxPages` iterates over the pages. Authorized by backendKey with scope messageRead.

Sends [`communication.inbox`](../../operations/communication/inbox.md).

#### `ProjectClient.InboxPages` method

```go
func (c *ProjectClient) InboxPages(ctx context.Context, input InboxRequestInput) iter.Seq2[*InboxPage, error]
```

InboxPages iterates over the pages of `ProjectClient.Inbox`, starting at input.Cursor. Each page is a new request with a new request ID. Iteration stops after the complete page or at the first error. A page that requires a refresh yields `ErrRefreshRequired` and stops. An incomplete page whose next cursor is missing, malformed or doesn't advance yields an INVALID_RESPONSE `Problem` in place of the page and stops.

Sends [`communication.inbox`](../../operations/communication/inbox.md).

#### `ProjectClient.Search` method

```go
func (c *ProjectClient) Search(ctx context.Context, input SearchRequestInput, opts ...CallOption) (*SearchReply, error)
```

Search calls the communication.search query. Search the messages visible to the calling user. A backend key searches as the member named by actAsPrincipalId, or within scope.conversationIds.

Idempotency: safe. Read-only. Repeat freely; each attempt may use a new requestId. Pagination: cursor. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. `ProjectClient.SearchPages` iterates over the pages. Authorized by backendKey with scope messageRead.

Sends [`communication.search`](../../operations/communication/search.md).

#### `ProjectClient.SearchPages` method

```go
func (c *ProjectClient) SearchPages(ctx context.Context, input SearchRequestInput) iter.Seq2[*SearchPage, error]
```

SearchPages iterates over the pages of `ProjectClient.Search`, starting at input.Cursor. Each page is a new request with a new request ID. Iteration stops after the complete page or at the first error. A page that requires a refresh yields `ErrRefreshRequired` and stops. An incomplete page whose next cursor is missing, malformed or doesn't advance yields an INVALID_RESPONSE `Problem` in place of the page and stops.

Sends [`communication.search`](../../operations/communication/search.md).

#### `ProjectClient.ResolveRequest` method

```go
func (c *ProjectClient) ResolveRequest(ctx context.Context, input ResolveRequestRequestInput, opts ...CallOption) (*ResolveRequestReply, error)
```

ResolveRequest calls the communication.resolveRequest query. Look up the stored outcome of an earlier communication mutation by its requestId.

Idempotency: safe. Read-only. Repeat freely; each attempt may use a new requestId. Authorized by backendKey (condition: ownRequest).

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md).

#### `ProjectClient.GetOperation` method

```go
func (c *ProjectClient) GetOperation(ctx context.Context, input GetOperationRequestInput, opts ...CallOption) (*GetOperationReply, error)
```

GetOperation calls the communication.getOperation query. Read the state of a long-running communication operation.

Idempotency: safe. Read-only. Repeat freely; each attempt may use a new requestId. Authorized by backendKey (condition: operationParticipant).

Sends [`communication.getOperation`](../../operations/communication/getOperation.md).

#### `ProjectClient.ConversationMute` method

```go
func (c *ProjectClient) ConversationMute(ctx context.Context, input ConversationMuteInput, opts ...CallOption) (*ConversationMuteReply, error)
```

ConversationMute calls the communication.conversationMute query. Read whether a member has muted message push notifications for a conversation. A backend key must name the member with actAsPrincipalId.

Idempotency: safe. Read-only. Repeat freely; each attempt may use a new requestId. Authorized by backendKey with scope membershipManage.

Sends [`communication.conversationMute`](../../operations/communication/conversationMute.md).

#### `ProjectClient.CurrentLiveSession` method

```go
func (c *ProjectClient) CurrentLiveSession(ctx context.Context, input ConversationLiveInput, opts ...CallOption) (*CurrentLiveSessionReply, error)
```

CurrentLiveSession calls the communication.currentLiveSession query. Return the active live session of a conversation, if any.

Idempotency: safe. Read-only. Repeat freely; each attempt may use a new requestId. Authorized by any one of: backendKey with scope callRead; backendKey with scope callManage.

Sends [`communication.currentLiveSession`](../../operations/communication/currentLiveSession.md).

#### `ProjectClient.LiveSession` method

```go
func (c *ProjectClient) LiveSession(ctx context.Context, input LiveSessionInput, opts ...CallOption) (*LiveSessionReply, error)
```

LiveSession calls the communication.liveSession query. Read a live session.

Idempotency: safe. Read-only. Repeat freely; each attempt may use a new requestId. Authorized by any one of: backendKey with scope callRead; backendKey with scope callManage.

Sends [`communication.liveSession`](../../operations/communication/liveSession.md).

#### `ProjectClient.LiveSessions` method

```go
func (c *ProjectClient) LiveSessions(ctx context.Context, input LiveSessionsInput, opts ...CallOption) (*LiveSessionPageReply, error)
```

LiveSessions calls the communication.liveSessions query. List the live sessions of a conversation.

Idempotency: safe. Read-only. Repeat freely; each attempt may use a new requestId. Pagination: cursor. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. `ProjectClient.LiveSessionsPages` iterates over the pages. Authorized by any one of: backendKey with scope callRead; backendKey with scope callManage.

Sends [`communication.liveSessions`](../../operations/communication/liveSessions.md).

#### `ProjectClient.LiveSessionsPages` method

```go
func (c *ProjectClient) LiveSessionsPages(ctx context.Context, input LiveSessionsInput) iter.Seq2[*LiveSessionPage, error]
```

LiveSessionsPages iterates over the pages of `ProjectClient.LiveSessions`, starting at input.Cursor. Each page is a new request with a new request ID. Iteration stops after the complete page or at the first error. A page that requires a refresh yields `ErrRefreshRequired` and stops. An incomplete page whose next cursor is missing, malformed or doesn't advance yields an INVALID_RESPONSE `Problem` in place of the page and stops.

Sends [`communication.liveSessions`](../../operations/communication/liveSessions.md).

#### `ProjectClient.LiveSessionParticipants` method

```go
func (c *ProjectClient) LiveSessionParticipants(ctx context.Context, input LiveParticipantsInput, opts ...CallOption) (*LiveParticipantPageReply, error)
```

LiveSessionParticipants calls the communication.liveSessionParticipants query. List the participants of a live session.

Idempotency: safe. Read-only. Repeat freely; each attempt may use a new requestId. Pagination: cursor. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. `ProjectClient.LiveSessionParticipantsPages` iterates over the pages. Authorized by any one of: backendKey with scope callRead; backendKey with scope callManage.

Sends [`communication.liveSessionParticipants`](../../operations/communication/liveSessionParticipants.md).

#### `ProjectClient.LiveSessionParticipantsPages` method

```go
func (c *ProjectClient) LiveSessionParticipantsPages(ctx context.Context, input LiveParticipantsInput) iter.Seq2[*LiveParticipantPage, error]
```

LiveSessionParticipantsPages iterates over the pages of `ProjectClient.LiveSessionParticipants`, starting at input.Cursor. Each page is a new request with a new request ID. Iteration stops after the complete page or at the first error. A page that requires a refresh yields `ErrRefreshRequired` and stops. An incomplete page whose next cursor is missing, malformed or doesn't advance yields an INVALID_RESPONSE `Problem` in place of the page and stops.

Sends [`communication.liveSessionParticipants`](../../operations/communication/liveSessionParticipants.md).

#### `ProjectClient.LiveSessionOperation` method

```go
func (c *ProjectClient) LiveSessionOperation(ctx context.Context, input LiveSessionOperationInput, opts ...CallOption) (*LiveSessionOperationReply, error)
```

LiveSessionOperation calls the communication.liveSessionOperation query. Read the state of a live session start or end operation.

Idempotency: safe. Read-only. Repeat freely; each attempt may use a new requestId. Authorized by any one of: backendKey with scope callRead; backendKey with scope callManage.

Sends [`communication.liveSessionOperation`](../../operations/communication/liveSessionOperation.md).

#### `ProjectClient.SessionRequestOutcome` method

```go
func (c *ProjectClient) SessionRequestOutcome(ctx context.Context, input SessionRequestOutcomeRequestInput, opts ...CallOption) (*SessionRequestOutcomeReply, error)
```

SessionRequestOutcome calls the communication.sessionRequestOutcome query. Look up the outcome of an earlier issueSession or renewSession request, including the session it produced.

Idempotency: safe. Read-only. Repeat freely; each attempt may use a new requestId. Authorized by backendKey with all of the scopes sessionIssue and sessionManage.

Sends [`communication.sessionRequestOutcome`](../../operations/communication/sessionRequestOutcome.md).

#### `ProjectClient.CreatePrincipal` method

```go
func (c *ProjectClient) CreatePrincipal(ctx context.Context, input CreatePrincipalRequestInput, opts ...CallOption) (*CreatePrincipalReply, error)
```

CreatePrincipal calls the communication.createPrincipal mutation. Create a principal for an application user.

Idempotency: idempotent. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest. Retry budget: 3 attempts within 60 seconds. Authorized by backendKey with scope principalManage.

Sends [`communication.createPrincipal`](../../operations/communication/createPrincipal.md).

#### `ProjectClient.DisablePrincipal` method

```go
func (c *ProjectClient) DisablePrincipal(ctx context.Context, input DisablePrincipalRequestInput, opts ...CallOption) (*DisablePrincipalReply, error)
```

DisablePrincipal calls the communication.disablePrincipal mutation. Disable a principal.

Idempotency: idempotent. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest. Retry budget: 3 attempts within 60 seconds. Authorized by backendKey with scope principalManage.

Sends [`communication.disablePrincipal`](../../operations/communication/disablePrincipal.md).

#### `ProjectClient.IssueSession` method

```go
func (c *ProjectClient) IssueSession(ctx context.Context, input IssueSessionRequestInput, opts ...CallOption) (*IssueSessionReply, error)
```

IssueSession calls the communication.issueSession mutation. Issue a short-lived user session token for a principal and device.

Idempotency: idempotent. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest. Retry budget: 3 attempts within 60 seconds. Authorized by backendKey with scope sessionIssue.

Sends [`communication.issueSession`](../../operations/communication/issueSession.md).

#### `ProjectClient.RenewSession` method

```go
func (c *ProjectClient) RenewSession(ctx context.Context, input RenewSessionRequestInput, opts ...CallOption) (*RenewSessionReply, error)
```

RenewSession calls the communication.renewSession mutation. Renew a user session before it expires.

Idempotency: idempotent. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest. Retry budget: 3 attempts within 60 seconds. Authorized by backendKey with scope sessionIssue.

Sends [`communication.renewSession`](../../operations/communication/renewSession.md).

#### `ProjectClient.RevokeSession` method

```go
func (c *ProjectClient) RevokeSession(ctx context.Context, input RevokeSessionRequestInput, opts ...CallOption) (*RevokeSessionReply, error)
```

RevokeSession calls the communication.revokeSession mutation. Revoke a user session.

Idempotency: idempotent. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest. Retry budget: 3 attempts within 60 seconds. Authorized by backendKey with scope sessionManage.

Sends [`communication.revokeSession`](../../operations/communication/revokeSession.md).

#### `ProjectClient.CreateConversation` method

```go
func (c *ProjectClient) CreateConversation(ctx context.Context, input CreateConversationRequestInput, opts ...CallOption) (*CreateConversationReply, error)
```

CreateConversation calls the communication.createConversation mutation. Create a conversation with its initial members.

Idempotency: idempotent. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest. Retry budget: 3 attempts within 60 seconds. Realtime events: conversation.created. Authorized by backendKey with scope conversationManage.

Sends [`communication.createConversation`](../../operations/communication/createConversation.md).

#### `ProjectClient.UpdateConversation` method

```go
func (c *ProjectClient) UpdateConversation(ctx context.Context, input UpdateConversationRequestInput, opts ...CallOption) (*UpdateConversationReply, error)
```

UpdateConversation calls the communication.updateConversation mutation. Update the title or properties of a conversation.

Idempotency: idempotent. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest. Retry budget: 3 attempts within 60 seconds. Realtime events: conversation.updated. Authorized by backendKey with scope conversationManage.

Sends [`communication.updateConversation`](../../operations/communication/updateConversation.md).

#### `ProjectClient.AddMember` method

```go
func (c *ProjectClient) AddMember(ctx context.Context, input AddMemberRequestInput, opts ...CallOption) (*AddMemberReply, error)
```

AddMember calls the communication.addMember mutation. Add a member, or change the role of an active member.

Idempotency: idempotent. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest. Retry budget: 3 attempts within 60 seconds. Realtime events: member.added and member.roleChanged. Authorized by backendKey with scope membershipManage.

Sends [`communication.addMember`](../../operations/communication/addMember.md).

#### `ProjectClient.AddMembers` method

```go
func (c *ProjectClient) AddMembers(ctx context.Context, input AddMembersInput, opts ...CallOption) (*AddMembersPayload, error)
```

AddMembers calls the communication.addMembers mutation. Add several members in one request.

Idempotency: idempotent. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest. Retry budget: 3 attempts within 60 seconds. Realtime events: member.added and member.roleChanged. Authorized by backendKey with scope membershipManage.

Sends [`communication.addMembers`](../../operations/communication/addMembers.md).

#### `ProjectClient.RemoveMember` method

```go
func (c *ProjectClient) RemoveMember(ctx context.Context, input RemoveMemberRequestInput, opts ...CallOption) (*RemoveMemberReply, error)
```

RemoveMember calls the communication.removeMember mutation. Remove a member from a conversation.

Idempotency: idempotent. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest. Retry budget: 3 attempts within 60 seconds. Realtime events: member.removed. Authorized by backendKey with scope membershipManage.

Sends [`communication.removeMember`](../../operations/communication/removeMember.md).

#### `ProjectClient.HistoryGrant` method

```go
func (c *ProjectClient) HistoryGrant(ctx context.Context, input HistoryGrantRequestInput, opts ...CallOption) (*HistoryGrantReply, error)
```

HistoryGrant calls the communication.historyGrant mutation. Expand the history a member can see to an earlier sequence.

Idempotency: idempotent. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest. Retry budget: 3 attempts within 60 seconds. Realtime events: member.historyExpanded. Authorized by backendKey with scope historyManage.

Sends [`communication.historyGrant`](../../operations/communication/historyGrant.md).

#### `ProjectClient.SendMessage` method

```go
func (c *ProjectClient) SendMessage(ctx context.Context, input SendMessageRequestInput, opts ...CallOption) (*SendMessageReply, error)
```

SendMessage calls the communication.sendMessage mutation. Send a message. A backend key sends as its service principal, or as the member named by actAsPrincipalId.

Idempotency: idempotent. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest. Retry budget: 3 attempts within 60 seconds. Realtime events: message.created. Authorized by backendKey with scope messageWrite.

Sends [`communication.sendMessage`](../../operations/communication/sendMessage.md).

#### `ProjectClient.EditMessage` method

```go
func (c *ProjectClient) EditMessage(ctx context.Context, input EditMessageRequestInput, opts ...CallOption) (*EditMessageReply, error)
```

EditMessage calls the communication.editMessage mutation. Edit a message.

Idempotency: idempotent. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest. Retry budget: 3 attempts within 60 seconds. Realtime events: message.edited. Authorized by backendKey with scope moderation.

Sends [`communication.editMessage`](../../operations/communication/editMessage.md).

#### `ProjectClient.DeleteMessage` method

```go
func (c *ProjectClient) DeleteMessage(ctx context.Context, input DeleteMessageRequestInput, opts ...CallOption) (*DeleteMessageReply, error)
```

DeleteMessage calls the communication.deleteMessage mutation. Delete a message.

Idempotency: idempotent. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest. Retry budget: 3 attempts within 60 seconds. Realtime events: message.deleted. Authorized by backendKey with scope moderation.

Sends [`communication.deleteMessage`](../../operations/communication/deleteMessage.md).

#### `ProjectClient.SetBroadcastPermission` method

```go
func (c *ProjectClient) SetBroadcastPermission(ctx context.Context, input SetBroadcastPermissionInput, opts ...CallOption) (*SetBroadcastPermissionPayload, error)
```

SetBroadcastPermission calls the communication.setBroadcastPermission mutation. Allow or deny a member to publish media in live sessions.

Idempotency: idempotent. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest. Retry budget: 3 attempts within 60 seconds. Realtime events: member.broadcastPermissionChanged. Authorized by backendKey with scope membershipManage.

Sends [`communication.setBroadcastPermission`](../../operations/communication/setBroadcastPermission.md).

#### `ProjectClient.SetConversationMute` method

```go
func (c *ProjectClient) SetConversationMute(ctx context.Context, input SetConversationMuteInput, opts ...CallOption) (*SetConversationMutePayload, error)
```

SetConversationMute calls the communication.setConversationMute mutation. Mute or unmute message push notifications for a member of a conversation, optionally until a time. Calls still ring. A backend key must name the member with actAsPrincipalId.

Idempotency: idempotent. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest. Retry budget: 3 attempts within 60 seconds. Authorized by backendKey with scope membershipManage.

Sends [`communication.setConversationMute`](../../operations/communication/setConversationMute.md).

#### `ProjectClient.AlertLiveSession` method

```go
func (c *ProjectClient) AlertLiveSession(ctx context.Context, input AlertLiveSessionInput, opts ...CallOption) (*AlertLiveSessionPayload, error)
```

AlertLiveSession calls the communication.alertLiveSession mutation. Alert (ring) conversation members about a live session.

Idempotency: idempotent. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest. Retry budget: 3 attempts within 60 seconds. Realtime events: live.alerted. Authorized by backendKey with scope callManage.

Sends [`communication.alertLiveSession`](../../operations/communication/alertLiveSession.md).

#### `ProjectClient.EndLiveSession` method

```go
func (c *ProjectClient) EndLiveSession(ctx context.Context, input EndLiveSessionInput, opts ...CallOption) (*EndLiveSessionPayload, error)
```

EndLiveSession calls the communication.endLiveSession mutation. End a live session for every participant. Completes asynchronously.

Idempotency: idempotent. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest. Retry budget: 3 attempts within 60 seconds. Long-running: poll `ProjectClient.LiveSessionOperation` with the reply's Operation reference until the work completes. Realtime events: live.ended. Authorized by backendKey with scope callManage.

Sends [`communication.endLiveSession`](../../operations/communication/endLiveSession.md).

#### `ProjectClient.RedeemCredential` method

```go
func (c *ProjectClient) RedeemCredential(ctx context.Context, permit SignedProof, input RedeemCredentialRequestInput, opts ...CallOption) (*RedeemCredentialReply, error)
```

RedeemCredential calls the communication.redeemCredential mutation. Redeem a delivered credential with its delivery permit.

Idempotency: permitBound. Authorized by a single-delivery permit. Retry with the same requestId and permit; outcomes cannot be resolved by lookup. Retry budget: 3 attempts within 60 seconds. Authorized by deliveryPermit, sent as the permit argument without a bearer token.

Sends [`communication.redeemCredential`](../../operations/communication/redeemCredential.md).

#### `ProjectClient.AcknowledgeCredential` method

```go
func (c *ProjectClient) AcknowledgeCredential(ctx context.Context, permit SignedProof, input AcknowledgeCredentialRequestInput, opts ...CallOption) (*AcknowledgeCredentialReply, error)
```

AcknowledgeCredential calls the communication.acknowledgeCredential mutation. Acknowledge that a redeemed credential is stored, closing the delivery.

Idempotency: permitBound. Authorized by a single-delivery permit. Retry with the same requestId and permit; outcomes cannot be resolved by lookup. Retry budget: 3 attempts within 60 seconds. Authorized by deliveryPermit, sent as the permit argument without a bearer token.

Sends [`communication.acknowledgeCredential`](../../operations/communication/acknowledgeCredential.md).

#### `ProjectClient.Initialize` method

```go
func (c *ProjectClient) Initialize(ctx context.Context, options ...CallOption) error
```

Initialize reads the project route and checks that it names the configured project and incarnation. Later communication requests report the serving epoch it read. Call it after creating the client, and again to observe a newer epoch.

Sends [`communication.route`](../../operations/communication/route.md).

#### `ProjectClient.Retry` method

```go
func (c *ProjectClient) Retry(ctx context.Context, requestID string) (*RequestResolution, error)
```

Retry settles a mutation this client recorded with an unknown outcome. It reads the request's resolution and returns it once the authority has observed the request. Otherwise it sends the request again with its original request ID and payload, within the operation's retry budget, and returns the resolution read afterwards. It never sends a request under a new identity. It fails with a plain error, not a `*Problem`, when the client has no record of requestID.

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md).

#### `ProjectClient.RecoveryRecords` method

```go
func (c *ProjectClient) RecoveryRecords(ctx context.Context) ([]RecoveryRecord, error)
```

RecoveryRecords returns copies of the client's recovery records, oldest first.

### `ProjectConfig` struct

```go
type ProjectConfig struct {
	BaseURL     string
	ProjectID   string
	Incarnation string
	BackendKey  string
}
```

ProjectConfig configures a `ProjectClient`.

#### `ProjectConfig.BaseURL` property

```go
BaseURL string
```

BaseURL is the authority origin, such as `https://api.example.com`. HTTP is accepted only for localhost, 127.0.0.1 and \[::1\].

#### `ProjectConfig.ProjectID` property

```go
ProjectID string
```

ProjectID is the project the client calls, a canonical lowercase UUID.

#### `ProjectConfig.Incarnation` property

```go
Incarnation string
```

Incarnation is the project incarnation the client expects, a canonical lowercase UUID. A restored or recreated project has a new incarnation, and requests for the old one fail with INCARNATION_MISMATCH.

#### `ProjectConfig.BackendKey` property

```go
BackendKey string
```

BackendKey is a backend key of the project. Keep it in trusted server runtimes; never ship it to a browser or a mobile app. Leave it empty only for a client that redeems and acknowledges credential deliveries, which a delivery permit authorizes. Every other method of such a client fails with UNAUTHENTICATED and sends nothing.

### `ProjectPolicyReply` struct

```go
type ProjectPolicyReply struct {
	Status      string           `json:"status"`
	RequestID   UUID             `json:"requestId"`
	ServerTime  *string          `json:"serverTime"`
	ReceiptID   *UUID            `json:"receiptId"`
	CommittedAt *string          `json:"committedAt"`
	Replayed    *bool            `json:"replayed"`
	Operation   *OperationRef    `json:"operation"`
	ResourceRef *ResourceRef     `json:"resourceRef"`
	Result      *OperationResult `json:"result"`
}
```

ProjectPolicyReply is the GraphQL object ProjectPolicyReply.

### `ProjectPolicyRequestInput` struct

```go
type ProjectPolicyRequestInput struct {
	ProjectID        UUID              `json:"projectId"`
	ExpectedRevision Decimal           `json:"expectedRevision"`
	Change           PolicyChangeInput `json:"change"`
}
```

ProjectPolicyRequestInput is the GraphQL input ProjectPolicyRequestInput.

### `ProjectUsage` struct

```go
type ProjectUsage struct {
	ProjectID         UUID         `json:"projectId"`
	Source            string       `json:"source"`
	ObservedAt        string       `json:"observedAt"`
	Complete          bool         `json:"complete"`
	Reason            string       `json:"reason"`
	From              string       `json:"from"`
	To                string       `json:"to"`
	Meters            []UsageMeter `json:"meters"`
	AggregatedThrough *string      `json:"aggregatedThrough"`
}
```

ProjectUsage is the GraphQL object ProjectUsage.

### `ProjectUsageReply` struct

```go
type ProjectUsageReply struct {
	Status      string        `json:"status"`
	RequestID   UUID          `json:"requestId"`
	ServerTime  *string       `json:"serverTime"`
	ReceiptID   *UUID         `json:"receiptId"`
	CommittedAt *string       `json:"committedAt"`
	Replayed    *bool         `json:"replayed"`
	Operation   *OperationRef `json:"operation"`
	ResourceRef *ResourceRef  `json:"resourceRef"`
	Result      *ProjectUsage `json:"result"`
}
```

ProjectUsageReply is the GraphQL object ProjectUsageReply.

### `ProjectUsageRequestInput` struct

```go
type ProjectUsageRequestInput struct {
	ProjectID UUID    `json:"projectId"`
	From      *string `json:"from,omitzero"`
	To        *string `json:"to,omitzero"`
}
```

ProjectUsageRequestInput is the GraphQL input ProjectUsageRequestInput.

### `ReadReceipt` struct

```go
type ReadReceipt struct {
	PrincipalID              UUID     `json:"principalId"`
	MembershipEpoch          Decimal  `json:"membershipEpoch"`
	VisibilityEpoch          Decimal  `json:"visibilityEpoch"`
	DeliveredThroughSequence *Decimal `json:"deliveredThroughSequence"`
	ReadThroughSequence      *Decimal `json:"readThroughSequence"`
	UpdatedAt                *string  `json:"updatedAt"`
}
```

ReadReceipt is the GraphQL object ReadReceipt.

### `RecoveryRecord` struct

```go
type RecoveryRecord struct {
	RequestID                 string         `json:"requestId"`
	Incarnation               string         `json:"incarnation"`
	PayloadFingerprint        string         `json:"payloadFingerprint"`
	Operation                 string         `json:"operation"`
	ProjectID                 string         `json:"projectId,omitempty"`
	Input                     map[string]any `json:"input"`
	FirstSubmittedAt          int64          `json:"firstSubmittedAt"`
	RetryDeadline             int64          `json:"retryDeadline"`
	AttemptCount              int64          `json:"attemptCount"`
	LastAttemptAt             int64          `json:"lastAttemptAt"`
	LastAttemptClassification string         `json:"lastAttemptClassification"`
	ResolutionState           string         `json:"resolutionState"`
	MediaAdmissionAttempted   bool           `json:"mediaAdmissionAttempted,omitempty"`
}
```

RecoveryRecord is what a client keeps about a mutation until its outcome is known. Times are milliseconds since the Unix epoch.

#### `RecoveryRecord.RequestID` property

```go
RequestID string `json:"requestId"`
```

RequestID identifies the mutation.

#### `RecoveryRecord.Incarnation` property

```go
Incarnation string `json:"incarnation"`
```

Incarnation is the project incarnation the mutation was sent to, or "management" for management mutations.

#### `RecoveryRecord.PayloadFingerprint` property

```go
PayloadFingerprint string `json:"payloadFingerprint"`
```

PayloadFingerprint is the SHA-256 digest of the canonical operation, project and input.

#### `RecoveryRecord.Operation` property

```go
Operation string `json:"operation"`
```

Operation is the operation ID, such as communication.sendMessage.

#### `RecoveryRecord.ProjectID` property

```go
ProjectID string `json:"projectId,omitempty"`
```

ProjectID is the project of a communication mutation.

#### `RecoveryRecord.Input` property

```go
Input map[string]any `json:"input"`
```

Input is the input object the mutation sends on every attempt.

#### `RecoveryRecord.FirstSubmittedAt` property

```go
FirstSubmittedAt int64 `json:"firstSubmittedAt"`
```

FirstSubmittedAt is when the record was created.

#### `RecoveryRecord.RetryDeadline` property

```go
RetryDeadline int64 `json:"retryDeadline"`
```

RetryDeadline is the last time the request may be sent.

#### `RecoveryRecord.AttemptCount` property

```go
AttemptCount int64 `json:"attemptCount"`
```

AttemptCount counts the attempts sent so far.

#### `RecoveryRecord.LastAttemptAt` property

```go
LastAttemptAt int64 `json:"lastAttemptAt"`
```

LastAttemptAt is when the last attempt was sent.

#### `RecoveryRecord.LastAttemptClassification` property

```go
LastAttemptClassification string `json:"lastAttemptClassification"`
```

LastAttemptClassification describes the last attempt: notSubmitted, submitted, authorityReceipt, an error code or opaqueTransportFailure.

#### `RecoveryRecord.ResolutionState` property

```go
ResolutionState string `json:"resolutionState"`
```

ResolutionState is pending before the first attempt and unknown once an attempt may have taken effect. It is committed or accepted once the authority confirms the request, and rejected while the authority has refused every attempt.

#### `RecoveryRecord.MediaAdmissionAttempted` property

```go
MediaAdmissionAttempted bool `json:"mediaAdmissionAttempted,omitempty"`
```

MediaAdmissionAttempted marks credentials used for native media admission, which must never be issued again.

### `RedeemCredentialReply` struct

```go
type RedeemCredentialReply struct {
	Status      string             `json:"status"`
	RequestID   UUID               `json:"requestId"`
	ServerTime  *string            `json:"serverTime"`
	ReceiptID   *UUID              `json:"receiptId"`
	CommittedAt *string            `json:"committedAt"`
	Replayed    *bool              `json:"replayed"`
	Operation   *OperationRef      `json:"operation"`
	ResourceRef *ResourceRef       `json:"resourceRef"`
	Result      *CredentialCapsule `json:"result"`
}
```

RedeemCredentialReply is the GraphQL object RedeemCredentialReply.

### `RedeemCredentialRequestInput` struct

```go
type RedeemCredentialRequestInput struct {
	DeliveryID UUID `json:"deliveryId"`
}
```

RedeemCredentialRequestInput is the GraphQL input RedeemCredentialRequestInput.

### `RemoveMemberReply` struct

```go
type RemoveMemberReply struct {
	Status      string        `json:"status"`
	RequestID   UUID          `json:"requestId"`
	ServerTime  *string       `json:"serverTime"`
	ReceiptID   *UUID         `json:"receiptId"`
	CommittedAt *string       `json:"committedAt"`
	Replayed    *bool         `json:"replayed"`
	Operation   *OperationRef `json:"operation"`
	ResourceRef *ResourceRef  `json:"resourceRef"`
	Result      *Member       `json:"result"`
}
```

RemoveMemberReply is the GraphQL object RemoveMemberReply.

### `RemoveMemberRequestInput` struct

```go
type RemoveMemberRequestInput struct {
	ConversationID   UUID    `json:"conversationId"`
	PrincipalID      UUID    `json:"principalId"`
	ExpectedRevision Decimal `json:"expectedRevision"`
}
```

RemoveMemberRequestInput is the GraphQL input RemoveMemberRequestInput.

### `RenewSessionReply` struct

```go
type RenewSessionReply struct {
	Status      string            `json:"status"`
	RequestID   UUID              `json:"requestId"`
	ServerTime  *string           `json:"serverTime"`
	ReceiptID   *UUID             `json:"receiptId"`
	CommittedAt *string           `json:"committedAt"`
	Replayed    *bool             `json:"replayed"`
	Operation   *OperationRef     `json:"operation"`
	ResourceRef *ResourceRef      `json:"resourceRef"`
	Result      *SessionBootstrap `json:"result"`
}
```

RenewSessionReply is the GraphQL object RenewSessionReply.

### `RenewSessionRequestInput` struct

```go
type RenewSessionRequestInput struct {
	SessionID        UUID    `json:"sessionId"`
	PrincipalID      UUID    `json:"principalId"`
	DeviceID         UUID    `json:"deviceId"`
	ExpectedRevision Decimal `json:"expectedRevision"`
	RequestedTTLMs   Decimal `json:"requestedTtlMs"`
}
```

RenewSessionRequestInput is the GraphQL input RenewSessionRequestInput.

### `ReplayWebhookDeliveriesReply` struct

```go
type ReplayWebhookDeliveriesReply struct {
	Status      string           `json:"status"`
	RequestID   UUID             `json:"requestId"`
	ServerTime  *string          `json:"serverTime"`
	ReceiptID   *UUID            `json:"receiptId"`
	CommittedAt *string          `json:"committedAt"`
	Replayed    *bool            `json:"replayed"`
	Operation   *OperationRef    `json:"operation"`
	ResourceRef *ResourceRef     `json:"resourceRef"`
	Result      *OperationResult `json:"result"`
}
```

ReplayWebhookDeliveriesReply is the GraphQL object ReplayWebhookDeliveriesReply.

### `ReplayWebhookDeliveriesRequestInput` struct

```go
type ReplayWebhookDeliveriesRequestInput struct {
	ProjectID  UUID    `json:"projectId"`
	EndpointID UUID    `json:"endpointId"`
	EffectID   *UUID   `json:"effectId,omitzero"`
	Since      *string `json:"since,omitzero"`
	Until      *string `json:"until,omitzero"`
}
```

ReplayWebhookDeliveriesRequestInput is the GraphQL input ReplayWebhookDeliveriesRequestInput.

### `RequestResolution` struct

```go
type RequestResolution struct {
	State          string           `json:"state"`
	RequestID      UUID             `json:"requestId"`
	CheckedAt      string           `json:"checkedAt"`
	ResultWithheld bool             `json:"resultWithheld"`
	Receipt        *ResolvedReceipt `json:"receipt"`
}
```

RequestResolution is the GraphQL object RequestResolution.

### `ResolveRequestReply` struct

```go
type ResolveRequestReply struct {
	Status      string             `json:"status"`
	RequestID   UUID               `json:"requestId"`
	ServerTime  *string            `json:"serverTime"`
	ReceiptID   *UUID              `json:"receiptId"`
	CommittedAt *string            `json:"committedAt"`
	Replayed    *bool              `json:"replayed"`
	Operation   *OperationRef      `json:"operation"`
	ResourceRef *ResourceRef       `json:"resourceRef"`
	Result      *RequestResolution `json:"result"`
}
```

ResolveRequestReply is the GraphQL object ResolveRequestReply.

### `ResolveRequestRequestInput` struct

```go
type ResolveRequestRequestInput struct {
	RequestID UUID `json:"requestId"`
}
```

ResolveRequestRequestInput is the GraphQL input ResolveRequestRequestInput.

### `ResolvedReceipt` struct

```go
type ResolvedReceipt struct {
	Status      string          `json:"status"`
	RequestID   UUID            `json:"requestId"`
	ServerTime  *string         `json:"serverTime"`
	ReceiptID   *UUID           `json:"receiptId"`
	CommittedAt *string         `json:"committedAt"`
	Replayed    *bool           `json:"replayed"`
	Operation   *OperationRef   `json:"operation"`
	ResourceRef *ResourceRef    `json:"resourceRef"`
	Result      *RetainedResult `json:"result"`
}
```

ResolvedReceipt is the GraphQL object ResolvedReceipt.

### `ResourceRef` struct

```go
type ResourceRef struct {
	Kind string `json:"kind"`
	ID   string `json:"id"`
}
```

ResourceRef is the GraphQL object ResourceRef.

### `ResumeOperationReply` struct

```go
type ResumeOperationReply struct {
	Status      string        `json:"status"`
	RequestID   UUID          `json:"requestId"`
	ServerTime  *string       `json:"serverTime"`
	ReceiptID   *UUID         `json:"receiptId"`
	CommittedAt *string       `json:"committedAt"`
	Replayed    *bool         `json:"replayed"`
	Operation   *OperationRef `json:"operation"`
	ResourceRef *ResourceRef  `json:"resourceRef"`
	Result      *Operation    `json:"result"`
}
```

ResumeOperationReply is the GraphQL object ResumeOperationReply.

### `ResumeOperationRequestInput` struct

```go
type ResumeOperationRequestInput struct {
	OperationID      UUID    `json:"operationId"`
	ExpectedRevision Decimal `json:"expectedRevision"`
}
```

ResumeOperationRequestInput is the GraphQL input ResumeOperationRequestInput.

### `RetainedResult` struct

```go
type RetainedResult struct {
	BillingCheckoutSession     *BillingCheckoutSession     `json:"billingCheckoutSession"`
	BillingPortalSession       *BillingPortalSession       `json:"billingPortalSession"`
	BroadcastPermissionChanged *BroadcastPermissionChanged `json:"broadcastPermissionChanged"`
	Conversation               *Conversation               `json:"conversation"`
	ConversationMemberBatch    *ConversationMemberBatch    `json:"conversationMemberBatch"`
	ConversationMute           *ConversationMute           `json:"conversationMute"`
	CredentialDeliveryReceipt  *CredentialDeliveryReceipt  `json:"credentialDeliveryReceipt"`
	DeliveryAck                *DeliveryAck                `json:"deliveryAck"`
	LiveAlertBatch             *LiveAlertBatch             `json:"liveAlertBatch"`
	LiveCredentialIssuance     *LiveCredentialIssuance     `json:"liveCredentialIssuance"`
	LiveSessionEndRequested    *LiveSessionEndRequested    `json:"liveSessionEndRequested"`
	LiveSessionJoined          *LiveSessionJoined          `json:"liveSessionJoined"`
	LiveSessionLeft            *LiveSessionLeft            `json:"liveSessionLeft"`
	LiveSessionStarted         *LiveSessionStarted         `json:"liveSessionStarted"`
	Member                     *Member                     `json:"member"`
	Message                    *Message                    `json:"message"`
	MessageAck                 *MessageAck                 `json:"messageAck"`
	Organization               *Organization               `json:"organization"`
	Principal                  *Principal                  `json:"principal"`
	ReadReceipt                *ReadReceipt                `json:"readReceipt"`
	SessionBootstrap           *SessionBootstrap           `json:"sessionBootstrap"`
	SessionRevocation          *SessionRevocation          `json:"sessionRevocation"`
	SignedProof                SignedProof                 `json:"signedProof"`
}
```

RetainedResult is the GraphQL object RetainedResult. Exactly one typed field contains the retained, currently authorized receipt result.

### `RevokeBackendKeyReply` struct

```go
type RevokeBackendKeyReply struct {
	Status      string           `json:"status"`
	RequestID   UUID             `json:"requestId"`
	ServerTime  *string          `json:"serverTime"`
	ReceiptID   *UUID            `json:"receiptId"`
	CommittedAt *string          `json:"committedAt"`
	Replayed    *bool            `json:"replayed"`
	Operation   *OperationRef    `json:"operation"`
	ResourceRef *ResourceRef     `json:"resourceRef"`
	Result      *OperationResult `json:"result"`
}
```

RevokeBackendKeyReply is the GraphQL object RevokeBackendKeyReply.

### `RevokeBackendKeyRequestInput` struct

```go
type RevokeBackendKeyRequestInput struct {
	ProjectID            UUID    `json:"projectId"`
	KeyID                string  `json:"keyId"`
	ExpectedRevision     Decimal `json:"expectedRevision"`
	RevokeIssuedSessions bool    `json:"revokeIssuedSessions"`
}
```

RevokeBackendKeyRequestInput is the GraphQL input RevokeBackendKeyRequestInput.

### `RevokeSessionReply` struct

```go
type RevokeSessionReply struct {
	Status      string             `json:"status"`
	RequestID   UUID               `json:"requestId"`
	ServerTime  *string            `json:"serverTime"`
	ReceiptID   *UUID              `json:"receiptId"`
	CommittedAt *string            `json:"committedAt"`
	Replayed    *bool              `json:"replayed"`
	Operation   *OperationRef      `json:"operation"`
	ResourceRef *ResourceRef       `json:"resourceRef"`
	Result      *SessionRevocation `json:"result"`
}
```

RevokeSessionReply is the GraphQL object RevokeSessionReply.

### `RevokeSessionRequestInput` struct

```go
type RevokeSessionRequestInput struct {
	SessionID        UUID    `json:"sessionId"`
	ExpectedRevision Decimal `json:"expectedRevision"`
}
```

RevokeSessionRequestInput is the GraphQL input RevokeSessionRequestInput.

### `RotateWebhookSecretReply` struct

```go
type RotateWebhookSecretReply struct {
	Status      string           `json:"status"`
	RequestID   UUID             `json:"requestId"`
	ServerTime  *string          `json:"serverTime"`
	ReceiptID   *UUID            `json:"receiptId"`
	CommittedAt *string          `json:"committedAt"`
	Replayed    *bool            `json:"replayed"`
	Operation   *OperationRef    `json:"operation"`
	ResourceRef *ResourceRef     `json:"resourceRef"`
	Result      *OperationResult `json:"result"`
}
```

RotateWebhookSecretReply is the GraphQL object RotateWebhookSecretReply.

### `RotateWebhookSecretRequestInput` struct

```go
type RotateWebhookSecretRequestInput struct {
	ProjectID        UUID    `json:"projectId"`
	EndpointID       UUID    `json:"endpointId"`
	ExpectedRevision Decimal `json:"expectedRevision"`
}
```

RotateWebhookSecretRequestInput is the GraphQL input RotateWebhookSecretRequestInput.

### `RouteReply` struct

```go
type RouteReply struct {
	Status      string        `json:"status"`
	RequestID   UUID          `json:"requestId"`
	ServerTime  *string       `json:"serverTime"`
	ReceiptID   *UUID         `json:"receiptId"`
	CommittedAt *string       `json:"committedAt"`
	Replayed    *bool         `json:"replayed"`
	Operation   *OperationRef `json:"operation"`
	ResourceRef *ResourceRef  `json:"resourceRef"`
	Result      SignedProof   `json:"result"`
}
```

RouteReply is the GraphQL object RouteReply.

### `SearchHit` struct

```go
type SearchHit struct {
	ConversationID UUID     `json:"conversationId"`
	Message        *Message `json:"message"`
}
```

SearchHit is the GraphQL object SearchHit.

### `SearchPage` struct

```go
type SearchPage struct {
	Items           []SearchHit `json:"items"`
	Complete        bool        `json:"complete"`
	RefreshRequired bool        `json:"refreshRequired"`
	NextCursor      *string     `json:"nextCursor"`
}
```

SearchPage is the GraphQL object SearchPage.

### `SearchReply` struct

```go
type SearchReply struct {
	Status      string        `json:"status"`
	RequestID   UUID          `json:"requestId"`
	ServerTime  *string       `json:"serverTime"`
	ReceiptID   *UUID         `json:"receiptId"`
	CommittedAt *string       `json:"committedAt"`
	Replayed    *bool         `json:"replayed"`
	Operation   *OperationRef `json:"operation"`
	ResourceRef *ResourceRef  `json:"resourceRef"`
	Result      *SearchPage   `json:"result"`
}
```

SearchReply is the GraphQL object SearchReply.

### `SearchRequestInput` struct

```go
type SearchRequestInput struct {
	Query            string            `json:"query"`
	PageSize         PageSize          `json:"pageSize"`
	Scope            *SearchScopeInput `json:"scope,omitzero"`
	Cursor           *string           `json:"cursor,omitzero"`
	ActAsPrincipalID *UUID             `json:"actAsPrincipalId,omitzero"`
}
```

SearchRequestInput is the GraphQL input SearchRequestInput.

### `SearchScopeInput` struct

```go
type SearchScopeInput struct {
	ConversationIDs []UUID `json:"conversationIds"`
}
```

SearchScopeInput is the GraphQL input SearchScopeInput.

### `SendMessageReply` struct

```go
type SendMessageReply struct {
	Status      string        `json:"status"`
	RequestID   UUID          `json:"requestId"`
	ServerTime  *string       `json:"serverTime"`
	ReceiptID   *UUID         `json:"receiptId"`
	CommittedAt *string       `json:"committedAt"`
	Replayed    *bool         `json:"replayed"`
	Operation   *OperationRef `json:"operation"`
	ResourceRef *ResourceRef  `json:"resourceRef"`
	Result      *MessageAck   `json:"result"`
}
```

SendMessageReply is the GraphQL object SendMessageReply.

### `SendMessageRequestInput` struct

```go
type SendMessageRequestInput struct {
	ConversationID   UUID       `json:"conversationId"`
	Text             string     `json:"text"`
	Props            Properties `json:"props"`
	ActAsPrincipalID *UUID      `json:"actAsPrincipalId,omitzero"`
}
```

SendMessageRequestInput is the GraphQL input SendMessageRequestInput.

### `ServiceDetails` struct

```go
type ServiceDetails struct {
	Status string `json:"status"`
}
```

ServiceDetails is the GraphQL object ServiceDetails.

### `ServiceObservation` struct

```go
type ServiceObservation struct {
	Role       string          `json:"role"`
	ObservedAt string          `json:"observedAt"`
	Details    *ServiceDetails `json:"details"`
}
```

ServiceObservation is the GraphQL object ServiceObservation.

### `Session` struct

```go
type Session struct {
	SessionID       UUID    `json:"sessionId"`
	PrincipalID     UUID    `json:"principalId"`
	DeviceID        UUID    `json:"deviceId"`
	Incarnation     UUID    `json:"incarnation"`
	SessionRevision Decimal `json:"sessionRevision"`
	ExpiresAt       string  `json:"expiresAt"`
	Status          string  `json:"status"`
}
```

Session is the GraphQL object Session.

### `SessionBootstrap` struct

```go
type SessionBootstrap struct {
	Session        *Session `json:"session"`
	TokenExpiresAt string   `json:"tokenExpiresAt"`
	SessionToken   string   `json:"sessionToken"`
}
```

SessionBootstrap is the GraphQL object SessionBootstrap.

### `SessionRequestOutcome` struct

```go
type SessionRequestOutcome struct {
	State           string   `json:"state"`
	RequestID       UUID     `json:"requestId"`
	CheckedAt       string   `json:"checkedAt"`
	Operation       *string  `json:"operation"`
	ReceiptID       *UUID    `json:"receiptId"`
	CommittedAt     *string  `json:"committedAt"`
	OriginalSession *Session `json:"originalSession"`
	CurrentSession  *Session `json:"currentSession"`
	CurrentState    *string  `json:"currentState"`
}
```

SessionRequestOutcome is the GraphQL object SessionRequestOutcome.

### `SessionRequestOutcomeReply` struct

```go
type SessionRequestOutcomeReply struct {
	Status     string                `json:"status"`
	RequestID  UUID                  `json:"requestId"`
	ServerTime string                `json:"serverTime"`
	Result     SessionRequestOutcome `json:"result"`
}
```

SessionRequestOutcomeReply is the GraphQL object SessionRequestOutcomeReply.

### `SessionRequestOutcomeRequestInput` struct

```go
type SessionRequestOutcomeRequestInput struct {
	RequestID UUID `json:"requestId"`
}
```

SessionRequestOutcomeRequestInput is the GraphQL input SessionRequestOutcomeRequestInput.

### `SessionRevocation` struct

```go
type SessionRevocation struct {
	SessionID   UUID         `json:"sessionId"`
	Status      string       `json:"status"`
	MediaCutoff *MediaCutoff `json:"mediaCutoff"`
}
```

SessionRevocation is the GraphQL object SessionRevocation.

### `SetBroadcastPermissionInput` struct

```go
type SetBroadcastPermissionInput struct {
	ConversationID             UUID    `json:"conversationId"`
	PrincipalID                UUID    `json:"principalId"`
	Allowed                    bool    `json:"allowed"`
	ExpectedMembershipRevision Decimal `json:"expectedMembershipRevision"`
}
```

SetBroadcastPermissionInput is the GraphQL input SetBroadcastPermissionInput.

### `SetBroadcastPermissionPayload` struct

```go
type SetBroadcastPermissionPayload struct {
	Status      string                     `json:"status"`
	RequestID   UUID                       `json:"requestId"`
	ReceiptID   UUID                       `json:"receiptId"`
	CommittedAt string                     `json:"committedAt"`
	Replayed    bool                       `json:"replayed"`
	Result      BroadcastPermissionChanged `json:"result"`
}
```

SetBroadcastPermissionPayload is the GraphQL object SetBroadcastPermissionPayload.

### `SetConversationMuteInput` struct

```go
type SetConversationMuteInput struct {
	ConversationID   UUID    `json:"conversationId"`
	Muted            bool    `json:"muted"`
	Until            *string `json:"until,omitzero"`
	ActAsPrincipalID *UUID   `json:"actAsPrincipalId,omitzero"`
}
```

SetConversationMuteInput is the GraphQL input SetConversationMuteInput.

### `SetConversationMutePayload` struct

```go
type SetConversationMutePayload struct {
	Status      string           `json:"status"`
	RequestID   UUID             `json:"requestId"`
	ReceiptID   UUID             `json:"receiptId"`
	CommittedAt string           `json:"committedAt"`
	Replayed    bool             `json:"replayed"`
	Result      ConversationMute `json:"result"`
}
```

SetConversationMutePayload is the GraphQL object SetConversationMutePayload.

### `UpdateConversationReply` struct

```go
type UpdateConversationReply struct {
	Status      string        `json:"status"`
	RequestID   UUID          `json:"requestId"`
	ServerTime  *string       `json:"serverTime"`
	ReceiptID   *UUID         `json:"receiptId"`
	CommittedAt *string       `json:"committedAt"`
	Replayed    *bool         `json:"replayed"`
	Operation   *OperationRef `json:"operation"`
	ResourceRef *ResourceRef  `json:"resourceRef"`
	Result      *Conversation `json:"result"`
}
```

UpdateConversationReply is the GraphQL object UpdateConversationReply.

### `UpdateConversationRequestInput` struct

```go
type UpdateConversationRequestInput struct {
	ConversationID   UUID       `json:"conversationId"`
	ExpectedRevision Decimal    `json:"expectedRevision"`
	Title            *string    `json:"title,omitzero"`
	Props            Properties `json:"props,omitzero"`
}
```

UpdateConversationRequestInput is the GraphQL input UpdateConversationRequestInput.

### `UpdateWebhookReply` struct

```go
type UpdateWebhookReply struct {
	Status      string           `json:"status"`
	RequestID   UUID             `json:"requestId"`
	ServerTime  *string          `json:"serverTime"`
	ReceiptID   *UUID            `json:"receiptId"`
	CommittedAt *string          `json:"committedAt"`
	Replayed    *bool            `json:"replayed"`
	Operation   *OperationRef    `json:"operation"`
	ResourceRef *ResourceRef     `json:"resourceRef"`
	Result      *OperationResult `json:"result"`
}
```

UpdateWebhookReply is the GraphQL object UpdateWebhookReply.

### `UpdateWebhookRequestInput` struct

```go
type UpdateWebhookRequestInput struct {
	ProjectID        UUID     `json:"projectId"`
	EndpointID       UUID     `json:"endpointId"`
	ExpectedRevision Decimal  `json:"expectedRevision"`
	EventTypes       []string `json:"eventTypes"`
	Enabled          bool     `json:"enabled"`
}
```

UpdateWebhookRequestInput is the GraphQL input UpdateWebhookRequestInput.

### `UsageMeter` struct

```go
type UsageMeter struct {
	Meter    string  `json:"meter"`
	Unit     string  `json:"unit"`
	Quantity Decimal `json:"quantity"`
	Emitted  bool    `json:"emitted"`
}
```

UsageMeter is the GraphQL object UsageMeter.

### `WebhookDeliveriesReply` struct

```go
type WebhookDeliveriesReply struct {
	Status      string               `json:"status"`
	RequestID   UUID                 `json:"requestId"`
	ServerTime  *string              `json:"serverTime"`
	ReceiptID   *UUID                `json:"receiptId"`
	CommittedAt *string              `json:"committedAt"`
	Replayed    *bool                `json:"replayed"`
	Operation   *OperationRef        `json:"operation"`
	ResourceRef *ResourceRef         `json:"resourceRef"`
	Result      *WebhookDeliveryPage `json:"result"`
}
```

WebhookDeliveriesReply is the GraphQL object WebhookDeliveriesReply.

### `WebhookDeliveriesRequestInput` struct

```go
type WebhookDeliveriesRequestInput struct {
	ProjectID  UUID `json:"projectId"`
	EndpointID UUID `json:"endpointId"`
}
```

WebhookDeliveriesRequestInput is the GraphQL input WebhookDeliveriesRequestInput.

### `WebhookDelivery` struct

```go
type WebhookDelivery struct {
	EffectID       UUID    `json:"effectId"`
	EventID        UUID    `json:"eventId"`
	State          string  `json:"state"`
	Attempts       Decimal `json:"attempts"`
	LastOutcome    *string `json:"lastOutcome"`
	NextAttemptAt  string  `json:"nextAttemptAt"`
	EventType      *string `json:"eventType"`
	CreatedAt      *string `json:"createdAt"`
	ReplayedAt     *string `json:"replayedAt"`
	LastAttemptAt  *string `json:"lastAttemptAt"`
	LastHTTPStatus *int64  `json:"lastHttpStatus"`
	LastLatencyMs  *int64  `json:"lastLatencyMs"`
	LastErrorCode  *string `json:"lastErrorCode"`
}
```

WebhookDelivery is the GraphQL object WebhookDelivery.

### `WebhookDeliveryPage` struct

```go
type WebhookDeliveryPage struct {
	Items           []WebhookDelivery `json:"items"`
	Complete        bool              `json:"complete"`
	RefreshRequired bool              `json:"refreshRequired"`
	NextCursor      *string           `json:"nextCursor"`
	ObservedAt      *string           `json:"observedAt"`
	PartialReason   *string           `json:"partialReason"`
	SourceRevision  *Decimal          `json:"sourceRevision"`
}
```

WebhookDeliveryPage is the GraphQL object WebhookDeliveryPage.

### `WebhookEndpoint` struct

```go
type WebhookEndpoint struct {
	EndpointID           UUID     `json:"endpointId"`
	URL                  string   `json:"url"`
	EventTypes           []string `json:"eventTypes"`
	Enabled              bool     `json:"enabled"`
	Status               string   `json:"status"`
	DisabledReason       *string  `json:"disabledReason"`
	Revision             Decimal  `json:"revision"`
	SecretVersion        string   `json:"secretVersion"`
	RotationPending      bool     `json:"rotationPending"`
	RotationOverlapUntil *string  `json:"rotationOverlapUntil"`
	ConsecutiveFailures  int64    `json:"consecutiveFailures"`
	FailingSince         *string  `json:"failingSince"`
	LastSuccessAt        *string  `json:"lastSuccessAt"`
	LastFailureAt        *string  `json:"lastFailureAt"`
}
```

WebhookEndpoint is the GraphQL object WebhookEndpoint.

### `WebhookEndpointPage` struct

```go
type WebhookEndpointPage struct {
	Items           []WebhookEndpoint `json:"items"`
	Complete        bool              `json:"complete"`
	RefreshRequired bool              `json:"refreshRequired"`
	NextCursor      *string           `json:"nextCursor"`
	ObservedAt      *string           `json:"observedAt"`
	PartialReason   *string           `json:"partialReason"`
}
```

WebhookEndpointPage is the GraphQL object WebhookEndpointPage.

### `WebhookEndpointsReply` struct

```go
type WebhookEndpointsReply struct {
	Status      string               `json:"status"`
	RequestID   UUID                 `json:"requestId"`
	ServerTime  *string              `json:"serverTime"`
	ReceiptID   *UUID                `json:"receiptId"`
	CommittedAt *string              `json:"committedAt"`
	Replayed    *bool                `json:"replayed"`
	Operation   *OperationRef        `json:"operation"`
	ResourceRef *ResourceRef         `json:"resourceRef"`
	Result      *WebhookEndpointPage `json:"result"`
}
```

WebhookEndpointsReply is the GraphQL object WebhookEndpointsReply.

### `WebhookEndpointsRequestInput` struct

```go
type WebhookEndpointsRequestInput struct {
	ProjectID UUID `json:"projectId"`
}
```

WebhookEndpointsRequestInput is the GraphQL input WebhookEndpointsRequestInput.

## Interfaces

### `RecoveryStore` interface

```go
type RecoveryStore interface {
	Load(ctx context.Context, key string) ([]byte, error)
	Store(ctx context.Context, key string, data []byte) error
}
```

RecoveryStore persists the mutation recovery records of a client, so a restarted process can still resolve or retry its requests. Records hold request identity, payload and attempt counts; they never hold credentials. Implementations must be safe for concurrent use.

A client reads its key once, on first use, and then replaces the data on every change. The key names the project, or the operator for a `ManagementClient`, so two clients for the same project or operator that run at the same time must not use the same store.

#### `RecoveryStore.Load` method

```go
Load(ctx context.Context, key string) ([]byte, error)
```

Load returns the data last stored under key, or no data when nothing is stored.

#### `RecoveryStore.Store` method

```go
Store(ctx context.Context, key string, data []byte) error
```

Store replaces the data under key. Return nil only once the data is durable.

## Enums

### `ErrorCode` enum

```go
type ErrorCode string
```

ErrorCode is the stable code of a `Problem`. The generated constants list every code the API documents. ErrorCode implements error so that errors.Is(err, ErrorCodeNotFound) matches a `Problem` with that code.

Error codes reported in `Problem`. Classify errors by code, never by message text.

#### `ErrorCode.ErrorCodeAdmissionLimit` case

```go
const ErrorCodeAdmissionLimit ErrorCode = "ADMISSION_LIMIT"
```

A rate, size or concurrency admission limit was reached. Back off, then retry with the same requestId. HTTP status 429. Retryable. Raised by the server or the SDK.

#### `ErrorCode.ErrorCodeAlreadyConnected` case

```go
const ErrorCodeAlreadyConnected ErrorCode = "ALREADY_CONNECTED"
```

The participation already has an active media connection. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeAlreadyExists` case

```go
const ErrorCodeAlreadyExists ErrorCode = "ALREADY_EXISTS"
```

A resource with the same unique key already exists. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeAuthorityUnavailable` case

```go
const ErrorCodeAuthorityUnavailable ErrorCode = "AUTHORITY_UNAVAILABLE"
```

The authority is temporarily unavailable. Retry with the same requestId. HTTP status 503. Retryable. Raised by the server or the SDK.

#### `ErrorCode.ErrorCodeBillingCatalogConflict` case

```go
const ErrorCodeBillingCatalogConflict ErrorCode = "BILLING_CATALOG_CONFLICT"
```

The billing provider's catalog conflicts with the configured price book, for example a duplicated or unsafe object. An operator must resolve it. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeBillingCatalogNotSynced` case

```go
const ErrorCodeBillingCatalogNotSynced ErrorCode = "BILLING_CATALOG_NOT_SYNCED"
```

The billing provider's catalog does not match the configured price book yet. An operator must sync it. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeBillingCustomerMissing` case

```go
const ErrorCodeBillingCustomerMissing ErrorCode = "BILLING_CUSTOMER_MISSING"
```

The organization has no billing account yet. Start a checkout first. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeBillingLinkExpired` case

```go
const ErrorCodeBillingLinkExpired ErrorCode = "BILLING_LINK_EXPIRED"
```

The billing link of this request is no longer valid. Send a new request with a new requestId. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeBillingNotConfigured` case

```go
const ErrorCodeBillingNotConfigured ErrorCode = "BILLING_NOT_CONFIGURED"
```

Billing is not configured in this environment. HTTP status 503. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeBillingPlanUnavailable` case

```go
const ErrorCodeBillingPlanUnavailable ErrorCode = "BILLING_PLAN_UNAVAILABLE"
```

The plan is not offered for self-service checkout. HTTP status 400. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeBillingProviderChanged` case

```go
const ErrorCodeBillingProviderChanged ErrorCode = "BILLING_PROVIDER_CHANGED"
```

The organization's billing account belongs to a different billing provider. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeBillingProviderRejected` case

```go
const ErrorCodeBillingProviderRejected ErrorCode = "BILLING_PROVIDER_REJECTED"
```

The billing provider refused the request. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeBillingSubscriptionActive` case

```go
const ErrorCodeBillingSubscriptionActive ErrorCode = "BILLING_SUBSCRIPTION_ACTIVE"
```

The organization already has a subscription. Change it in the billing portal. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeBillingSuspended` case

```go
const ErrorCodeBillingSuspended ErrorCode = "BILLING_SUSPENDED"
```

The organization is suspended for an unpaid balance. Update its payment method in the billing portal. HTTP status 402. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeCredentialDeliveryExpired` case

```go
const ErrorCodeCredentialDeliveryExpired ErrorCode = "CREDENTIAL_DELIVERY_EXPIRED"
```

The credential delivery expired or can no longer be redeemed. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeCredentialExpired` case

```go
const ErrorCodeCredentialExpired ErrorCode = "CREDENTIAL_EXPIRED"
```

The credential carried by the stored result has expired. Request a new one. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeCredentialRefreshRequired` case

```go
const ErrorCodeCredentialRefreshRequired ErrorCode = "CREDENTIAL_REFRESH_REQUIRED"
```

The media credential must be refreshed before connecting. HTTP status 409. Not retryable. Raised by the server or the SDK.

#### `ErrorCode.ErrorCodeCredentialRequired` case

```go
const ErrorCodeCredentialRequired ErrorCode = "CREDENTIAL_REQUIRED"
```

Delivery-permit requests cannot be resolved by lookup. Obtain a current permit and resubmit the same delivery explicitly. HTTP status 409. Not retryable. Raised by the SDK.

#### `ErrorCode.ErrorCodeCursorAhead` case

```go
const ErrorCodeCursorAhead ErrorCode = "CURSOR_AHEAD"
```

The cursor is ahead of the committed events of the conversation. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeCursorExpired` case

```go
const ErrorCodeCursorExpired ErrorCode = "CURSOR_EXPIRED"
```

The cursor is older than retained history. Resynchronize from current state; never reset the cursor silently. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeCursorInvalid` case

```go
const ErrorCodeCursorInvalid ErrorCode = "CURSOR_INVALID"
```

The cursor is malformed or was not issued for this query. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeCursorMismatch` case

```go
const ErrorCodeCursorMismatch ErrorCode = "CURSOR_MISMATCH"
```

The cursor does not continue the subscribed stream. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeCursorScopeMismatch` case

```go
const ErrorCodeCursorScopeMismatch ErrorCode = "CURSOR_SCOPE_MISMATCH"
```

The cursor was issued for a different scope, caller or visibility. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeDeliveryConsumed` case

```go
const ErrorCodeDeliveryConsumed ErrorCode = "DELIVERY_CONSUMED"
```

The delivery was already redeemed by a different request. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeDeliveryNotRedeemed` case

```go
const ErrorCodeDeliveryNotRedeemed ErrorCode = "DELIVERY_NOT_REDEEMED"
```

The delivery must be redeemed before it can be acknowledged. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeDeploymentNotReady` case

```go
const ErrorCodeDeploymentNotReady ErrorCode = "DEPLOYMENT_NOT_READY"
```

The deployment cannot host projects yet. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeFeatureUnsupported` case

```go
const ErrorCodeFeatureUnsupported ErrorCode = "FEATURE_UNSUPPORTED"
```

The feature is not available in this deployment. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeForbidden` case

```go
const ErrorCodeForbidden ErrorCode = "FORBIDDEN"
```

The credential is valid but not allowed to perform this operation. HTTP status 403. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeGenerationConflict` case

```go
const ErrorCodeGenerationConflict ErrorCode = "GENERATION_CONFLICT"
```

The live session generation changed. Read the current generation and retry. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeGraphQLError` case

```go
const ErrorCodeGraphQLError ErrorCode = "GRAPHQL_ERROR"
```

A GraphQL error arrived without a recognized code. Not retryable. Raised by the SDK.

#### `ErrorCode.ErrorCodeGraphQLInvalidRequest` case

```go
const ErrorCodeGraphQLInvalidRequest ErrorCode = "GRAPHQL_INVALID_REQUEST"
```

The GraphQL request is malformed or fails validation. HTTP status 400. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeGraphQLQueryLimit` case

```go
const ErrorCodeGraphQLQueryLimit ErrorCode = "GRAPHQL_QUERY_LIMIT"
```

The GraphQL document exceeds a depth, complexity or size limit. HTTP status 400. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeGraphQLResponseLimit` case

```go
const ErrorCodeGraphQLResponseLimit ErrorCode = "GRAPHQL_RESPONSE_LIMIT"
```

The query response exceeds the response limit. Request a smaller page. HTTP status 413. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeHTTPFailure` case

```go
const ErrorCodeHTTPFailure ErrorCode = "HTTP_FAILURE"
```

The HTTP exchange failed without a usable GraphQL error. Retryable. Raised by the SDK.

#### `ErrorCode.ErrorCodeIdempotencyConflict` case

```go
const ErrorCodeIdempotencyConflict ErrorCode = "IDEMPOTENCY_CONFLICT"
```

The requestId was already used with a different payload or caller. HTTP status 409. Not retryable. Raised by the server or the SDK.

#### `ErrorCode.ErrorCodeIncarnationMismatch` case

```go
const ErrorCodeIncarnationMismatch ErrorCode = "INCARNATION_MISMATCH"
```

The project incarnation changed. Discard state from the old incarnation and recover explicitly. HTTP status 409. Not retryable. Raised by the server or the SDK.

#### `ErrorCode.ErrorCodeInvalidReplacement` case

```go
const ErrorCodeInvalidReplacement ErrorCode = "INVALID_REPLACEMENT"
```

The connection to replace is not a current connection of this participation. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeInvalidRequest` case

```go
const ErrorCodeInvalidRequest ErrorCode = "INVALID_REQUEST"
```

The input or request context failed validation. HTTP status 400. Not retryable. Raised by the server or the SDK.

#### `ErrorCode.ErrorCodeInvalidResponse` case

```go
const ErrorCodeInvalidResponse ErrorCode = "INVALID_RESPONSE"
```

The response did not match the expected shape or identity. The outcome is unknown. Retryable. Raised by the SDK.

#### `ErrorCode.ErrorCodeLiveAlertLimit` case

```go
const ErrorCodeLiveAlertLimit ErrorCode = "LIVE_ALERT_LIMIT"
```

The live session reached its alert limit. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeLiveSessionClosed` case

```go
const ErrorCodeLiveSessionClosed ErrorCode = "LIVE_SESSION_CLOSED"
```

The live session has ended or is ending. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeLiveSessionExists` case

```go
const ErrorCodeLiveSessionExists ErrorCode = "LIVE_SESSION_EXISTS"
```

The conversation already has an active live session. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeMediaConnectFailed` case

```go
const ErrorCodeMediaConnectFailed ErrorCode = "MEDIA_CONNECT_FAILED"
```

The native media connection failed. The participation remains; resolve and reconnect, or leave explicitly. Not retryable. Raised by the SDK.

#### `ErrorCode.ErrorCodeMediaFenceRequired` case

```go
const ErrorCodeMediaFenceRequired ErrorCode = "MEDIA_FENCE_REQUIRED"
```

Media cutoff is not enforced yet for this live session. Retry after the cutoff completes. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeMediaNotReady` case

```go
const ErrorCodeMediaNotReady ErrorCode = "MEDIA_NOT_READY"
```

Media for the live session is not ready yet. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeMediaRecovering` case

```go
const ErrorCodeMediaRecovering ErrorCode = "MEDIA_RECOVERING"
```

Media for the live session is recovering. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeMembershipCountInvalid` case

```go
const ErrorCodeMembershipCountInvalid ErrorCode = "MEMBERSHIP_COUNT_INVALID"
```

Membership accounting needs operator reconciliation. HTTP status 503. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeMemberLimit` case

```go
const ErrorCodeMemberLimit ErrorCode = "MEMBER_LIMIT"
```

The conversation reached its member limit. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeMessageDeleted` case

```go
const ErrorCodeMessageDeleted ErrorCode = "MESSAGE_DELETED"
```

The message was deleted. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeNotASessionRequest` case

```go
const ErrorCodeNotASessionRequest ErrorCode = "NOT_A_SESSION_REQUEST"
```

The requestId does not belong to an issueSession or renewSession request. HTTP status 400. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeNotFound` case

```go
const ErrorCodeNotFound ErrorCode = "NOT_FOUND"
```

The resource does not exist or is not visible to the caller. HTTP status 404. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeOutcomeUnknown` case

```go
const ErrorCodeOutcomeUnknown ErrorCode = "OUTCOME_UNKNOWN"
```

The mutation may have committed. Retry with the same requestId or resolve it. HTTP status 503. Retryable. Raised by the server.

#### `ErrorCode.ErrorCodePageItemTooLarge` case

```go
const ErrorCodePageItemTooLarge ErrorCode = "PAGE_ITEM_TOO_LARGE"
```

A single item exceeds the page response limit. HTTP status 413. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeParticipationMismatch` case

```go
const ErrorCodeParticipationMismatch ErrorCode = "PARTICIPATION_MISMATCH"
```

The participation does not belong to the caller or the current live session generation. HTTP status 409. Not retryable. Raised by the server or the SDK.

#### `ErrorCode.ErrorCodePermitExpired` case

```go
const ErrorCodePermitExpired ErrorCode = "PERMIT_EXPIRED"
```

The stored delivery permit has expired. Request a new permit. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodePlanLimitExceeded` case

```go
const ErrorCodePlanLimitExceeded ErrorCode = "PLAN_LIMIT_EXCEEDED"
```

The plan does not permit the resource or feature. extensions.planLimit names the limit and extensions.limit holds the plan's value. Change the plan or the limit before trying again. HTTP status 403. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeQuotaExceeded` case

```go
const ErrorCodeQuotaExceeded ErrorCode = "QUOTA_EXCEEDED"
```

A hard usage quota refused new work until the quota period ends. extensions.meter, extensions.limit and extensions.periodEnd describe the quota, and extensions.retryAfter (HTTP Retry-After) counts the seconds until it resets. Work already in progress continues. HTTP status 429. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeRateLimited` case

```go
const ErrorCodeRateLimited ErrorCode = "RATE_LIMITED"
```

A per-second rate limit refused the request before it had any effect. Wait extensions.retryAfter seconds (HTTP Retry-After), then resend the request with the same requestId. HTTP status 429. Retryable. Raised by the server.

#### `ErrorCode.ErrorCodeRecoveryLimit` case

```go
const ErrorCodeRecoveryLimit ErrorCode = "RECOVERY_LIMIT"
```

The SDK's recovery store already holds 128 mutation records that are not final, so the new request was not sent. Retry or resolve outstanding requests, then send it again. HTTP status 409. Not retryable. Raised by the SDK.

#### `ErrorCode.ErrorCodeRecoveryStorageFailure` case

```go
const ErrorCodeRecoveryStorageFailure ErrorCode = "RECOVERY_STORAGE_FAILURE"
```

Caller-provided recovery storage did not confirm durability. Keep the original request and its outcome. Not retryable. Raised by the SDK.

#### `ErrorCode.ErrorCodeRequestExpired` case

```go
const ErrorCodeRequestExpired ErrorCode = "REQUEST_EXPIRED"
```

The original request is too old to replay. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeRequestTooLarge` case

```go
const ErrorCodeRequestTooLarge ErrorCode = "REQUEST_TOO_LARGE"
```

The request body exceeds the size limit. HTTP status 413. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeResolutionRequired` case

```go
const ErrorCodeResolutionRequired ErrorCode = "RESOLUTION_REQUIRED"
```

The outcome is still unresolved and the retry budget is spent. Resolve the original request before continuing. HTTP status 409. Not retryable. Raised by the SDK.

#### `ErrorCode.ErrorCodeResponseTooLarge` case

```go
const ErrorCodeResponseTooLarge ErrorCode = "RESPONSE_TOO_LARGE"
```

The response exceeds the size limit. HTTP status 413. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeResyncRequired` case

```go
const ErrorCodeResyncRequired ErrorCode = "RESYNC_REQUIRED"
```

The subscription cannot continue. Replay from the last applied cursor. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeRetryExhausted` case

```go
const ErrorCodeRetryExhausted ErrorCode = "RETRY_EXHAUSTED"
```

The authority exhausted its internal retry budget. Retry later with the same requestId. HTTP status 503. Retryable. Raised by the server.

#### `ErrorCode.ErrorCodeRevisionConflict` case

```go
const ErrorCodeRevisionConflict ErrorCode = "REVISION_CONFLICT"
```

The expected revision or epoch is stale. Read the current state and retry with a new request. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeScopeRequired` case

```go
const ErrorCodeScopeRequired ErrorCode = "SCOPE_REQUIRED"
```

The backend key lacks a scope this operation requires. The message names the scope. HTTP status 403. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeSessionReceiptBindingMismatch` case

```go
const ErrorCodeSessionReceiptBindingMismatch ErrorCode = "SESSION_RECEIPT_BINDING_MISMATCH"
```

The stored session receipt does not match its binding. HTTP status 503. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeSessionReceiptInvalid` case

```go
const ErrorCodeSessionReceiptInvalid ErrorCode = "SESSION_RECEIPT_INVALID"
```

The stored session receipt failed validation. HTTP status 503. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeSessionRefreshFailed` case

```go
const ErrorCodeSessionRefreshFailed ErrorCode = "SESSION_REFRESH_FAILED"
```

The application session refresh callback failed. Not retryable. Raised by the SDK.

#### `ErrorCode.ErrorCodeSessionRefreshRejected` case

```go
const ErrorCodeSessionRefreshRejected ErrorCode = "SESSION_REFRESH_REJECTED"
```

The refreshed session was rejected because it does not match the current session. HTTP status 409. Not retryable. Raised by the SDK.

#### `ErrorCode.ErrorCodeSessionRefreshRequired` case

```go
const ErrorCodeSessionRefreshRequired ErrorCode = "SESSION_REFRESH_REQUIRED"
```

The user session needs renewal and no refresh is configured, or it expired. HTTP status 409. Not retryable. Raised by the SDK.

#### `ErrorCode.ErrorCodeSessionRefreshUnverified` case

```go
const ErrorCodeSessionRefreshUnverified ErrorCode = "SESSION_REFRESH_UNVERIFIED"
```

The refreshed session could not be verified. Not retryable. Raised by the SDK.

#### `ErrorCode.ErrorCodeTransportUnknown` case

```go
const ErrorCodeTransportUnknown ErrorCode = "TRANSPORT_UNKNOWN"
```

The transport failed after the request may have been sent. Resolve or retry the original request. Retryable. Raised by the SDK.

#### `ErrorCode.ErrorCodeUnauthenticated` case

```go
const ErrorCodeUnauthenticated ErrorCode = "UNAUTHENTICATED"
```

The credential is missing, invalid or expired. HTTP status 401. Not retryable. Raised by the server or the SDK.

#### `ErrorCode.ErrorCodeWebhookDestinationDenied` case

```go
const ErrorCodeWebhookDestinationDenied ErrorCode = "WEBHOOK_DESTINATION_DENIED"
```

The webhook URL is not a public HTTPS destination. HTTP status 400. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeWebhookEndpointDisabled` case

```go
const ErrorCodeWebhookEndpointDisabled ErrorCode = "WEBHOOK_ENDPOINT_DISABLED"
```

The webhook endpoint is disabled. Enable it, then replay its deliveries. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeWebhookEndpointLimit` case

```go
const ErrorCodeWebhookEndpointLimit ErrorCode = "WEBHOOK_ENDPOINT_LIMIT"
```

The project reached its webhook endpoint limit. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeWebhookRotationPending` case

```go
const ErrorCodeWebhookRotationPending ErrorCode = "WEBHOOK_ROTATION_PENDING"
```

A signing-secret rotation is already waiting for acknowledgement. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeWebhookSecretUnacknowledged` case

```go
const ErrorCodeWebhookSecretUnacknowledged ErrorCode = "WEBHOOK_SECRET_UNACKNOWLEDGED"
```

The endpoint's signing secret has not been acknowledged yet. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.ErrorCodeWrongRegion` case

```go
const ErrorCodeWrongRegion ErrorCode = "WRONG_REGION"
```

The observed serving epoch is stale. Route again, then retry. HTTP status 409. Not retryable. Raised by the server.

#### `ErrorCode.Error` method

```go
func (c ErrorCode) Error() string
```

Error returns the code as an error message.

#### `ErrorCode.Retryable` method

```go
func (c ErrorCode) Retryable() bool
```

Retryable reports whether the API documents the error code as retryable with the same request ID.

### `LiveCutoffEvidence` enum

```go
type LiveCutoffEvidence string

const (
	LiveCutoffEvidenceNativeFence             LiveCutoffEvidence = "NATIVE_FENCE"
	LiveCutoffEvidenceMonotonicBootRetirement LiveCutoffEvidence = "MONOTONIC_BOOT_RETIREMENT"
	LiveCutoffEvidenceNoGrantsIssued          LiveCutoffEvidence = "NO_GRANTS_ISSUED"
)
```

LiveCutoffEvidence is the GraphQL enum LiveCutoffEvidence.

LiveCutoffEvidence values.

### `LiveCutoffScopeKind` enum

```go
type LiveCutoffScopeKind string

const (
	LiveCutoffScopeKindParticipation LiveCutoffScopeKind = "PARTICIPATION"
	LiveCutoffScopeKindGeneration    LiveCutoffScopeKind = "GENERATION"
)
```

LiveCutoffScopeKind is the GraphQL enum LiveCutoffScopeKind.

LiveCutoffScopeKind values.

### `LiveCutoffState` enum

```go
type LiveCutoffState string

const (
	LiveCutoffStatePending  LiveCutoffState = "PENDING"
	LiveCutoffStateEnforced LiveCutoffState = "ENFORCED"
	LiveCutoffStateUnknown  LiveCutoffState = "UNKNOWN"
)
```

LiveCutoffState is the GraphQL enum LiveCutoffState.

LiveCutoffState values.

### `LiveErrorCode` enum

```go
type LiveErrorCode string

const (
	LiveErrorCodeLiveSessionExists         LiveErrorCode = "LIVE_SESSION_EXISTS"
	LiveErrorCodeLiveSessionClosed         LiveErrorCode = "LIVE_SESSION_CLOSED"
	LiveErrorCodeLiveSessionInterrupted    LiveErrorCode = "LIVE_SESSION_INTERRUPTED"
	LiveErrorCodeLiveSessionCapacity       LiveErrorCode = "LIVE_SESSION_CAPACITY"
	LiveErrorCodeLiveAlertLimit            LiveErrorCode = "LIVE_ALERT_LIMIT"
	LiveErrorCodeJoinedElsewhere           LiveErrorCode = "JOINED_ELSEWHERE"
	LiveErrorCodeParticipationDraining     LiveErrorCode = "PARTICIPATION_DRAINING"
	LiveErrorCodeParticipationMismatch     LiveErrorCode = "PARTICIPATION_MISMATCH"
	LiveErrorCodeGenerationConflict        LiveErrorCode = "GENERATION_CONFLICT"
	LiveErrorCodeMediaNotReady             LiveErrorCode = "MEDIA_NOT_READY"
	LiveErrorCodeCredentialRefreshRequired LiveErrorCode = "CREDENTIAL_REFRESH_REQUIRED"
	LiveErrorCodeLiveStartCancelled        LiveErrorCode = "LIVE_START_CANCELLED"
	LiveErrorCodeLivePreparationFailed     LiveErrorCode = "LIVE_PREPARATION_FAILED"
)
```

LiveErrorCode is the GraphQL enum LiveErrorCode.

LiveErrorCode values.

### `LiveMediaProfile` enum

```go
type LiveMediaProfile string

const (
	LiveMediaProfileAudioOnly  LiveMediaProfile = "AUDIO_ONLY"
	LiveMediaProfileAudioVideo LiveMediaProfile = "AUDIO_VIDEO"
)
```

LiveMediaProfile is the GraphQL enum LiveMediaProfile.

LiveMediaProfile values.

### `LiveOperationKind` enum

```go
type LiveOperationKind string

const (
	LiveOperationKindStart LiveOperationKind = "START"
	LiveOperationKindEnd   LiveOperationKind = "END"
)
```

LiveOperationKind is the GraphQL enum LiveOperationKind.

LiveOperationKind values.

### `LiveOperationState` enum

```go
type LiveOperationState string

const (
	LiveOperationStateRunning   LiveOperationState = "RUNNING"
	LiveOperationStateCompleted LiveOperationState = "COMPLETED"
	LiveOperationStateFailed    LiveOperationState = "FAILED"
)
```

LiveOperationState is the GraphQL enum LiveOperationState.

LiveOperationState values.

### `LiveParticipationState` enum

```go
type LiveParticipationState string

const (
	LiveParticipationStateJoined       LiveParticipationState = "JOINED"
	LiveParticipationStateConnecting   LiveParticipationState = "CONNECTING"
	LiveParticipationStateConnected    LiveParticipationState = "CONNECTED"
	LiveParticipationStateDisconnected LiveParticipationState = "DISCONNECTED"
	LiveParticipationStateLeaving      LiveParticipationState = "LEAVING"
	LiveParticipationStateLeft         LiveParticipationState = "LEFT"
)
```

LiveParticipationState is the GraphQL enum LiveParticipationState.

LiveParticipationState values.

### `LiveRole` enum

```go
type LiveRole string

const (
	LiveRolePublisher LiveRole = "PUBLISHER"
	LiveRoleViewer    LiveRole = "VIEWER"
)
```

LiveRole is the GraphQL enum LiveRole.

LiveRole values.

### `LiveSessionKind` enum

```go
type LiveSessionKind string

const (
	LiveSessionKindInteractive LiveSessionKind = "INTERACTIVE"
	LiveSessionKindBroadcast   LiveSessionKind = "BROADCAST"
)
```

LiveSessionKind is the GraphQL enum LiveSessionKind.

LiveSessionKind values.

### `LiveSessionState` enum

```go
type LiveSessionState string

const (
	LiveSessionStatePreparing LiveSessionState = "PREPARING"
	LiveSessionStateReady     LiveSessionState = "READY"
	LiveSessionStateActive    LiveSessionState = "ACTIVE"
	LiveSessionStateDraining  LiveSessionState = "DRAINING"
	LiveSessionStateEnded     LiveSessionState = "ENDED"
	LiveSessionStateFailed    LiveSessionState = "FAILED"
)
```

LiveSessionState is the GraphQL enum LiveSessionState.

LiveSessionState values.

### `Outcome` enum

```go
type Outcome string
```

Outcome reports what is known about the effect of a failed request.

Outcomes reported in `Problem`.

#### `Outcome.OutcomeRejected` case

```go
const OutcomeRejected Outcome = "rejected"
```

OutcomeRejected means the authority did not apply the request.

#### `Outcome.OutcomeUnknown` case

```go
const OutcomeUnknown Outcome = "unknown"
```

OutcomeUnknown means the request may or may not have taken effect. Resolve the original request ID before deciding what to do.

#### `Outcome.OutcomeCommitted` case

```go
const OutcomeCommitted Outcome = "committed"
```

OutcomeCommitted means the request took effect.

#### `Outcome.OutcomeAccepted` case

```go
const OutcomeAccepted Outcome = "accepted"
```

OutcomeAccepted means the authority accepted a long-running operation.

## Types

### `CallOption` type

```go
type CallOption func(*callSettings)
```

CallOption configures one call.

### `Decimal` type

```go
type Decimal = string
```

Decimal is the GraphQL scalar Decimal. Non-negative 64-bit counter as a canonical decimal string. Never convert it to a floating-point number.

### `Option` type

```go
type Option func(*settings)
```

Option configures a client. Pass options to `NewProjectClient` or `NewManagementClient`.

### `PageSize` type

```go
type PageSize = int64
```

PageSize is the GraphQL scalar PageSize. Requested page size.

### `Properties` type

```go
type Properties = map[string]any
```

Properties is the GraphQL scalar Properties. Application-defined JSON object. Numbers must stay within the interoperable safe-integer range.

### `SignedProof` type

```go
type SignedProof = map[string]any
```

SignedProof is the GraphQL scalar SignedProof. Server-signed JSON object. Treat it as opaque and pass it back unchanged.

### `UUID` type

```go
type UUID = string
```

UUID is the GraphQL scalar UUID. Canonical lowercase UUID. The nil UUID is rejected.

## Functions

### `NewManagementClient` function

```go
func NewManagementClient(config ManagementConfig, options ...Option) (*ManagementClient, error)
```

NewManagementClient returns a client for the management plane. It sends nothing until a method is called.

### `NewMemoryRecoveryStore` function

```go
func NewMemoryRecoveryStore() *MemoryRecoveryStore
```

NewMemoryRecoveryStore returns an empty `MemoryRecoveryStore`.

### `NewProjectClient` function

```go
func NewProjectClient(config ProjectConfig, options ...Option) (*ProjectClient, error)
```

NewProjectClient returns a client for the communication plane of one project. It sends nothing until a method is called.

### `NewRequestID` function

```go
func NewRequestID() string
```

NewRequestID returns a random version 4 UUID in canonical lowercase form.

### `WithClock` function

```go
func WithClock(now func() time.Time) Option
```

WithClock replaces time.Now for retry budgets. Use it in tests.

### `WithHTTPClient` function

```go
func WithHTTPClient(client *http.Client) Option
```

WithHTTPClient sends requests with a copy of client. The copy never follows redirects and never sends cookies; client's Transport and Timeout apply.

### `WithRecoveryStore` function

```go
func WithRecoveryStore(store RecoveryStore) Option
```

WithRecoveryStore persists mutation recovery records in store, so a restarted process can resolve or retry requests whose outcome is unknown. Without it, records live only in memory. Records hold request identity, payload and attempt counts; they never hold credentials.

### `WithRequestID` function

```go
func WithRequestID(requestID string) CallOption
```

WithRequestID sends the call with requestID, a canonical lowercase UUID, instead of a new one. To retry a mutation whose outcome is unknown, send the same input again with the original request ID, or use the client's Retry.

### `WithTimeout` function

```go
func WithTimeout(timeout time.Duration) Option
```

WithTimeout bounds each HTTP exchange, including reading the response. The default is 12 seconds. A context deadline still applies.

## Constants

### `ErrRefreshRequired` constant

```go
var ErrRefreshRequired = errors.New("convohop: the page sequence requires a refresh; start again from the first page")
```

ErrRefreshRequired reports a page sequence the authority can no longer continue consistently, for example after a visibility change. A Pages iterator yields the page that requires the refresh together with this error and stops. Start again from the first page.
