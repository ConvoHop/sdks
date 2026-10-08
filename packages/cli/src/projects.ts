import { mutate, query } from "./call.js";
import { printMutation, requiredId, text, type Command } from "./command.js";
import { CliError, UsageError } from "./output.js";
import { communicationPlane, managementPlane } from "./session.js";

const projectOption = text("ID", "The project.");

const projectsGet: Command = {
  name: "projects get",
  summary: "Show a project, with its incarnation and serving region.",
  usage: "--project ID",
  details: "The schema has no operation that lists projects, so name the project.",
  options: { project: projectOption },
  async run(context, args) {
    const projectId = requiredId(args, "project");
    const management = await managementPlane(context, args);
    const project = (await query(context, management, "management.getProject", { projectId })).result;
    if (project === null) throw new CliError(`Project ${projectId} doesn't exist`, 1, { code: "NOT_FOUND" });
    context.printer.data(project);
  },
};

const projectsCreate: Command = {
  name: "projects create",
  summary: "Create a project in a deployment.",
  usage: "--deployment ID --name NAME --environment ENVIRONMENT --backend-principal-name NAME",
  details: "Prints the request's reply. The project is ready when its operation succeeds: convohop operation get.",
  options: {
    deployment: text("ID", "The deployment that hosts the project."),
    name: text("NAME", "The project's name."),
    environment: text("ENVIRONMENT", "The project's environment, such as production."),
    "backend-principal-name": text("NAME", "The name of the project's backend service principal."),
  },
  async run(context, args) {
    const input = {
      deploymentId: requiredId(args, "deployment"), name: args.required("name"), environment: args.required("environment"),
      backendPrincipalName: args.required("backend-principal-name"),
    };
    const management = await managementPlane(context, args);
    printMutation(context, await mutate(context, management, "management.createProject", input));
  },
};

const projectsUsage: Command = {
  name: "projects usage",
  summary: "Show a project's metered usage.",
  usage: "--project ID [--from TIME] [--to TIME]",
  options: {
    project: projectOption,
    from: text("TIME", "The start of the period, as the authority accepts it."),
    to: text("TIME", "The end of the period."),
  },
  async run(context, args) {
    const projectId = requiredId(args, "project"), from = args.string("from"), to = args.string("to");
    const management = await managementPlane(context, args);
    const reply = await query(context, management, "management.projectUsage",
      { projectId, ...(from === undefined ? {} : { from }), ...(to === undefined ? {} : { to }) });
    context.printer.data(reply.result);
  },
};

const operationGet: Command = {
  name: "operation get",
  summary: "Show a management operation, such as a project creation or a key issue, and its steps.",
  usage: "--operation ID",
  options: { operation: text("ID", "The operation.") },
  async run(context, args) {
    const operationId = requiredId(args, "operation");
    const management = await managementPlane(context, args);
    const operation = (await query(context, management, "management.getOperation", { operationId })).result;
    if (operation === null) throw new CliError(`Operation ${operationId} doesn't exist`, 1, { code: "NOT_FOUND" });
    context.printer.data(operation);
  },
};

const resolve: Command = {
  name: "resolve",
  summary: "Look up a request whose outcome is unknown, without sending it again.",
  usage: "--request ID [--plane management|communication] [--project ID] [--incarnation ID]",
  details: "state is committed, accepted or notObservedYet. convohop doesn't keep requests after it exits, so it can't " +
    "resend one; run the command again only when the authority hasn't seen the request.",
  options: {
    request: text("ID", "The request ID that an error reported."),
    plane: text("PLANE", "management (default) or communication."),
    project: text("ID", "Communication requests: the project. Default: CONVOHOP_PROJECT_ID."),
    incarnation: text("ID", "Communication requests: the project's incarnation. Default: CONVOHOP_INCARNATION."),
  },
  async run(context, args) {
    const requestId = requiredId(args, "request"), plane = args.string("plane") ?? "management";
    if (plane !== "management" && plane !== "communication")
      throw new UsageError("--plane must be management or communication", args.command);
    const resolution = plane === "management"
      ? (await query(context, await managementPlane(context, args), "management.resolveRequest", { requestId })).result
      : (await query(context, await communicationPlane(context, args, client => client.initialize()),
        "communication.resolveRequest", { requestId })).result;
    if (resolution === null) throw new CliError("The authority returned no resolution");
    context.printer.data(resolution);
  },
};

export const projectCommands: readonly Command[] = [projectsGet, projectsCreate, projectsUsage, operationGet, resolve];
