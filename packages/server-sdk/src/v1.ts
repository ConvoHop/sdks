// Deprecated, frozen compatibility module. New code imports from @convohop/server.
// Do not add exports here; this package is removed once consumers migrate.
export { V1ManagementClient, V1ProjectServerClient } from "@convohop/server";
export type {
  V1RecoveryStorage, V1AsyncRecoveryStorage, V1SessionBootstrap, V1DeploymentOptions, V1ProjectOptions,
  V1SessionRequestOutcome,
} from "@convohop/server";
