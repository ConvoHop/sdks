// Deprecated, frozen compatibility module. New code imports from @convohop/client.
// Do not add exports here; this package is removed once consumers migrate.
export {
  ConversationHandle, ConversationLive, LiveStartOperation, LiveEndOperation, LiveSessionHandle, LiveParticipationHandle,
} from "@convohop/client";
export type {
  LiveSession, LiveParticipation, LiveConnectionGrant, LiveOperation, CommandOptions, PageOptions, LiveWaitOptions,
  LiveConnectOptions,
} from "@convohop/client";
