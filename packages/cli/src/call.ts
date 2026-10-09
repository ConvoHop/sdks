import { randomUUID } from "node:crypto";
import {
  ConvoHopProblem, operationCatalog, type OperationInput, type OperationKey, type OperationPayload,
} from "@convohop/server";
import { CliError, problemDetails } from "./output.js";
import type { Context, Plane } from "./session.js";

/** A request's resolution: committed, accepted or notObservedYet, with its receipt. */
export type Resolution = NonNullable<OperationPayload<"communication.resolveRequest">["result"]>;

/** The longest retryAfter, in seconds, that the CLI waits out before sending again. */
export const maxWait = 30;

export function isOperationKey(value: string): value is OperationKey {
  return Object.hasOwn(operationCatalog, value);
}

/** Tells the user how to look a request up, instead of sending it again. */
export function resolveHint(plane: Plane, requestId: string): string {
  const where = plane.name === "communication" ? ` --plane communication --project ${plane.projectId ?? "ID"}` : "";
  return `Don't run the command again: that sends a new request. Check it with convohop resolve --request ${requestId}${where}`;
}

/** Unknown outcomes that sending the request again doesn't change. */
export const finalCodes: ReadonlySet<string> = new Set(["RESOLUTION_REQUIRED", "INCARNATION_MISMATCH",
  "IDEMPOTENCY_CONFLICT", "REQUEST_EXPIRED", "RECOVERY_STORAGE_FAILURE"]);

/** Runs send, and again up to twice when the outcome is unknown or the authority asks to wait. */
async function again<T>(context: Context, send: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await send();
    } catch (error) {
      const wait = error instanceof ConvoHopProblem && !finalCodes.has(error.code)
        ? error.retryAfter ?? (error.outcome === "unknown" ? attempt : undefined) : undefined;
      if (wait === undefined || wait > maxWait || attempt >= 3 || context.signal.aborted) throw error;
      await context.sleep(wait * 1000);
    }
  }
}

/** Runs a query, and again with a new request ID when needed. Queries have no effect, so repeating them is safe. */
export function query<K extends OperationKey>(context: Context, plane: Plane, key: K, input: OperationInput<K>): Promise<OperationPayload<K>> {
  if (operationCatalog[key].kind !== "query") throw new TypeError(`${key} isn't a query`);
  return again(context, () => plane.transport.execute(key, plane.projectId, input));
}

/**
 * Sends a mutation whose result only its reply carries, such as a delivery permit, which resolving the request can't
 * return. When the outcome is unknown or the authority asks to wait, sends the same request again, with the same request
 * ID and payload, which the authority deduplicates: up to three times in all, within the transport's retry budget.
 */
export function resend<K extends OperationKey>(context: Context, plane: Plane, key: K, input: OperationInput<K>,
  requestId: string = randomUUID()): Promise<OperationPayload<K>> {
  return again(context, () => plane.transport.execute(key, plane.projectId, input, requestId));
}

/** A mutation's reply, or, when the reply was lost, the resolution that shows the authority has the request. */
export type MutationResult<K extends OperationKey> =
  | { readonly kind: "reply"; readonly requestId: string; readonly payload: OperationPayload<K> }
  | { readonly kind: "recovered"; readonly requestId: string; readonly resolution: Resolution };

function recorded(plane: Plane, requestId: string): boolean {
  return plane.transport.recoveryStates.some(state => state.requestId === requestId);
}

function unknownOutcome(plane: Plane, requestId: string, error: unknown, message: string, exitCode = 3): CliError {
  const details = error instanceof ConvoHopProblem ? problemDetails(error) : {};
  return new CliError(message, exitCode, { ...details, outcome: "unknown", requestId, next: resolveHint(plane, requestId) });
}

function rejected(problem: ConvoHopProblem): CliError {
  const next = problem.outcome === "committed" || problem.outcome === "accepted" ? "The authority has the request. Don't send it again."
    : problem.retryAfter === undefined ? undefined : `The authority asked to wait ${problem.retryAfter} seconds before sending again.`;
  return new CliError(problem.message, 1, problemDetails(problem, next));
}

/**
 * Sends a mutation with a new request ID. When the authority rejects it before any effect and asks to wait, sends the
 * same request again. When the outcome is unknown, resolves the request and, while the authority hasn't seen it, resends
 * it with the same request ID and payload, within the transport's retry budget. Fails with exit code 3 when the outcome
 * stays unknown.
 */
export async function mutate<K extends OperationKey>(context: Context, plane: Plane, key: K,
  input: OperationInput<K>): Promise<MutationResult<K>> {
  const requestId = randomUUID();
  let failure: unknown;
  for (let attempt = 1; ; attempt += 1) {
    try {
      return { kind: "reply", requestId, payload: await plane.transport.execute(key, plane.projectId, input, requestId) };
    } catch (error) {
      failure = error;
      if (!(error instanceof ConvoHopProblem) || error.requestId !== requestId || error.outcome !== "rejected" ||
          error.retryAfter === undefined || error.retryAfter > maxWait || attempt >= 3 || context.signal.aborted) break;
      await context.sleep(error.retryAfter * 1000);
    }
  }
  // The transport records a mutation before sending it, so an unrecorded mutation was never sent.
  if (!recorded(plane, requestId)) throw failure;
  if (context.signal.aborted) throw unknownOutcome(plane, requestId, failure, "Interrupted; the request's outcome is unknown", 130);
  if (failure instanceof ConvoHopProblem && failure.requestId === requestId) {
    if (failure.outcome !== "unknown") throw rejected(failure);
    if (failure.code === "RESOLUTION_REQUIRED") throw unknownOutcome(plane, requestId, failure, failure.message);
  }
  return recover(context, plane, requestId, failure);
}

async function recover<K extends OperationKey>(context: Context, plane: Plane, requestId: string,
  failure: unknown): Promise<MutationResult<K>> {
  let last = failure;
  for (let round = 1; round <= 3; round += 1) {
    const asked = last instanceof ConvoHopProblem ? last.retryAfter : undefined;
    if (asked !== undefined && asked > maxWait) break;
    try {
      await context.sleep((asked ?? 2 ** (round - 1)) * 1000);
    } catch {
      throw unknownOutcome(plane, requestId, last, "Interrupted; the request's outcome is unknown", 130);
    }
    try {
      // Resolves the request and, when the authority hasn't seen it, resends it with the same ID and payload.
      const resolution = await plane.transport.retry(requestId);
      if (resolution.state === "committed" || resolution.state === "accepted") return { kind: "recovered", requestId, resolution };
    } catch (error) {
      last = error;
      if (context.signal.aborted) throw unknownOutcome(plane, requestId, error, "Interrupted; the request's outcome is unknown", 130);
      if (!(error instanceof ConvoHopProblem) || error.code === "RESOLUTION_REQUIRED") break;
      // A problem with this request's ID comes from the resend; others come from the lookup.
      if (error.requestId === requestId && error.outcome === "rejected" && error.retryAfter === undefined) throw rejected(error);
      if (error.outcome !== "unknown" && error.retryAfter === undefined) break;
    }
  }
  throw unknownOutcome(plane, requestId, last, "The request's outcome is unknown");
}
