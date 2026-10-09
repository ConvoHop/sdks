// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
/** The JSON Schema (2020-12) keywords that tool input schemas use. */
export interface JsonSchema {
  type?: JsonSchemaTypeName | JsonSchemaTypeName[];
  description?: string;
  deprecated?: boolean;
  default?: unknown;
  properties?: { [name: string]: JsonSchema };
  required?: string[];
  additionalProperties?: boolean;
  items?: JsonSchema;
  enum?: (string | null)[];
  not?: JsonSchema;
  pattern?: string;
  minimum?: number;
  maximum?: number;
}
export type JsonSchemaTypeName = "array" | "boolean" | "integer" | "null" | "number" | "object" | "string";
export interface McpToolAuth { readonly credential: string; readonly scopes?: readonly string[]; readonly condition?: string }
export interface McpToolPagination {
  readonly style: string; readonly limitField?: string; readonly cursorField?: string;
  readonly pagePath?: readonly string[]; readonly pageType?: string; readonly itemType?: string;
}
/** Operation annotations, published in the tool's `_meta` under operationMetaKey. */
export interface McpToolOperation {
  readonly id: string;
  readonly plane: string;
  readonly kind: "query" | "mutation";
  /** The credential the server authenticates this tool with. */
  readonly credential: string;
  readonly auth: readonly McpToolAuth[];
  readonly idempotency: string;
  readonly destructive: boolean;
  readonly pagination: McpToolPagination;
  readonly longRunning?: { readonly poll: string; readonly refField: string; readonly tool?: string };
}
export interface McpToolAnnotations {
  readonly readOnlyHint: boolean;
  readonly destructiveHint: boolean;
  readonly idempotentHint: boolean;
  readonly openWorldHint: boolean;
}
export interface McpToolDefinition {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly inputSchema: JsonSchema;
  readonly annotations: McpToolAnnotations;
  readonly operation: McpToolOperation;
}
export const retryToolName = "retry_request";
export const operationMetaKey = "com.convohop/operation";
export const withheldOperations: Readonly<Record<string, string>> = {
  "communication.issueSession": "returns a user session token",
  "communication.renewSession": "returns a user session token",
  "management.credentialPermit": "returns a credential delivery permit",
  "management.createBillingCheckoutSession": "returns a hosted billing link that grants access to whoever holds it",
  "management.createBillingPortalSession": "returns a hosted billing link that grants access to whoever holds it",
  "management.agentCredentialPermit": "returns a credential delivery permit",
  "management.approveAgentSignup": "records an owner's consent to an agent signup; the owner gives it from the emailed approval link"
};
export const mcpTools: readonly McpToolDefinition[] = [
  {
    "name": "communication_capabilities",
    "title": "Communication: capabilities",
    "description": "Describe the features, limits and API model the authority supports.\n\nOperation communication.capabilities (query).\nRequires backendKey.\nRead-only and safe to repeat.",
    "inputSchema": {"type": "object", "properties": {}, "additionalProperties": false},
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "communication.capabilities",
      "plane": "communication",
      "kind": "query",
      "credential": "backendKey",
      "auth": [{"credential": "userSession"}, {"credential": "backendKey"}],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "communication_route",
    "title": "Communication: route",
    "description": "Return the signed route: project incarnation, serving epoch and realtime endpoint. Call it before other communication operations and again after WRONG_REGION.\n\nOperation communication.route (query).\nRequires backendKey.\nRead-only and safe to repeat.",
    "inputSchema": {"type": "object", "properties": {}, "additionalProperties": false},
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "communication.route",
      "plane": "communication",
      "kind": "query",
      "credential": "backendKey",
      "auth": [{"credential": "userSession"}, {"credential": "backendKey"}],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "communication_get_principal",
    "title": "Communication: get principal",
    "description": "Read a principal (an application user).\n\nOperation communication.getPrincipal (query).\nRequires backendKey with scope principalManage.\nRead-only and safe to repeat.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "principalId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        }
      },
      "required": ["principalId"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "communication.getPrincipal",
      "plane": "communication",
      "kind": "query",
      "credential": "backendKey",
      "auth": [{"credential": "backendKey", "scopes": ["principalManage"]}],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "communication_get_conversation",
    "title": "Communication: get conversation",
    "description": "Read a conversation.\n\nOperation communication.getConversation (query).\nRequires backendKey with scope conversationManage.\nRead-only and safe to repeat.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "conversationId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        }
      },
      "required": ["conversationId"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "communication.getConversation",
      "plane": "communication",
      "kind": "query",
      "credential": "backendKey",
      "auth": [
        {"credential": "userSession", "condition": "member"},
        {"credential": "backendKey", "scopes": ["conversationManage"]}
      ],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "communication_members",
    "title": "Communication: members",
    "description": "List the members of a conversation.\n\nOperation communication.members (query).\nRequires backendKey with scope membershipManage.\nRead-only and safe to repeat.\nPaged (cursor): Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. Uses cursor input cursor and page size input limit.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "conversationId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "limit": {
          "type": "integer",
          "description": "Requested page size.",
          "minimum": 1,
          "maximum": 100
        },
        "cursor": {"type": ["string", "null"]}
      },
      "required": ["conversationId", "limit"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "communication.members",
      "plane": "communication",
      "kind": "query",
      "credential": "backendKey",
      "auth": [
        {"credential": "userSession", "condition": "member"},
        {"credential": "backendKey", "scopes": ["membershipManage"]}
      ],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {
        "style": "cursor",
        "limitField": "limit",
        "cursorField": "cursor",
        "pagePath": ["result"],
        "pageType": "MemberPage",
        "itemType": "Member"
      }
    }
  },
  {
    "name": "communication_messages",
    "title": "Communication: messages",
    "description": "List the messages of a conversation, newest first. A backend key reads the full history, or the history visible to the member named by actAsPrincipalId.\n\nOperation communication.messages (query).\nRequires backendKey with scope messageRead.\nRead-only and safe to repeat.\nPaged (sequence): Newest first. Pass nextCursor back as the sequence cursor input to read older items until complete is true. Uses cursor input beforeSequence and page size input limit.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "conversationId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "limit": {
          "type": "integer",
          "description": "Requested page size.",
          "minimum": 1,
          "maximum": 100
        },
        "beforeSequence": {
          "type": ["string", "null"],
          "description": "Non-negative 64-bit counter as a canonical decimal string. Never convert it to a floating-point number.",
          "pattern": "^(0|[1-9][0-9]*)$"
        },
        "actAsPrincipalId": {
          "type": ["string", "null"],
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        }
      },
      "required": ["conversationId", "limit"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "communication.messages",
      "plane": "communication",
      "kind": "query",
      "credential": "backendKey",
      "auth": [
        {"credential": "userSession", "condition": "member"},
        {"credential": "backendKey", "scopes": ["messageRead"]}
      ],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {
        "style": "sequence",
        "limitField": "limit",
        "cursorField": "beforeSequence",
        "pagePath": ["result"],
        "pageType": "MessagePage",
        "itemType": "Message"
      }
    }
  },
  {
    "name": "communication_get_message",
    "title": "Communication: get message",
    "description": "Read one message. A backend key reads any message, or reads as the member named by actAsPrincipalId.\n\nOperation communication.getMessage (query).\nRequires backendKey with scope messageRead.\nRead-only and safe to repeat.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "conversationId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "messageId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "actAsPrincipalId": {
          "type": ["string", "null"],
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        }
      },
      "required": ["conversationId", "messageId"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "communication.getMessage",
      "plane": "communication",
      "kind": "query",
      "credential": "backendKey",
      "auth": [
        {"credential": "userSession", "condition": "member"},
        {"credential": "backendKey", "scopes": ["messageRead"]}
      ],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "communication_inbox",
    "title": "Communication: inbox",
    "description": "List the conversations visible to the calling user. A backend key must name that user with actAsPrincipalId.\n\nOperation communication.inbox (query).\nRequires backendKey with scope messageRead.\nRead-only and safe to repeat.\nPaged (cursor): Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. Uses cursor input cursor and page size input limit.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "limit": {
          "type": "integer",
          "description": "Requested page size.",
          "minimum": 1,
          "maximum": 100
        },
        "cursor": {"type": ["string", "null"]},
        "actAsPrincipalId": {
          "type": ["string", "null"],
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        }
      },
      "required": ["limit"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "communication.inbox",
      "plane": "communication",
      "kind": "query",
      "credential": "backendKey",
      "auth": [
        {"credential": "userSession"},
        {"credential": "backendKey", "scopes": ["messageRead"]}
      ],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {
        "style": "cursor",
        "limitField": "limit",
        "cursorField": "cursor",
        "pagePath": ["result"],
        "pageType": "InboxPage",
        "itemType": "InboxItem"
      }
    }
  },
  {
    "name": "communication_search",
    "title": "Communication: search",
    "description": "Search the messages visible to the calling user. A backend key searches as the member named by actAsPrincipalId, or within scope.conversationIds.\n\nOperation communication.search (query).\nRequires backendKey with scope messageRead.\nRead-only and safe to repeat.\nPaged (cursor): Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. Uses cursor input cursor and page size input pageSize.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "query": {"type": "string"},
        "pageSize": {
          "type": "integer",
          "description": "Requested page size.",
          "minimum": 1,
          "maximum": 100
        },
        "scope": {
          "type": ["object", "null"],
          "properties": {
            "conversationIds": {
              "type": "array",
              "items": {
                "type": "string",
                "description": "Canonical lowercase UUID. The nil UUID is rejected.",
                "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
              }
            }
          },
          "required": ["conversationIds"],
          "additionalProperties": false
        },
        "cursor": {"type": ["string", "null"]},
        "actAsPrincipalId": {
          "type": ["string", "null"],
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        }
      },
      "required": ["query", "pageSize"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "communication.search",
      "plane": "communication",
      "kind": "query",
      "credential": "backendKey",
      "auth": [
        {"credential": "userSession"},
        {"credential": "backendKey", "scopes": ["messageRead"]}
      ],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {
        "style": "cursor",
        "limitField": "pageSize",
        "cursorField": "cursor",
        "pagePath": ["result"],
        "pageType": "SearchPage",
        "itemType": "SearchHit"
      }
    }
  },
  {
    "name": "communication_resolve_request",
    "title": "Communication: resolve request",
    "description": "Look up the stored outcome of an earlier communication mutation by its requestId.\n\nOperation communication.resolveRequest (query).\nRequires backendKey (condition ownRequest: The caller made the original request).\nRead-only and safe to repeat.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "requestId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        }
      },
      "required": ["requestId"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "communication.resolveRequest",
      "plane": "communication",
      "kind": "query",
      "credential": "backendKey",
      "auth": [
        {"credential": "userSession", "condition": "ownRequest"},
        {"credential": "backendKey", "condition": "ownRequest"}
      ],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "communication_get_operation",
    "title": "Communication: get operation",
    "description": "Read the state of a long-running communication operation.\n\nOperation communication.getOperation (query).\nRequires backendKey (condition operationParticipant: The caller started the operation or can access its target).\nRead-only and safe to repeat.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "operationId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        }
      },
      "required": ["operationId"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "communication.getOperation",
      "plane": "communication",
      "kind": "query",
      "credential": "backendKey",
      "auth": [
        {"credential": "userSession", "condition": "operationParticipant"},
        {"credential": "backendKey", "condition": "operationParticipant"}
      ],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "communication_conversation_mute",
    "title": "Communication: conversation mute",
    "description": "Read whether a member has muted message push notifications for a conversation. A backend key must name the member with actAsPrincipalId.\n\nOperation communication.conversationMute (query).\nRequires backendKey with scope membershipManage.\nRead-only and safe to repeat.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "conversationId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "actAsPrincipalId": {
          "type": ["string", "null"],
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        }
      },
      "required": ["conversationId"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "communication.conversationMute",
      "plane": "communication",
      "kind": "query",
      "credential": "backendKey",
      "auth": [
        {"credential": "userSession", "condition": "member"},
        {"credential": "backendKey", "scopes": ["membershipManage"]}
      ],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "communication_current_live_session",
    "title": "Communication: current live session",
    "description": "Return the active live session of a conversation, if any.\n\nOperation communication.currentLiveSession (query).\nRequires backendKey with scope callRead, or backendKey with scope callManage.\nRead-only and safe to repeat.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "conversationId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        }
      },
      "required": ["conversationId"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "communication.currentLiveSession",
      "plane": "communication",
      "kind": "query",
      "credential": "backendKey",
      "auth": [
        {"credential": "userSession", "condition": "member"},
        {"credential": "backendKey", "scopes": ["callRead"]},
        {"credential": "backendKey", "scopes": ["callManage"]}
      ],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "communication_live_session",
    "title": "Communication: live session",
    "description": "Read a live session.\n\nOperation communication.liveSession (query).\nRequires backendKey with scope callRead, or backendKey with scope callManage.\nRead-only and safe to repeat.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "liveSessionId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        }
      },
      "required": ["liveSessionId"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "communication.liveSession",
      "plane": "communication",
      "kind": "query",
      "credential": "backendKey",
      "auth": [
        {"credential": "userSession", "condition": "member"},
        {"credential": "backendKey", "scopes": ["callRead"]},
        {"credential": "backendKey", "scopes": ["callManage"]}
      ],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "communication_live_sessions",
    "title": "Communication: live sessions",
    "description": "List the live sessions of a conversation.\n\nOperation communication.liveSessions (query).\nRequires backendKey with scope callRead, or backendKey with scope callManage.\nRead-only and safe to repeat.\nPaged (cursor): Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. Uses cursor input cursor and page size input limit.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "conversationId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "limit": {
          "type": "integer",
          "description": "Requested page size.",
          "minimum": 1,
          "maximum": 100,
          "default": 50
        },
        "cursor": {"type": ["string", "null"]}
      },
      "required": ["conversationId"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "communication.liveSessions",
      "plane": "communication",
      "kind": "query",
      "credential": "backendKey",
      "auth": [
        {"credential": "userSession", "condition": "member"},
        {"credential": "backendKey", "scopes": ["callRead"]},
        {"credential": "backendKey", "scopes": ["callManage"]}
      ],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {
        "style": "cursor",
        "limitField": "limit",
        "cursorField": "cursor",
        "pagePath": ["result"],
        "pageType": "LiveSessionPage",
        "itemType": "LiveSession"
      }
    }
  },
  {
    "name": "communication_live_session_participants",
    "title": "Communication: live session participants",
    "description": "List the participants of a live session.\n\nOperation communication.liveSessionParticipants (query).\nRequires backendKey with scope callRead, or backendKey with scope callManage.\nRead-only and safe to repeat.\nPaged (cursor): Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. Uses cursor input cursor and page size input limit.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "liveSessionId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "limit": {
          "type": "integer",
          "description": "Requested page size.",
          "minimum": 1,
          "maximum": 100,
          "default": 50
        },
        "cursor": {"type": ["string", "null"]}
      },
      "required": ["liveSessionId"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "communication.liveSessionParticipants",
      "plane": "communication",
      "kind": "query",
      "credential": "backendKey",
      "auth": [
        {"credential": "userSession", "condition": "member"},
        {"credential": "backendKey", "scopes": ["callRead"]},
        {"credential": "backendKey", "scopes": ["callManage"]}
      ],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {
        "style": "cursor",
        "limitField": "limit",
        "cursorField": "cursor",
        "pagePath": ["result"],
        "pageType": "LiveParticipantPage",
        "itemType": "LiveParticipation"
      }
    }
  },
  {
    "name": "communication_live_session_operation",
    "title": "Communication: live session operation",
    "description": "Read the state of a live session start or end operation.\n\nOperation communication.liveSessionOperation (query).\nRequires backendKey with scope callRead, or backendKey with scope callManage.\nRead-only and safe to repeat.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "operationId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        }
      },
      "required": ["operationId"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "communication.liveSessionOperation",
      "plane": "communication",
      "kind": "query",
      "credential": "backendKey",
      "auth": [
        {"credential": "userSession", "condition": "member"},
        {"credential": "backendKey", "scopes": ["callRead"]},
        {"credential": "backendKey", "scopes": ["callManage"]}
      ],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "communication_session_request_outcome",
    "title": "Communication: session request outcome",
    "description": "Look up the outcome of an earlier issueSession or renewSession request, including the session it produced.\n\nOperation communication.sessionRequestOutcome (query).\nRequires backendKey with scopes sessionIssue and sessionManage.\nRead-only and safe to repeat.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "requestId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        }
      },
      "required": ["requestId"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "communication.sessionRequestOutcome",
      "plane": "communication",
      "kind": "query",
      "credential": "backendKey",
      "auth": [{"credential": "backendKey", "scopes": ["sessionIssue", "sessionManage"]}],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "communication_create_principal",
    "title": "Communication: create principal",
    "description": "Create a principal for an application user.\n\nOperation communication.createPrincipal (mutation).\nRequires backendKey with scope principalManage.\nEach call is a new request. Results and errors carry its requestId. When the outcome is unknown, call retry_request with that requestId instead of calling this tool again.",
    "inputSchema": {
      "type": "object",
      "properties": {"externalUserId": {"type": "string"}},
      "required": ["externalUserId"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "operation": {
      "id": "communication.createPrincipal",
      "plane": "communication",
      "kind": "mutation",
      "credential": "backendKey",
      "auth": [{"credential": "backendKey", "scopes": ["principalManage"]}],
      "idempotency": "idempotent",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "communication_disable_principal",
    "title": "Communication: disable principal",
    "description": "Disable a principal.\n\nOperation communication.disablePrincipal (mutation).\nRequires backendKey with scope principalManage.\nEach call is a new request. Results and errors carry its requestId. When the outcome is unknown, call retry_request with that requestId instead of calling this tool again.\nDestructive: it deletes, revokes, removes, disables or ends something. Confirm with the user before calling it.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "principalId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "expectedRevision": {
          "type": "string",
          "description": "Non-negative 64-bit counter as a canonical decimal string. Never convert it to a floating-point number.",
          "pattern": "^(0|[1-9][0-9]*)$"
        }
      },
      "required": ["principalId", "expectedRevision"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": true,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "operation": {
      "id": "communication.disablePrincipal",
      "plane": "communication",
      "kind": "mutation",
      "credential": "backendKey",
      "auth": [{"credential": "backendKey", "scopes": ["principalManage"]}],
      "idempotency": "idempotent",
      "destructive": true,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "communication_revoke_session",
    "title": "Communication: revoke session",
    "description": "Revoke a user session.\n\nOperation communication.revokeSession (mutation).\nRequires backendKey with scope sessionManage.\nEach call is a new request. Results and errors carry its requestId. When the outcome is unknown, call retry_request with that requestId instead of calling this tool again.\nDestructive: it deletes, revokes, removes, disables or ends something. Confirm with the user before calling it.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "sessionId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "expectedRevision": {
          "type": "string",
          "description": "Non-negative 64-bit counter as a canonical decimal string. Never convert it to a floating-point number.",
          "pattern": "^(0|[1-9][0-9]*)$"
        }
      },
      "required": ["sessionId", "expectedRevision"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": true,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "operation": {
      "id": "communication.revokeSession",
      "plane": "communication",
      "kind": "mutation",
      "credential": "backendKey",
      "auth": [
        {"credential": "userSession", "condition": "ownSession"},
        {"credential": "backendKey", "scopes": ["sessionManage"]}
      ],
      "idempotency": "idempotent",
      "destructive": true,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "communication_create_conversation",
    "title": "Communication: create conversation",
    "description": "Create a conversation with its initial members.\n\nOperation communication.createConversation (mutation).\nRequires backendKey with scope conversationManage.\nEach call is a new request. Results and errors carry its requestId. When the outcome is unknown, call retry_request with that requestId instead of calling this tool again.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "title": {"type": "string"},
        "props": {
          "type": "object",
          "description": "Application-defined JSON object. Numbers must stay within the interoperable safe-integer range."
        },
        "members": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "principalId": {
                "type": "string",
                "description": "Canonical lowercase UUID. The nil UUID is rejected.",
                "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
              },
              "role": {"type": "string"}
            },
            "required": ["principalId", "role"],
            "additionalProperties": false
          }
        }
      },
      "required": ["title", "props", "members"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "operation": {
      "id": "communication.createConversation",
      "plane": "communication",
      "kind": "mutation",
      "credential": "backendKey",
      "auth": [{"credential": "backendKey", "scopes": ["conversationManage"]}],
      "idempotency": "idempotent",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "communication_update_conversation",
    "title": "Communication: update conversation",
    "description": "Update the title or properties of a conversation.\n\nOperation communication.updateConversation (mutation).\nRequires backendKey with scope conversationManage.\nEach call is a new request. Results and errors carry its requestId. When the outcome is unknown, call retry_request with that requestId instead of calling this tool again.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "conversationId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "expectedRevision": {
          "type": "string",
          "description": "Non-negative 64-bit counter as a canonical decimal string. Never convert it to a floating-point number.",
          "pattern": "^(0|[1-9][0-9]*)$"
        },
        "title": {"type": ["string", "null"]},
        "props": {
          "type": ["object", "null"],
          "description": "Application-defined JSON object. Numbers must stay within the interoperable safe-integer range."
        }
      },
      "required": ["conversationId", "expectedRevision"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "operation": {
      "id": "communication.updateConversation",
      "plane": "communication",
      "kind": "mutation",
      "credential": "backendKey",
      "auth": [
        {"credential": "userSession", "condition": "moderator"},
        {"credential": "backendKey", "scopes": ["conversationManage"]}
      ],
      "idempotency": "idempotent",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "communication_add_member",
    "title": "Communication: add member",
    "description": "Add a member, or change the role of an active member.\n\nOperation communication.addMember (mutation).\nRequires backendKey with scope membershipManage.\nEach call is a new request. Results and errors carry its requestId. When the outcome is unknown, call retry_request with that requestId instead of calling this tool again.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "conversationId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "principalId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "role": {"type": "string"},
        "expectedRevision": {
          "type": "string",
          "description": "Non-negative 64-bit counter as a canonical decimal string. Never convert it to a floating-point number.",
          "pattern": "^(0|[1-9][0-9]*)$"
        }
      },
      "required": ["conversationId", "principalId", "role", "expectedRevision"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "operation": {
      "id": "communication.addMember",
      "plane": "communication",
      "kind": "mutation",
      "credential": "backendKey",
      "auth": [{"credential": "backendKey", "scopes": ["membershipManage"]}],
      "idempotency": "idempotent",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "communication_add_members",
    "title": "Communication: add members",
    "description": "Add several members in one request.\n\nOperation communication.addMembers (mutation).\nRequires backendKey with scope membershipManage.\nEach call is a new request. Results and errors carry its requestId. When the outcome is unknown, call retry_request with that requestId instead of calling this tool again.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "conversationId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "members": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "principalId": {
                "type": "string",
                "description": "Canonical lowercase UUID. The nil UUID is rejected.",
                "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
              },
              "role": {"type": "string"},
              "expectedRevision": {
                "type": "string",
                "description": "Non-negative 64-bit counter as a canonical decimal string. Never convert it to a floating-point number.",
                "pattern": "^(0|[1-9][0-9]*)$"
              }
            },
            "required": ["principalId", "role", "expectedRevision"],
            "additionalProperties": false
          }
        }
      },
      "required": ["conversationId", "members"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "operation": {
      "id": "communication.addMembers",
      "plane": "communication",
      "kind": "mutation",
      "credential": "backendKey",
      "auth": [{"credential": "backendKey", "scopes": ["membershipManage"]}],
      "idempotency": "idempotent",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "communication_remove_member",
    "title": "Communication: remove member",
    "description": "Remove a member from a conversation.\n\nOperation communication.removeMember (mutation).\nRequires backendKey with scope membershipManage.\nEach call is a new request. Results and errors carry its requestId. When the outcome is unknown, call retry_request with that requestId instead of calling this tool again.\nDestructive: it deletes, revokes, removes, disables or ends something. Confirm with the user before calling it.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "conversationId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "principalId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "expectedRevision": {
          "type": "string",
          "description": "Non-negative 64-bit counter as a canonical decimal string. Never convert it to a floating-point number.",
          "pattern": "^(0|[1-9][0-9]*)$"
        }
      },
      "required": ["conversationId", "principalId", "expectedRevision"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": true,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "operation": {
      "id": "communication.removeMember",
      "plane": "communication",
      "kind": "mutation",
      "credential": "backendKey",
      "auth": [{"credential": "backendKey", "scopes": ["membershipManage"]}],
      "idempotency": "idempotent",
      "destructive": true,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "communication_history_grant",
    "title": "Communication: history grant",
    "description": "Expand the history a member can see to an earlier sequence.\n\nOperation communication.historyGrant (mutation).\nRequires backendKey with scope historyManage.\nEach call is a new request. Results and errors carry its requestId. When the outcome is unknown, call retry_request with that requestId instead of calling this tool again.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "conversationId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "principalId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "membershipEpoch": {
          "type": "string",
          "description": "Non-negative 64-bit counter as a canonical decimal string. Never convert it to a floating-point number.",
          "pattern": "^(0|[1-9][0-9]*)$"
        },
        "expectedRevision": {
          "type": "string",
          "description": "Non-negative 64-bit counter as a canonical decimal string. Never convert it to a floating-point number.",
          "pattern": "^(0|[1-9][0-9]*)$"
        },
        "fromSequence": {
          "type": "string",
          "description": "Non-negative 64-bit counter as a canonical decimal string. Never convert it to a floating-point number.",
          "pattern": "^(0|[1-9][0-9]*)$"
        }
      },
      "required": [
        "conversationId",
        "principalId",
        "membershipEpoch",
        "expectedRevision",
        "fromSequence"
      ],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "operation": {
      "id": "communication.historyGrant",
      "plane": "communication",
      "kind": "mutation",
      "credential": "backendKey",
      "auth": [{"credential": "backendKey", "scopes": ["historyManage"]}],
      "idempotency": "idempotent",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "communication_send_message",
    "title": "Communication: send message",
    "description": "Send a message. A backend key sends as its service principal, or as the member named by actAsPrincipalId.\n\nOperation communication.sendMessage (mutation).\nRequires backendKey with scope messageWrite.\nEach call is a new request. Results and errors carry its requestId. When the outcome is unknown, call retry_request with that requestId instead of calling this tool again.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "conversationId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "text": {"type": "string"},
        "props": {
          "type": "object",
          "description": "Application-defined JSON object. Numbers must stay within the interoperable safe-integer range."
        },
        "actAsPrincipalId": {
          "type": ["string", "null"],
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        }
      },
      "required": ["conversationId", "text", "props"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "operation": {
      "id": "communication.sendMessage",
      "plane": "communication",
      "kind": "mutation",
      "credential": "backendKey",
      "auth": [
        {"credential": "userSession", "condition": "member"},
        {"credential": "backendKey", "scopes": ["messageWrite"]}
      ],
      "idempotency": "idempotent",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "communication_edit_message",
    "title": "Communication: edit message",
    "description": "Edit a message.\n\nOperation communication.editMessage (mutation).\nRequires backendKey with scope moderation.\nEach call is a new request. Results and errors carry its requestId. When the outcome is unknown, call retry_request with that requestId instead of calling this tool again.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "conversationId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "messageId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "expectedRevision": {
          "type": "string",
          "description": "Non-negative 64-bit counter as a canonical decimal string. Never convert it to a floating-point number.",
          "pattern": "^(0|[1-9][0-9]*)$"
        },
        "text": {"type": ["string", "null"]},
        "props": {
          "type": ["object", "null"],
          "description": "Application-defined JSON object. Numbers must stay within the interoperable safe-integer range."
        }
      },
      "required": ["conversationId", "messageId", "expectedRevision"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "operation": {
      "id": "communication.editMessage",
      "plane": "communication",
      "kind": "mutation",
      "credential": "backendKey",
      "auth": [
        {"credential": "userSession", "condition": "authorOrModerator"},
        {"credential": "backendKey", "scopes": ["moderation"]}
      ],
      "idempotency": "idempotent",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "communication_delete_message",
    "title": "Communication: delete message",
    "description": "Delete a message.\n\nOperation communication.deleteMessage (mutation).\nRequires backendKey with scope moderation.\nEach call is a new request. Results and errors carry its requestId. When the outcome is unknown, call retry_request with that requestId instead of calling this tool again.\nDestructive: it deletes, revokes, removes, disables or ends something. Confirm with the user before calling it.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "conversationId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "messageId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "expectedRevision": {
          "type": "string",
          "description": "Non-negative 64-bit counter as a canonical decimal string. Never convert it to a floating-point number.",
          "pattern": "^(0|[1-9][0-9]*)$"
        }
      },
      "required": ["conversationId", "messageId", "expectedRevision"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": true,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "operation": {
      "id": "communication.deleteMessage",
      "plane": "communication",
      "kind": "mutation",
      "credential": "backendKey",
      "auth": [
        {"credential": "userSession", "condition": "authorOrModerator"},
        {"credential": "backendKey", "scopes": ["moderation"]}
      ],
      "idempotency": "idempotent",
      "destructive": true,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "communication_set_broadcast_permission",
    "title": "Communication: set broadcast permission",
    "description": "Allow or deny a member to publish media in live sessions.\n\nOperation communication.setBroadcastPermission (mutation).\nRequires backendKey with scope membershipManage.\nEach call is a new request. Results and errors carry its requestId. When the outcome is unknown, call retry_request with that requestId instead of calling this tool again.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "conversationId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "principalId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "allowed": {"type": "boolean"},
        "expectedMembershipRevision": {
          "type": "string",
          "description": "Non-negative 64-bit counter as a canonical decimal string. Never convert it to a floating-point number.",
          "pattern": "^(0|[1-9][0-9]*)$"
        }
      },
      "required": ["conversationId", "principalId", "allowed", "expectedMembershipRevision"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "operation": {
      "id": "communication.setBroadcastPermission",
      "plane": "communication",
      "kind": "mutation",
      "credential": "backendKey",
      "auth": [{"credential": "backendKey", "scopes": ["membershipManage"]}],
      "idempotency": "idempotent",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "communication_set_conversation_mute",
    "title": "Communication: set conversation mute",
    "description": "Mute or unmute message push notifications for a member of a conversation, optionally until a time. Calls still ring. A backend key must name the member with actAsPrincipalId.\n\nOperation communication.setConversationMute (mutation).\nRequires backendKey with scope membershipManage.\nEach call is a new request. Results and errors carry its requestId. When the outcome is unknown, call retry_request with that requestId instead of calling this tool again.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "conversationId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "muted": {"type": "boolean"},
        "until": {"type": ["string", "null"]},
        "actAsPrincipalId": {
          "type": ["string", "null"],
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        }
      },
      "required": ["conversationId", "muted"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "operation": {
      "id": "communication.setConversationMute",
      "plane": "communication",
      "kind": "mutation",
      "credential": "backendKey",
      "auth": [
        {"credential": "userSession", "condition": "member"},
        {"credential": "backendKey", "scopes": ["membershipManage"]}
      ],
      "idempotency": "idempotent",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "communication_alert_live_session",
    "title": "Communication: alert live session",
    "description": "Alert (ring) conversation members about a live session.\n\nOperation communication.alertLiveSession (mutation).\nRequires backendKey with scope callManage.\nEach call is a new request. Results and errors carry its requestId. When the outcome is unknown, call retry_request with that requestId instead of calling this tool again.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "liveSessionId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "expectedGeneration": {
          "type": "string",
          "description": "Non-negative 64-bit counter as a canonical decimal string. Never convert it to a floating-point number.",
          "pattern": "^(0|[1-9][0-9]*)$"
        },
        "principalIds": {
          "type": "array",
          "items": {
            "type": "string",
            "description": "Canonical lowercase UUID. The nil UUID is rejected.",
            "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
            "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
          }
        }
      },
      "required": ["liveSessionId", "expectedGeneration", "principalIds"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "operation": {
      "id": "communication.alertLiveSession",
      "plane": "communication",
      "kind": "mutation",
      "credential": "backendKey",
      "auth": [
        {"credential": "userSession", "condition": "creatorOrModerator"},
        {"credential": "backendKey", "scopes": ["callManage"]}
      ],
      "idempotency": "idempotent",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "communication_end_live_session",
    "title": "Communication: end live session",
    "description": "End a live session for every participant. Completes asynchronously.\n\nOperation communication.endLiveSession (mutation).\nRequires backendKey with scope callManage.\nEach call is a new request. Results and errors carry its requestId. When the outcome is unknown, call retry_request with that requestId instead of calling this tool again.\nDestructive: it deletes, revokes, removes, disables or ends something. Confirm with the user before calling it.\nLong-running: the result's operation identifies work that finishes later. Poll it with communication_live_session_operation.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "liveSessionId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "expectedGeneration": {
          "type": "string",
          "description": "Non-negative 64-bit counter as a canonical decimal string. Never convert it to a floating-point number.",
          "pattern": "^(0|[1-9][0-9]*)$"
        },
        "expectedRevision": {
          "type": "string",
          "description": "Non-negative 64-bit counter as a canonical decimal string. Never convert it to a floating-point number.",
          "pattern": "^(0|[1-9][0-9]*)$"
        }
      },
      "required": ["liveSessionId", "expectedGeneration", "expectedRevision"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": true,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "operation": {
      "id": "communication.endLiveSession",
      "plane": "communication",
      "kind": "mutation",
      "credential": "backendKey",
      "auth": [
        {"credential": "userSession", "condition": "creatorOrModerator"},
        {"credential": "backendKey", "scopes": ["callManage"]}
      ],
      "idempotency": "idempotent",
      "destructive": true,
      "pagination": {"style": "none"},
      "longRunning": {
        "poll": "communication.liveSessionOperation",
        "refField": "operation",
        "tool": "communication_live_session_operation"
      }
    }
  },
  {
    "name": "management_capabilities",
    "title": "Management: capabilities",
    "description": "Describe the management features and limits the authority supports.\n\nOperation management.capabilities (query).\nRequires portalCredential.\nRead-only and safe to repeat.",
    "inputSchema": {"type": "object", "properties": {}, "additionalProperties": false},
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "management.capabilities",
      "plane": "management",
      "kind": "query",
      "credential": "portalCredential",
      "auth": [{"credential": "portalCredential"}],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "management_organizations",
    "title": "Management: organizations",
    "description": "List the organizations the caller can access.\n\nOperation management.organizations (query).\nRequires portalCredential.\nRead-only and safe to repeat.\nPaged (bounded): One bounded page without a cursor input. complete reports whether every item fit.",
    "inputSchema": {"type": "object", "properties": {}, "additionalProperties": false},
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "management.organizations",
      "plane": "management",
      "kind": "query",
      "credential": "portalCredential",
      "auth": [{"credential": "portalCredential"}],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {
        "style": "bounded",
        "pagePath": ["result"],
        "pageType": "OrganizationPage",
        "itemType": "Organization"
      }
    }
  },
  {
    "name": "management_get_organization",
    "title": "Management: get organization",
    "description": "Read an organization.\n\nOperation management.getOrganization (query).\nRequires portalCredential (condition owner: The caller owns the organization, deployment or project).\nRead-only and safe to repeat.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "orgId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        }
      },
      "required": ["orgId"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "management.getOrganization",
      "plane": "management",
      "kind": "query",
      "credential": "portalCredential",
      "auth": [{"credential": "portalCredential", "condition": "owner"}],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "management_get_deployment",
    "title": "Management: get deployment",
    "description": "Read a deployment.\n\nOperation management.getDeployment (query).\nRequires portalCredential (condition owner: The caller owns the organization, deployment or project).\nRead-only and safe to repeat.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "deploymentId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        }
      },
      "required": ["deploymentId"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "management.getDeployment",
      "plane": "management",
      "kind": "query",
      "credential": "portalCredential",
      "auth": [{"credential": "portalCredential", "condition": "owner"}],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "management_get_project",
    "title": "Management: get project",
    "description": "Read a project.\n\nOperation management.getProject (query).\nRequires portalCredential (condition owner: The caller owns the organization, deployment or project).\nRead-only and safe to repeat.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "projectId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        }
      },
      "required": ["projectId"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "management.getProject",
      "plane": "management",
      "kind": "query",
      "credential": "portalCredential",
      "auth": [{"credential": "portalCredential", "condition": "owner"}],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "management_deployment_health",
    "title": "Management: deployment health",
    "description": "Read the health of a deployment.\n\nOperation management.deploymentHealth (query).\nRequires portalCredential (condition owner: The caller owns the organization, deployment or project).\nRead-only and safe to repeat.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "deploymentId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        }
      },
      "required": ["deploymentId"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "management.deploymentHealth",
      "plane": "management",
      "kind": "query",
      "credential": "portalCredential",
      "auth": [{"credential": "portalCredential", "condition": "owner"}],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "management_deployment_usage",
    "title": "Management: deployment usage",
    "description": "Read the metered usage of a deployment, summed over its projects. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days.\n\nOperation management.deploymentUsage (query).\nRequires portalCredential (condition owner: The caller owns the organization, deployment or project).\nRead-only and safe to repeat.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "deploymentId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "from": {"type": ["string", "null"]},
        "to": {"type": ["string", "null"]}
      },
      "required": ["deploymentId"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "management.deploymentUsage",
      "plane": "management",
      "kind": "query",
      "credential": "portalCredential",
      "auth": [{"credential": "portalCredential", "condition": "owner"}],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "management_project_usage",
    "title": "Management: project usage",
    "description": "Read the metered usage of a project. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days.\n\nOperation management.projectUsage (query).\nRequires portalCredential (condition owner: The caller owns the organization, deployment or project).\nRead-only and safe to repeat.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "projectId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "from": {"type": ["string", "null"]},
        "to": {"type": ["string", "null"]}
      },
      "required": ["projectId"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "management.projectUsage",
      "plane": "management",
      "kind": "query",
      "credential": "portalCredential",
      "auth": [{"credential": "portalCredential", "condition": "owner"}],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "management_organization_usage",
    "title": "Management: organization usage",
    "description": "Read the metered usage of an organization in any status, summed over its projects. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days.\n\nOperation management.organizationUsage (query).\nRequires portalCredential (condition owner: The caller owns the organization, deployment or project).\nRead-only and safe to repeat.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "orgId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "from": {"type": ["string", "null"]},
        "to": {"type": ["string", "null"]}
      },
      "required": ["orgId"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "management.organizationUsage",
      "plane": "management",
      "kind": "query",
      "credential": "portalCredential",
      "auth": [{"credential": "portalCredential", "condition": "owner"}],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "management_organization_billing",
    "title": "Management: organization billing",
    "description": "Read the billing state of an organization in any status: the plan whose limits apply, whether ConvoHop bills the organization and, when it does, its standing and subscription.\n\nOperation management.organizationBilling (query).\nRequires portalCredential (condition owner: The caller owns the organization, deployment or project).\nRead-only and safe to repeat.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "orgId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        }
      },
      "required": ["orgId"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "management.organizationBilling",
      "plane": "management",
      "kind": "query",
      "credential": "portalCredential",
      "auth": [{"credential": "portalCredential", "condition": "owner"}],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "management_webhook_endpoints",
    "title": "Management: webhook endpoints",
    "description": "List the webhook endpoints of a project with their status, signing-secret rotation and delivery health.\n\nOperation management.webhookEndpoints (query).\nRequires portalCredential (condition owner: The caller owns the organization, deployment or project).\nRead-only and safe to repeat.\nPaged (bounded): One bounded page without a cursor input. complete reports whether every item fit.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "projectId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        }
      },
      "required": ["projectId"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "management.webhookEndpoints",
      "plane": "management",
      "kind": "query",
      "credential": "portalCredential",
      "auth": [{"credential": "portalCredential", "condition": "owner"}],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {
        "style": "bounded",
        "pagePath": ["result"],
        "pageType": "WebhookEndpointPage",
        "itemType": "WebhookEndpoint"
      }
    }
  },
  {
    "name": "management_webhook_deliveries",
    "title": "Management: webhook deliveries",
    "description": "List recent deliveries of a webhook endpoint.\n\nOperation management.webhookDeliveries (query).\nRequires portalCredential (condition owner: The caller owns the organization, deployment or project).\nRead-only and safe to repeat.\nPaged (bounded): One bounded page without a cursor input. complete reports whether every item fit.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "projectId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "endpointId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        }
      },
      "required": ["projectId", "endpointId"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "management.webhookDeliveries",
      "plane": "management",
      "kind": "query",
      "credential": "portalCredential",
      "auth": [{"credential": "portalCredential", "condition": "owner"}],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {
        "style": "bounded",
        "pagePath": ["result"],
        "pageType": "WebhookDeliveryPage",
        "itemType": "WebhookDelivery"
      }
    }
  },
  {
    "name": "management_resolve_request",
    "title": "Management: resolve request",
    "description": "Look up the stored outcome of an earlier management mutation by its requestId.\n\nOperation management.resolveRequest (query).\nRequires portalCredential (condition ownRequest: The caller made the original request).\nRead-only and safe to repeat.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "requestId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        }
      },
      "required": ["requestId"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "management.resolveRequest",
      "plane": "management",
      "kind": "query",
      "credential": "portalCredential",
      "auth": [{"credential": "portalCredential", "condition": "ownRequest"}],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "management_get_operation",
    "title": "Management: get operation",
    "description": "Read the state of a long-running management operation.\n\nOperation management.getOperation (query).\nRequires portalCredential (condition owner: The caller owns the organization, deployment or project).\nRead-only and safe to repeat.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "operationId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        }
      },
      "required": ["operationId"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "management.getOperation",
      "plane": "management",
      "kind": "query",
      "credential": "portalCredential",
      "auth": [{"credential": "portalCredential", "condition": "owner"}],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "management_agent_grants",
    "title": "Management: agent grants",
    "description": "List an organization's agent grants with their keys, newest first.\n\nOperation management.agentGrants (query).\nRequires portalCredential (condition owner: The caller owns the organization, deployment or project).\nRead-only and safe to repeat.\nPaged (cursor): Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. Uses cursor input cursor and page size input limit.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "orgId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "limit": {
          "type": "integer",
          "description": "Requested page size.",
          "minimum": 1,
          "maximum": 100,
          "default": 50
        },
        "cursor": {"type": ["string", "null"]}
      },
      "required": ["orgId"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "management.agentGrants",
      "plane": "management",
      "kind": "query",
      "credential": "portalCredential",
      "auth": [{"credential": "portalCredential", "condition": "owner"}],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {
        "style": "cursor",
        "limitField": "limit",
        "cursorField": "cursor",
        "pagePath": ["result"],
        "pageType": "AgentGrantPage",
        "itemType": "AgentGrant"
      }
    }
  },
  {
    "name": "management_agent_audit_events",
    "title": "Management: agent audit events",
    "description": "List an organization's agent audit trail, newest first: the approval, provisioning, keys, revocations, spend-control changes and purchases.\n\nOperation management.agentAuditEvents (query).\nRequires portalCredential (condition owner: The caller owns the organization, deployment or project).\nRead-only and safe to repeat.\nPaged (cursor): Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. Uses cursor input cursor and page size input limit.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "orgId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "limit": {
          "type": "integer",
          "description": "Requested page size.",
          "minimum": 1,
          "maximum": 100,
          "default": 50
        },
        "cursor": {"type": ["string", "null"]}
      },
      "required": ["orgId"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "management.agentAuditEvents",
      "plane": "management",
      "kind": "query",
      "credential": "portalCredential",
      "auth": [{"credential": "portalCredential", "condition": "owner"}],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {
        "style": "cursor",
        "limitField": "limit",
        "cursorField": "cursor",
        "pagePath": ["result"],
        "pageType": "AgentAuditEventPage",
        "itemType": "AgentAuditEvent"
      }
    }
  },
  {
    "name": "management_organization_spend",
    "title": "Management: organization spend",
    "description": "Read the organization's spend this month: its cap, credits, minimum credit, charge limit, charges, margin, spend stop and the freshness of its usage.\n\nOperation management.organizationSpend (query).\nRequires portalCredential (condition owner: The caller owns the organization, deployment or project).\nRead-only and safe to repeat.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "orgId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        }
      },
      "required": ["orgId"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "management.organizationSpend",
      "plane": "management",
      "kind": "query",
      "credential": "portalCredential",
      "auth": [{"credential": "portalCredential", "condition": "owner"}],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "management_create_organization",
    "title": "Management: create organization",
    "description": "Create an organization.\n\nOperation management.createOrganization (mutation).\nRequires portalCredential.\nEach call is a new request. Results and errors carry its requestId. When the outcome is unknown, call retry_request with that requestId instead of calling this tool again.",
    "inputSchema": {
      "type": "object",
      "properties": {"name": {"type": "string"}, "termsRef": {"type": "string"}},
      "required": ["name", "termsRef"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "operation": {
      "id": "management.createOrganization",
      "plane": "management",
      "kind": "mutation",
      "credential": "portalCredential",
      "auth": [{"credential": "portalCredential"}],
      "idempotency": "idempotent",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "management_create_deployment",
    "title": "Management: create deployment",
    "description": "Create a deployment in an organization. Completes asynchronously.\n\nOperation management.createDeployment (mutation).\nRequires portalCredential (condition owner: The caller owns the organization, deployment or project).\nEach call is a new request. Results and errors carry its requestId. When the outcome is unknown, call retry_request with that requestId instead of calling this tool again.\nLong-running: the result's operation identifies work that finishes later. Poll it with management_get_operation.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "orgId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "offering": {"type": "string"},
        "geoId": {"type": "string"},
        "installationProfileId": {"type": "string"},
        "consentRef": {"type": "string"}
      },
      "required": ["orgId", "offering", "geoId", "installationProfileId", "consentRef"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "operation": {
      "id": "management.createDeployment",
      "plane": "management",
      "kind": "mutation",
      "credential": "portalCredential",
      "auth": [{"credential": "portalCredential", "condition": "owner"}],
      "idempotency": "idempotent",
      "destructive": false,
      "pagination": {"style": "none"},
      "longRunning": {
        "poll": "management.getOperation",
        "refField": "operation",
        "tool": "management_get_operation"
      }
    }
  },
  {
    "name": "management_create_project",
    "title": "Management: create project",
    "description": "Create a project in a ready deployment. Completes asynchronously.\n\nOperation management.createProject (mutation).\nRequires portalCredential (condition owner: The caller owns the organization, deployment or project).\nEach call is a new request. Results and errors carry its requestId. When the outcome is unknown, call retry_request with that requestId instead of calling this tool again.\nLong-running: the result's operation identifies work that finishes later. Poll it with management_get_operation.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "deploymentId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "name": {"type": "string"},
        "environment": {"type": "string"},
        "backendPrincipalName": {"type": "string"}
      },
      "required": ["deploymentId", "name", "environment", "backendPrincipalName"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "operation": {
      "id": "management.createProject",
      "plane": "management",
      "kind": "mutation",
      "credential": "portalCredential",
      "auth": [{"credential": "portalCredential", "condition": "owner"}],
      "idempotency": "idempotent",
      "destructive": false,
      "pagination": {"style": "none"},
      "longRunning": {
        "poll": "management.getOperation",
        "refField": "operation",
        "tool": "management_get_operation"
      }
    }
  },
  {
    "name": "management_issue_backend_key",
    "title": "Management: issue backend key",
    "description": "Issue a scoped backend key. The secret is delivered once through a credential delivery.\n\nOperation management.issueBackendKey (mutation).\nRequires portalCredential (condition owner: The caller owns the organization, deployment or project).\nEach call is a new request. Results and errors carry its requestId. When the outcome is unknown, call retry_request with that requestId instead of calling this tool again.\nLong-running: the result's operation identifies work that finishes later. Poll it with management_get_operation.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "projectId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "name": {"type": "string"},
        "scopes": {"type": "array", "items": {"type": "string"}},
        "expiresAt": {"type": "string"}
      },
      "required": ["projectId", "name", "scopes", "expiresAt"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "operation": {
      "id": "management.issueBackendKey",
      "plane": "management",
      "kind": "mutation",
      "credential": "portalCredential",
      "auth": [{"credential": "portalCredential", "condition": "owner"}],
      "idempotency": "idempotent",
      "destructive": false,
      "pagination": {"style": "none"},
      "longRunning": {
        "poll": "management.getOperation",
        "refField": "operation",
        "tool": "management_get_operation"
      }
    }
  },
  {
    "name": "management_revoke_backend_key",
    "title": "Management: revoke backend key",
    "description": "Revoke a backend key, optionally revoking the sessions it issued.\n\nOperation management.revokeBackendKey (mutation).\nRequires portalCredential (condition owner: The caller owns the organization, deployment or project).\nEach call is a new request. Results and errors carry its requestId. When the outcome is unknown, call retry_request with that requestId instead of calling this tool again.\nDestructive: it deletes, revokes, removes, disables or ends something. Confirm with the user before calling it.\nLong-running: the result's operation identifies work that finishes later. Poll it with management_get_operation.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "projectId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "keyId": {"type": "string"},
        "expectedRevision": {
          "type": "string",
          "description": "Non-negative 64-bit counter as a canonical decimal string. Never convert it to a floating-point number.",
          "pattern": "^(0|[1-9][0-9]*)$"
        },
        "revokeIssuedSessions": {"type": "boolean"}
      },
      "required": ["projectId", "keyId", "expectedRevision", "revokeIssuedSessions"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": true,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "operation": {
      "id": "management.revokeBackendKey",
      "plane": "management",
      "kind": "mutation",
      "credential": "portalCredential",
      "auth": [{"credential": "portalCredential", "condition": "owner"}],
      "idempotency": "idempotent",
      "destructive": true,
      "pagination": {"style": "none"},
      "longRunning": {
        "poll": "management.getOperation",
        "refField": "operation",
        "tool": "management_get_operation"
      }
    }
  },
  {
    "name": "management_project_policy",
    "title": "Management: project policy",
    "description": "Change the policy of a project.\n\nOperation management.projectPolicy (mutation).\nRequires portalCredential (condition owner: The caller owns the organization, deployment or project).\nEach call is a new request. Results and errors carry its requestId. When the outcome is unknown, call retry_request with that requestId instead of calling this tool again.\nLong-running: the result's operation identifies work that finishes later. Poll it with management_get_operation.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "projectId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "expectedRevision": {
          "type": "string",
          "description": "Non-negative 64-bit counter as a canonical decimal string. Never convert it to a floating-point number.",
          "pattern": "^(0|[1-9][0-9]*)$"
        },
        "change": {
          "type": "object",
          "properties": {
            "kind": {"type": "string"},
            "reason": {"type": ["string", "null"]},
            "holdId": {"type": ["string", "null"]}
          },
          "required": ["kind"],
          "additionalProperties": false
        }
      },
      "required": ["projectId", "expectedRevision", "change"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "operation": {
      "id": "management.projectPolicy",
      "plane": "management",
      "kind": "mutation",
      "credential": "portalCredential",
      "auth": [{"credential": "portalCredential", "condition": "owner"}],
      "idempotency": "idempotent",
      "destructive": false,
      "pagination": {"style": "none"},
      "longRunning": {
        "poll": "management.getOperation",
        "refField": "operation",
        "tool": "management_get_operation"
      }
    }
  },
  {
    "name": "management_pause_operation",
    "title": "Management: pause operation",
    "description": "Pause a long-running operation.\n\nOperation management.pauseOperation (mutation).\nRequires portalCredential (condition owner: The caller owns the organization, deployment or project).\nEach call is a new request. Results and errors carry its requestId. When the outcome is unknown, call retry_request with that requestId instead of calling this tool again.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "operationId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "expectedRevision": {
          "type": "string",
          "description": "Non-negative 64-bit counter as a canonical decimal string. Never convert it to a floating-point number.",
          "pattern": "^(0|[1-9][0-9]*)$"
        }
      },
      "required": ["operationId", "expectedRevision"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "operation": {
      "id": "management.pauseOperation",
      "plane": "management",
      "kind": "mutation",
      "credential": "portalCredential",
      "auth": [{"credential": "portalCredential", "condition": "owner"}],
      "idempotency": "idempotent",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "management_resume_operation",
    "title": "Management: resume operation",
    "description": "Resume a paused or blocked operation.\n\nOperation management.resumeOperation (mutation).\nRequires portalCredential (condition owner: The caller owns the organization, deployment or project).\nEach call is a new request. Results and errors carry its requestId. When the outcome is unknown, call retry_request with that requestId instead of calling this tool again.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "operationId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "expectedRevision": {
          "type": "string",
          "description": "Non-negative 64-bit counter as a canonical decimal string. Never convert it to a floating-point number.",
          "pattern": "^(0|[1-9][0-9]*)$"
        }
      },
      "required": ["operationId", "expectedRevision"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "operation": {
      "id": "management.resumeOperation",
      "plane": "management",
      "kind": "mutation",
      "credential": "portalCredential",
      "auth": [{"credential": "portalCredential", "condition": "owner"}],
      "idempotency": "idempotent",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "management_configure_webhook",
    "title": "Management: configure webhook",
    "description": "Create a webhook endpoint for project events. The signing secret is delivered once through a credential delivery.\n\nOperation management.configureWebhook (mutation).\nRequires portalCredential (condition owner: The caller owns the organization, deployment or project).\nEach call is a new request. Results and errors carry its requestId. When the outcome is unknown, call retry_request with that requestId instead of calling this tool again.\nLong-running: the result's operation identifies work that finishes later. Poll it with management_get_operation.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "projectId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "url": {"type": "string"},
        "eventTypes": {"type": "array", "items": {"type": "string"}},
        "consentRef": {"type": "string"}
      },
      "required": ["projectId", "url", "eventTypes", "consentRef"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "operation": {
      "id": "management.configureWebhook",
      "plane": "management",
      "kind": "mutation",
      "credential": "portalCredential",
      "auth": [{"credential": "portalCredential", "condition": "owner"}],
      "idempotency": "idempotent",
      "destructive": false,
      "pagination": {"style": "none"},
      "longRunning": {
        "poll": "management.getOperation",
        "refField": "operation",
        "tool": "management_get_operation"
      }
    }
  },
  {
    "name": "management_update_webhook",
    "title": "Management: update webhook",
    "description": "Change the event types of a webhook endpoint, or enable or disable it.\n\nOperation management.updateWebhook (mutation).\nRequires portalCredential (condition owner: The caller owns the organization, deployment or project).\nEach call is a new request. Results and errors carry its requestId. When the outcome is unknown, call retry_request with that requestId instead of calling this tool again.\nDestructive: it deletes, revokes, removes, disables or ends something. Confirm with the user before calling it.\nLong-running: the result's operation identifies work that finishes later. Poll it with management_get_operation.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "projectId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "endpointId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "expectedRevision": {
          "type": "string",
          "description": "Non-negative 64-bit counter as a canonical decimal string. Never convert it to a floating-point number.",
          "pattern": "^(0|[1-9][0-9]*)$"
        },
        "eventTypes": {"type": "array", "items": {"type": "string"}},
        "enabled": {"type": "boolean"}
      },
      "required": ["projectId", "endpointId", "expectedRevision", "eventTypes", "enabled"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": true,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "operation": {
      "id": "management.updateWebhook",
      "plane": "management",
      "kind": "mutation",
      "credential": "portalCredential",
      "auth": [{"credential": "portalCredential", "condition": "owner"}],
      "idempotency": "idempotent",
      "destructive": true,
      "pagination": {"style": "none"},
      "longRunning": {
        "poll": "management.getOperation",
        "refField": "operation",
        "tool": "management_get_operation"
      }
    }
  },
  {
    "name": "management_rotate_webhook_secret",
    "title": "Management: rotate webhook secret",
    "description": "Start rotating the signing secret of a webhook endpoint. The next secret is delivered once through a credential delivery.\n\nOperation management.rotateWebhookSecret (mutation).\nRequires portalCredential (condition owner: The caller owns the organization, deployment or project).\nEach call is a new request. Results and errors carry its requestId. When the outcome is unknown, call retry_request with that requestId instead of calling this tool again.\nDestructive: it deletes, revokes, removes, disables or ends something. Confirm with the user before calling it.\nLong-running: the result's operation identifies work that finishes later. Poll it with management_get_operation.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "projectId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "endpointId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "expectedRevision": {
          "type": "string",
          "description": "Non-negative 64-bit counter as a canonical decimal string. Never convert it to a floating-point number.",
          "pattern": "^(0|[1-9][0-9]*)$"
        }
      },
      "required": ["projectId", "endpointId", "expectedRevision"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": true,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "operation": {
      "id": "management.rotateWebhookSecret",
      "plane": "management",
      "kind": "mutation",
      "credential": "portalCredential",
      "auth": [{"credential": "portalCredential", "condition": "owner"}],
      "idempotency": "idempotent",
      "destructive": true,
      "pagination": {"style": "none"},
      "longRunning": {
        "poll": "management.getOperation",
        "refField": "operation",
        "tool": "management_get_operation"
      }
    }
  },
  {
    "name": "management_disable_webhook",
    "title": "Management: disable webhook",
    "description": "Disable a webhook endpoint.\n\nOperation management.disableWebhook (mutation).\nRequires portalCredential (condition owner: The caller owns the organization, deployment or project).\nEach call is a new request. Results and errors carry its requestId. When the outcome is unknown, call retry_request with that requestId instead of calling this tool again.\nDestructive: it deletes, revokes, removes, disables or ends something. Confirm with the user before calling it.\nLong-running: the result's operation identifies work that finishes later. Poll it with management_get_operation.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "projectId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "endpointId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "expectedRevision": {
          "type": "string",
          "description": "Non-negative 64-bit counter as a canonical decimal string. Never convert it to a floating-point number.",
          "pattern": "^(0|[1-9][0-9]*)$"
        }
      },
      "required": ["projectId", "endpointId", "expectedRevision"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": true,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "operation": {
      "id": "management.disableWebhook",
      "plane": "management",
      "kind": "mutation",
      "credential": "portalCredential",
      "auth": [{"credential": "portalCredential", "condition": "owner"}],
      "idempotency": "idempotent",
      "destructive": true,
      "pagination": {"style": "none"},
      "longRunning": {
        "poll": "management.getOperation",
        "refField": "operation",
        "tool": "management_get_operation"
      }
    }
  },
  {
    "name": "management_replay_webhook_deliveries",
    "title": "Management: replay webhook deliveries",
    "description": "Redeliver one webhook delivery, or the deliveries of an endpoint in a time range, with their original event IDs.\n\nOperation management.replayWebhookDeliveries (mutation).\nRequires portalCredential (condition owner: The caller owns the organization, deployment or project).\nEach call is a new request. Results and errors carry its requestId. When the outcome is unknown, call retry_request with that requestId instead of calling this tool again.\nLong-running: the result's operation identifies work that finishes later. Poll it with management_get_operation.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "projectId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "endpointId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "effectId": {
          "type": ["string", "null"],
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "since": {"type": ["string", "null"]},
        "until": {"type": ["string", "null"]}
      },
      "required": ["projectId", "endpointId"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "operation": {
      "id": "management.replayWebhookDeliveries",
      "plane": "management",
      "kind": "mutation",
      "credential": "portalCredential",
      "auth": [{"credential": "portalCredential", "condition": "owner"}],
      "idempotency": "idempotent",
      "destructive": false,
      "pagination": {"style": "none"},
      "longRunning": {
        "poll": "management.getOperation",
        "refField": "operation",
        "tool": "management_get_operation"
      }
    }
  },
  {
    "name": "management_revoke_agent_grant",
    "title": "Management: revoke agent grant",
    "description": "Revoke an agent grant and every key issued under it.\n\nOperation management.revokeAgentGrant (mutation).\nRequires portalCredential (condition owner: The caller owns the organization, deployment or project).\nEach call is a new request. Results and errors carry its requestId. When the outcome is unknown, call retry_request with that requestId instead of calling this tool again.\nDestructive: it deletes, revokes, removes, disables or ends something. Confirm with the user before calling it.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "grantId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "revokeIssuedSessions": {"type": "boolean"}
      },
      "required": ["grantId", "revokeIssuedSessions"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": true,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "operation": {
      "id": "management.revokeAgentGrant",
      "plane": "management",
      "kind": "mutation",
      "credential": "portalCredential",
      "auth": [{"credential": "portalCredential", "condition": "owner"}],
      "idempotency": "idempotent",
      "destructive": true,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "management_set_spend_controls",
    "title": "Management: set spend controls",
    "description": "Set the organization's monthly spend cap and agent purchase limit.\n\nOperation management.setSpendControls (mutation).\nRequires portalCredential (condition owner: The caller owns the organization, deployment or project).\nEach call is a new request. Results and errors carry its requestId. When the outcome is unknown, call retry_request with that requestId instead of calling this tool again.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "orgId": {
          "type": "string",
          "description": "Canonical lowercase UUID. The nil UUID is rejected.",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "not": {"enum": ["00000000-0000-0000-0000-000000000000"]}
        },
        "monthlySpendCap": {"type": "string"},
        "agentPurchaseLimit": {"type": ["string", "null"]}
      },
      "required": ["orgId", "monthlySpendCap"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "operation": {
      "id": "management.setSpendControls",
      "plane": "management",
      "kind": "mutation",
      "credential": "portalCredential",
      "auth": [{"credential": "portalCredential", "condition": "owner"}],
      "idempotency": "idempotent",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  }
];
