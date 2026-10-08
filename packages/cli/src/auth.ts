import { randomUUID } from "node:crypto";
import { ConvoHopTransport } from "@convohop/server";
import type { Args } from "./args.js";
import { query } from "./call.js";
import { flag, text, type Command } from "./command.js";
import { authorityOrigin, credentialStores, selectedProfile, type CredentialStore, type Profile } from "./config.js";
import { CredentialStoreError, loadToken, platformStore, vault } from "./credentials.js";
import { CliError, UsageError } from "./output.js";
import { promptHidden } from "./prompt.js";
import { managementPlane, readLimited, variable, type Context } from "./session.js";

const tokenLimit = 16 * 1024;
/** One line of printable ASCII, as bearer tokens are. */
const tokenShape = /^[\x21-\x7e]+$/;

async function pipedToken(context: Context): Promise<string> {
  let bytes: Buffer | undefined;
  try {
    bytes = await readLimited(context.stdin, tokenLimit);
  } catch {
    throw new CliError("Can't read standard input");
  }
  if (bytes === undefined) throw new CliError(`The portal token must be at most ${tokenLimit} bytes`);
  const token = bytes.toString("utf8").trim();
  if (!token) throw new UsageError("Pipe the portal token to standard input, or run convohop login in a terminal", "login");
  return token;
}

/** The portal token from a hidden prompt at a terminal, or from piped standard input. Never from an argument. */
async function readToken(context: Context): Promise<string> {
  const token = context.stdin.isTTY && context.stdin.setRawMode ? await promptHidden(context, "Portal token: ")
    : await pipedToken(context);
  context.printer.secret(token);
  if (!tokenShape.test(token) || token.length > tokenLimit)
    throw new CliError("The portal token must be one line of printable ASCII characters");
  return token;
}

function storeChoice(args: Args): CredentialStore | "auto" {
  const value = args.string("credential-store") ?? "auto";
  if (value === "auto") return value;
  const store = credentialStores.find(item => item === value);
  if (store === undefined) throw new UsageError("--credential-store must be auto, keychain, secret-service or file", args.command);
  return store;
}

/** Saves the token in the chosen store. auto tries the OS store, then falls back to credentials.json with a warning. */
async function saveToken(context: Context, choice: CredentialStore | "auto", ref: string, profile: string,
  token: string): Promise<CredentialStore> {
  const os = platformStore(context.platform);
  const candidates: CredentialStore[] = choice !== "auto" ? [choice] : os === undefined ? ["file"] : [os, "file"];
  for (const store of candidates) {
    try {
      await vault(store, context.files, context.runCommand).save(ref, profile, token);
      return store;
    } catch (error) {
      if (error instanceof CliError) throw error;
      const reason = error instanceof CredentialStoreError ? error.message : "it failed";
      if (choice !== "auto" || store === "file")
        throw new CliError(`Can't save the portal token in the ${store} credential store: ${reason}`);
      context.printer.note(`warning: can't use the ${store} credential store (${reason}). Saving the token in ` +
        `${context.files.credentialsPath}, readable only by you.`);
    }
  }
  throw new CliError("No credential store is available");
}

function originOption(args: Args, context: Context, option: string, variableName: string): string | undefined {
  const flagValue = args.string(option), envValue = variable(context.env, variableName);
  if (flagValue !== undefined) return authorityOrigin(flagValue, `--${option}`);
  return envValue === undefined ? undefined : authorityOrigin(envValue, variableName);
}

const login: Command = {
  name: "login",
  summary: "Save a portal token for a profile, after checking it with the management authority.",
  usage: "[--management-url URL] [--communication-url URL] [--credential-store STORE] [--no-verify]",
  details: "Type the token at the hidden prompt, or pipe it to standard input; convohop never takes it as an argument " +
    "and never prints it. The token goes to the OS credential store (the macOS keychain or the Secret Service) or, with " +
    "--credential-store file or when no OS store works, to credentials.json in the configuration directory, readable " +
    "only by you. CONVOHOP_CONFIG_DIR moves that directory.",
  options: {
    "credential-store": text("STORE", "auto (default), keychain, secret-service or file."),
    "no-verify": flag("Save the token without checking it with the management authority."),
  },
  async run(context, args) {
    const name = selectedProfile(args.string("profile"), context.env);
    const config = await context.files.read();
    const existing = Object.hasOwn(config.profiles, name) ? config.profiles[name] : undefined;
    const managementUrl = originOption(args, context, "management-url", "CONVOHOP_MANAGEMENT_URL") ?? existing?.managementUrl;
    if (managementUrl === undefined) throw new UsageError("Set --management-url or CONVOHOP_MANAGEMENT_URL", args.command);
    const communicationUrl = originOption(args, context, "communication-url", "CONVOHOP_COMMUNICATION_URL") ??
      existing?.communicationUrl;
    const choice = storeChoice(args);
    const token = await readToken(context);

    let portalIdentity: string | null | undefined;
    if (!args.flag("no-verify")) {
      const transport = new ConvoHopTransport({ baseUrl: managementUrl, credential: token, namespace: "cli:management",
        fetch: context.fetch });
      const reply = await query(context, { name: "management", transport, projectId: undefined }, "management.capabilities", {});
      portalIdentity = reply.result?.portalIdentity ?? null;
    }

    const ref = existing?.credentialRef ?? randomUUID();
    const store = await saveToken(context, choice, ref, name, token);
    const profile: Profile = { managementUrl, ...(communicationUrl === undefined ? {} : { communicationUrl }),
      credentialStore: store, credentialRef: ref };
    try {
      await context.files.write({ profiles: { ...config.profiles, [name]: profile } });
    } catch {
      // The old profile still names its own store; a token saved in another store would be orphaned.
      if (existing?.credentialStore !== store)
        await vault(store, context.files, context.runCommand).remove(ref).catch(() => undefined);
      throw new CliError(`Can't write ${context.files.configPath}`);
    }
    if (existing !== undefined && existing.credentialStore !== store)
      await vault(existing.credentialStore, context.files, context.runCommand).remove(existing.credentialRef).catch(() =>
        context.printer.note(`warning: can't remove the old token from the ${existing.credentialStore} credential store`));
    context.printer.data({ profile: name, managementUrl, ...(communicationUrl === undefined ? {} : { communicationUrl }),
      credentialStore: store, verified: portalIdentity !== undefined,
      ...(portalIdentity === undefined ? {} : { portalIdentity }) });
  },
};

const logout: Command = {
  name: "logout",
  summary: "Remove a profile and its saved portal token.",
  usage: "",
  options: {},
  async run(context, args) {
    const name = selectedProfile(args.string("profile"), context.env);
    const config = await context.files.read();
    const profile = Object.hasOwn(config.profiles, name) ? config.profiles[name] : undefined;
    if (profile === undefined) {
      context.printer.data({ profile: name, loggedOut: false });
      return;
    }
    try {
      await vault(profile.credentialStore, context.files, context.runCommand).remove(profile.credentialRef);
    } catch (error) {
      if (!(error instanceof CredentialStoreError)) throw error;
      throw new CliError(`Can't remove the portal token from the ${profile.credentialStore} credential store: ` +
        `${error.message}. The profile is kept, so you can try again`);
    }
    const { [name]: _removed, ...rest } = config.profiles;
    await context.files.write({ profiles: rest });
    context.printer.data({ profile: name, loggedOut: true });
  },
};

const status: Command = {
  name: "status",
  summary: "Show the profile, the authorities and where the portal token comes from.",
  usage: "[--verify]",
  details: "Doesn't contact the authority unless --verify is given. token is environment, present or missing.",
  options: { verify: flag("Also check the token with the management authority and show its portal identity.") },
  async run(context, args) {
    const name = selectedProfile(args.string("profile"), context.env);
    const { profiles } = await context.files.read();
    const profile = Object.hasOwn(profiles, name) ? profiles[name] : undefined;
    const fromEnvironment = variable(context.env, "CONVOHOP_PORTAL_TOKEN") !== undefined ||
      variable(context.env, "CONVOHOP_PORTAL_TOKEN_FILE") !== undefined;
    const stored = !fromEnvironment && profile !== undefined &&
      await loadToken(vault(profile.credentialStore, context.files, context.runCommand), profile.credentialRef) !== undefined;
    const managementUrl = originOption(args, context, "management-url", "CONVOHOP_MANAGEMENT_URL") ?? profile?.managementUrl;
    const communicationUrl = originOption(args, context, "communication-url", "CONVOHOP_COMMUNICATION_URL") ??
      profile?.communicationUrl;
    const summary = {
      profile: name, loggedIn: profile !== undefined, managementUrl: managementUrl ?? null,
      communicationUrl: communicationUrl ?? null, credentialStore: profile?.credentialStore ?? null,
      token: fromEnvironment ? "environment" : stored ? "present" : "missing",
    };
    if (!args.flag("verify")) {
      context.printer.data(summary);
      return;
    }
    const reply = await query(context, await managementPlane(context, args), "management.capabilities", {});
    context.printer.data({ ...summary, verified: true, portalIdentity: reply.result?.portalIdentity ?? null });
  },
};

export const authCommands: readonly Command[] = [login, logout, status];
