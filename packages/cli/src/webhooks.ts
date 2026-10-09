import { mutate, query } from "./call.js";
import { integerOption, printMutation, requiredId, text, type Command } from "./command.js";
import { CliError, UsageError } from "./output.js";
import { pushTest, pushTestOptions } from "./push.js";
import { managementPlane, uuidOption } from "./session.js";

const project = text("ID", "The project.");
const endpoint = text("ID", "The webhook endpoint.");

const webhooksList: Command = {
  name: "webhooks list",
  summary: "List a project's webhook endpoints and their health.",
  usage: "--project ID",
  options: { project },
  async run(context, args) {
    const projectId = requiredId(args, "project");
    const management = await managementPlane(context, args);
    context.printer.data((await query(context, management, "management.webhookEndpoints", { projectId })).result);
  },
};

const webhooksDeliveries: Command = {
  name: "webhooks deliveries",
  summary: "Show an endpoint's recent deliveries and their attempts.",
  usage: "--project ID --endpoint ID",
  options: { project, endpoint },
  async run(context, args) {
    const projectId = requiredId(args, "project"), endpointId = requiredId(args, "endpoint");
    const management = await managementPlane(context, args);
    context.printer.data((await query(context, management, "management.webhookDeliveries", { projectId, endpointId })).result);
  },
};

const webhooksTail: Command = {
  name: "webhooks tail",
  summary: "Follow an endpoint's deliveries, printing each new or changed delivery as a line of JSON.",
  usage: "--project ID --endpoint ID [--interval SECONDS] [--polls N]",
  details: "Each line is {\"change\": \"new\" or \"changed\", \"delivery\": ...}. The first poll prints every delivery the " +
    "authority returns. webhookDeliveries takes no cursor, so tail follows the one page of recent deliveries that each " +
    "poll returns. Ctrl-C stops it.",
  options: {
    project, endpoint,
    interval: text("SECONDS", "Seconds between polls, from 1 to 300. Default: 5."),
    polls: text("N", "Stop after N polls. Default: follow until interrupted."),
  },
  async run(context, args) {
    const projectId = requiredId(args, "project"), endpointId = requiredId(args, "endpoint");
    const interval = integerOption(args, "interval", 5, 1, 300), polls = integerOption(args, "polls", 0, 1, 1_000_000);
    const management = await managementPlane(context, args);
    let seen = new Map<string, string>(), warned = false;
    try {
      for (let poll = 1; ; poll += 1) {
        const page = (await query(context, management, "management.webhookDeliveries", { projectId, endpointId })).result;
        if (page === null) throw new CliError("The authority returned no deliveries page");
        if (!page.complete && !warned) {
          warned = true;
          context.printer.note(`warning: the authority returned part of the deliveries${page.partialReason ? ` (${page.partialReason})` : ""}`);
        }
        const current = new Map<string, string>();
        for (const delivery of page.items) {
          const state = JSON.stringify(delivery), before = seen.get(delivery.effectId);
          current.set(delivery.effectId, state);
          if (before !== state) context.printer.line({ change: before === undefined ? "new" : "changed", delivery });
        }
        seen = current;
        if (polls !== 0 && poll >= polls) return;
        await context.sleep(interval * 1000);
      }
    } catch (error) {
      // Ctrl-C ends a tail normally.
      if (context.signal.aborted && !(error instanceof CliError)) return;
      throw error;
    }
  },
};

const webhooksReplay: Command = {
  name: "webhooks replay",
  summary: "Redeliver one webhook delivery, or an endpoint's deliveries in a time range, with their original event IDs.",
  usage: "--project ID --endpoint ID (--effect ID | [--since TIME] [--until TIME])",
  details: "Set --effect, or at least one of --since and --until, so that a replay never resends every delivery by " +
    "accident. Receivers deduplicate redeliveries by event ID.",
  options: {
    project, endpoint,
    effect: text("ID", "Redeliver this delivery, by its effectId."),
    since: text("TIME", "The start of the time range."),
    until: text("TIME", "The end of the time range."),
  },
  async run(context, args) {
    const projectId = requiredId(args, "project"), endpointId = requiredId(args, "endpoint");
    const effectId = uuidOption(args, "effect"), since = args.string("since"), until = args.string("until");
    if (effectId === undefined && since === undefined && until === undefined)
      throw new UsageError("Set --effect, --since or --until", args.command);
    if (effectId !== undefined && (since !== undefined || until !== undefined))
      throw new UsageError("--effect redelivers one delivery; don't combine it with --since or --until", args.command);
    const management = await managementPlane(context, args);
    printMutation(context, await mutate(context, management, "management.replayWebhookDeliveries", {
      projectId, endpointId, ...(effectId === undefined ? {} : { effectId }), ...(since === undefined ? {} : { since }),
      ...(until === undefined ? {} : { until }),
    }));
  },
};

const pushTestCommand: Command = {
  name: "push test",
  summary: "Build the push payloads for a signed notification webhook, without sending a push.",
  usage: "[--type TYPE | --event FILE] [--platform PLATFORM...] [--bundle-id ID] [--deliver URL]",
  details: "Signs a sample notification event (or --event's body) as a Standard Webhooks delivery, verifies it with " +
    "webhooks.verify and builds each platform's push request with the @convohop/server push builders. Prints the event, " +
    "the requests and their measured sizes; a null request means the platform sends nothing for the event. Nothing " +
    "reaches a push provider. With --deliver, also posts the signed delivery to your webhook endpoint.",
  options: pushTestOptions,
  run: pushTest,
};

export const webhookCommands: readonly Command[] = [
  webhooksList, webhooksDeliveries, webhooksTail, webhooksReplay, pushTestCommand,
];
