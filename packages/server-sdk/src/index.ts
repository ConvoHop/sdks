import { Buffer } from "node:buffer";
import {
  ConvoHopClient, GraphQLHttp, InvalidResponseError, isIdentityId, requireIdentityId,
  type ClientOptions,
} from "@convohop/browser-sdk";

export { ApiError, InvalidResponseError, TransportError } from "@convohop/browser-sdk";

export interface ManagementClientOptions {
  baseUrl: string;
  adminToken: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export interface ProjectServerClientOptions {
  baseUrl: string;
  projectKey: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export interface ProvisionedProject {
  id: string;
  projectKey: string;
}

export type ProjectStatus = "active" | "suspended" | "provisioning" | "failed";

export interface ProjectSummary {
  id: string;
  name: string;
  status: ProjectStatus;
}

export interface ProjectPage {
  items: ProjectSummary[];
  nextAfter: string | null;
}

export interface ListProjectsOptions {
  after?: string;
  limit?: number;
}

export interface SessionToken {
  token: string;
  expiresAt: string;
}

export interface Identity {
  id: string;
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const statuses: readonly string[] = ["active", "suspended", "provisioning", "failed"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuid.test(value);
}

function requireUuid(value: string, name: string): void {
  if (!isUuid(value)) throw new TypeError(`${name} must be a UUID`);
}

function isProject(value: unknown): value is ProjectSummary {
  return isRecord(value) && isUuid(value.id) && typeof value.name === "string" &&
    typeof value.status === "string" && statuses.includes(value.status);
}

function isExpiry(value: unknown): value is string {
  return typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    Number.isFinite(Date.parse(value));
}

export class ManagementClient {
  readonly #http: GraphQLHttp;

  constructor(options: ManagementClientOptions) {
    this.#http = new GraphQLHttp({
      baseUrl: options.baseUrl,
      token: options.adminToken,
      kind: "adm",
      ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
      ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
    });
  }

  async createProject(name: string): Promise<ProvisionedProject> {
    if (
      typeof name !== "string" || !name.trim() ||
      Buffer.byteLength(name, "utf8") > 128 || /\p{Cc}/u.test(name)
    ) {
      throw new TypeError("name must contain text and be at most 128 UTF-8 bytes without control characters");
    }
    const value = await this.#http.execute(
      "mutation($name:String!){createProject(name:$name){id projectKey}}",
      { name }, "createProject",
    );
    if (!isRecord(value) || !isUuid(value.id) ||
        typeof value.projectKey !== "string" || !/^pk_[0-9a-fA-F]{64}$/.test(value.projectKey)) {
      throw new InvalidResponseError(200, "Management returned an invalid project");
    }
    return { id: value.id, projectKey: value.projectKey };
  }

  async listProjects(options: ListProjectsOptions = {}): Promise<ProjectPage> {
    const limit = options.limit ?? 50;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new RangeError("limit must be an integer from 1 to 100");
    }
    if (options.after !== undefined) requireUuid(options.after, "after");
    const value = await this.#http.execute(
      "query($after:ID,$limit:Int){projects(after:$after,limit:$limit){items{id name status} nextAfter}}",
      { after: options.after, limit }, "projects",
    );
    if (!isRecord(value) || !Array.isArray(value.items) || !value.items.every(isProject) ||
        !(value.nextAfter === null || isUuid(value.nextAfter))) {
      throw new InvalidResponseError(200, "Management returned an invalid project page");
    }
    const items: ProjectSummary[] = value.items.map(({ id, name, status }) => ({
      id, name, status,
    }));
    const expectedCursor = items.at(-1)?.id ?? options.after ?? null;
    if (value.nextAfter !== expectedCursor) {
      throw new InvalidResponseError(200, "Management returned an invalid project cursor");
    }
    return { items, nextAfter: value.nextAfter };
  }

  async suspendProject(projectId: string): Promise<void> {
    requireUuid(projectId, "projectId");
    const value = await this.#http.execute(
      "mutation($id:ID!){suspendProject(id:$id)}", { id: projectId }, "suspendProject",
    );
    if (value !== true) throw new InvalidResponseError(200, "Management did not suspend the project");
  }
}

export class ProjectServerClient {
  readonly #http: GraphQLHttp;

  constructor(options: ProjectServerClientOptions) {
    this.#http = new GraphQLHttp({
      baseUrl: options.baseUrl,
      token: options.projectKey,
      kind: "pk",
      ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
      ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
    });
  }

  async createIdentity(requestId: string): Promise<Identity> {
    requireUuid(requestId, "requestId");
    if (requestId === "00000000-0000-0000-0000-000000000000") {
      throw new TypeError("requestId must not be a nil UUID");
    }
    const value = await this.#http.execute(
      "mutation($requestId:ID!){createIdentity(requestId:$requestId){id}}",
      { requestId }, "createIdentity",
    );
    if (!isRecord(value) || !isIdentityId(value.id)) {
      throw new InvalidResponseError(200, "Communication returned an invalid identity");
    }
    return { id: value.id };
  }

  async mintIdentityToken(identityId: string): Promise<SessionToken> {
    requireIdentityId(identityId);
    const value = await this.#http.execute(
      "mutation($identityId:ID!){issueIdentityToken(identityId:$identityId){token expiresAt}}",
      { identityId }, "issueIdentityToken",
    );
    if (!isRecord(value) || typeof value.token !== "string" ||
        !/^st_[0-9a-fA-F]{64}$/.test(value.token) || !isExpiry(value.expiresAt)) {
      throw new InvalidResponseError(200, "Communication returned an invalid session token");
    }
    return { token: value.token, expiresAt: value.expiresAt };
  }

  async asIdentity(identityId: string, options: Pick<ClientOptions, "socketFactory"> = {}):
    Promise<ConvoHopClient> {
    if (options.socketFactory !== undefined && typeof options.socketFactory !== "function") {
      throw new TypeError("socketFactory must be a function");
    }
    const { token } = await this.mintIdentityToken(identityId);
    return new ConvoHopClient({
      baseUrl: this.#http.origin,
      sessionToken: token,
      fetch: this.#http.fetcher,
      ...(options.socketFactory === undefined ? {} : { socketFactory: options.socketFactory }),
    });
  }
}
export * from "./v1.js";
