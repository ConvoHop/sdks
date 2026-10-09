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
/** Operations `convohop call` never runs, because their results are credentials or they record a person's consent. */
export const withheldOperations: Readonly<Record<string, string>> = {
  "communication.issueSession": "returns a user session token",
  "communication.renewSession": "returns a user session token",
  "management.credentialPermit": "returns a credential delivery permit",
  "management.createBillingCheckoutSession": "returns a hosted billing link that grants access to whoever holds it",
  "management.createBillingPortalSession": "returns a hosted billing link that grants access to whoever holds it",
  "management.agentCredentialPermit": "returns a credential delivery permit",
  "management.approveAgentSignup": "records an owner's consent to an agent signup; the owner gives it from the emailed approval link"
};
/** The scopes a backend key can grant, by wire name, with what each allows. */
export const cliScopes: Readonly<Record<string, string>> = {"itemRead": "Read items and jobs.", "widgetWrite": "Create widgets and start jobs."};
export const cliTypes: Readonly<Record<string, CliType>> = {
  "Blob": {"kind": "scalar", "description": "Server-signed JSON object. Pass it back unchanged."},
  "CreateWidgetInput": {
    "kind": "input",
    "fields": [
      {"name": "label", "type": "String!", "required": true},
      {"name": "state", "type": "WidgetState", "required": false, "default": "ACTIVE"},
      {"name": "ratio", "type": "Ratio", "required": false, "default": 0.5},
      {"name": "nested", "type": "[[Int!]!]", "required": false},
      {
        "name": "shape",
        "type": "ShapeInput",
        "required": false,
        "default": {"kind": "box", "sides": [1, 2]}
      }
    ]
  },
  "JobInput": {
    "kind": "input",
    "fields": [{"name": "operationId", "type": "ID!", "required": true}]
  },
  "Ratio": {"kind": "scalar", "description": "Fraction between 0 and 1."},
  "ResolveInput": {
    "kind": "input",
    "fields": [{"name": "requestId", "type": "ID!", "required": true}]
  },
  "ShapeInput": {
    "kind": "input",
    "fields": [
      {"name": "kind", "type": "String!", "required": true},
      {"name": "sides", "type": "[Int!]!", "required": true}
    ]
  },
  "StartJobInput": {
    "kind": "input",
    "fields": [
      {"name": "itemId", "type": "ID!", "required": true},
      {
        "name": "repeat",
        "type": "Int",
        "required": false,
        "description": "How many times to run.",
        "default": 1
      },
      {"name": "props", "type": "Blob", "required": false}
    ]
  },
  "WidgetState": {"kind": "enum", "values": ["ACTIVE", "ARCHIVED"]},
  "WidgetsInput": {
    "kind": "input",
    "fields": [{"name": "states", "type": "[WidgetState!]", "required": false}]
  }
};
export const cliOperations: Readonly<Record<string, CliOperation>> = {
  "alpha.capabilities": {
    "id": "alpha.capabilities",
    "plane": "alpha",
    "kind": "query",
    "summary": "Read the server capabilities.",
    "description": "Server capabilities.",
    "credential": "serverKey",
    "requires": "serverKey",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false
  },
  "alpha.resolveRequest": {
    "id": "alpha.resolveRequest",
    "plane": "alpha",
    "kind": "query",
    "summary": "Look up the outcome of an earlier alpha mutation by requestId.",
    "credential": "serverKey",
    "requires": "serverKey with scope itemRead",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false,
    "input": "ResolveInput"
  },
  "alpha.job": {
    "id": "alpha.job",
    "plane": "alpha",
    "kind": "query",
    "summary": "Poll a job that alpha.startJob started.",
    "credential": "serverKey",
    "requires": "serverKey with scope itemRead",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false,
    "input": "JobInput"
  },
  "alpha.startJob": {
    "id": "alpha.startJob",
    "plane": "alpha",
    "kind": "mutation",
    "summary": "Start a job. It finishes asynchronously.",
    "credential": "serverKey",
    "requires": "serverKey with scope widgetWrite",
    "idempotency": "idempotent",
    "retry": "sameRequest",
    "resolvable": true,
    "destructive": false,
    "longRunning": {"poll": "alpha.job", "refField": "job"},
    "input": "StartJobInput"
  },
  "beta.capabilities": {
    "id": "beta.capabilities",
    "plane": "beta",
    "kind": "query",
    "summary": "Read the server capabilities.",
    "description": "Server capabilities.",
    "credential": "serverKey",
    "requires": "serverKey",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false
  },
  "beta.resolveRequest": {
    "id": "beta.resolveRequest",
    "plane": "beta",
    "kind": "query",
    "summary": "Look up the outcome of an earlier beta mutation by requestId.",
    "credential": "serverKey",
    "requires": "serverKey with scope widgetWrite",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false,
    "input": "ResolveInput"
  },
  "beta.widgets": {
    "id": "beta.widgets",
    "plane": "beta",
    "kind": "query",
    "summary": "List widgets in one bounded page.",
    "credential": "serverKey",
    "requires": "serverKey with scope itemRead",
    "idempotency": "safe",
    "retry": "repeat",
    "resolvable": false,
    "destructive": false,
    "paged": "Paged (bounded): One bounded page.",
    "input": "WidgetsInput"
  },
  "beta.createWidget": {
    "id": "beta.createWidget",
    "plane": "beta",
    "kind": "mutation",
    "summary": "Create a widget.",
    "credential": "serverKey",
    "requires": "serverKey with scope widgetWrite",
    "idempotency": "singleUse",
    "retry": "sameRequest",
    "resolvable": true,
    "destructive": false,
    "input": "CreateWidgetInput"
  }
};
