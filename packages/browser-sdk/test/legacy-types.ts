// Compile-time pin of the frozen @convohop/browser-sdk type surface, checked by `tsc --project test`.
import type {
  V1Record, V1Cursor, V1Page, V1Message, V1SendReceipt, V1SearchHit, V1Membership, V1Conversation, V1Session,
  V1SessionBootstrap, V1SessionRefresh, V1SessionRefreshState, V1Route, V1RecoveryState, V1RecoveryStorage,
  V1AsyncRecoveryStorage, V1TransportOptions, V1ClientOptions, V1Problem, V1Transport, V1Client, V1Realtime,
  LiveSession, LiveParticipation, LiveConnectionGrant, LiveOperation, CommandOptions, PageOptions, LiveWaitOptions,
  LiveConnectOptions, ConversationHandle, ConversationLive, LiveStartOperation, LiveEndOperation, LiveSessionHandle,
  LiveParticipationHandle, V1RemoteMedia, V1MediaOptions, V1MediaStats, V1MediaConnection, V1OperationKey,
  V1OperationTypes, OperationInput, OperationPayload, V1Graphql,
} from "@convohop/browser-sdk";
import type * as V1 from "../dist/v1.js";
import type * as Live from "../dist/live.js";
import type * as Media from "../dist/v1-media.js";
import type * as Graphql from "../dist/v1-graphql.js";
import type * as Operations from "../dist/v1-operations.js";
import type * as Generated from "../dist/v1-generated.js";
import type * as Client from "@convohop/client";

type Same<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Pinned<T extends true> = T;

export type IndexSurface = [
  V1Record, V1Cursor, V1Page<V1Message>, V1Message, V1SendReceipt, V1SearchHit, V1Membership, V1Conversation, V1Session,
  V1SessionBootstrap, V1SessionRefresh, V1SessionRefreshState, V1Route, V1RecoveryState, V1RecoveryStorage,
  V1AsyncRecoveryStorage, V1TransportOptions, V1ClientOptions, V1Problem, V1Transport, V1Client, V1Realtime,
  LiveSession, LiveParticipation, LiveConnectionGrant, LiveOperation, CommandOptions, PageOptions, LiveWaitOptions,
  LiveConnectOptions, ConversationHandle, ConversationLive, LiveStartOperation, LiveEndOperation, LiveSessionHandle,
  LiveParticipationHandle, V1RemoteMedia, V1MediaOptions, V1MediaStats, V1MediaConnection, V1OperationKey,
  V1OperationTypes, OperationInput<V1OperationKey>, OperationPayload<V1OperationKey>,
  V1Graphql.CreateProjectRequestInput,
];
export type ModuleSurface = [
  V1.V1Record, V1.V1Cursor, V1.V1Page<V1.V1Message>, V1.V1Message, V1.V1SendReceipt, V1.V1SearchHit, V1.V1Membership,
  V1.V1Conversation, V1.V1Session, V1.V1SessionBootstrap, V1.V1SessionRefresh, V1.V1SessionRefreshState, V1.V1Route,
  V1.V1RecoveryState, V1.V1RecoveryStorage, V1.V1AsyncRecoveryStorage, V1.V1TransportOptions, V1.V1ClientOptions,
  V1.V1Problem, V1.V1Transport, V1.V1Client, V1.V1Realtime,
  Live.LiveSession, Live.LiveParticipation, Live.LiveConnectionGrant, Live.LiveOperation, Live.CommandOptions,
  Live.PageOptions, Live.LiveWaitOptions, Live.LiveConnectOptions, Live.ConversationHandle, Live.ConversationLive,
  Live.LiveStartOperation, Live.LiveEndOperation, Live.LiveSessionHandle, Live.LiveParticipationHandle,
  Media.V1RemoteMedia, Media.V1MediaOptions, Media.V1MediaStats, Media.V1MediaConnection,
  Graphql.CommunicationOperation, Graphql.OperationInput<Operations.V1OperationKey>, Graphql.OperationPayload<Operations.V1OperationKey>,
  Operations.V1OperationTypes, Operations.V1OperationKey, Operations.V1Operation, Operations.V1OutputShape,
  Generated.CreateProjectRequestInput,
];
// Migrating only changes the specifier: every root type name is also importable from @convohop/client.
export type ClientSurface = [
  Client.V1Record, Client.V1Cursor, Client.V1Page<Client.V1Message>, Client.V1Message, Client.V1SendReceipt,
  Client.V1SearchHit, Client.V1Membership, Client.V1Conversation, Client.V1Session, Client.V1SessionBootstrap,
  Client.V1SessionRefresh, Client.V1SessionRefreshState, Client.V1Route, Client.V1RecoveryState,
  Client.V1RecoveryStorage, Client.V1AsyncRecoveryStorage, Client.V1TransportOptions, Client.V1ClientOptions,
  Client.V1Problem, Client.V1Transport, Client.V1Client, Client.V1Realtime,
  Client.LiveSession, Client.LiveParticipation, Client.LiveConnectionGrant, Client.LiveOperation, Client.CommandOptions,
  Client.PageOptions, Client.LiveWaitOptions, Client.LiveConnectOptions, Client.ConversationHandle,
  Client.ConversationLive, Client.LiveStartOperation, Client.LiveEndOperation, Client.LiveSessionHandle,
  Client.LiveParticipationHandle, Client.V1RemoteMedia, Client.V1MediaOptions, Client.V1MediaStats,
  Client.V1MediaConnection, Client.V1OperationKey, Client.V1OperationTypes, Client.OperationInput<Client.V1OperationKey>,
  Client.OperationPayload<Client.V1OperationKey>, Client.V1Graphql.CreateProjectRequestInput,
];
export type Identity = [
  Pinned<Same<V1Client, Client.V1Client>>, Pinned<Same<V1Problem, Client.V1Problem>>,
  Pinned<Same<V1Graphql.CreateProjectRequestInput, Generated.CreateProjectRequestInput>>,
  Pinned<Same<OperationPayload<V1OperationKey>, Client.OperationPayload<V1OperationKey>>>,
];
// The legacy alias was Pick<Storage, ...>; browser storage must remain assignable.
export const storage: V1RecoveryStorage = globalThis.localStorage;
