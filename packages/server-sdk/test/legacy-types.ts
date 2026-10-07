// Compile-time pin of the frozen @convohop/server-sdk type surface, checked by `tsc --project test`.
import type {
  V1ManagementClient, V1ProjectServerClient, V1RecoveryStorage, V1AsyncRecoveryStorage, V1SessionBootstrap,
  V1DeploymentOptions, V1ProjectOptions, V1SessionRequestOutcome,
} from "@convohop/server-sdk";
import type * as V1 from "../dist/v1.js";
import type * as Server from "@convohop/server";

type Same<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Pinned<T extends true> = T;

export type IndexSurface = [
  V1ManagementClient, V1ProjectServerClient, V1RecoveryStorage, V1AsyncRecoveryStorage, V1SessionBootstrap,
  V1DeploymentOptions, V1ProjectOptions, V1SessionRequestOutcome,
];
export type ModuleSurface = [
  V1.V1ManagementClient, V1.V1ProjectServerClient, V1.V1RecoveryStorage, V1.V1AsyncRecoveryStorage, V1.V1SessionBootstrap,
  V1.V1DeploymentOptions, V1.V1ProjectOptions, V1.V1SessionRequestOutcome,
];
// Migrating only changes the specifier: every root type name is also importable from @convohop/server.
export type ServerSurface = [
  Server.V1ManagementClient, Server.V1ProjectServerClient, Server.V1RecoveryStorage, Server.V1AsyncRecoveryStorage,
  Server.V1SessionBootstrap, Server.V1DeploymentOptions, Server.V1ProjectOptions, Server.V1SessionRequestOutcome,
];
export type Identity = [
  Pinned<Same<V1ManagementClient, Server.V1ManagementClient>>,
  Pinned<Same<V1ProjectServerClient, Server.V1ProjectServerClient>>,
  Pinned<Same<V1SessionRequestOutcome, Server.V1SessionRequestOutcome>>,
];
