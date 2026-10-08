// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
/** One field of an input type. */
export interface CliInputField {
  readonly name: string;
  /** The GraphQL type, such as `UUID!` or `[String!]!`. */
  readonly type: string;
  /** Whether the input must set the field: it is non-null and has no default. */
  readonly required: boolean;
  readonly description?: string;
  /** The value the authority uses when the input leaves the field out. */
  readonly default?: unknown;
  readonly deprecated?: { readonly reason?: string };
}
/** An input type, enum or custom scalar that operation inputs use. */
export type CliType =
  | { readonly kind: "input"; readonly description?: string; readonly fields: readonly CliInputField[] }
  | { readonly kind: "enum"; readonly description?: string; readonly values: readonly string[] }
  | { readonly kind: "scalar"; readonly description?: string };
/** One operation and its annotations. */
export interface CliOperation {
  readonly id: string;
  readonly plane: string;
  readonly kind: "query" | "mutation";
  readonly summary: string;
  readonly description?: string;
  /** The bearer credential the CLI sends with the operation. */
  readonly credential: string;
  /** Who can call the operation with that credential: its scopes and conditions. */
  readonly requires: string;
  readonly idempotency: string;
  /** How the idempotency class retries: `repeat` (read-only), `sameRequest` (resend the same request) or `none`. */
  readonly retry: string;
  /** Whether resolveRequest can look up a request with an unknown outcome. */
  readonly resolvable: boolean;
  /** Whether it deletes, revokes, removes, disables or ends something. */
  readonly destructive: boolean;
  /** How the result pages, for paged operations. */
  readonly paged?: string;
  /** For long-running operations: the result field that identifies the work, and the operation that polls it. */
  readonly longRunning?: { readonly poll: string; readonly refField: string };
  /** The input type, a key of cliTypes; absent when the operation takes no input. */
  readonly input?: string;
}
/** Operations `convohop call` never runs, because their results are credentials. */
export const withheldOperations: Readonly<Record<string, string>> = {
  "communication.issueSession": "returns a user session token",
  "communication.renewSession": "returns a user session token",
  "management.credentialPermit": "returns a credential delivery permit"
};
/** The scopes a backend key can grant, by wire name, with what each allows. */
export const cliScopes: Readonly<Record<string, string>> = {
  "callManage": "Read, alert and end any live session in the project.",
  "callRead": "Read any live session in the project, with its participants and operations.",
  "conversationManage": "Create, read and update any conversation in the project.",
  "historyManage": "Expand the history visible to members.",
  "membershipManage": "Read and change conversation membership and broadcast permissions, and read or set the push mute of the member named by actAsPrincipalId. Requests that use actAsPrincipalId are audited.",
  "messageRead": "Read history, get messages and search in any conversation of the project, or read as the member named by actAsPrincipalId. The inbox requires actAsPrincipalId. Requests that use actAsPrincipalId are audited.",
  "messageWrite": "Send messages as the backend's service principal, or as the member named by actAsPrincipalId. Requests that use actAsPrincipalId are audited.",
  "moderation": "Edit or delete any message.",
  "principalManage": "Create, read and disable principals.",
  "sessionIssue": "Issue and renew user sessions.",
  "sessionManage": "Revoke user sessions and inspect session request outcomes."
};
export const cliTypes: Readonly<Record<string, CliType>> = {
  "AddMemberRequestInput": {
    "kind": "input",
    "fields": [
      {"name": "conversationId", "type": "UUID!", "required": true},
      {"name": "principalId", "type": "UUID!", "required": true},
      {"name": "role", "type": "String!", "required": true},
      {"name": "expectedRevision", "type": "Decimal!", "required": true}
    ]
  },
  "AddMembersInput": {
    "kind": "input",
    "fields": [
      {"name": "conversationId", "type": "UUID!", "required": true},
      {"name": "members", "type": "[MemberBatchEntryInput!]!", "required": true}
    ]
  },
  "AlertLiveSessionInput": {
    "kind": "input",
    "fields": [
      {"name": "liveSessionId", "type": "UUID!", "required": true},
      {"name": "expectedGeneration", "type": "Decimal!", "required": true},
      {"name": "principalIds", "type": "[UUID!]!", "required": true}
    ]
  },
  "ConfigureWebhookRequestInput": {
    "kind": "input",
    "fields": [
      {"name": "projectId", "type": "UUID!", "required": true},
      {"name": "url", "type": "String!", "required": true},
      {"name": "eventTypes", "type": "[String!]!", "required": true},
      {"name": "consentRef", "type": "String!", "required": true}
    ]
  },
  "ConversationLiveInput": {
    "kind": "input",
    "fields": [{"name": "conversationId", "type": "UUID!", "required": true}]
  },
  "ConversationMuteInput": {
    "kind": "input",
    "fields": [
      {"name": "conversationId", "type": "UUID!", "required": true},
      {"name": "actAsPrincipalId", "type": "UUID", "required": false}
    ]
  },
  "CreateConversationRequestInput": {
    "kind": "input",
    "fields": [
      {"name": "title", "type": "String!", "required": true},
      {"name": "props", "type": "Properties!", "required": true},
      {"name": "members", "type": "[MemberInputInput!]!", "required": true}
    ]
  },
  "CreateDeploymentRequestInput": {
    "kind": "input",
    "fields": [
      {"name": "orgId", "type": "UUID!", "required": true},
      {"name": "offering", "type": "String!", "required": true},
      {"name": "geoId", "type": "String!", "required": true},
      {"name": "installationProfileId", "type": "String!", "required": true},
      {"name": "consentRef", "type": "String!", "required": true}
    ]
  },
  "CreateOrganizationRequestInput": {
    "kind": "input",
    "fields": [
      {"name": "name", "type": "String!", "required": true},
      {"name": "termsRef", "type": "String!", "required": true}
    ]
  },
  "CreatePrincipalRequestInput": {
    "kind": "input",
    "fields": [{"name": "externalUserId", "type": "String!", "required": true}]
  },
  "CreateProjectRequestInput": {
    "kind": "input",
    "fields": [
      {"name": "deploymentId", "type": "UUID!", "required": true},
      {"name": "name", "type": "String!", "required": true},
      {"name": "environment", "type": "String!", "required": true},
      {"name": "backendPrincipalName", "type": "String!", "required": true}
    ]
  },
  "Decimal": {
    "kind": "scalar",
    "description": "Non-negative 64-bit counter as a canonical decimal string. Never convert it to a floating-point number."
  },
  "DeleteMessageRequestInput": {
    "kind": "input",
    "fields": [
      {"name": "conversationId", "type": "UUID!", "required": true},
      {"name": "messageId", "type": "UUID!", "required": true},
      {"name": "expectedRevision", "type": "Decimal!", "required": true}
    ]
  },
  "DeploymentHealthRequestInput": {
    "kind": "input",
    "fields": [{"name": "deploymentId", "type": "UUID!", "required": true}]
  },
  "DeploymentUsageRequestInput": {
    "kind": "input",
    "fields": [
      {"name": "deploymentId", "type": "UUID!", "required": true},
      {"name": "from", "type": "String", "required": false},
      {"name": "to", "type": "String", "required": false}
    ]
  },
  "DisablePrincipalRequestInput": {
    "kind": "input",
    "fields": [
      {"name": "principalId", "type": "UUID!", "required": true},
      {"name": "expectedRevision", "type": "Decimal!", "required": true}
    ]
  },
  "DisableWebhookRequestInput": {
    "kind": "input",
    "fields": [
      {"name": "projectId", "type": "UUID!", "required": true},
      {"name": "endpointId", "type": "UUID!", "required": true},
      {"name": "expectedRevision", "type": "Decimal!", "required": true}
    ]
  },
  "EditMessageRequestInput": {
    "kind": "input",
    "fields": [
      {"name": "conversationId", "type": "UUID!", "required": true},
      {"name": "messageId", "type": "UUID!", "required": true},
      {"name": "expectedRevision", "type": "Decimal!", "required": true},
      {"name": "text", "type": "String", "required": false},
      {"name": "props", "type": "Properties", "required": false}
    ]
  },
  "EndLiveSessionInput": {
    "kind": "input",
    "fields": [
      {"name": "liveSessionId", "type": "UUID!", "required": true},
      {"name": "expectedGeneration", "type": "Decimal!", "required": true},
      {"name": "expectedRevision", "type": "Decimal!", "required": true}
    ]
  },
  "GetConversationRequestInput": {
    "kind": "input",
    "fields": [{"name": "conversationId", "type": "UUID!", "required": true}]
  },
  "GetDeploymentRequestInput": {
    "kind": "input",
    "fields": [{"name": "deploymentId", "type": "UUID!", "required": true}]
  },
  "GetMessageRequestInput": {
    "kind": "input",
    "fields": [
      {"name": "conversationId", "type": "UUID!", "required": true},
      {"name": "messageId", "type": "UUID!", "required": true},
      {"name": "actAsPrincipalId", "type": "UUID", "required": false}
    ]
  },
  "GetOperationRequestInput": {
    "kind": "input",
    "fields": [{"name": "operationId", "type": "UUID!", "required": true}]
  },
  "GetOrganizationRequestInput": {
    "kind": "input",
    "fields": [{"name": "orgId", "type": "UUID!", "required": true}]
  },
  "GetPrincipalRequestInput": {
    "kind": "input",
    "fields": [{"name": "principalId", "type": "UUID!", "required": true}]
  },
  "GetProjectRequestInput": {
    "kind": "input",
    "fields": [{"name": "projectId", "type": "UUID!", "required": true}]
  },
  "HistoryGrantRequestInput": {
    "kind": "input",
    "fields": [
      {"name": "conversationId", "type": "UUID!", "required": true},
      {"name": "principalId", "type": "UUID!", "required": true},
      {"name": "membershipEpoch", "type": "Decimal!", "required": true},
      {"name": "expectedRevision", "type": "Decimal!", "required": true},
      {"name": "fromSequence", "type": "Decimal!", "required": true}
    ]
  },
  "InboxRequestInput": {
    "kind": "input",
    "fields": [
      {"name": "limit", "type": "PageSize!", "required": true},
      {"name": "cursor", "type": "String", "required": false},
      {"name": "actAsPrincipalId", "type": "UUID", "required": false}
    ]
  },
  "IssueBackendKeyRequestInput": {
    "kind": "input",
    "fields": [
      {"name": "projectId", "type": "UUID!", "required": true},
      {"name": "name", "type": "String!", "required": true},
      {"name": "scopes", "type": "[String!]!", "required": true},
      {"name": "expiresAt", "type": "String!", "required": true}
    ]
  },
  "LiveParticipantsInput": {
    "kind": "input",
    "fields": [
      {"name": "liveSessionId", "type": "UUID!", "required": true},
      {"name": "limit", "type": "PageSize!", "required": false, "default": 50},
      {"name": "cursor", "type": "String", "required": false}
    ]
  },
  "LiveSessionInput": {
    "kind": "input",
    "fields": [{"name": "liveSessionId", "type": "UUID!", "required": true}]
  },
  "LiveSessionOperationInput": {
    "kind": "input",
    "fields": [{"name": "operationId", "type": "UUID!", "required": true}]
  },
  "LiveSessionsInput": {
    "kind": "input",
    "fields": [
      {"name": "conversationId", "type": "UUID!", "required": true},
      {"name": "limit", "type": "PageSize!", "required": false, "default": 50},
      {"name": "cursor", "type": "String", "required": false}
    ]
  },
  "MemberBatchEntryInput": {
    "kind": "input",
    "fields": [
      {"name": "principalId", "type": "UUID!", "required": true},
      {"name": "role", "type": "String!", "required": true},
      {"name": "expectedRevision", "type": "Decimal!", "required": true}
    ]
  },
  "MemberInputInput": {
    "kind": "input",
    "fields": [
      {"name": "principalId", "type": "UUID!", "required": true},
      {"name": "role", "type": "String!", "required": true}
    ]
  },
  "MembersRequestInput": {
    "kind": "input",
    "fields": [
      {"name": "conversationId", "type": "UUID!", "required": true},
      {"name": "limit", "type": "PageSize!", "required": true},
      {"name": "cursor", "type": "String", "required": false}
    ]
  },
  "MessagesRequestInput": {
    "kind": "input",
    "fields": [
      {"name": "conversationId", "type": "UUID!", "required": true},
      {"name": "limit", "type": "PageSize!", "required": true},
      {"name": "beforeSequence", "type": "Decimal", "required": false},
      {"name": "actAsPrincipalId", "type": "UUID", "required": false}
    ]
  },
  "OrganizationUsageRequestInput": {
    "kind": "input",
    "fields": [
      {"name": "orgId", "type": "UUID!", "required": true},
      {"name": "from", "type": "String", "required": false},
      {"name": "to", "type": "String", "required": false}
    ]
  },
  "PageSize": {"kind": "scalar", "description": "Requested page size."},
  "PauseOperationRequestInput": {
    "kind": "input",
    "fields": [
      {"name": "operationId", "type": "UUID!", "required": true},
      {"name": "expectedRevision", "type": "Decimal!", "required": true}
    ]
  },
  "PolicyChangeInput": {
    "kind": "input",
    "fields": [
      {"name": "kind", "type": "String!", "required": true},
      {"name": "reason", "type": "String", "required": false},
      {"name": "holdId", "type": "String", "required": false}
    ]
  },
  "ProjectPolicyRequestInput": {
    "kind": "input",
    "fields": [
      {"name": "projectId", "type": "UUID!", "required": true},
      {"name": "expectedRevision", "type": "Decimal!", "required": true},
      {"name": "change", "type": "PolicyChangeInput!", "required": true}
    ]
  },
  "ProjectUsageRequestInput": {
    "kind": "input",
    "fields": [
      {"name": "projectId", "type": "UUID!", "required": true},
      {"name": "from", "type": "String", "required": false},
      {"name": "to", "type": "String", "required": false}
    ]
  },
  "Properties": {
    "kind": "scalar",
    "description": "Application-defined JSON object. Numbers must stay within the interoperable safe-integer range."
  },
  "RemoveMemberRequestInput": {
    "kind": "input",
    "fields": [
      {"name": "conversationId", "type": "UUID!", "required": true},
      {"name": "principalId", "type": "UUID!", "required": true},
      {"name": "expectedRevision", "type": "Decimal!", "required": true}
    ]
  },
  "ReplayWebhookDeliveriesRequestInput": {
    "kind": "input",
    "fields": [
      {"name": "projectId", "type": "UUID!", "required": true},
      {"name": "endpointId", "type": "UUID!", "required": true},
      {"name": "effectId", "type": "UUID", "required": false},
      {"name": "since", "type": "String", "required": false},
      {"name": "until", "type": "String", "required": false}
    ]
  },
  "ResolveRequestRequestInput": {
    "kind": "input",
    "fields": [{"name": "requestId", "type": "UUID!", "required": true}]
  },
  "ResumeOperationRequestInput": {
    "kind": "input",
    "fields": [
      {"name": "operationId", "type": "UUID!", "required": true},
      {"name": "expectedRevision", "type": "Decimal!", "required": true}
    ]
  },
  "RevokeBackendKeyRequestInput": {
    "kind": "input",
    "fields": [
      {"name": "projectId", "type": "UUID!", "required": true},
      {"name": "keyId", "type": "String!", "required": true},
      {"name": "expectedRevision", "type": "Decimal!", "required": true},
      {"name": "revokeIssuedSessions", "type": "Boolean!", "required": true}
    ]
  },
  "RevokeSessionRequestInput": {
    "kind": "input",
    "fields": [
      {"name": "sessionId", "type": "UUID!", "required": true},
      {"name": "expectedRevision", "type": "Decimal!", "required": true}
    ]
  },
  "RotateWebhookSecretRequestInput": {
    "kind": "input",
    "fields": [
      {"name": "projectId", "type": "UUID!", "required": true},
      {"name": "endpointId", "type": "UUID!", "required": true},
      {"name": "expectedRevision", "type": "Decimal!", "required": true}
    ]
  },
  "SearchRequestInput": {
    "kind": "input",
    "fields": [
      {"name": "query", "type": "String!", "required": true},
      {"name": "pageSize", "type": "PageSize!", "required": true},
      {"name": "scope", "type": "SearchScopeInput", "required": false},
      {"name": "cursor", "type": "String", "required": false},
      {"name": "actAsPrincipalId", "type": "UUID", "required": false}
    ]
  },
  "SearchScopeInput": {
    "kind": "input",
    "fields": [{"name": "conversationIds", "type": "[UUID!]!", "required": true}]
  },
  "SendMessageRequestInput": {
    "kind": "input",
    "fields": [
      {"name": "conversationId", "type": "UUID!", "required": true},
      {"name": "text", "type": "String!", "required": true},
      {"name": "props", "type": "Properties!", "required": true},
      {"name": "actAsPrincipalId", "type": "UUID", "required": false}
    ]
  },
  "SessionRequestOutcomeRequestInput": {
    "kind": "input",
    "fields": [{"name": "requestId", "type": "UUID!", "required": true}]
  },
  "SetBroadcastPermissionInput": {
    "kind": "input",
    "fields": [
      {"name": "conversationId", "type": "UUID!", "required": true},
      {"name": "principalId", "type": "UUID!", "required": true},
      {"name": "allowed", "type": "Boolean!", "required": true},
      {"name": "expectedMembershipRevision", "type": "Decimal!", "required": true}
    ]
  },
  "SetConversationMuteInput": {
    "kind": "input",
    "fields": [
      {"name": "conversationId", "type": "UUID!", "required": true},
      {"name": "muted", "type": "Boolean!", "required": true},
      {"name": "until", "type": "String", "required": false},
      {"name": "actAsPrincipalId", "type": "UUID", "required": false}
    ]
  },
  "UUID": {"kind": "scalar", "description": "Canonical lowercase UUID. The nil UUID is rejected."},
  "UpdateConversationRequestInput": {
    "kind": "input",
    "fields": [
      {"name": "conversationId", "type": "UUID!", "required": true},
      {"name": "expectedRevision", "type": "Decimal!", "required": true},
      {"name": "title", "type": "String", "required": false},
      {"name": "props", "type": "Properties", "required": false}
    ]
  },
  "UpdateWebhookRequestInput": {
    "kind": "input",
    "fields": [
      {"name": "projectId", "type": "UUID!", "required": true},
      {"name": "endpointId", "type": "UUID!", "required": true},
      {"name": "expectedRevision", "type": "Decimal!", "required": true},
      {"name": "eventTypes", "type": "[String!]!", "required": true},
      {"name": "enabled", "type": "Boolean!", "required": true}
    ]
  },
  "WebhookDeliveriesRequestInput": {
    "kind": "input",
    "fields": [
      {"name": "projectId", "type": "UUID!", "required": true},
      {"name": "endpointId", "type": "UUID!", "required": true}
    ]
  },
  "WebhookEndpointsRequestInput": {
    "kind": "input",
    "fields": [{"name": "projectId", "type": "UUID!", "required": true}]
  }
};
export const cliOperations: Readonly<Record<string, CliOperation>> = {
  "communication.capabilities": {
    "id": "communication.capabilities",
    "plane": "communication",
    "kind": "query",
    "summary": "Describe the features, limits and API model the authority supports.",
    "credential": "backendKey",
    "requires": "backendKey",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false
  },
  "communication.route": {
    "id": "communication.route",
    "plane": "communication",
    "kind": "query",
    "summary": "Return the signed route: project incarnation, serving epoch and realtime endpoint. Call it before other communication operations and again after WRONG_REGION.",
    "credential": "backendKey",
    "requires": "backendKey",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false
  },
  "communication.getPrincipal": {
    "id": "communication.getPrincipal",
    "plane": "communication",
    "kind": "query",
    "summary": "Read a principal (an application user).",
    "credential": "backendKey",
    "requires": "backendKey with scope principalManage",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false,
    "input": "GetPrincipalRequestInput"
  },
  "communication.getConversation": {
    "id": "communication.getConversation",
    "plane": "communication",
    "kind": "query",
    "summary": "Read a conversation.",
    "credential": "backendKey",
    "requires": "backendKey with scope conversationManage",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false,
    "input": "GetConversationRequestInput"
  },
  "communication.members": {
    "id": "communication.members",
    "plane": "communication",
    "kind": "query",
    "summary": "List the members of a conversation.",
    "credential": "backendKey",
    "requires": "backendKey with scope membershipManage",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false,
    "paged": "Paged (cursor): Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. Uses cursor input cursor and page size input limit.",
    "input": "MembersRequestInput"
  },
  "communication.messages": {
    "id": "communication.messages",
    "plane": "communication",
    "kind": "query",
    "summary": "List the messages of a conversation, newest first. A backend key reads the full history, or the history visible to the member named by actAsPrincipalId.",
    "credential": "backendKey",
    "requires": "backendKey with scope messageRead",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false,
    "paged": "Paged (sequence): Newest first. Pass nextCursor back as the sequence cursor input to read older items until complete is true. Uses cursor input beforeSequence and page size input limit.",
    "input": "MessagesRequestInput"
  },
  "communication.getMessage": {
    "id": "communication.getMessage",
    "plane": "communication",
    "kind": "query",
    "summary": "Read one message. A backend key reads any message, or reads as the member named by actAsPrincipalId.",
    "credential": "backendKey",
    "requires": "backendKey with scope messageRead",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false,
    "input": "GetMessageRequestInput"
  },
  "communication.inbox": {
    "id": "communication.inbox",
    "plane": "communication",
    "kind": "query",
    "summary": "List the conversations visible to the calling user. A backend key must name that user with actAsPrincipalId.",
    "credential": "backendKey",
    "requires": "backendKey with scope messageRead",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false,
    "paged": "Paged (cursor): Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. Uses cursor input cursor and page size input limit.",
    "input": "InboxRequestInput"
  },
  "communication.search": {
    "id": "communication.search",
    "plane": "communication",
    "kind": "query",
    "summary": "Search the messages visible to the calling user. A backend key searches as the member named by actAsPrincipalId, or within scope.conversationIds.",
    "credential": "backendKey",
    "requires": "backendKey with scope messageRead",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false,
    "paged": "Paged (cursor): Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. Uses cursor input cursor and page size input pageSize.",
    "input": "SearchRequestInput"
  },
  "communication.resolveRequest": {
    "id": "communication.resolveRequest",
    "plane": "communication",
    "kind": "query",
    "summary": "Look up the stored outcome of an earlier communication mutation by its requestId.",
    "credential": "backendKey",
    "requires": "backendKey (condition ownRequest: The caller made the original request)",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false,
    "input": "ResolveRequestRequestInput"
  },
  "communication.getOperation": {
    "id": "communication.getOperation",
    "plane": "communication",
    "kind": "query",
    "summary": "Read the state of a long-running communication operation.",
    "credential": "backendKey",
    "requires": "backendKey (condition operationParticipant: The caller started the operation or can access its target)",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false,
    "input": "GetOperationRequestInput"
  },
  "communication.conversationMute": {
    "id": "communication.conversationMute",
    "plane": "communication",
    "kind": "query",
    "summary": "Read whether a member has muted message push notifications for a conversation. A backend key must name the member with actAsPrincipalId.",
    "credential": "backendKey",
    "requires": "backendKey with scope membershipManage",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false,
    "input": "ConversationMuteInput"
  },
  "communication.currentLiveSession": {
    "id": "communication.currentLiveSession",
    "plane": "communication",
    "kind": "query",
    "summary": "Return the active live session of a conversation, if any.",
    "credential": "backendKey",
    "requires": "backendKey with scope callRead, or backendKey with scope callManage",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false,
    "input": "ConversationLiveInput"
  },
  "communication.liveSession": {
    "id": "communication.liveSession",
    "plane": "communication",
    "kind": "query",
    "summary": "Read a live session.",
    "credential": "backendKey",
    "requires": "backendKey with scope callRead, or backendKey with scope callManage",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false,
    "input": "LiveSessionInput"
  },
  "communication.liveSessions": {
    "id": "communication.liveSessions",
    "plane": "communication",
    "kind": "query",
    "summary": "List the live sessions of a conversation.",
    "credential": "backendKey",
    "requires": "backendKey with scope callRead, or backendKey with scope callManage",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false,
    "paged": "Paged (cursor): Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. Uses cursor input cursor and page size input limit.",
    "input": "LiveSessionsInput"
  },
  "communication.liveSessionParticipants": {
    "id": "communication.liveSessionParticipants",
    "plane": "communication",
    "kind": "query",
    "summary": "List the participants of a live session.",
    "credential": "backendKey",
    "requires": "backendKey with scope callRead, or backendKey with scope callManage",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false,
    "paged": "Paged (cursor): Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. Uses cursor input cursor and page size input limit.",
    "input": "LiveParticipantsInput"
  },
  "communication.liveSessionOperation": {
    "id": "communication.liveSessionOperation",
    "plane": "communication",
    "kind": "query",
    "summary": "Read the state of a live session start or end operation.",
    "credential": "backendKey",
    "requires": "backendKey with scope callRead, or backendKey with scope callManage",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false,
    "input": "LiveSessionOperationInput"
  },
  "communication.sessionRequestOutcome": {
    "id": "communication.sessionRequestOutcome",
    "plane": "communication",
    "kind": "query",
    "summary": "Look up the outcome of an earlier issueSession or renewSession request, including the session it produced.",
    "credential": "backendKey",
    "requires": "backendKey with scopes sessionIssue and sessionManage",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false,
    "input": "SessionRequestOutcomeRequestInput"
  },
  "communication.createPrincipal": {
    "id": "communication.createPrincipal",
    "plane": "communication",
    "kind": "mutation",
    "summary": "Create a principal for an application user.",
    "credential": "backendKey",
    "requires": "backendKey with scope principalManage",
    "idempotency": "idempotent",
    "retry": "sameRequest",
    "resolvable": true,
    "destructive": false,
    "input": "CreatePrincipalRequestInput"
  },
  "communication.disablePrincipal": {
    "id": "communication.disablePrincipal",
    "plane": "communication",
    "kind": "mutation",
    "summary": "Disable a principal.",
    "credential": "backendKey",
    "requires": "backendKey with scope principalManage",
    "idempotency": "idempotent",
    "retry": "sameRequest",
    "resolvable": true,
    "destructive": true,
    "input": "DisablePrincipalRequestInput"
  },
  "communication.revokeSession": {
    "id": "communication.revokeSession",
    "plane": "communication",
    "kind": "mutation",
    "summary": "Revoke a user session.",
    "credential": "backendKey",
    "requires": "backendKey with scope sessionManage",
    "idempotency": "idempotent",
    "retry": "sameRequest",
    "resolvable": true,
    "destructive": true,
    "input": "RevokeSessionRequestInput"
  },
  "communication.createConversation": {
    "id": "communication.createConversation",
    "plane": "communication",
    "kind": "mutation",
    "summary": "Create a conversation with its initial members.",
    "credential": "backendKey",
    "requires": "backendKey with scope conversationManage",
    "idempotency": "idempotent",
    "retry": "sameRequest",
    "resolvable": true,
    "destructive": false,
    "input": "CreateConversationRequestInput"
  },
  "communication.updateConversation": {
    "id": "communication.updateConversation",
    "plane": "communication",
    "kind": "mutation",
    "summary": "Update the title or properties of a conversation.",
    "credential": "backendKey",
    "requires": "backendKey with scope conversationManage",
    "idempotency": "idempotent",
    "retry": "sameRequest",
    "resolvable": true,
    "destructive": false,
    "input": "UpdateConversationRequestInput"
  },
  "communication.addMember": {
    "id": "communication.addMember",
    "plane": "communication",
    "kind": "mutation",
    "summary": "Add a member, or change the role of an active member.",
    "credential": "backendKey",
    "requires": "backendKey with scope membershipManage",
    "idempotency": "idempotent",
    "retry": "sameRequest",
    "resolvable": true,
    "destructive": false,
    "input": "AddMemberRequestInput"
  },
  "communication.addMembers": {
    "id": "communication.addMembers",
    "plane": "communication",
    "kind": "mutation",
    "summary": "Add several members in one request.",
    "credential": "backendKey",
    "requires": "backendKey with scope membershipManage",
    "idempotency": "idempotent",
    "retry": "sameRequest",
    "resolvable": true,
    "destructive": false,
    "input": "AddMembersInput"
  },
  "communication.removeMember": {
    "id": "communication.removeMember",
    "plane": "communication",
    "kind": "mutation",
    "summary": "Remove a member from a conversation.",
    "credential": "backendKey",
    "requires": "backendKey with scope membershipManage",
    "idempotency": "idempotent",
    "retry": "sameRequest",
    "resolvable": true,
    "destructive": true,
    "input": "RemoveMemberRequestInput"
  },
  "communication.historyGrant": {
    "id": "communication.historyGrant",
    "plane": "communication",
    "kind": "mutation",
    "summary": "Expand the history a member can see to an earlier sequence.",
    "credential": "backendKey",
    "requires": "backendKey with scope historyManage",
    "idempotency": "idempotent",
    "retry": "sameRequest",
    "resolvable": true,
    "destructive": false,
    "input": "HistoryGrantRequestInput"
  },
  "communication.sendMessage": {
    "id": "communication.sendMessage",
    "plane": "communication",
    "kind": "mutation",
    "summary": "Send a message. A backend key sends as its service principal, or as the member named by actAsPrincipalId.",
    "credential": "backendKey",
    "requires": "backendKey with scope messageWrite",
    "idempotency": "idempotent",
    "retry": "sameRequest",
    "resolvable": true,
    "destructive": false,
    "input": "SendMessageRequestInput"
  },
  "communication.editMessage": {
    "id": "communication.editMessage",
    "plane": "communication",
    "kind": "mutation",
    "summary": "Edit a message.",
    "credential": "backendKey",
    "requires": "backendKey with scope moderation",
    "idempotency": "idempotent",
    "retry": "sameRequest",
    "resolvable": true,
    "destructive": false,
    "input": "EditMessageRequestInput"
  },
  "communication.deleteMessage": {
    "id": "communication.deleteMessage",
    "plane": "communication",
    "kind": "mutation",
    "summary": "Delete a message.",
    "credential": "backendKey",
    "requires": "backendKey with scope moderation",
    "idempotency": "idempotent",
    "retry": "sameRequest",
    "resolvable": true,
    "destructive": true,
    "input": "DeleteMessageRequestInput"
  },
  "communication.setBroadcastPermission": {
    "id": "communication.setBroadcastPermission",
    "plane": "communication",
    "kind": "mutation",
    "summary": "Allow or deny a member to publish media in live sessions.",
    "credential": "backendKey",
    "requires": "backendKey with scope membershipManage",
    "idempotency": "idempotent",
    "retry": "sameRequest",
    "resolvable": true,
    "destructive": false,
    "input": "SetBroadcastPermissionInput"
  },
  "communication.setConversationMute": {
    "id": "communication.setConversationMute",
    "plane": "communication",
    "kind": "mutation",
    "summary": "Mute or unmute message push notifications for a member of a conversation, optionally until a time. Calls still ring. A backend key must name the member with actAsPrincipalId.",
    "credential": "backendKey",
    "requires": "backendKey with scope membershipManage",
    "idempotency": "idempotent",
    "retry": "sameRequest",
    "resolvable": true,
    "destructive": false,
    "input": "SetConversationMuteInput"
  },
  "communication.alertLiveSession": {
    "id": "communication.alertLiveSession",
    "plane": "communication",
    "kind": "mutation",
    "summary": "Alert (ring) conversation members about a live session.",
    "credential": "backendKey",
    "requires": "backendKey with scope callManage",
    "idempotency": "idempotent",
    "retry": "sameRequest",
    "resolvable": true,
    "destructive": false,
    "input": "AlertLiveSessionInput"
  },
  "communication.endLiveSession": {
    "id": "communication.endLiveSession",
    "plane": "communication",
    "kind": "mutation",
    "summary": "End a live session for every participant. Completes asynchronously.",
    "credential": "backendKey",
    "requires": "backendKey with scope callManage",
    "idempotency": "idempotent",
    "retry": "sameRequest",
    "resolvable": true,
    "destructive": true,
    "longRunning": {"poll": "communication.liveSessionOperation", "refField": "operation"},
    "input": "EndLiveSessionInput"
  },
  "management.capabilities": {
    "id": "management.capabilities",
    "plane": "management",
    "kind": "query",
    "summary": "Describe the management features and limits the authority supports.",
    "credential": "portalCredential",
    "requires": "portalCredential",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false
  },
  "management.organizations": {
    "id": "management.organizations",
    "plane": "management",
    "kind": "query",
    "summary": "List the organizations the caller can access.",
    "credential": "portalCredential",
    "requires": "portalCredential",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false,
    "paged": "Paged (bounded): One bounded page without a cursor input. complete reports whether every item fit."
  },
  "management.getOrganization": {
    "id": "management.getOrganization",
    "plane": "management",
    "kind": "query",
    "summary": "Read an organization.",
    "credential": "portalCredential",
    "requires": "portalCredential (condition owner: The caller owns the organization, deployment or project)",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false,
    "input": "GetOrganizationRequestInput"
  },
  "management.getDeployment": {
    "id": "management.getDeployment",
    "plane": "management",
    "kind": "query",
    "summary": "Read a deployment.",
    "credential": "portalCredential",
    "requires": "portalCredential (condition owner: The caller owns the organization, deployment or project)",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false,
    "input": "GetDeploymentRequestInput"
  },
  "management.getProject": {
    "id": "management.getProject",
    "plane": "management",
    "kind": "query",
    "summary": "Read a project.",
    "credential": "portalCredential",
    "requires": "portalCredential (condition owner: The caller owns the organization, deployment or project)",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false,
    "input": "GetProjectRequestInput"
  },
  "management.deploymentHealth": {
    "id": "management.deploymentHealth",
    "plane": "management",
    "kind": "query",
    "summary": "Read the health of a deployment.",
    "credential": "portalCredential",
    "requires": "portalCredential (condition owner: The caller owns the organization, deployment or project)",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false,
    "input": "DeploymentHealthRequestInput"
  },
  "management.deploymentUsage": {
    "id": "management.deploymentUsage",
    "plane": "management",
    "kind": "query",
    "summary": "Read the metered usage of a deployment, summed over its projects. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days.",
    "credential": "portalCredential",
    "requires": "portalCredential (condition owner: The caller owns the organization, deployment or project)",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false,
    "input": "DeploymentUsageRequestInput"
  },
  "management.projectUsage": {
    "id": "management.projectUsage",
    "plane": "management",
    "kind": "query",
    "summary": "Read the metered usage of a project. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days.",
    "credential": "portalCredential",
    "requires": "portalCredential (condition owner: The caller owns the organization, deployment or project)",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false,
    "input": "ProjectUsageRequestInput"
  },
  "management.organizationUsage": {
    "id": "management.organizationUsage",
    "plane": "management",
    "kind": "query",
    "summary": "Read the metered usage of an organization in any status, summed over its projects. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days.",
    "credential": "portalCredential",
    "requires": "portalCredential (condition owner: The caller owns the organization, deployment or project)",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false,
    "input": "OrganizationUsageRequestInput"
  },
  "management.webhookEndpoints": {
    "id": "management.webhookEndpoints",
    "plane": "management",
    "kind": "query",
    "summary": "List the webhook endpoints of a project with their status, signing-secret rotation and delivery health.",
    "credential": "portalCredential",
    "requires": "portalCredential (condition owner: The caller owns the organization, deployment or project)",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false,
    "paged": "Paged (bounded): One bounded page without a cursor input. complete reports whether every item fit.",
    "input": "WebhookEndpointsRequestInput"
  },
  "management.webhookDeliveries": {
    "id": "management.webhookDeliveries",
    "plane": "management",
    "kind": "query",
    "summary": "List recent deliveries of a webhook endpoint.",
    "credential": "portalCredential",
    "requires": "portalCredential (condition owner: The caller owns the organization, deployment or project)",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false,
    "paged": "Paged (bounded): One bounded page without a cursor input. complete reports whether every item fit.",
    "input": "WebhookDeliveriesRequestInput"
  },
  "management.resolveRequest": {
    "id": "management.resolveRequest",
    "plane": "management",
    "kind": "query",
    "summary": "Look up the stored outcome of an earlier management mutation by its requestId.",
    "credential": "portalCredential",
    "requires": "portalCredential (condition ownRequest: The caller made the original request)",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false,
    "input": "ResolveRequestRequestInput"
  },
  "management.getOperation": {
    "id": "management.getOperation",
    "plane": "management",
    "kind": "query",
    "summary": "Read the state of a long-running management operation.",
    "credential": "portalCredential",
    "requires": "portalCredential (condition owner: The caller owns the organization, deployment or project)",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false,
    "input": "GetOperationRequestInput"
  },
  "management.createOrganization": {
    "id": "management.createOrganization",
    "plane": "management",
    "kind": "mutation",
    "summary": "Create an organization.",
    "credential": "portalCredential",
    "requires": "portalCredential",
    "idempotency": "idempotent",
    "retry": "sameRequest",
    "resolvable": true,
    "destructive": false,
    "input": "CreateOrganizationRequestInput"
  },
  "management.createDeployment": {
    "id": "management.createDeployment",
    "plane": "management",
    "kind": "mutation",
    "summary": "Create a deployment in an organization. Completes asynchronously.",
    "credential": "portalCredential",
    "requires": "portalCredential (condition owner: The caller owns the organization, deployment or project)",
    "idempotency": "idempotent",
    "retry": "sameRequest",
    "resolvable": true,
    "destructive": false,
    "longRunning": {"poll": "management.getOperation", "refField": "operation"},
    "input": "CreateDeploymentRequestInput"
  },
  "management.createProject": {
    "id": "management.createProject",
    "plane": "management",
    "kind": "mutation",
    "summary": "Create a project in a ready deployment. Completes asynchronously.",
    "credential": "portalCredential",
    "requires": "portalCredential (condition owner: The caller owns the organization, deployment or project)",
    "idempotency": "idempotent",
    "retry": "sameRequest",
    "resolvable": true,
    "destructive": false,
    "longRunning": {"poll": "management.getOperation", "refField": "operation"},
    "input": "CreateProjectRequestInput"
  },
  "management.issueBackendKey": {
    "id": "management.issueBackendKey",
    "plane": "management",
    "kind": "mutation",
    "summary": "Issue a scoped backend key. The secret is delivered once through a credential delivery.",
    "credential": "portalCredential",
    "requires": "portalCredential (condition owner: The caller owns the organization, deployment or project)",
    "idempotency": "idempotent",
    "retry": "sameRequest",
    "resolvable": true,
    "destructive": false,
    "longRunning": {"poll": "management.getOperation", "refField": "operation"},
    "input": "IssueBackendKeyRequestInput"
  },
  "management.revokeBackendKey": {
    "id": "management.revokeBackendKey",
    "plane": "management",
    "kind": "mutation",
    "summary": "Revoke a backend key, optionally revoking the sessions it issued.",
    "credential": "portalCredential",
    "requires": "portalCredential (condition owner: The caller owns the organization, deployment or project)",
    "idempotency": "idempotent",
    "retry": "sameRequest",
    "resolvable": true,
    "destructive": true,
    "longRunning": {"poll": "management.getOperation", "refField": "operation"},
    "input": "RevokeBackendKeyRequestInput"
  },
  "management.projectPolicy": {
    "id": "management.projectPolicy",
    "plane": "management",
    "kind": "mutation",
    "summary": "Change the policy of a project.",
    "credential": "portalCredential",
    "requires": "portalCredential (condition owner: The caller owns the organization, deployment or project)",
    "idempotency": "idempotent",
    "retry": "sameRequest",
    "resolvable": true,
    "destructive": false,
    "longRunning": {"poll": "management.getOperation", "refField": "operation"},
    "input": "ProjectPolicyRequestInput"
  },
  "management.pauseOperation": {
    "id": "management.pauseOperation",
    "plane": "management",
    "kind": "mutation",
    "summary": "Pause a long-running operation.",
    "credential": "portalCredential",
    "requires": "portalCredential (condition owner: The caller owns the organization, deployment or project)",
    "idempotency": "idempotent",
    "retry": "sameRequest",
    "resolvable": true,
    "destructive": false,
    "input": "PauseOperationRequestInput"
  },
  "management.resumeOperation": {
    "id": "management.resumeOperation",
    "plane": "management",
    "kind": "mutation",
    "summary": "Resume a paused operation.",
    "credential": "portalCredential",
    "requires": "portalCredential (condition owner: The caller owns the organization, deployment or project)",
    "idempotency": "idempotent",
    "retry": "sameRequest",
    "resolvable": true,
    "destructive": false,
    "input": "ResumeOperationRequestInput"
  },
  "management.configureWebhook": {
    "id": "management.configureWebhook",
    "plane": "management",
    "kind": "mutation",
    "summary": "Create a webhook endpoint for project events. The signing secret is delivered once through a credential delivery.",
    "credential": "portalCredential",
    "requires": "portalCredential (condition owner: The caller owns the organization, deployment or project)",
    "idempotency": "idempotent",
    "retry": "sameRequest",
    "resolvable": true,
    "destructive": false,
    "longRunning": {"poll": "management.getOperation", "refField": "operation"},
    "input": "ConfigureWebhookRequestInput"
  },
  "management.updateWebhook": {
    "id": "management.updateWebhook",
    "plane": "management",
    "kind": "mutation",
    "summary": "Change the event types of a webhook endpoint, or enable or disable it.",
    "credential": "portalCredential",
    "requires": "portalCredential (condition owner: The caller owns the organization, deployment or project)",
    "idempotency": "idempotent",
    "retry": "sameRequest",
    "resolvable": true,
    "destructive": true,
    "longRunning": {"poll": "management.getOperation", "refField": "operation"},
    "input": "UpdateWebhookRequestInput"
  },
  "management.rotateWebhookSecret": {
    "id": "management.rotateWebhookSecret",
    "plane": "management",
    "kind": "mutation",
    "summary": "Start rotating the signing secret of a webhook endpoint. The next secret is delivered once through a credential delivery.",
    "credential": "portalCredential",
    "requires": "portalCredential (condition owner: The caller owns the organization, deployment or project)",
    "idempotency": "idempotent",
    "retry": "sameRequest",
    "resolvable": true,
    "destructive": true,
    "longRunning": {"poll": "management.getOperation", "refField": "operation"},
    "input": "RotateWebhookSecretRequestInput"
  },
  "management.disableWebhook": {
    "id": "management.disableWebhook",
    "plane": "management",
    "kind": "mutation",
    "summary": "Disable a webhook endpoint.",
    "credential": "portalCredential",
    "requires": "portalCredential (condition owner: The caller owns the organization, deployment or project)",
    "idempotency": "idempotent",
    "retry": "sameRequest",
    "resolvable": true,
    "destructive": true,
    "longRunning": {"poll": "management.getOperation", "refField": "operation"},
    "input": "DisableWebhookRequestInput"
  },
  "management.replayWebhookDeliveries": {
    "id": "management.replayWebhookDeliveries",
    "plane": "management",
    "kind": "mutation",
    "summary": "Redeliver one webhook delivery, or the deliveries of an endpoint in a time range, with their original event IDs.",
    "credential": "portalCredential",
    "requires": "portalCredential (condition owner: The caller owns the organization, deployment or project)",
    "idempotency": "idempotent",
    "retry": "sameRequest",
    "resolvable": true,
    "destructive": false,
    "longRunning": {"poll": "management.getOperation", "refField": "operation"},
    "input": "ReplayWebhookDeliveriesRequestInput"
  }
};
