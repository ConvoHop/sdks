// Calls to your own backend. The paths and bodies are this example's; see the server quickstart for issuing sessions.
import type { SessionBootstrap, SessionMetadata } from "@convohop/client";
import type { NativePushRegistration } from "@convohop/react-native";
import { BACKEND_URL } from "./config";

/** A ConvoHop session for the signed-in user, and where to use it. */
export type UserBootstrap = SessionBootstrap & { baseUrl: string; projectId: string };
export interface SignedIn {
  /** Your backend's own credential for this user. The example keeps it in memory only. */
  readonly appToken: string;
  readonly bootstrap: UserBootstrap;
}

type Fields = Readonly<Record<string, unknown>>;
const isFields = (value: unknown): value is Fields => typeof value === "object" && value !== null && !Array.isArray(value);
function text(fields: Fields, name: string): string {
  const value = fields[name];
  if (typeof value !== "string" || value === "") throw new TypeError(`The backend's response has no ${name}`);
  return value;
}
function fields(value: unknown, name: string): Fields {
  if (!isFields(value)) throw new TypeError(`The backend's response has no ${name}`);
  return value;
}

/** Checks a session from the backend, so a malformed response fails here instead of in the SDK. */
export function parseBootstrap(value: unknown): UserBootstrap {
  const bootstrap = fields(value, "session"), session = fields(bootstrap.session, "session");
  return {
    baseUrl: text(bootstrap, "baseUrl"),
    projectId: text(bootstrap, "projectId"),
    sessionToken: text(bootstrap, "sessionToken"),
    tokenExpiresAt: text(bootstrap, "tokenExpiresAt"),
    session: {
      sessionId: text(session, "sessionId"),
      principalId: text(session, "principalId"),
      deviceId: text(session, "deviceId"),
      incarnation: text(session, "incarnation"),
      sessionRevision: text(session, "sessionRevision"),
      expiresAt: text(session, "expiresAt"),
      status: text(session, "status"),
    },
  };
}

async function call(method: "POST" | "DELETE", path: string, body: unknown, appToken?: string): Promise<unknown> {
  const response = await fetch(BACKEND_URL + path, {
    method,
    headers: { "content-type": "application/json", ...(appToken === undefined ? {} : { authorization: "Bearer " + appToken }) },
    body: JSON.stringify(body),
  });
  // Never include the response body: it can hold credentials.
  if (!response.ok) throw new Error(`The backend answered ${method} ${path} with HTTP ${response.status}`);
  return response.status === 204 ? undefined : response.json();
}

export async function signIn(userName: string, password: string): Promise<SignedIn> {
  const result = fields(await call("POST", "/sign-in", { userName, password }), "sign-in");
  return { appToken: text(result, "appToken"), bootstrap: parseBootstrap(result.convohop) };
}
/** Asks the backend for a new ConvoHop session before the current one expires. */
export async function renewSession(appToken: string, current: Readonly<SessionMetadata>): Promise<UserBootstrap> {
  return parseBootstrap(await call("POST", "/convohop/session", { sessionId: current.sessionId }, appToken));
}
/**
 * Stores this device's APNs or PushKit token, or its FCM registration token or FID on Android, which the backend sends
 * pushes to. Key it by the token or FID: when another user signs in on this device, it moves to them.
 */
export async function registerPush(appToken: string, registration: NativePushRegistration): Promise<void> {
  await call("POST", "/push-registrations", registration, appToken);
}
/** Deletes a registration that FCM unregistered, so the backend stops sending to it. */
export async function unregisterPush(appToken: string, registration: NativePushRegistration): Promise<void> {
  await call("DELETE", "/push-registrations", registration, appToken);
}
/** Ends the user's sessions on this device and deletes the push registrations it stored. */
export async function signOut(appToken: string): Promise<void> {
  await call("POST", "/sign-out", {}, appToken);
}
