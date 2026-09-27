import {
  V1Transport, v1Id, v1Record, v1String, v1Conversation,
  type V1RecoveryStorage, type V1Record, type V1Conversation,
} from "@convohop/browser-sdk";

export class V1ManagementClient {
  readonly http: V1Transport;
  constructor(options: { baseUrl: string; accessToken: string; actorId: string; recoveryStorage?: V1RecoveryStorage; fetch?: typeof fetch }) {
    this.http = new V1Transport({ baseUrl: options.baseUrl, credential: options.accessToken,
      namespace: "management:" + v1Id(options.actorId),
      ...(options.recoveryStorage ? { recoveryStorage: options.recoveryStorage } : {}),
      ...(options.fetch ? { fetch: options.fetch } : {}) });
  }
  async createOrganization(name: string, termsRef: string): Promise<V1Record> {
    return v1Record((await this.http.mutate("POST", "/management/v1/organizations", { name, termsRef })).result);
  }
  async createDeployment(orgId: string): Promise<V1Record> {
    const response = await this.http.mutate("POST", `/management/v1/organizations/${v1Id(orgId)}/deployments`,
      { offering: "managedShared", geoId: "local", installationProfileId: "local-single-node", consentRef: "local-development" });
    return { operation: response.operation, resourceRef: response.resourceRef };
  }
  async createProject(deploymentId: string, name: string): Promise<V1Record> {
    const response = await this.http.mutate("POST", `/management/v1/deployments/${v1Id(deploymentId)}/projects`,
      { name, environment: "local", backendPrincipalName: "application-server" });
    return { operation: response.operation, resourceRef: response.resourceRef };
  }
  async operation(operationId: string): Promise<V1Record> { return v1Record((await this.http.read(`/management/v1/operations/${v1Id(operationId)}`)).result); }
  async issueBackendKey(projectId: string, name: string, scopes: string[], expiresAt: string): Promise<V1Record> {
    const response = await this.http.mutate("POST", `/management/v1/projects/${v1Id(projectId)}/backendKeys`, { name, scopes, expiresAt });
    return { operation: response.operation, resourceRef: response.resourceRef };
  }
  async deliveryPermit(projectId: string, deliveryId: string, redemptionRequestId: string): Promise<V1Record> {
    return v1Record((await this.http.mutate("POST", `/management/v1/projects/${v1Id(projectId)}/credentialDeliveries/${v1Id(deliveryId)}/permits`,
      { redemptionRequestId: v1Id(redemptionRequestId) })).result);
  }
}
export interface V1SessionBootstrap {
  sessionToken: string; tokenExpiresAt: string;
  session: { sessionId: string; principalId: string; deviceId: string; incarnation: string; sessionRevision: string; expiresAt: string };
}
export class V1ProjectServerClient {
  readonly projectId: string; readonly http: V1Transport;
  constructor(options: { baseUrl: string; projectId: string; backendKey: string; incarnation: string; recoveryStorage?: V1RecoveryStorage; fetch?: typeof fetch }) {
    this.projectId = v1Id(options.projectId);
    this.http = new V1Transport({ baseUrl: options.baseUrl, credential: options.backendKey,
      namespace: "backend:" + options.projectId, incarnation: v1Id(options.incarnation),
      ...(options.recoveryStorage ? { recoveryStorage: options.recoveryStorage } : {}),
      ...(options.fetch ? { fetch: options.fetch } : {}) });
  }
  get path(): string { return "/v1/projects/" + this.projectId; }
  async initialize(): Promise<void> {
    const route = v1Record((await this.http.read(this.path + "/route")).result);
    if (route.projectId !== this.projectId || route.incarnation !== this.http.incarnation) throw new Error("Project incarnation changed; explicit recovery required");
    this.http.servingEpoch = v1String(route.servingEpoch);
  }
  async createPrincipal(externalUserId: string): Promise<string> {
    return v1Id(v1Record((await this.http.mutate("POST", this.path + "/principals", { externalUserId })).result).principalId);
  }
  async issueSession(principalId: string, deviceId: string, requestedTtlMs = "900000"): Promise<V1SessionBootstrap> {
    const v = v1Record((await this.http.mutate("POST", this.path + "/sessions", { principalId: v1Id(principalId), deviceId: v1Id(deviceId), requestedTtlMs })).result);
    const s = v1Record(v.session);
    return { sessionToken: v1String(v.sessionToken), tokenExpiresAt: v1String(v.tokenExpiresAt),
      session: { sessionId: v1Id(s.sessionId), principalId: v1Id(s.principalId), deviceId: v1Id(s.deviceId),
        incarnation: v1Id(s.incarnation), sessionRevision: v1String(s.sessionRevision), expiresAt: v1String(s.expiresAt) } };
  }
  async createConversation(title: string, members: { principalId: string; role: "member" | "moderator" }[]): Promise<V1Conversation> {
    return v1Conversation((await this.http.mutate("POST", this.path + "/conversations", { title, props: {}, members })).result);
  }
}
