import type { Args } from "./args.js";
import { mutate, type MutationResult } from "./call.js";
import { flag, integerOption, printMutation, requiredId, text, type Command } from "./command.js";
import { cliOperations, cliScopes, type CliOperation } from "./generated/operations.js";
import { CliError, UsageError } from "./output.js";
import { confirm } from "./prompt.js";
import { SecretFile, awaitDelivery, redeem, type DeliveryRef } from "./redeem.js";
import { communicationUrl, managementPlane, uuidOption, type Context } from "./session.js";

const scopeName = /^[A-Za-z][A-Za-z0-9]{0,39}$/;
const isoTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/;
const units: Readonly<Record<string, number>> = { s: 1, m: 60, h: 3600, d: 86_400 };

function scopeList(args: Args): string[] {
  const given = args.list("scope");
  if (given.length === 0) throw new UsageError("Set at least one --scope. convohop keys scopes lists them", args.command);
  const scopes = new Set<string>();
  for (const scope of given) {
    if (!Object.hasOwn(cliScopes, scope))
      throw new UsageError(`${scopeName.test(scope) ? `Unknown scope ${scope}` : "Unknown scope"}. convohop keys scopes lists them`,
        args.command);
    if (scopes.has(scope)) throw new UsageError(`--scope ${scope} is given more than once`, args.command);
    scopes.add(scope);
  }
  return [...scopes];
}

function expiry(context: Context, args: Args): string {
  const at = args.string("expires-at"), within = args.string("expires-in");
  if ((at === undefined) === (within === undefined)) throw new UsageError("Set --expires-at or --expires-in", args.command);
  let date: Date;
  if (at !== undefined) {
    date = new Date(at);
    if (!isoTime.test(at) || Number.isNaN(date.getTime()))
      throw new UsageError("--expires-at must be an ISO 8601 time with a zone, such as 2027-01-31T00:00:00Z", args.command);
  } else {
    const match = /^([1-9][0-9]{0,5})([smhd])$/.exec(within ?? "");
    const unit = match?.[2] === undefined ? undefined : units[match[2]];
    if (match === null || unit === undefined)
      throw new UsageError("--expires-in must be a number and a unit (s, m, h or d), such as 90d", args.command);
    date = new Date(context.now().getTime() + Number(match[1]) * unit * 1000);
  }
  if (Number.isNaN(date.getTime()) || date.getTime() <= context.now().getTime())
    throw new UsageError("The key must expire in the future", args.command);
  return date.toISOString();
}

function catalogEntry(id: string): CliOperation {
  const operation = Object.hasOwn(cliOperations, id) ? cliOperations[id] : undefined;
  if (operation === undefined) throw new Error(`The operation catalog has no ${id}`);
  return operation;
}

/** Where the issued key's credential delivery is: in the reply, or in the operation the reply or receipt names. */
function issued(result: MutationResult<"management.issueBackendKey">): { delivery?: DeliveryRef; operationId?: string } {
  if (result.kind === "recovered") {
    const operationId = result.resolution.receipt?.operation?.operationId;
    return operationId === undefined ? {} : { operationId };
  }
  const delivery = result.payload.result?.delivery, operationId = result.payload.operation?.operationId;
  return {
    ...(delivery ? { delivery: { deliveryId: delivery.deliveryId, projectId: delivery.projectId } } : {}),
    ...(operationId === undefined ? {} : { operationId }),
  };
}

const out = text("FILE", "Redeem the credential into this new file, created readable only by you. It must not exist.");
const timeout = text("SECONDS", "How long to wait for the credential delivery. Default: 120.");

const keysIssue: Command = {
  name: "keys issue",
  summary: "Issue a backend key for a project and, with --out, redeem it into a file.",
  usage: "--project ID --name NAME --scope SCOPE... (--expires-at TIME | --expires-in DURATION) [--out FILE]",
  details: "convohop never prints the key. With --out, it waits for the key's credential delivery, redeems the key " +
    "into FILE and acknowledges the delivery; redeeming needs the communication authority's URL. Without --out, it " +
    "prints the request and how to redeem the key with convohop redeem.",
  options: {
    project: text("ID", "The project."),
    name: text("NAME", "The key's name."),
    scope: { kind: "list", value: "SCOPE", description: "A scope the key grants. Repeat it for more; convohop keys scopes lists them." },
    "expires-at": text("TIME", "When the key expires, such as 2027-01-31T00:00:00Z."),
    "expires-in": text("DURATION", "When the key expires, from now: a number and s, m, h or d, such as 90d."),
    out, timeout,
  },
  async run(context, args) {
    const projectId = requiredId(args, "project"), name = args.required("name");
    const input = { projectId, name, scopes: scopeList(args), expiresAt: expiry(context, args) };
    const path = args.string("out"), wait = integerOption(args, "timeout", 120, 0, 3600);
    const baseUrl = path === undefined ? undefined : await communicationUrl(context, args);
    if (path !== undefined && baseUrl === undefined)
      throw new UsageError("--out redeems the key from the communication authority: set --communication-url or " +
        "CONVOHOP_COMMUNICATION_URL, or log in with --communication-url", args.command);
    const management = await managementPlane(context, args);
    const file = path === undefined ? undefined : await SecretFile.create(path, args.command);
    try {
      const request = await mutate(context, management, "management.issueBackendKey", input);
      const { delivery, operationId } = issued(request);
      const redeemLater = delivery ? `convohop redeem --delivery ${delivery.deliveryId} --project ${delivery.projectId} --out FILE`
        : operationId ? `convohop redeem --operation ${operationId} --out FILE` : undefined;
      if (file === undefined || baseUrl === undefined) {
        context.printer.data(request);
        if (redeemLater) context.printer.note(`Redeem the key with ${redeemLater}`);
        return;
      }
      if (delivery === undefined && operationId === undefined)
        throw new CliError("The key request succeeded, but the authority returned no operation or credential delivery", 1,
          { requestId: request.requestId });
      try {
        const target = delivery ?? await awaitDelivery(context, management, operationId ?? "", wait);
        if (target.projectId !== projectId) throw new CliError("The credential delivery is for another project");
        context.printer.data({ request, redemption: await redeem(context, management, baseUrl, target, file) });
      } catch (error) {
        const hinted = error instanceof CliError && error.details.next !== undefined;
        context.printer.note(`The key is issued${operationId ? ` (operation ${operationId})` : ""}.` +
          (hinted || !redeemLater ? "" : ` Redeem it with ${redeemLater}`));
        throw error;
      }
    } finally {
      await file?.discard();
    }
  },
};

const redeemCommand: Command = {
  name: "redeem",
  summary: "Redeem a credential delivery, such as a backend key's, into a file, and acknowledge it.",
  usage: "(--operation ID | --delivery ID --project ID) --out FILE [--timeout SECONDS]",
  details: "A delivery can be redeemed once. With --operation, convohop waits for the operation's delivery. The " +
    "credential goes only to FILE; convohop prints its metadata. Redeeming needs the communication authority's URL.",
  options: {
    operation: text("ID", "The operation that issued the credential, such as a key issue."),
    delivery: text("ID", "The credential delivery."),
    project: text("ID", "The delivery's project."),
    out, timeout,
  },
  async run(context, args) {
    const operationId = uuidOption(args, "operation"), deliveryId = uuidOption(args, "delivery");
    const projectId = uuidOption(args, "project"), path = args.required("out");
    if ((operationId === undefined) === (deliveryId === undefined))
      throw new UsageError("Set --operation, or --delivery and --project", args.command);
    if (deliveryId !== undefined && projectId === undefined) throw new UsageError("--delivery needs --project", args.command);
    const wait = integerOption(args, "timeout", 120, 0, 3600);
    const baseUrl = await communicationUrl(context, args);
    if (baseUrl === undefined)
      throw new UsageError("Set --communication-url or CONVOHOP_COMMUNICATION_URL, or log in with --communication-url",
        args.command);
    const management = await managementPlane(context, args);
    const file = await SecretFile.create(path, args.command);
    try {
      const delivery = deliveryId !== undefined && projectId !== undefined ? { deliveryId, projectId }
        : await awaitDelivery(context, management, operationId ?? "", wait);
      if (projectId !== undefined && delivery.projectId !== projectId)
        throw new CliError("The credential delivery is for another project");
      context.printer.data(await redeem(context, management, baseUrl, delivery, file));
    } finally {
      await file.discard();
    }
  },
};

const keysScopes: Command = {
  name: "keys scopes",
  summary: "List the scopes a backend key can grant.",
  usage: "",
  options: {},
  async run(context) {
    context.printer.data(cliScopes);
  },
};

const keysRevoke: Command = {
  name: "keys revoke",
  summary: "Revoke a backend key. Asks first, unless --yes is given.",
  usage: "--project ID --key ID --expected-revision REVISION [--revoke-sessions] [--yes]",
  options: {
    project: text("ID", "The key's project."),
    key: text("ID", "The key."),
    "expected-revision": text("REVISION", "The key's current revision, so a concurrent change fails instead."),
    "revoke-sessions": flag("Also revoke the user sessions the key issued."),
    yes: flag("Don't ask for confirmation."),
  },
  async run(context, args) {
    const projectId = requiredId(args, "project"), keyId = args.required("key");
    const expectedRevision = args.required("expected-revision");
    if (!/^(?:0|[1-9][0-9]{0,30})$/.test(expectedRevision))
      throw new UsageError("--expected-revision must be a whole number", args.command);
    const management = await managementPlane(context, args);
    await confirm(context, args, catalogEntry("management.revokeBackendKey"));
    printMutation(context, await mutate(context, management, "management.revokeBackendKey",
      { projectId, keyId, expectedRevision, revokeIssuedSessions: args.flag("revoke-sessions") }));
  },
};

export const keyCommands: readonly Command[] = [keysIssue, keysScopes, keysRevoke, redeemCommand];
export { catalogEntry };
