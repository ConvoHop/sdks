import {
  V1Transport, v1Id, v1Record, type V1AsyncRecoveryStorage, type V1Graphql, type V1Record, type V1RecoveryStorage,
} from "@convohop/core";
import { required } from "./result.js";

export type V1DeploymentOptions = Omit<V1Graphql.CreateDeploymentRequestInput, "orgId">;
export type V1ProjectOptions = Omit<V1Graphql.CreateProjectRequestInput, "deploymentId" | "name">;

/** Operator-token client for organizations, deployments, projects and backend keys. */
export class V1ManagementClient {
  readonly http: V1Transport;
  constructor(options: { baseUrl: string; accessToken: string; actorId: string; recoveryStorage?: V1RecoveryStorage; asyncRecoveryStorage?: V1AsyncRecoveryStorage; fetch?: typeof fetch }) {
    this.http = new V1Transport({ baseUrl: options.baseUrl, credential: options.accessToken,
      namespace: "management:" + v1Id(options.actorId),
      ...(options.recoveryStorage === undefined ? {} : { recoveryStorage: options.recoveryStorage }),
      ...(options.asyncRecoveryStorage === undefined ? {} : { asyncRecoveryStorage: options.asyncRecoveryStorage }),
      ...(options.fetch ? { fetch: options.fetch } : {}) });
  }
  async createOrganization(name: string, termsRef: string) {
    return required((await this.http.execute("management.createOrganization", undefined, { name, termsRef })).result);
  }
  async createDeployment(orgId: string, configuration?: V1DeploymentOptions) {
    if (!configuration && !["127.0.0.1", "localhost", "[::1]"].includes(new URL(this.http.baseUrl).hostname))
      throw new TypeError("Hosted deployment requires explicit offering, geoId, installationProfileId and consentRef");
    return this.http.execute("management.createDeployment", undefined,
      { orgId: v1Id(orgId), ...(configuration ?? { offering: "managedShared", geoId: "local", installationProfileId: "local-single-node", consentRef: "local-development" }) });
  }
  async createProject(deploymentId: string, name: string, configuration?: V1ProjectOptions) {
    if (!configuration && !["127.0.0.1", "localhost", "[::1]"].includes(new URL(this.http.baseUrl).hostname))
      throw new TypeError("Hosted project requires explicit environment and backendPrincipalName");
    return this.http.execute("management.createProject", undefined,
      { deploymentId: v1Id(deploymentId), ...(configuration ?? { environment: "local", backendPrincipalName: "application-server" }), name });
  }
  async operation(operationId: string) {
    return required((await this.http.execute("management.getOperation", undefined, { operationId: v1Id(operationId) })).result);
  }
  async issueBackendKey(projectId: string, name: string, scopes: string[], expiresAt: string) {
    return this.http.execute("management.issueBackendKey", undefined, { projectId: v1Id(projectId), name, scopes, expiresAt });
  }
  async deliveryPermit(projectId: string, deliveryId: string, redemptionRequestId: string): Promise<V1Record> {
    return v1Record((await this.http.execute("management.credentialPermit", undefined,
      { projectId: v1Id(projectId), deliveryId: v1Id(deliveryId), redemptionRequestId: v1Id(redemptionRequestId) })).result);
  }
}
