// The backends the samples talk to. connect, bootstrapUser and createConversation do what your backend does with
// @convohop/server: see the TypeScript server quickstart. startAppBackend stands in for your backend's own endpoints,
// which the samples call with fetch. It records each request and answers it with respond's status and JSON body.
import { createServer } from "node:http";
import { ProjectServerClient } from "@convohop/server";
import type { Backend, UserBootstrap } from "../src/client.ts";

export interface ServerConfig {
  baseUrl: string;
  projectId: string;
  incarnation: string;
  backendKey: string;
}

export async function connect(config: ServerConfig): Promise<ProjectServerClient> {
  const server = new ProjectServerClient(config);
  await server.initialize();
  return server;
}

// What your backend's sign-in endpoint returns to the app.
export async function bootstrapUser(
  server: ProjectServerClient,
  config: ServerConfig,
  accountId: string,
  deviceId: string,
): Promise<UserBootstrap> {
  const principalId = await server.createPrincipal(accountId);
  const session = await server.issueSession(principalId, deviceId);
  return { ...session, baseUrl: config.baseUrl, projectId: config.projectId };
}

export async function createConversation(
  server: ProjectServerClient,
  title: string,
  principalIds: readonly string[],
  requestId: string,
): Promise<string> {
  const conversation = await server.conversations.create(
    { title, props: {}, members: principalIds.map(principalId => ({ principalId, role: "member" })) },
    { requestId },
  );
  return conversation.conversationId;
}

export interface AppRequest {
  method: string;
  path: string;
  authorization: string | undefined;
  body: unknown;
}

export interface AppBackend extends Backend {
  readonly requests: AppRequest[];
  close(): Promise<void>;
}

export async function startAppBackend(
  respond: (request: AppRequest) => { status: number; body?: unknown } = () => ({ status: 204 }),
): Promise<AppBackend> {
  const requests: AppRequest[] = [];
  const server = createServer(async (incoming, outgoing) => {
    let text = "";
    for await (const chunk of incoming) text += chunk;
    const request: AppRequest = {
      method: incoming.method ?? "",
      path: incoming.url ?? "",
      authorization: incoming.headers.authorization,
      body: text ? JSON.parse(text) : undefined,
    };
    requests.push(request);
    const { status, body } = respond(request);
    if (body === undefined) outgoing.writeHead(status).end();
    else outgoing.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("The app backend isn't listening on a TCP port");
  return {
    url: `http://127.0.0.1:${address.port}`,
    appToken: "app-token",
    requests,
    close: () =>
      new Promise<void>(resolve => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}
