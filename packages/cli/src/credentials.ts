import { spawn } from "node:child_process";
import type { ConfigFiles, CredentialStore } from "./config.js";
import { CliError } from "./output.js";

/** What a program printed and how it exited; code is null when a signal or the timeout ended it. */
export interface CommandResult {
  readonly code: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

/** Runs a program without a shell, writing input to its standard input. Rejects when the program can't start. */
export type CommandRunner = (command: string, args: readonly string[], input: string) => Promise<CommandResult>;

/** Runs the program with a 30-second timeout. */
export const runCommand: CommandRunner = (command, args, input) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"], timeout: 30_000, windowsHide: true });
  const stdout: Buffer[] = [], stderr: Buffer[] = [];
  child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
  child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
  child.on("error", reject);
  child.on("close", code => resolve({ code, stdout: Buffer.concat(stdout).toString("utf8"),
    stderr: Buffer.concat(stderr).toString("utf8") }));
  // A program that exits without reading its input closes the pipe.
  child.stdin.on("error", () => undefined);
  child.stdin.end(input);
});

/** The keychain service and Secret Service attribute that identify convohop's items. */
export const credentialService = "com.convohop.cli";

/** Why an OS credential store failed. It never carries the store's output, which could echo the token. */
export class CredentialStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CredentialStoreError";
  }
}

/** Keeps portal tokens under a reference: a random UUID that each profile keeps across logins. */
export interface Vault {
  readonly store: CredentialStore;
  save(ref: string, profile: string, token: string): Promise<void>;
  load(ref: string): Promise<string | undefined>;
  remove(ref: string): Promise<void>;
}

async function invoke(run: CommandRunner, program: string, args: readonly string[], input = ""): Promise<CommandResult> {
  try {
    return await run(program, args, input);
  } catch {
    throw new CredentialStoreError(`${program} is not available`);
  }
}

const exited = (program: string, result: CommandResult): CredentialStoreError =>
  new CredentialStoreError(result.code === null ? `${program} did not finish` : `${program} exited with code ${result.code}`);

/** The macOS login keychain, through the security tool. */
class KeychainVault implements Vault {
  readonly store = "keychain";
  constructor(private readonly run: CommandRunner) {}

  async save(ref: string, profile: string, token: string): Promise<void> {
    // security -i reads the command from standard input, so the token never appears in a process listing. -X takes the
    // token as hex, which needs no quoting. security -i splits lines of 4095 bytes or more into separate commands.
    const command = `add-generic-password -U -a ${ref} -s ${credentialService} -l convohop-cli/${profile} ` +
      `-X ${Buffer.from(token, "utf8").toString("hex")}\n`;
    if (command.length >= 4000) throw new CredentialStoreError("the token is too long for the keychain");
    const result = await invoke(this.run, "security", ["-i"], command);
    if (result.code !== 0) throw exited("security", result);
    if (await this.load(ref) !== token) {
      await this.remove(ref).catch(() => undefined);
      throw new CredentialStoreError("the keychain returned a different token");
    }
  }
  async load(ref: string): Promise<string | undefined> {
    const result = await invoke(this.run, "security", ["find-generic-password", "-a", ref, "-s", credentialService, "-w"]);
    // 44 is errSecItemNotFound.
    if (result.code === 44) return undefined;
    if (result.code !== 0) throw exited("security", result);
    return result.stdout.replace(/\n$/, "") || undefined;
  }
  async remove(ref: string): Promise<void> {
    const result = await invoke(this.run, "security", ["delete-generic-password", "-a", ref, "-s", credentialService]);
    if (result.code !== 0 && result.code !== 44) throw exited("security", result);
  }
}

/** The freedesktop Secret Service (GNOME Keyring, KWallet), through secret-tool. */
class SecretServiceVault implements Vault {
  readonly store = "secret-service";
  constructor(private readonly run: CommandRunner) {}

  async save(ref: string, profile: string, token: string): Promise<void> {
    // secret-tool reads the secret from standard input.
    const result = await invoke(this.run, "secret-tool",
      ["store", `--label=convohop-cli/${profile}`, "service", credentialService, "account", ref], token);
    if (result.code !== 0) throw exited("secret-tool", result);
    if (await this.load(ref) !== token) {
      await this.remove(ref).catch(() => undefined);
      throw new CredentialStoreError("the Secret Service returned a different token");
    }
  }
  async load(ref: string): Promise<string | undefined> {
    const result = await invoke(this.run, "secret-tool", ["lookup", "service", credentialService, "account", ref]);
    // secret-tool exits with 1 and prints nothing when no item matches.
    if (result.code === 1 && result.stdout === "") return undefined;
    if (result.code !== 0) throw exited("secret-tool", result);
    return result.stdout.replace(/\n$/, "") || undefined;
  }
  async remove(ref: string): Promise<void> {
    const result = await invoke(this.run, "secret-tool", ["clear", "service", credentialService, "account", ref]);
    if (result.code !== 0) throw exited("secret-tool", result);
  }
}

/** credentials.json in the configuration directory, readable only by the current user. */
class FileVault implements Vault {
  readonly store = "file";
  constructor(private readonly files: ConfigFiles) {}

  save(ref: string, _profile: string, token: string): Promise<void> {
    return this.files.saveToken(ref, token);
  }
  load(ref: string): Promise<string | undefined> {
    return this.files.loadToken(ref);
  }
  remove(ref: string): Promise<void> {
    return this.files.removeToken(ref);
  }
}

export function vault(store: CredentialStore, files: ConfigFiles, run: CommandRunner): Vault {
  if (store === "keychain") return new KeychainVault(run);
  if (store === "secret-service") return new SecretServiceVault(run);
  return new FileVault(files);
}

/** The OS store `--credential-store auto` tries first; undefined where convohop supports none. */
export function platformStore(platform: NodeJS.Platform): CredentialStore | undefined {
  if (platform === "darwin") return "keychain";
  if (platform === "win32") return undefined;
  return "secret-service";
}

/** Loads a profile's token, reporting a store failure as a CliError. */
export async function loadToken(store: Vault, ref: string): Promise<string | undefined> {
  try {
    return await store.load(ref);
  } catch (error) {
    if (!(error instanceof CredentialStoreError)) throw error;
    throw new CliError(`Can't read the portal token from the ${store.store} credential store: ${error.message}. ` +
      "Run convohop login again");
  }
}
