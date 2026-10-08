import { readFile } from "node:fs/promises";

type Expected = { request: unknown; bytes: number } | null;

// spec/push-payload/vectors.json: notification events, builder options, and the requests each builder must return.
export interface PushVector {
  id: string;
  event: Record<string, unknown> & { eventType: string };
  options: { bundleId: string; title?: string; body?: string; preview?: boolean };
  nowSeconds: number;
  expected: { apnsAlert: Expected; apnsVoip: Expected; fcm: Expected; webPush: Expected };
}

export async function pushVectors(): Promise<PushVector[]> {
  const file = new URL("../../../../../spec/push-payload/vectors.json", import.meta.url);
  return (JSON.parse(await readFile(file, "utf8")) as { vectors: PushVector[] }).vectors;
}
