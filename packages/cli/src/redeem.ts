import { randomUUID } from "node:crypto";
import { open, rm, type FileHandle } from "node:fs/promises";
import { resolve } from "node:path";
import { ConvoHopProblem, ConvoHopTransport, parseObject, type ProtocolObject } from "@convohop/server";
import { maxWait, query, read } from "./call.js";
import { CliError, UsageError, problemDetails, type ErrorDetails } from "./output.js";
import type { Context, Plane } from "./session.js";

/** Seconds between polls of an operation that has no credential delivery yet. */
export const pollInterval = 2;

/** A credential delivery, such as a backend key's, and its project. */
export interface DeliveryRef {
  readonly deliveryId: string;
  readonly projectId: string;
}

/** A redeemed credential's metadata. The credential itself is only in the file. */
export interface Redemption {
  readonly deliveryId: string;
  readonly kind: string;
  readonly keyId: string | null;
  readonly backendPrincipalId: string | null;
  readonly endpointId: string | null;
  readonly secretVersion: string | null;
  readonly expiresAt: string | null;
  /** The file that holds the credential. */
  readonly file: string;
  /** Whether the authority confirmed that the credential arrived. */
  readonly acknowledged: boolean;
}

const reissue = "If no one has the credential, revoke the key or rotate the webhook secret, then issue a new one.";
const consumed = new Set(["DELIVERY_CONSUMED", "CREDENTIAL_DELIVERY_EXPIRED"]);
/** Unknown outcomes that waiting doesn't change. */
const final = new Set(["RESOLUTION_REQUIRED", "INCARNATION_MISMATCH", "IDEMPOTENCY_CONFLICT", "REQUEST_EXPIRED",
  "RECOVERY_STORAGE_FAILURE"]);

function redeemAgain(delivery: DeliveryRef): string {
  return "The credential may be redeemed but not received. Run convohop redeem --delivery " +
    `${delivery.deliveryId} --project ${delivery.projectId} --out FILE; if it reports DELIVERY_CONSUMED: ${reissue}`;
}

/** A new file, readable only by the current user, that receives one credential. */
export class SecretFile {
  #handle: FileHandle | undefined;
  private constructor(readonly path: string, handle: FileHandle) {
    this.#handle = handle;
  }

  /** Creates the file, which must not exist yet, so that no request is sent when it can't be written. */
  static async create(path: string, command: string): Promise<SecretFile> {
    if (path === "-") throw new UsageError("--out must name a file: convohop never prints credentials", command);
    const absolute = resolve(path);
    try {
      return new SecretFile(absolute, await open(absolute, "wx", 0o600));
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "EEXIST")
        throw new UsageError(`${absolute} already exists. Name a new file for the credential`, command);
      throw new CliError(`Can't create ${absolute}`);
    }
  }

  /** Writes the credential and a newline, then flushes and closes the file. Deletes the file when that fails. */
  async write(credential: string): Promise<void> {
    const handle = this.#handle;
    if (handle === undefined) throw new Error("The credential file is closed");
    this.#handle = undefined;
    try {
      await handle.writeFile(`${credential}\n`);
      await handle.datasync();
      await handle.close();
    } catch (error) {
      await handle.close().catch(() => undefined);
      await rm(this.path, { force: true });
      throw error;
    }
  }

  /** Deletes the file unless it holds a credential. */
  async discard(): Promise<void> {
    const handle = this.#handle;
    if (handle === undefined) return;
    this.#handle = undefined;
    await handle.close().catch(() => undefined);
    await rm(this.path, { force: true });
  }
}

/**
 * Polls a long-running operation, such as a backend key issue, until it has a credential delivery. Fails when the
 * operation is blocked, or still has no delivery after timeout seconds.
 */
export async function awaitDelivery(context: Context, management: Plane, operationId: string,
  timeout: number): Promise<DeliveryRef> {
  for (let waited = 0; ; waited += pollInterval) {
    const operation = (await query(context, management, "management.getOperation", { operationId })).result;
    if (operation === null) throw new CliError(`Operation ${operationId} doesn't exist`);
    const delivery = operation.result?.delivery;
    if (delivery) return { deliveryId: delivery.deliveryId, projectId: delivery.projectId };
    if (operation.blockedReason !== null)
      throw new CliError(`Operation ${operationId} is blocked: ${operation.blockedReason}`, 1,
        { next: `convohop operation get --operation ${operationId}` });
    if (waited >= timeout)
      throw new CliError(`Operation ${operationId} has no credential delivery after ${timeout} seconds (state ${operation.state})`,
        1, { next: `Wait, then run convohop redeem --operation ${operationId} --out FILE` });
    await context.sleep(pollInterval * 1000);
  }
}

/** The project's incarnation and serving epoch, which credential delivery requests carry instead of a route. */
async function projectRoute(context: Context, management: Plane,
  projectId: string): Promise<{ incarnation: string; servingEpoch: string }> {
  const project = (await query(context, management, "management.getProject", { projectId })).result;
  if (project === null) throw new CliError(`Project ${projectId} doesn't exist`);
  return { incarnation: project.incarnation, servingEpoch: project.servingEpoch };
}

/** A permit that authorizes one redemption, identified by redemptionRequestId, and its acknowledgement. */
async function requestPermit(context: Context, management: Plane, delivery: DeliveryRef,
  redemptionRequestId: string): Promise<ProtocolObject> {
  const { result } = await read(context, () => management.transport.execute("management.credentialPermit", undefined,
    { projectId: delivery.projectId, deliveryId: delivery.deliveryId, redemptionRequestId }));
  try {
    return parseObject(result);
  } catch {
    throw new CliError("The management authority returned no delivery permit");
  }
}

type Sent<T> =
  | { readonly ok: true; readonly payload: T }
  | { readonly ok: false; readonly error: unknown; readonly uncertain: boolean };
/** Sends one delivery request with the current permit. */
type DeliveryRequest<T> = (transport: ConvoHopTransport, permit: ProtocolObject) => Promise<T>;

/** Sends the delivery's redemption and acknowledgement, routing and renewing the permit as the authority asks. */
class DeliveryRoute {
  constructor(
    private readonly context: Context,
    private readonly management: Plane,
    private readonly transport: ConvoHopTransport,
    private readonly delivery: DeliveryRef,
    private readonly redemptionRequestId: string,
    private permit: ProtocolObject,
  ) {}

  async #renew(): Promise<void> {
    this.permit = await requestPermit(this.context, this.management, this.delivery, this.redemptionRequestId);
  }

  async #reroute(): Promise<void> {
    const route = await projectRoute(this.context, this.management, this.delivery.projectId);
    if (route.incarnation !== this.transport.incarnation)
      throw new CliError("The project's incarnation changed, so the delivery can't be redeemed", 1, { next: reissue });
    this.transport.servingEpoch = route.servingEpoch;
  }

  /**
   * Sends request, and again with the same request ID, up to three times in all, after WRONG_REGION, an expired permit,
   * a requested wait or an unknown outcome. An unknown outcome needs a new permit.
   */
  async send<T>(request: DeliveryRequest<T>): Promise<Sent<T>> {
    let uncertain = false;
    for (let attempt = 1; ; attempt += 1) {
      let problem: ConvoHopProblem;
      try {
        return { ok: true, payload: await request(this.transport, this.permit) };
      } catch (error) {
        if (!(error instanceof ConvoHopProblem)) return { ok: false, error, uncertain: true };
        problem = error;
      }
      if (problem.outcome === "unknown") uncertain = true;
      if (attempt >= 3 || this.context.signal.aborted) return { ok: false, error: problem, uncertain };
      try {
        if (problem.code === "WRONG_REGION") await this.#reroute();
        else if (problem.code === "PERMIT_EXPIRED") await this.#renew();
        else {
          const wait = problem.retryAfter ??
            (problem.outcome === "unknown" && !final.has(problem.code) ? attempt : undefined);
          if (wait === undefined || wait > maxWait) return { ok: false, error: problem, uncertain };
          await this.context.sleep(wait * 1000);
          if (problem.outcome === "unknown") await this.#renew();
        }
      } catch (error) {
        return { ok: false, error, uncertain };
      }
    }
  }
}

function redeemFailure(context: Context, failed: { error: unknown; uncertain: boolean }, delivery: DeliveryRef): unknown {
  const { error, uncertain } = failed;
  const details: ErrorDetails = error instanceof ConvoHopProblem ? problemDetails(error) : {};
  if (context.signal.aborted)
    return new CliError("Interrupted while redeeming the credential", 130,
      uncertain ? { ...details, outcome: "unknown", next: redeemAgain(delivery) } : details);
  if (uncertain)
    return new CliError("The redemption's outcome is unknown", 3, { ...details, outcome: "unknown", next: redeemAgain(delivery) });
  if (error instanceof ConvoHopProblem)
    return new CliError(error.message, 1, problemDetails(error, consumed.has(error.code) ? reissue : undefined));
  return error;
}

/**
 * Redeems a credential delivery into file, then acknowledges it. The credential goes only to the file. When the
 * acknowledgement fails, warns on stderr and reports acknowledged: false; the credential is still saved.
 */
export async function redeem(context: Context, management: Plane, baseUrl: string, delivery: DeliveryRef,
  file: SecretFile): Promise<Redemption> {
  const route = await projectRoute(context, management, delivery.projectId);
  const transport = new ConvoHopTransport({ baseUrl, namespace: "cli:delivery", incarnation: route.incarnation,
    fetch: context.fetch });
  transport.servingEpoch = route.servingEpoch;
  const redemptionRequestId = randomUUID();
  const channel = new DeliveryRoute(context, management, transport, delivery, redemptionRequestId,
    await requestPermit(context, management, delivery, redemptionRequestId));

  const { deliveryId, projectId } = delivery, redeemRequestId = randomUUID(), acknowledgeRequestId = randomUUID();
  const redeemed = await channel.send((sender, permit) =>
    sender.execute("communication.redeemCredential", projectId, { deliveryId }, redeemRequestId, permit));
  if (!redeemed.ok) throw redeemFailure(context, redeemed, delivery);
  const capsule = redeemed.payload.result;
  const values = [capsule?.backendKey, capsule?.secret].filter((value): value is string => typeof value === "string" && value !== "");
  values.forEach(value => context.printer.secret(value));
  const [credential] = values;
  if (capsule === null || credential === undefined || values.length !== 1)
    throw new CliError("The credential delivery returned no usable credential", 1, { next: reissue });
  try {
    await file.write(credential);
  } catch {
    throw new CliError(`Can't write the credential to ${file.path}; the delivery is redeemed`, 1, { next: reissue });
  }

  const acknowledgement = await channel.send((sender, permit) =>
    sender.execute("communication.acknowledgeCredential", projectId, { deliveryId }, acknowledgeRequestId, permit));
  const acknowledged = acknowledgement.ok && acknowledgement.payload.result?.deliveryId === delivery.deliveryId &&
    acknowledgement.payload.result.acknowledged;
  if (!acknowledged) {
    if (context.signal.aborted)
      throw new CliError(`Interrupted; the credential is saved in ${file.path}, but its delivery isn't acknowledged`, 130);
    const code = acknowledgement.ok ? "NOT_ACKNOWLEDGED"
      : acknowledgement.error instanceof ConvoHopProblem ? acknowledgement.error.code : "FAILED";
    context.printer.note(`warning: the credential is saved, but its delivery isn't acknowledged (${code})`);
  }
  return {
    deliveryId: delivery.deliveryId, kind: capsule.kind, keyId: capsule.keyId, backendPrincipalId: capsule.backendPrincipalId,
    endpointId: capsule.endpointId, secretVersion: capsule.secretVersion, expiresAt: capsule.expiresAt, file: file.path,
    acknowledged,
  };
}
