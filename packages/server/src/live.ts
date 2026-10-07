import { V1Problem, v1Counter, v1Id, type CommandOptions, type OperationPayload, type PageOptions } from "@convohop/core";
import type { V1ProjectServerClient } from "./project.js";
import { mismatch, pageInput } from "./result.js";

export type LiveSession = OperationPayload<"communication.liveSession">["result"];
export type LiveSessionPage = OperationPayload<"communication.liveSessions">["result"];
export type LiveParticipantPage = OperationPayload<"communication.liveSessionParticipants">["result"];
export type LiveOperation = OperationPayload<"communication.liveSessionOperation">["result"];
export type LiveOperationCompletion = NonNullable<LiveOperation["completion"]>;
export type LiveAlertBatch = OperationPayload<"communication.alertLiveSession">["result"];
export type LiveEndReceipt = OperationPayload<"communication.endLiveSession">;
export interface LiveWaitOptions { signal?: AbortSignal; timeoutMs?: number }

function waitOptions(options: LiveWaitOptions): { deadline: number; signal: AbortSignal | undefined } {
  const timeout = options.timeoutMs ?? 45000;
  if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 300000) throw new RangeError("Wait timeout must be 1..300000 ms");
  return { deadline: Date.now() + timeout, signal: options.signal };
}

async function pause(signal?: AbortSignal): Promise<void> {
  signal?.throwIfAborted();
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { signal?.removeEventListener("abort", aborted); resolve(); }, 500);
    function aborted() { clearTimeout(timer); signal?.removeEventListener("abort", aborted); reject(signal?.reason); }
    signal?.addEventListener("abort", aborted, { once: true });
  });
}

/**
 * Backend view of one live session (`callRead` or `callManage` to read; `callManage` to alert or end). Creating the
 * handle sends no request. Mutations take the generation and revision you observed, so a retry with the same
 * `requestId` resends the original payload.
 */
export class ServerLiveSession {
  constructor(readonly client: V1ProjectServerClient, readonly liveSessionId: string) { v1Id(liveSessionId); }
  async get(): Promise<LiveSession> {
    const session = (await this.client.http.execute("communication.liveSession", this.client.projectId,
      { liveSessionId: this.liveSessionId })).result;
    if (session.liveSessionId !== this.liveSessionId) throw mismatch("Live session");
    return session;
  }
  async participants(options: PageOptions = {}): Promise<LiveParticipantPage> {
    return (await this.client.http.execute("communication.liveSessionParticipants", this.client.projectId,
      { liveSessionId: this.liveSessionId, ...pageInput(options) })).result;
  }
  async alert(input: { expectedGeneration: string; principalIds: readonly string[] },
    options: CommandOptions = {}): Promise<LiveAlertBatch> {
    const batch = (await this.client.http.execute("communication.alertLiveSession", this.client.projectId,
      { liveSessionId: this.liveSessionId, expectedGeneration: v1Counter(input.expectedGeneration),
        principalIds: input.principalIds.map(principalId => v1Id(principalId)) }, options.requestId)).result;
    if (batch.liveSessionId !== this.liveSessionId) throw mismatch("Live alert batch");
    return batch;
  }
  /** Requests the end. The returned operation completes once the authority has enforced the media cutoff. */
  async end(input: { expectedGeneration: string; expectedRevision: string },
    options: CommandOptions = {}): Promise<ServerLiveOperation> {
    const receipt = await this.client.http.execute("communication.endLiveSession", this.client.projectId,
      { liveSessionId: this.liveSessionId, expectedGeneration: v1Counter(input.expectedGeneration),
        expectedRevision: v1Counter(input.expectedRevision) }, options.requestId);
    if (receipt.result.liveSessionId !== this.liveSessionId) throw mismatch("Live end receipt");
    return new ServerLiveOperation(this.client, receipt.result.operationId, receipt);
  }
}

/** A live start or end operation. The first read locks its live session and kind; later reads must match. */
export class ServerLiveOperation {
  readonly operationId: string;
  #scope: { liveSessionId: string; kind: LiveOperation["kind"] } | undefined;
  constructor(readonly client: V1ProjectServerClient, operationId: string, readonly receipt?: LiveEndReceipt) {
    this.operationId = v1Id(operationId);
    if (receipt) this.#scope = { liveSessionId: v1Id(receipt.result.liveSessionId), kind: "END" };
  }
  async get(): Promise<LiveOperation> {
    const operation = (await this.client.http.execute("communication.liveSessionOperation", this.client.projectId,
      { operationId: this.operationId })).result;
    if (operation.operationId !== this.operationId) throw mismatch("Live operation");
    if (this.#scope && (operation.liveSessionId !== this.#scope.liveSessionId || operation.kind !== this.#scope.kind))
      throw new TypeError("Live operation scope changed");
    this.#scope ??= { liveSessionId: operation.liveSessionId, kind: operation.kind };
    return operation;
  }
  /**
   * Polls until the operation completes. An END completion must carry an enforced media cutoff. A failure throws a
   * `V1Problem` with the live error code; the deadline throws `RESOLUTION_REQUIRED`, which is not a cutoff.
   */
  async completed(options: LiveWaitOptions = {}): Promise<LiveOperationCompletion> {
    const { deadline, signal } = waitOptions(options);
    let requestId = this.receipt?.requestId;
    for (;;) {
      signal?.throwIfAborted();
      const operation = await this.get();
      requestId ??= operation.requestId;
      if (operation.state === "COMPLETED") {
        const completion = operation.completion;
        if (!completion || completion.liveSessionId !== operation.liveSessionId ||
            (operation.kind === "END" && completion.mediaCutoff?.state !== "ENFORCED"))
          throw new TypeError("Completed live operation is missing its completion evidence");
        return completion;
      }
      if (operation.state === "FAILED") {
        if (!operation.failure) throw new TypeError("Failed live operation is missing its reason");
        throw new V1Problem(operation.failure.code, requestId, "accepted", 409, operation.failure.message);
      }
      if (operation.state !== "RUNNING") throw new TypeError("Unknown live operation state");
      if (Date.now() >= deadline) throw new V1Problem("RESOLUTION_REQUIRED", requestId, "accepted", 409,
        "Action remains unresolved; retain this operation ID and query it again. Elapsed time is not cutoff.");
      await pause(signal);
    }
  }
}
