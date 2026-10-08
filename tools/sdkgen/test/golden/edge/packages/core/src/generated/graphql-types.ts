/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type Box_3dInput = {
  depth: number;
  height: number;
  width: number;
};

/** Request metadata that every root field takes. */
export type ContextInput = {
  attempt?: number | null | undefined;
  /** Single-use permit. Only alpha.redeem accepts it. */
  permit?: string | null | undefined;
  requestId: string | number;
  tags?: Array<string> | null | undefined;
  /** Tenant that owns the request. */
  tenant?: string | null | undefined;
};

export type CreateWidgetInput = {
  label: string;
  nested?: Array<Array<number>> | null | undefined;
  ratio?: number | null | undefined;
  shape?: ShapeInput | null | undefined;
  state?: WidgetState | null | undefined;
};

export type EventsInput = {
  after?: string | null | undefined;
  limit: number;
};

export type FetchInput = {
  method?: HttpMethod | null | undefined;
};

/**
 * Kinds of fruit.
 * The values are deliberately unsorted.
 */
export type Fruit =
  | 'APPLE'
  /** Curved and yellow. */
  | 'BANANA'
  | 'DATE'
  /** Elderberries. */
  | 'ELDER'
  | 'apple9'
  | 'apple10'
  | 'cherry';

export type HttpMethod =
  | 'GET'
  | 'POST';

/**
 * Filters for alpha.items.
 * A closing comment marker *\/ must not end a generated comment.
 */
export type ItemsInput = {
  box?: Box_3dInput | null | undefined;
  cursor?: string | null | undefined;
  fruits?: Array<Fruit> | null | undefined;
  includeDeprecated?: boolean | null | undefined;
  item2?: number | null | undefined;
  item10?: number | null | undefined;
  /** @deprecated Use fruits. */
  legacyFilter?: string | null | undefined;
  /**
   * Page size.
   * Defaults to 20.
   */
  limit?: number | null | undefined;
  method?: HttpMethod | null | undefined;
  minWeight?: number | null | undefined;
};

export type JobInput = {
  operationId: string | number;
};

export type PingInput = {
  note?: string | null | undefined;
};

export type RedeemInput = {
  deliveryId: string | number;
};

export type ResolveInput = {
  requestId: string | number;
};

export type ShapeInput = {
  kind: string;
  sides: Array<number>;
};

export type StartJobInput = {
  itemId: string | number;
  props?: Record<string, unknown> | null | undefined;
  /** How many times to run. */
  repeat?: number | null | undefined;
};

export type WidgetState =
  | 'ACTIVE'
  | 'ARCHIVED';

export type WidgetsInput = {
  states?: Array<WidgetState> | null | undefined;
};

export type AlphaCapabilitiesQueryVariables = Exact<{
  context: ContextInput;
}>;


export type AlphaCapabilitiesQuery = { capabilities: { version: string, wssUrl: string | null, features: Array<string> } };

export type AlphaResolveRequestQueryVariables = Exact<{
  context: ContextInput;
  input: ResolveInput;
}>;


export type AlphaResolveRequestQuery = { resolveRequest: { requestId: string, committed: boolean, sequence: string | null } };

export type AlphaItemsQueryVariables = Exact<{
  context: ContextInput;
  input: ItemsInput;
}>;


export type AlphaItemsQuery = { items: { complete: boolean, refreshRequired: boolean, nextCursor: string | null, items: Array<{ id: string, name: string, fruit: Fruit | null, weight: number | null, ripe: boolean, oldName: string | null, legacyCode: number | null, grid: Array<Array<number> | null>, aliases: Array<string | null> | null, history: Array<Array<Fruit | null>> | null }> } };

export type AlphaEventsQueryVariables = Exact<{
  context: ContextInput;
  input: EventsInput;
}>;


export type AlphaEventsQuery = { events: { complete: boolean, refreshRequired: boolean, nextCursor: string | null, items: Array<{ sequence: string, type: string, subjectRef: { kind: string, id: string }, payload: { itemId: string | null, jobId: string | null, revision: string | null, note: string | null } }> } };

export type AlphaJobQueryVariables = Exact<{
  context: ContextInput;
  input: JobInput;
}>;


export type AlphaJobQuery = { job: { operationId: string, state: string, progress: number | null, output: Record<string, unknown> | null } | null };

export type AlphaFetchHttpStatusQueryVariables = Exact<{
  context: ContextInput;
  input?: FetchInput | null | undefined;
}>;


export type AlphaFetchHttpStatusQuery = { fetchHTTPStatus: number | null };

export type AlphaStartJobMutationVariables = Exact<{
  context: ContextInput;
  input: StartJobInput;
}>;


export type AlphaStartJobMutation = { startJob: { requestId: string, receipt: { requestId: string, committed: boolean, sequence: string | null }, job: { operationId: string, state: string } | null } };

export type AlphaPingMutationVariables = Exact<{
  context: ContextInput;
  input?: PingInput | null | undefined;
}>;


export type AlphaPingMutation = { ping: boolean };

export type AlphaRedeemMutationVariables = Exact<{
  context: ContextInput;
  input: RedeemInput;
}>;


export type AlphaRedeemMutation = { redeem: { requestId: string, committed: boolean, sequence: string | null } };

export type AlphaEventStreamSubscriptionVariables = Exact<{
  context: ContextInput;
  input: EventsInput;
}>;


export type AlphaEventStreamSubscription = { eventStream: { complete: boolean, refreshRequired: boolean, nextCursor: string | null, items: Array<{ sequence: string, type: string, subjectRef: { kind: string, id: string }, payload: { itemId: string | null, jobId: string | null, revision: string | null, note: string | null } }> } };

export type BetaCapabilitiesQueryVariables = Exact<{
  context: ContextInput;
}>;


export type BetaCapabilitiesQuery = { capabilities: { version: string, wssUrl: string | null, features: Array<string> } };

export type BetaResolveRequestQueryVariables = Exact<{
  context: ContextInput;
  input: ResolveInput;
}>;


export type BetaResolveRequestQuery = { resolveRequest: { requestId: string, committed: boolean, sequence: string | null } };

export type BetaWidgetsQueryVariables = Exact<{
  context: ContextInput;
  input?: WidgetsInput | null | undefined;
}>;


export type BetaWidgetsQuery = { widgets: { requestId: string, result: { complete: boolean, refreshRequired: boolean, items: Array<{ id: string, label: string | null, state: WidgetState, revision: string }> } | null } };

export type BetaCreateWidgetMutationVariables = Exact<{
  context: ContextInput;
  input: CreateWidgetInput;
}>;


export type BetaCreateWidgetMutation = { createWidget: { id: string, label: string | null, state: WidgetState, revision: string } };
