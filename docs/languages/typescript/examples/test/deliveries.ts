import { createHmac, randomBytes, randomUUID } from "node:crypto";

export const newSecret = () => `whsec_${randomBytes(32).toString("base64")}`;

// Signs a body the way ConvoHop signs deliveries: Standard Webhooks v1, HMAC-SHA256 over "id.timestamp.body".
export function signDelivery(body: string, secret: string, id = `msg_${randomUUID()}`) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const key = Buffer.from(secret.slice("whsec_".length), "base64");
  const signature = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
  const headers = { "content-type": "application/json", "webhook-id": id, "webhook-timestamp": timestamp,
    "webhook-signature": `v1,${signature}` };
  return { id, headers };
}
