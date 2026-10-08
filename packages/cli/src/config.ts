import { randomUUID } from "node:crypto";
import { mkdir, open, rename, rm, type FileHandle } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import { CliError, UsageError } from "./output.js";

/** Where a profile's portal token is kept: the macOS keychain, the Secret Service (Linux) or credentials.json. */
export type CredentialStore = "keychain" | "secret-service" | "file";
export const credentialStores: readonly CredentialStore[] = ["keychain", "secret-service", "file"];

/** A saved login. The token itself is in the credential store, under credentialRef. */
export interface Profile {
  readonly managementUrl: string;
  readonly communicationUrl?: string;
  readonly credentialStore: CredentialStore;
  readonly credentialRef: string;
}

export interface Config {
  readonly profiles: Readonly<Record<string, Profile>>;
}

export type Environment = Readonly<Record<string, string | undefined>>;

const profileName = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** The profile a command uses: --profile, else CONVOHOP_PROFILE, else default. */
export function selectedProfile(option: string | undefined, env: Environment): string {
  const name = option ?? (env.CONVOHOP_PROFILE || "default");
  if (!profileName.test(name))
    throw new UsageError("A profile name has 1 to 64 letters, digits, dots, dashes or underscores, and starts with a letter or digit");
  return name;
}

/**
 * The directory that holds config.json and credentials.json: CONVOHOP_CONFIG_DIR, else $XDG_CONFIG_HOME/convohop, else
 * the platform's user configuration directory.
 */
export function configDirectory(env: Environment, platform: NodeJS.Platform): string {
  if (env.CONVOHOP_CONFIG_DIR) return env.CONVOHOP_CONFIG_DIR;
  if (env.XDG_CONFIG_HOME && isAbsolute(env.XDG_CONFIG_HOME)) return join(env.XDG_CONFIG_HOME, "convohop");
  if (platform === "darwin") return join(homedir(), "Library", "Application Support", "convohop");
  if (platform === "win32") return join(env.APPDATA || join(homedir(), "AppData", "Roaming"), "convohop");
  return join(homedir(), ".config", "convohop");
}

/** An http(s) origin: https, or http on a loopback host. Returns it without a trailing slash. */
export function authorityOrigin(value: string, source: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new UsageError(`${source} is not a URL`);
  }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback))
    throw new UsageError(`${source} must be an https URL, or http on localhost`);
  if (url.username || url.password || url.search || url.hash || (url.pathname !== "/" && url.pathname !== ""))
    throw new UsageError(`${source} must be an origin, such as https://management.example.com`);
  return url.origin;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseProfile(value: unknown): Profile | undefined {
  if (!isRecord(value)) return undefined;
  const { managementUrl, communicationUrl, credentialStore, credentialRef, ...rest } = value;
  const store = credentialStores.find(item => item === credentialStore);
  if (Object.keys(rest).length || typeof managementUrl !== "string" || typeof credentialRef !== "string" ||
      !uuid.test(credentialRef) || store === undefined ||
      (communicationUrl !== undefined && typeof communicationUrl !== "string")) return undefined;
  try {
    authorityOrigin(managementUrl, "managementUrl");
    if (communicationUrl !== undefined) authorityOrigin(communicationUrl, "communicationUrl");
  } catch {
    return undefined;
  }
  return { managementUrl, ...(communicationUrl === undefined ? {} : { communicationUrl }), credentialStore: store, credentialRef };
}

/** config.json and credentials.json in one directory. */
export class ConfigFiles {
  constructor(readonly directory: string, private readonly platform: NodeJS.Platform) {}

  get configPath(): string {
    return join(this.directory, "config.json");
  }
  get credentialsPath(): string {
    return join(this.directory, "credentials.json");
  }

  /** The saved profiles; none when config.json doesn't exist. */
  async read(): Promise<Config> {
    const value = await this.#readJson(this.configPath, false);
    if (value === undefined) return { profiles: {} };
    const profiles = isRecord(value) && Object.keys(value).length === 1 && isRecord(value.profiles) ? value.profiles : undefined;
    if (!profiles) throw new CliError(`${this.configPath} is not a convohop configuration; fix or delete it`);
    const parsed: Record<string, Profile> = {};
    for (const [name, profile] of Object.entries(profiles)) {
      const valid = profileName.test(name) ? parseProfile(profile) : undefined;
      if (!valid) throw new CliError(`${this.configPath} has an invalid profile; fix or delete it`);
      parsed[name] = valid;
    }
    return { profiles: parsed };
  }

  async write(config: Config): Promise<void> {
    await this.#writePrivate(this.configPath, `${JSON.stringify(config, null, 2)}\n`);
  }

  /** The token stored under ref in credentials.json. Refuses a file that other users can read or that they own. */
  async loadToken(ref: string): Promise<string | undefined> {
    const tokens = await this.#readTokens();
    return Object.hasOwn(tokens, ref) ? tokens[ref] : undefined;
  }

  async saveToken(ref: string, token: string): Promise<void> {
    const tokens = await this.#readTokens();
    await this.#writePrivate(this.credentialsPath, `${JSON.stringify({ tokens: { ...tokens, [ref]: token } }, null, 2)}\n`);
  }

  /** Removes the token stored under ref, and the file once it holds no tokens. */
  async removeToken(ref: string): Promise<void> {
    const tokens = await this.#readTokens();
    if (!Object.hasOwn(tokens, ref)) return;
    const { [ref]: _removed, ...rest } = tokens;
    if (Object.keys(rest).length === 0) await rm(this.credentialsPath, { force: true });
    else await this.#writePrivate(this.credentialsPath, `${JSON.stringify({ tokens: rest }, null, 2)}\n`);
  }

  async #readTokens(): Promise<Record<string, string>> {
    const value = await this.#readJson(this.credentialsPath, true);
    if (value === undefined) return {};
    const tokens = isRecord(value) && Object.keys(value).length === 1 && isRecord(value.tokens) ? value.tokens : undefined;
    if (!tokens || Object.values(tokens).some(token => typeof token !== "string"))
      throw new CliError(`${this.credentialsPath} is not a convohop credentials file; delete it and log in again`);
    return Object.fromEntries(Object.entries(tokens).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  }

  async #readJson(path: string, secret: boolean): Promise<unknown> {
    let handle: FileHandle;
    try {
      handle = await open(path, "r");
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined;
      throw new CliError(`Can't read ${path}`);
    }
    let text: string;
    try {
      if (secret && this.platform !== "win32") {
        const status = await handle.stat();
        const uid = process.getuid?.();
        if ((status.mode & 0o077) !== 0 || (uid !== undefined && status.uid !== uid))
          throw new CliError(`${path} is accessible to other users. Run chmod 600 on it, or delete it and log in again`);
      }
      text = await handle.readFile("utf8");
    } finally {
      await handle.close();
    }
    try {
      return JSON.parse(text);
    } catch {
      // The parser's message can quote the file, and credentials.json holds tokens.
      throw new CliError(`${path} is not valid JSON; fix or delete it`);
    }
  }

  /** Writes text to path atomically, readable only by the current user. */
  async #writePrivate(path: string, text: string): Promise<void> {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const temporary = join(this.directory, `.${randomUUID()}.tmp`);
    try {
      const handle = await open(temporary, "wx", 0o600);
      try {
        await handle.writeFile(text);
        await handle.sync();
      } finally {
        await handle.close();
      }
      await rename(temporary, path);
    } catch (error) {
      await rm(temporary, { force: true });
      throw error;
    }
  }
}
