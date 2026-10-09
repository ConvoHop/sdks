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
  "management.createBillingPortalSession": "returns a hosted billing link that grants access to whoever holds it"
};
export const mcpTools: readonly McpToolDefinition[] = [
  {
    "name": "alpha_capabilities",
    "title": "Alpha: capabilities",
    "description": "Read the server capabilities.\n\nServer capabilities.\n\nOperation alpha.capabilities (query).\nRequires serverKey.\nRead-only and safe to repeat.",
    "inputSchema": {"type": "object", "properties": {}, "additionalProperties": false},
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "alpha.capabilities",
      "plane": "alpha",
      "kind": "query",
      "credential": "serverKey",
      "auth": [{"credential": "userToken"}, {"credential": "serverKey"}],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "alpha_resolve_request",
    "title": "Alpha: resolve request",
    "description": "Look up the outcome of an earlier alpha mutation by requestId.\n\nOperation alpha.resolveRequest (query).\nRequires serverKey with scope itemRead.\nRead-only and safe to repeat.",
    "inputSchema": {
      "type": "object",
      "properties": {"requestId": {"type": ["string", "integer"]}},
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
      "id": "alpha.resolveRequest",
      "plane": "alpha",
      "kind": "query",
      "credential": "serverKey",
      "auth": [
        {"credential": "userToken", "condition": "owner"},
        {"credential": "serverKey", "scopes": ["itemRead"]}
      ],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "alpha_job",
    "title": "Alpha: job",
    "description": "Poll a job that alpha.startJob started.\n\nOperation alpha.job (query).\nRequires serverKey with scope itemRead.\nRead-only and safe to repeat.",
    "inputSchema": {
      "type": "object",
      "properties": {"operationId": {"type": ["string", "integer"]}},
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
      "id": "alpha.job",
      "plane": "alpha",
      "kind": "query",
      "credential": "serverKey",
      "auth": [{"credential": "serverKey", "scopes": ["itemRead"]}],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "alpha_start_job",
    "title": "Alpha: start job",
    "description": "Start a job. It finishes asynchronously.\n\nOperation alpha.startJob (mutation).\nRequires serverKey with scope widgetWrite.\nEach call is a new request. Results and errors carry its requestId. When the outcome is unknown, call retry_request with that requestId instead of calling this tool again.\nLong-running: the result's job identifies work that finishes later. Poll it with alpha_job.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "itemId": {"type": ["string", "integer"]},
        "repeat": {
          "type": ["integer", "null"],
          "description": "How many times to run.",
          "default": 1
        },
        "props": {
          "type": ["object", "null"],
          "description": "Server-signed JSON object. Pass it back unchanged.",
          "properties": {"signature": {"type": "string"}},
          "required": ["signature"]
        }
      },
      "required": ["itemId"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "operation": {
      "id": "alpha.startJob",
      "plane": "alpha",
      "kind": "mutation",
      "credential": "serverKey",
      "auth": [{"credential": "serverKey", "scopes": ["widgetWrite"]}],
      "idempotency": "idempotent",
      "destructive": false,
      "pagination": {"style": "none"},
      "longRunning": {"poll": "alpha.job", "refField": "job", "tool": "alpha_job"}
    }
  },
  {
    "name": "beta_capabilities",
    "title": "Beta: capabilities",
    "description": "Read the server capabilities.\n\nServer capabilities.\n\nOperation beta.capabilities (query).\nRequires serverKey.\nRead-only and safe to repeat.",
    "inputSchema": {"type": "object", "properties": {}, "additionalProperties": false},
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "beta.capabilities",
      "plane": "beta",
      "kind": "query",
      "credential": "serverKey",
      "auth": [{"credential": "serverKey"}],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "beta_resolve_request",
    "title": "Beta: resolve request",
    "description": "Look up the outcome of an earlier beta mutation by requestId.\n\nOperation beta.resolveRequest (query).\nRequires serverKey with scope widgetWrite.\nRead-only and safe to repeat.",
    "inputSchema": {
      "type": "object",
      "properties": {"requestId": {"type": ["string", "integer"]}},
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
      "id": "beta.resolveRequest",
      "plane": "beta",
      "kind": "query",
      "credential": "serverKey",
      "auth": [{"credential": "serverKey", "scopes": ["widgetWrite"]}],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  },
  {
    "name": "beta_widgets",
    "title": "Beta: widgets",
    "description": "List widgets in one bounded page.\n\nOperation beta.widgets (query).\nRequires serverKey with scope itemRead.\nRead-only and safe to repeat.\nPaged (bounded): One bounded page.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "states": {
          "type": ["array", "null"],
          "items": {"type": "string", "enum": ["ACTIVE", "ARCHIVED"]}
        }
      },
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "operation": {
      "id": "beta.widgets",
      "plane": "beta",
      "kind": "query",
      "credential": "serverKey",
      "auth": [{"credential": "serverKey", "scopes": ["itemRead"]}],
      "idempotency": "safe",
      "destructive": false,
      "pagination": {
        "style": "bounded",
        "pagePath": ["result"],
        "pageType": "WidgetPage",
        "itemType": "Widget"
      }
    }
  },
  {
    "name": "beta_create_widget",
    "title": "Beta: create widget",
    "description": "Create a widget.\n\nOperation beta.createWidget (mutation).\nRequires serverKey with scope widgetWrite.\nEach call is a new request. Results and errors carry its requestId. When the outcome is unknown, call retry_request with that requestId instead of calling this tool again.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "label": {"type": "string"},
        "state": {
          "type": ["string", "null"],
          "enum": ["ACTIVE", "ARCHIVED", null],
          "default": "ACTIVE"
        },
        "ratio": {
          "type": ["number", "null"],
          "description": "Fraction between 0 and 1.",
          "minimum": 0,
          "maximum": 1,
          "default": 0.5
        },
        "nested": {
          "type": ["array", "null"],
          "items": {"type": "array", "items": {"type": "integer"}}
        },
        "shape": {
          "type": ["object", "null"],
          "properties": {
            "kind": {"type": "string"},
            "sides": {"type": "array", "items": {"type": "integer"}}
          },
          "required": ["kind", "sides"],
          "additionalProperties": false,
          "default": {"kind": "box", "sides": [1, 2]}
        }
      },
      "required": ["label"],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "operation": {
      "id": "beta.createWidget",
      "plane": "beta",
      "kind": "mutation",
      "credential": "serverKey",
      "auth": [{"credential": "serverKey", "scopes": ["widgetWrite"]}],
      "idempotency": "singleUse",
      "destructive": false,
      "pagination": {"style": "none"}
    }
  }
];
