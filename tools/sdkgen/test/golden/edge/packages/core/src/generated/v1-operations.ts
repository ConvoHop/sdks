// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
import type * as Generated from "./v1-generated.js";
export interface V1OperationTypes {
  "alpha.capabilities": { variables: Generated.AlphaCapabilitiesQueryVariables; result: Generated.AlphaCapabilitiesQuery };
  "alpha.resolveRequest": { variables: Generated.AlphaResolveRequestQueryVariables; result: Generated.AlphaResolveRequestQuery };
  "alpha.items": { variables: Generated.AlphaItemsQueryVariables; result: Generated.AlphaItemsQuery };
  "alpha.events": { variables: Generated.AlphaEventsQueryVariables; result: Generated.AlphaEventsQuery };
  "alpha.job": { variables: Generated.AlphaJobQueryVariables; result: Generated.AlphaJobQuery };
  "alpha.fetchHTTPStatus": { variables: Generated.AlphaFetchHttpStatusQueryVariables; result: Generated.AlphaFetchHttpStatusQuery };
  "alpha.startJob": { variables: Generated.AlphaStartJobMutationVariables; result: Generated.AlphaStartJobMutation };
  "alpha.ping": { variables: Generated.AlphaPingMutationVariables; result: Generated.AlphaPingMutation };
  "alpha.redeem": { variables: Generated.AlphaRedeemMutationVariables; result: Generated.AlphaRedeemMutation };
  "alpha.eventStream": { variables: Generated.AlphaEventStreamSubscriptionVariables; result: Generated.AlphaEventStreamSubscription };
  "beta.capabilities": { variables: Generated.BetaCapabilitiesQueryVariables; result: Generated.BetaCapabilitiesQuery };
  "beta.resolveRequest": { variables: Generated.BetaResolveRequestQueryVariables; result: Generated.BetaResolveRequestQuery };
  "beta.widgets": { variables: Generated.BetaWidgetsQueryVariables; result: Generated.BetaWidgetsQuery };
  "beta.createWidget": { variables: Generated.BetaCreateWidgetMutationVariables; result: Generated.BetaCreateWidgetMutation };
}
export type V1OperationKey = keyof V1OperationTypes;
export interface V1Operation { plane: string; kind: string; field: string; operationName: string; query: string; resultType: string; inputFields: readonly string[] }
export type V1OutputShape = { kind: "scalar" } | { kind: "enum"; values: readonly string[] } | { kind: "object"; fields: Readonly<Record<string, string>> };
export const v1OutputShapes: Readonly<Record<string, V1OutputShape>> = {
  "Counter": {
    "kind": "scalar"
  },
  "Blob": {
    "kind": "scalar"
  },
  "PageSize": {
    "kind": "scalar"
  },
  "String": {
    "kind": "scalar"
  },
  "ID": {
    "kind": "scalar"
  },
  "Int": {
    "kind": "scalar"
  },
  "Capabilities": {
    "kind": "object",
    "fields": {
      "version": "String!",
      "wssUrl": "String",
      "features": "[String!]!"
    }
  },
  "Receipt": {
    "kind": "object",
    "fields": {
      "requestId": "ID!",
      "committed": "Boolean!",
      "sequence": "Counter"
    }
  },
  "Boolean": {
    "kind": "scalar"
  },
  "Fruit": {
    "kind": "enum",
    "values": [
      "BANANA",
      "APPLE",
      "cherry",
      "apple10",
      "apple9",
      "DATE",
      "ELDER"
    ]
  },
  "HTTPMethod": {
    "kind": "enum",
    "values": [
      "POST",
      "GET"
    ]
  },
  "Item": {
    "kind": "object",
    "fields": {
      "id": "ID!",
      "name": "String!",
      "fruit": "Fruit",
      "weight": "Float",
      "ripe": "Boolean!",
      "oldName": "String",
      "legacyCode": "Int",
      "grid": "[[Int!]]!",
      "aliases": "[String]",
      "history": "[[Fruit]!]"
    }
  },
  "Float": {
    "kind": "scalar"
  },
  "ItemPage": {
    "kind": "object",
    "fields": {
      "items": "[Item!]!",
      "complete": "Boolean!",
      "refreshRequired": "Boolean!",
      "nextCursor": "String"
    }
  },
  "SubjectRef": {
    "kind": "object",
    "fields": {
      "kind": "String!",
      "id": "ID!"
    }
  },
  "EventPayload": {
    "kind": "object",
    "fields": {
      "itemId": "ID",
      "jobId": "ID",
      "revision": "Counter",
      "note": "String"
    }
  },
  "Event": {
    "kind": "object",
    "fields": {
      "sequence": "Counter!",
      "type": "String!",
      "subjectRef": "SubjectRef!",
      "payload": "EventPayload!"
    }
  },
  "EventPage": {
    "kind": "object",
    "fields": {
      "items": "[Event!]!",
      "complete": "Boolean!",
      "refreshRequired": "Boolean!",
      "nextCursor": "String"
    }
  },
  "JobRef": {
    "kind": "object",
    "fields": {
      "operationId": "ID!",
      "state": "String!"
    }
  },
  "StartJobPayload": {
    "kind": "object",
    "fields": {
      "requestId": "ID!",
      "receipt": "Receipt!",
      "job": "JobRef"
    }
  },
  "Job": {
    "kind": "object",
    "fields": {
      "operationId": "ID!",
      "state": "String!",
      "progress": "Float",
      "output": "Blob"
    }
  },
  "Ratio": {
    "kind": "scalar"
  },
  "WidgetState": {
    "kind": "enum",
    "values": [
      "ACTIVE",
      "ARCHIVED"
    ]
  },
  "Widget": {
    "kind": "object",
    "fields": {
      "id": "ID!",
      "label": "String",
      "state": "WidgetState!",
      "revision": "Counter!"
    }
  },
  "WidgetPage": {
    "kind": "object",
    "fields": {
      "items": "[Widget!]!",
      "complete": "Boolean!",
      "refreshRequired": "Boolean!"
    }
  },
  "WidgetsPayload": {
    "kind": "object",
    "fields": {
      "requestId": "ID!",
      "result": "WidgetPage"
    }
  }
};
export const v1Operations: Record<V1OperationKey, V1Operation> = {
  "alpha.capabilities": {
    "plane": "alpha",
    "kind": "query",
    "field": "capabilities",
    "operationName": "AlphaCapabilities",
    "query": "query AlphaCapabilities($context: ContextInput!) {\n  capabilities(context: $context) {\n    version\n    wssUrl\n    features\n  }\n}",
    "resultType": "Capabilities!",
    "inputFields": []
  },
  "alpha.resolveRequest": {
    "plane": "alpha",
    "kind": "query",
    "field": "resolveRequest",
    "operationName": "AlphaResolveRequest",
    "query": "query AlphaResolveRequest($context: ContextInput!, $input: ResolveInput!) {\n  resolveRequest(context: $context, input: $input) {\n    requestId\n    committed\n    sequence\n  }\n}",
    "resultType": "Receipt!",
    "inputFields": [
      "requestId"
    ]
  },
  "alpha.items": {
    "plane": "alpha",
    "kind": "query",
    "field": "items",
    "operationName": "AlphaItems",
    "query": "query AlphaItems($context: ContextInput!, $input: ItemsInput!) {\n  items(context: $context, input: $input) {\n    items {\n      id\n      name\n      fruit\n      weight\n      ripe\n      oldName\n      legacyCode\n      grid\n      aliases\n      history\n    }\n    complete\n    refreshRequired\n    nextCursor\n  }\n}",
    "resultType": "ItemPage!",
    "inputFields": [
      "limit",
      "cursor",
      "fruits",
      "minWeight",
      "includeDeprecated",
      "method",
      "box",
      "legacyFilter",
      "item2",
      "item10"
    ]
  },
  "alpha.events": {
    "plane": "alpha",
    "kind": "query",
    "field": "events",
    "operationName": "AlphaEvents",
    "query": "query AlphaEvents($context: ContextInput!, $input: EventsInput!) {\n  events(context: $context, input: $input) {\n    items {\n      sequence\n      type\n      subjectRef {\n        kind\n        id\n      }\n      payload {\n        itemId\n        jobId\n        revision\n        note\n      }\n    }\n    complete\n    refreshRequired\n    nextCursor\n  }\n}",
    "resultType": "EventPage!",
    "inputFields": [
      "after",
      "limit"
    ]
  },
  "alpha.job": {
    "plane": "alpha",
    "kind": "query",
    "field": "job",
    "operationName": "AlphaJob",
    "query": "query AlphaJob($context: ContextInput!, $input: JobInput!) {\n  job(context: $context, input: $input) {\n    operationId\n    state\n    progress\n    output\n  }\n}",
    "resultType": "Job",
    "inputFields": [
      "operationId"
    ]
  },
  "alpha.fetchHTTPStatus": {
    "plane": "alpha",
    "kind": "query",
    "field": "fetchHTTPStatus",
    "operationName": "AlphaFetchHTTPStatus",
    "query": "query AlphaFetchHTTPStatus($context: ContextInput!, $input: FetchInput) {\n  fetchHTTPStatus(context: $context, input: $input)\n}",
    "resultType": "Int",
    "inputFields": [
      "method"
    ]
  },
  "alpha.startJob": {
    "plane": "alpha",
    "kind": "mutation",
    "field": "startJob",
    "operationName": "AlphaStartJob",
    "query": "mutation AlphaStartJob($context: ContextInput!, $input: StartJobInput!) {\n  startJob(context: $context, input: $input) {\n    requestId\n    receipt {\n      requestId\n      committed\n      sequence\n    }\n    job {\n      operationId\n      state\n    }\n  }\n}",
    "resultType": "StartJobPayload!",
    "inputFields": [
      "itemId",
      "repeat",
      "props"
    ]
  },
  "alpha.ping": {
    "plane": "alpha",
    "kind": "mutation",
    "field": "ping",
    "operationName": "AlphaPing",
    "query": "mutation AlphaPing($context: ContextInput!, $input: PingInput) {\n  ping(context: $context, input: $input)\n}",
    "resultType": "Boolean!",
    "inputFields": [
      "note"
    ]
  },
  "alpha.redeem": {
    "plane": "alpha",
    "kind": "mutation",
    "field": "redeem",
    "operationName": "AlphaRedeem",
    "query": "mutation AlphaRedeem($context: ContextInput!, $input: RedeemInput!) {\n  redeem(context: $context, input: $input) {\n    requestId\n    committed\n    sequence\n  }\n}",
    "resultType": "Receipt!",
    "inputFields": [
      "deliveryId"
    ]
  },
  "alpha.eventStream": {
    "plane": "alpha",
    "kind": "subscription",
    "field": "eventStream",
    "operationName": "AlphaEventStream",
    "query": "subscription AlphaEventStream($context: ContextInput!, $input: EventsInput!) {\n  eventStream(context: $context, input: $input) {\n    items {\n      sequence\n      type\n      subjectRef {\n        kind\n        id\n      }\n      payload {\n        itemId\n        jobId\n        revision\n        note\n      }\n    }\n    complete\n    refreshRequired\n    nextCursor\n  }\n}",
    "resultType": "EventPage!",
    "inputFields": [
      "after",
      "limit"
    ]
  },
  "beta.capabilities": {
    "plane": "beta",
    "kind": "query",
    "field": "capabilities",
    "operationName": "BetaCapabilities",
    "query": "query BetaCapabilities($context: ContextInput!) {\n  capabilities(context: $context) {\n    version\n    wssUrl\n    features\n  }\n}",
    "resultType": "Capabilities!",
    "inputFields": []
  },
  "beta.resolveRequest": {
    "plane": "beta",
    "kind": "query",
    "field": "resolveRequest",
    "operationName": "BetaResolveRequest",
    "query": "query BetaResolveRequest($context: ContextInput!, $input: ResolveInput!) {\n  resolveRequest(context: $context, input: $input) {\n    requestId\n    committed\n    sequence\n  }\n}",
    "resultType": "Receipt!",
    "inputFields": [
      "requestId"
    ]
  },
  "beta.widgets": {
    "plane": "beta",
    "kind": "query",
    "field": "widgets",
    "operationName": "BetaWidgets",
    "query": "query BetaWidgets($context: ContextInput!, $input: WidgetsInput) {\n  widgets(context: $context, input: $input) {\n    requestId\n    result {\n      items {\n        id\n        label\n        state\n        revision\n      }\n      complete\n      refreshRequired\n    }\n  }\n}",
    "resultType": "WidgetsPayload!",
    "inputFields": [
      "states"
    ]
  },
  "beta.createWidget": {
    "plane": "beta",
    "kind": "mutation",
    "field": "createWidget",
    "operationName": "BetaCreateWidget",
    "query": "mutation BetaCreateWidget($context: ContextInput!, $input: CreateWidgetInput!) {\n  createWidget(context: $context, input: $input) {\n    id\n    label\n    state\n    revision\n  }\n}",
    "resultType": "Widget!",
    "inputFields": [
      "label",
      "state",
      "ratio",
      "nested",
      "shape"
    ]
  }
};
