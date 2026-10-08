import { createHmac, randomBytes, randomUUID } from "node:crypto";
import {
  PushPayloadError, WebhookVerificationError, push, webhooks, type PushOptions, type WebhookEvent,
  type WebhookNotificationEvent,
} from "@convohop/server";
import { echoable, type Args, type OptionSpecs } from "./args.js";
import { CliError, UsageError } from "./output.js";
import { environmentSecret, readInput, uuidOption, type Context } from "./session.js";

/** The platforms push test builds payloads for, and the @convohop/server builder of each. */
export const platforms = Object.freeze({
  "apns-alert": "apnsAlert", "apns-voip": "apnsVoip", fcm: "fcm", "web-push": "webPush",
} as const);
type Platform = keyof typeof platforms;
const platformNames: readonly Platform[] = ["apns-alert", "apns-voip", "fcm", "web-push"];

const sampleTypes = ["message", "call", "call-cancelled"] as const;
const sampleOnly = ["type", "project", "recipient", "preview-text", "reason"] as const;

/** The largest body webhooks.verify accepts. */
const bodyLimit = 4096;
const secretLimit = 1024;
const deliveryTimeout = 12;

export const pushTestOptions: OptionSpecs = {
  type: { kind: "string", value: "TYPE", description: "The sample notification: message (default), call or call-cancelled." },
  event: { kind: "string", value: "FILE",
    description: "Sign this webhook body, at most 4096 bytes, instead of a sample. - reads standard input." },
  project: { kind: "string", value: "ID", description: "The sample's project. Default: a random UUID." },
  recipient: { kind: "string", value: "ID", description: "The sample's recipient principal. Default: a random UUID." },
  "preview-text": { kind: "string", value: "TEXT", description: "A message sample's preview, as if the project shows previews." },
  reason: { kind: "string", value: "REASON",
    description: "A call-cancelled sample's reason: ended (default), expired, answered or declined." },
  platform: { kind: "list", value: "PLATFORM",
    description: "apns-alert, apns-voip, fcm or web-push. Repeat it for more. Default: fcm and web-push, and both APNs " +
      "platforms with --bundle-id." },
  "bundle-id": { kind: "string", value: "ID", description: "The iOS app's bundle ID, which APNs payloads need." },
  title: { kind: "string", value: "TEXT", description: "The visible title, such as the sender's name." },
  body: { kind: "string", value: "TEXT", description: "The visible body. Replaces a message's preview." },
  "no-preview": { kind: "boolean", description: "Don't show a message's preview as the body." },
  "secret-file": { kind: "string", value: "FILE",
    description: "A file holding the endpoint's whsec_ signing secret. Default: CONVOHOP_WEBHOOK_SECRET or " +
      "CONVOHOP_WEBHOOK_SECRET_FILE, else a new secret for this run." },
  deliver: { kind: "string", value: "URL",
    description: "Also POST the signed delivery to your webhook endpoint: https, or http on localhost. Needs the " +
      "endpoint's secret. The URL is never printed." },
};

function selectedPlatforms(args: Args, bundleId: string | undefined): Platform[] {
  const given = args.list("platform");
  if (given.length === 0) return bundleId === undefined ? ["fcm", "web-push"] : [...platformNames];
  const selected = new Set<Platform>();
  for (const name of given) {
    const platform = platformNames.find(item => item === name);
    if (platform === undefined)
      throw new UsageError(`${echoable.test(name) ? `Unknown platform ${name}` : "Unknown platform"}. Use apns-alert, ` +
        "apns-voip, fcm or web-push", args.command);
    if (selected.has(platform)) throw new UsageError(`--platform ${platform} is given more than once`, args.command);
    if (platform.startsWith("apns-") && bundleId === undefined)
      throw new UsageError(`--platform ${platform} needs --bundle-id`, args.command);
    selected.add(platform);
  }
  return platformNames.filter(platform => selected.has(platform));
}

/** A notification event for a recipient who isn't connected, with new IDs and the current time. */
function sampleEvent(context: Context, args: Args): Record<string, unknown> {
  const name = args.string("type") ?? "message";
  const type = sampleTypes.find(item => item === name);
  if (type === undefined)
    throw new UsageError(`${echoable.test(name) ? `Unknown type ${name}` : "Unknown type"}. Use message, call or call-cancelled`,
      args.command);
  if (type !== "message" && args.has("preview-text"))
    throw new UsageError("--preview-text applies to message samples", args.command);
  if (type !== "call-cancelled" && args.has("reason"))
    throw new UsageError("--reason applies to call-cancelled samples", args.command);
  const now = context.now();
  const fields = {
    eventId: randomUUID(), occurredAt: now.toISOString(),
    projectId: uuidOption(args, "project") ?? randomUUID(), recipientId: uuidOption(args, "recipient") ?? randomUUID(),
    conversationId: randomUUID(), senderId: randomUUID(), connected: false,
  };
  if (type === "message") {
    const messageId = randomUUID(), text = args.string("preview-text");
    return { eventType: "notification.message", ...fields, subjectRef: { id: messageId, kind: "message" }, messageId,
      ...(text === undefined ? {} : { preview: { text, truncated: false } }) };
  }
  const liveSessionId = randomUUID();
  const call = { ...fields, subjectRef: { id: liveSessionId, kind: "liveSession" }, liveSessionId, alertId: randomUUID(),
    expiresAt: new Date(now.getTime() + 30_000).toISOString(), mediaProfile: "AUDIO_VIDEO" };
  return type === "call" ? { eventType: "notification.call", ...call }
    : { eventType: "notification.callCancelled", ...call, reason: args.string("reason") ?? "ended" };
}

type SecretSource = "file" | "environment" | "ephemeral";

async function signingSecret(context: Context, args: Args): Promise<{ secret: string; source: SecretSource }> {
  const path = args.string("secret-file");
  if (path !== undefined) {
    if (path === "-" && args.string("event") === "-")
      throw new UsageError("--event and --secret-file can't both read standard input", args.command);
    const secret = (await readInput(context, path, secretLimit, "--secret-file", args.command)).toString("utf8").trim();
    if (!secret) throw new CliError("--secret-file names an empty file");
    return { secret, source: "file" };
  }
  const secret = await environmentSecret(context.env, "CONVOHOP_WEBHOOK_SECRET");
  if (secret !== undefined) return { secret, source: "environment" };
  return { secret: `whsec_${randomBytes(32).toString("base64")}`, source: "ephemeral" };
}

/** A Standard Webhooks v1 signature. webhooks.verify rejects a malformed secret before the signature is checked. */
function sign(secret: string, webhookId: string, timestamp: number, body: Buffer): string {
  const key = Buffer.from(secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret, "base64");
  return `v1,${createHmac("sha256", key).update(`${webhookId}.${timestamp}.`).update(body).digest("base64")}`;
}

function isNotification(event: WebhookEvent): event is WebhookNotificationEvent {
  return event.known && (event.eventType === "notification.message" || event.eventType === "notification.call" ||
    event.eventType === "notification.callCancelled");
}

type Built = { readonly request: unknown; readonly bytes: number } | null;

/** The UTF-8 size of the JSON a provider limits, as spec/push-payload/vectors.json measures it. */
const size = (value: unknown): number => Buffer.byteLength(JSON.stringify(value), "utf8");

function build(event: WebhookNotificationEvent, platform: Platform, options: PushOptions, bundleId: string): Built {
  try {
    if (platform === "fcm") {
      const request = push.fcm(event, options);
      return request && { request, bytes: size(request.message.data) };
    }
    if (platform === "web-push") {
      const request = push.webPush(event, options);
      return request && { request, bytes: size(request.payload) };
    }
    const apns = { ...options, bundleId };
    const request = platform === "apns-alert" ? push.apnsAlert(event, apns) : push.apnsVoip(event, apns);
    return request && { request, bytes: size(request.payload) };
  } catch (error) {
    if (error instanceof PushPayloadError) throw new CliError(error.message, 1, { code: error.code });
    throw error;
  }
}

function endpoint(value: string, command: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new UsageError("--deliver is not a URL", command);
  }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback))
    throw new UsageError("--deliver must be an https URL, or http on localhost", command);
  if (url.username || url.password) throw new UsageError("--deliver must not contain a user name or password", command);
  url.hash = "";
  return url;
}

async function deliver(context: Context, url: URL, headers: Readonly<Record<string, string>>,
  body: Buffer): Promise<{ status: number; ok: boolean }> {
  let response: Response;
  try {
    response = await context.fetch(url, {
      method: "POST", headers: { "content-type": "application/json", ...headers }, body, redirect: "manual",
      signal: AbortSignal.timeout(deliveryTimeout * 1000),
    });
  } catch (error) {
    if (context.signal.aborted) throw error;
    // Fetch errors can quote the URL, which may carry a token.
    if (error instanceof Error && error.name === "TimeoutError")
      throw new CliError(`The endpoint didn't answer within ${deliveryTimeout} seconds`);
    throw new CliError("Can't reach the endpoint");
  }
  await response.body?.cancel().catch(() => undefined);
  return { status: response.status, ok: response.status >= 200 && response.status < 300 };
}

/**
 * Signs a notification event as a webhook delivery, verifies it with webhooks.verify and builds each platform's push
 * request from it with the @convohop/server push builders, without sending any push. Prints the event, the requests
 * and their measured sizes. With --deliver, also posts the signed delivery to a webhook endpoint.
 */
export async function pushTest(context: Context, args: Args): Promise<void> {
  const command = args.command, eventPath = args.string("event");
  if (eventPath !== undefined)
    for (const name of sampleOnly)
      if (args.has(name)) throw new UsageError(`--${name} sets up a sample; don't combine it with --event`, command);
  const bundleId = args.string("bundle-id");
  const selected = selectedPlatforms(args, bundleId);
  const target = args.string("deliver") === undefined ? undefined : endpoint(args.required("deliver"), command);
  const { secret, source } = await signingSecret(context, args);
  context.printer.secret(secret);
  if (target !== undefined && source === "ephemeral")
    throw new UsageError("--deliver needs the endpoint's secret: set --secret-file, CONVOHOP_WEBHOOK_SECRET or " +
      "CONVOHOP_WEBHOOK_SECRET_FILE", command);

  const body = eventPath === undefined ? Buffer.from(JSON.stringify(sampleEvent(context, args)), "utf8")
    : await readInput(context, eventPath, bodyLimit, "--event", command);
  const now = context.now();
  const webhookId = `msg_${randomUUID().replaceAll("-", "")}`, timestamp = Math.floor(now.getTime() / 1000);
  const headers = { "webhook-id": webhookId, "webhook-timestamp": String(timestamp),
    "webhook-signature": sign(secret, webhookId, timestamp, body) };
  let verified: WebhookEvent;
  try {
    verified = (await webhooks.verify({ headers, body, secrets: secret, now })).event;
  } catch (error) {
    if (error instanceof WebhookVerificationError) throw new CliError(error.message, 1, { code: error.code });
    throw error;
  }
  // webhooks.verify parsed the body as JSON.
  const event: unknown = JSON.parse(body.toString("utf8"));
  // The builders validate the event they get and name its first invalid field, so pass them the body when the
  // verifier didn't recognize it as a notification event.
  const notice = isNotification(verified) ? verified : event as WebhookNotificationEvent;
  const options: PushOptions = { title: args.string("title"), body: args.string("body"), now,
    ...(args.flag("no-preview") ? { preview: false } : {}) };
  const payloads = Object.fromEntries(selected.map(platform =>
    [platforms[platform], build(notice, platform, options, bundleId ?? "")]));

  const output = { webhook: { id: webhookId, timestamp, secretSource: source }, event, payloads };
  if (target === undefined) {
    context.printer.data(output);
    if (source === "ephemeral")
      context.printer.note("Signed with a new secret for this run. Pass --secret-file to sign as your endpoint.");
    return;
  }
  const delivery = await deliver(context, target, headers, body);
  context.printer.data({ ...output, delivery });
  if (!delivery.ok) throw new CliError(`The endpoint answered HTTP ${delivery.status}`, 1, { status: delivery.status });
}
