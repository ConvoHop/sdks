// Deprecated, frozen compatibility module. New code imports from @convohop/client.
// Do not add exports here; this package is removed once consumers migrate.
export {
  V1Problem, v1Record, v1String, v1Id, v1Counter, v1Cursor, v1Page, v1Message, v1SearchHit, v1Membership, v1Conversation,
  V1Transport, V1Client, V1Realtime,
} from "@convohop/client";
export type {
  V1Record, V1Cursor, V1Page, V1Message, V1SendReceipt, V1SearchHit, V1Membership, V1Conversation, V1Session,
  V1SessionBootstrap, V1SessionRefresh, V1SessionRefreshState, V1Route, V1RecoveryState, V1RecoveryStorage,
  V1AsyncRecoveryStorage, V1TransportOptions, V1ClientOptions,
} from "@convohop/client";
