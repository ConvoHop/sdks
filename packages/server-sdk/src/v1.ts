import {
  V1Transport, v1Id, v1Record, v1String, v1Conversation, v1Counter,
  type V1RecoveryStorage, type V1AsyncRecoveryStorage, type V1Record, type V1Conversation, type V1Graphql, type V1Membership, type CommandOptions, type OperationPayload,
} from "@convohop/browser-sdk";

export type { V1RecoveryStorage, V1AsyncRecoveryStorage } from "@convohop/browser-sdk";

export type V1DeploymentOptions = Omit<V1Graphql.CreateDeploymentRequestInput, "orgId">;
export type V1ProjectOptions = Omit<V1Graphql.CreateProjectRequestInput, "deploymentId" | "name">;

function required<T>(value: T | null | undefined): T {
  if (value == null) throw new TypeError("Missing current authority result");
  return value;
}

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
type SessionResult = NonNullable<OperationPayload<"communication.issueSession">["result"]>;
export type V1SessionBootstrap = SessionResult & { session: NonNullable<SessionResult["session"]> };
export class V1ProjectServerClient {
  readonly projectId: string; readonly http: V1Transport;
  constructor(options: { baseUrl: string; projectId: string; backendKey: string; incarnation: string; recoveryStorage?: V1RecoveryStorage; asyncRecoveryStorage?: V1AsyncRecoveryStorage; fetch?: typeof fetch }) {
    this.projectId = v1Id(options.projectId);
    this.http = new V1Transport({ baseUrl: options.baseUrl, credential: options.backendKey,
      namespace: "backend:" + options.projectId, incarnation: v1Id(options.incarnation),
      ...(options.recoveryStorage === undefined ? {} : { recoveryStorage: options.recoveryStorage }),
      ...(options.asyncRecoveryStorage === undefined ? {} : { asyncRecoveryStorage: options.asyncRecoveryStorage }),
      ...(options.fetch ? { fetch: options.fetch } : {}) });
  }
  readonly conversations = {
    create: async (input: V1Graphql.CreateConversationRequestInput, options: CommandOptions = {}) => {
      const result = (await this.http.execute("communication.createConversation", this.projectId, input, options.requestId)).result;
      if (!result) throw new TypeError("Missing created conversation");
      return result;
    },
  };
  conversation(conversationId: string) {
    v1Id(conversationId);
    return {
      get: async () => {
        const result = (await this.http.execute("communication.getConversation", this.projectId, { conversationId })).result;
        if (!result) throw new TypeError("Missing authorized conversation");
        return result;
      },
      members: {
        addBatch: (members: V1Graphql.MemberBatchEntryInput[], options: CommandOptions = {}) =>
          this.addMembers(conversationId, members, options.requestId),
        setBroadcastPermission: (input: Omit<V1Graphql.SetBroadcastPermissionInput, "conversationId">,
          options: CommandOptions = {}) => this.http.execute("communication.setBroadcastPermission",
            this.projectId, { conversationId, ...input }, options.requestId),
        list: async (options: { limit?: number; cursor?: string } = {}) =>
          (await this.http.execute("communication.members", this.projectId, { conversationId, limit: 100, ...options })).result,
      },
    };
  }
  async initialize(): Promise<void> {
    const route = v1Record((await this.http.execute("communication.route", this.projectId, {})).result);
    if (route.projectId !== this.projectId || route.incarnation !== this.http.incarnation) throw new Error("Project incarnation changed; explicit recovery required");
    this.http.servingEpoch = v1String(route.servingEpoch);
  }
  async createPrincipal(externalUserId: string): Promise<string> {
    return required((await this.http.execute("communication.createPrincipal", this.projectId, { externalUserId })).result).principalId;
  }
  async issueSession(principalId: string, deviceId: string, requestedTtlMs = "900000"): Promise<V1SessionBootstrap> {
    const issued = required((await this.http.execute("communication.issueSession", this.projectId,
      { principalId: v1Id(principalId), deviceId: v1Id(deviceId), requestedTtlMs })).result);
    return { ...issued, session: required(issued.session) };
  }
  async createConversation(title: string, members: { principalId: string; role: "member" | "moderator" }[]): Promise<V1Conversation> {
    return v1Conversation((await this.http.execute("communication.createConversation", this.projectId, { title, props: {}, members })).result);
  }
  async addMembers(conversationId: string, members: V1Graphql.MemberBatchEntryInput[], requestId?: string): Promise<V1Membership[]> {
    if (!members.length || members.length > 100 || new Set(members.map(member => member.principalId)).size !== members.length)
      throw new TypeError("A membership batch requires 1..100 distinct principals");
    const entries = members.map(member => {
      if (member.role !== "member" && member.role !== "moderator") throw new TypeError("Invalid membership role");
      return { principalId: v1Id(member.principalId), role: member.role, expectedRevision: v1Counter(member.expectedRevision) };
    });
    const result = (await this.http.execute("communication.addMembers", this.projectId,
      { conversationId: v1Id(conversationId), members: entries }, requestId)).result;
    if (result.items.length !== entries.length) throw new TypeError("Invalid membership batch result");
    return result.items;
  }
}
