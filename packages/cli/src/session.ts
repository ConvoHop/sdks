import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { ConvoHopTransport, ProjectServerClient } from "@convohop/server";
import type { Args } from "./args.js";
import { authorityOrigin, selectedProfile, type ConfigFiles, type Environment, type Profile } from "./config.js";
import { loadToken, vault, type CommandRunner } from "./credentials.js";
import { CliError, UsageError, type Printer, type TextOutput } from "./output.js";

/** Standard input: piped data, or a terminal that can be put in raw mode. */
export type InputStream = NodeJS.ReadableStream & { readonly isTTY?: boolean; setRawMode?(mode: boolean): unknown };

/** What a command runs with. */
export interface Context {
  readonly env: Environment;
  readonly printer: Printer;
  readonly stdin: InputStream;
  readonly stdout: TextOutput;
  readonly stderr: TextOutput;
  /** Aborts with the run's signal, such as on Ctrl-C. */
  readonly fetch: typeof fetch;
  readonly signal: AbortSignal;
  readonly platform: NodeJS.Platform;
  readonly runCommand: CommandRunner;
  /** Waits, or rejects when the run's signal aborts. */
  readonly sleep: (milliseconds: number) => Promise<void>;
  readonly now: () => Date;
  readonly files: ConfigFiles;
}

/** A fetch whose requests also abort with signal. */
export function abortableFetch(base: typeof fetch, signal: AbortSignal): typeof fetch {
  return (input, init) => base(input, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, signal]) : signal });
}

/** Reads source to its end. Returns undefined, and stops reading, once it exceeds limit bytes. */
export async function readLimited(source: AsyncIterable<unknown>, limit: number): Promise<Buffer | undefined> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of source) {
    const bytes = typeof chunk === "string" ? Buffer.from(chunk, "utf8") : Buffer.from(chunk as Uint8Array);
    size += bytes.length;
    if (size > limit) return undefined;
    chunks.push(bytes);
  }
  return Buffer.concat(chunks);
}

/** Reads the file an option names, or standard input for -, failing when it has more than limit bytes. */
export async function readInput(context: Context, path: string, limit: number, option: string,
  command: string): Promise<Buffer> {
  let bytes: Buffer | undefined;
  try {
    bytes = await readLimited(path === "-" ? context.stdin : createReadStream(path, { end: limit }), limit);
  } catch {
    throw new CliError(path === "-" ? "Can't read standard input" : `Can't read ${path}`);
  }
  if (bytes === undefined) throw new UsageError(`${option} must be at most ${limit} bytes`, command);
  return bytes;
}

/** A variable's value; empty variables count as unset. */
export function variable(env: Environment, name: string): string | undefined {
  return env[name] || undefined;
}

/** A secret from the variable, or from the file that the variable's _FILE form names. */
export async function environmentSecret(env: Environment, name: string): Promise<string | undefined> {
  const inline = variable(env, name), file = variable(env, `${name}_FILE`);
  if (inline !== undefined && file !== undefined) throw new UsageError(`Set ${name} or ${name}_FILE, not both`);
  if (file === undefined) return inline;
  let text: string;
  try {
    text = (await readFile(file, "utf8")).trim();
  } catch {
    throw new CliError(`Can't read the file that ${name}_FILE names`);
  }
  if (!text) throw new CliError(`${name}_FILE names an empty file`);
  return text;
}

/** A plane's transport. Management requests carry the portal token; communication requests carry a backend key. */
export interface Plane {
  readonly name: "management" | "communication";
  readonly transport: ConvoHopTransport;
  /** The project of communication requests. Management operations name projects in their input. */
  readonly projectId: string | undefined;
}

async function savedProfile(context: Context, args: Args): Promise<{ name: string; profile: Profile | undefined }> {
  const name = selectedProfile(args.string("profile"), context.env);
  const { profiles } = await context.files.read();
  return { name, profile: Object.hasOwn(profiles, name) ? profiles[name] : undefined };
}

/** The management plane: the portal token from CONVOHOP_PORTAL_TOKEN(_FILE) or the profile's login. */
export async function managementPlane(context: Context, args: Args): Promise<Plane> {
  const { name, profile } = await savedProfile(context, args);
  const token = await environmentSecret(context.env, "CONVOHOP_PORTAL_TOKEN") ??
    (profile ? await loadToken(vault(profile.credentialStore, context.files, context.runCommand), profile.credentialRef) : undefined);
  if (!token) {
    const login = name === "default" ? "convohop login" : `convohop login --profile ${name}`;
    throw new CliError(profile ? `The ${name} profile's token is missing from its credential store. Run ${login}`
      : `Not logged in. Run ${login}, or set CONVOHOP_PORTAL_TOKEN or CONVOHOP_PORTAL_TOKEN_FILE`);
  }
  context.printer.secret(token);
  const flag = args.string("management-url"), env = variable(context.env, "CONVOHOP_MANAGEMENT_URL");
  const url = flag !== undefined ? authorityOrigin(flag, "--management-url") : env !== undefined ? authorityOrigin(env, "CONVOHOP_MANAGEMENT_URL")
    : profile?.managementUrl;
  if (url === undefined) throw new UsageError("Set --management-url or CONVOHOP_MANAGEMENT_URL, or run convohop login");
  return {
    name: "management", projectId: undefined,
    transport: new ConvoHopTransport({ baseUrl: url, credential: token, namespace: "cli:management", fetch: context.fetch }),
  };
}

/** The communication authority origin: --communication-url, else CONVOHOP_COMMUNICATION_URL, else the profile's. */
export async function communicationUrl(context: Context, args: Args): Promise<string | undefined> {
  const flag = args.string("communication-url"), env = variable(context.env, "CONVOHOP_COMMUNICATION_URL");
  if (flag !== undefined) return authorityOrigin(flag, "--communication-url");
  if (env !== undefined) return authorityOrigin(env, "CONVOHOP_COMMUNICATION_URL");
  return (await savedProfile(context, args)).profile?.communicationUrl;
}

/** A UUID option, such as --project. Fails with a usage error that doesn't repeat the value. */
export function uuidOption(args: Args, name: string, fallback?: string): string | undefined {
  const value = args.string(name) ?? fallback;
  if (value !== undefined && !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value))
    throw new UsageError(`--${name} must be a UUID`, args.command);
  return value?.toLowerCase();
}

/**
 * The communication plane of one project: a backend key from CONVOHOP_BACKEND_KEY(_FILE), the project from --project or
 * CONVOHOP_PROJECT_ID and its incarnation from --incarnation or CONVOHOP_INCARNATION. Routes to the project first.
 */
export async function communicationPlane(context: Context, args: Args,
  route: (client: ProjectServerClient) => Promise<void>): Promise<Plane> {
  const backendKey = await environmentSecret(context.env, "CONVOHOP_BACKEND_KEY");
  if (!backendKey)
    throw new UsageError("Communication operations need a backend key: set CONVOHOP_BACKEND_KEY or CONVOHOP_BACKEND_KEY_FILE");
  context.printer.secret(backendKey);
  const projectId = uuidOption(args, "project", variable(context.env, "CONVOHOP_PROJECT_ID"));
  if (projectId === undefined) throw new UsageError("Set --project or CONVOHOP_PROJECT_ID", args.command);
  const incarnation = uuidOption(args, "incarnation", variable(context.env, "CONVOHOP_INCARNATION"));
  if (incarnation === undefined)
    throw new UsageError("Set --incarnation or CONVOHOP_INCARNATION. convohop projects get --project ID shows it", args.command);
  const baseUrl = await communicationUrl(context, args);
  if (baseUrl === undefined)
    throw new UsageError("Set --communication-url or CONVOHOP_COMMUNICATION_URL, or log in with --communication-url", args.command);
  const client = new ProjectServerClient({ baseUrl, projectId, incarnation, backendKey, fetch: context.fetch });
  await route(client);
  return { name: "communication", transport: client.http, projectId: client.projectId };
}
