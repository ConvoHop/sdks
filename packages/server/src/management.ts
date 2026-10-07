import {
  ConvoHopTransport, parseId, parseObject, type AsyncRecoveryStorage, type GraphqlTypes, type ProtocolObject, type RecoveryStorage,
} from "@convohop/core";
import { required } from "./result.js";

export type DeploymentOptions = Omit<GraphqlTypes.CreateDeploymentRequestInput, "orgId">;
export type ProjectOptions = Omit<GraphqlTypes.CreateProjectRequestInput, "deploymentId" | "name">;

/** Operator-token client for organizations, deployments, projects and backend keys. */
export class ConvoHopManagementClient {
  readonly http: ConvoHopTransport;
  constructor(options: { baseUrl: string; accessToken: string; actorId: string; recoveryStorage?: RecoveryStorage; asyncRecoveryStorage?: AsyncRecoveryStorage; fetch?: typeof fetch }) {
    this.http = new ConvoHopTransport({ baseUrl: options.baseUrl, credential: options.accessToken,
      namespace: "management:" + parseId(options.actorId),
      ...(options.recoveryStorage === undefined ? {} : { recoveryStorage: options.recoveryStorage }),
      ...(options.asyncRecoveryStorage === undefined ? {} : { asyncRecoveryStorage: options.asyncRecoveryStorage }),
      ...(options.fetch ? { fetch: options.fetch } : {}) });
  }
  async createOrganization(name: string, termsRef: string) {
    return required((await this.http.execute("management.createOrganization", undefined, { name, termsRef })).result);
  }
  async createDeployment(orgId: string, configuration?: DeploymentOptions) {
    if (!configuration && !["127.0.0.1", "localhost", "[::1]"].includes(new URL(this.http.baseUrl).hostname))
      throw new TypeError("Hosted deployment requires explicit offering, geoId, installationProfileId and consentRef");
    return this.http.execute("management.createDeployment", undefined,
      { orgId: parseId(orgId), ...(configuration ?? { offering: "managedShared", geoId: "local", installationProfileId: "local-single-node", consentRef: "local-development" }) });
  }
  async createProject(deploymentId: string, name: string, configuration?: ProjectOptions) {
    if (!configuration && !["127.0.0.1", "localhost", "[::1]"].includes(new URL(this.http.baseUrl).hostname))
      throw new TypeError("Hosted project requires explicit environment and backendPrincipalName");
    return this.http.execute("management.createProject", undefined,
      { deploymentId: parseId(deploymentId), ...(configuration ?? { environment: "local", backendPrincipalName: "application-server" }), name });
  }
  async operation(operationId: string) {
    return required((await this.http.execute("management.getOperation", undefined, { operationId: parseId(operationId) })).result);
  }
  async issueBackendKey(projectId: string, name: string, scopes: string[], expiresAt: string) {
    return this.http.execute("management.issueBackendKey", undefined, { projectId: parseId(projectId), name, scopes, expiresAt });
  }
  async deliveryPermit(projectId: string, deliveryId: string, redemptionRequestId: string): Promise<ProtocolObject> {
    return parseObject((await this.http.execute("management.credentialPermit", undefined,
      { projectId: parseId(projectId), deliveryId: parseId(deliveryId), redemptionRequestId: parseId(redemptionRequestId) })).result);
  }
}
