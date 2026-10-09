"""Signs deliveries the way ConvoHop does: Standard Webhooks v1, HMAC-SHA256 over "id.timestamp.body"."""

import base64
import hashlib
import hmac
import json
import os
import time
import uuid


def new_secret() -> str:
    return "whsec_" + base64.b64encode(os.urandom(32)).decode()


# A body as ConvoHop sends it: compact JSON, with text left as UTF-8 rather than \u escapes.
def wire_json(event: object) -> str:
    return json.dumps(event, ensure_ascii=False, separators=(",", ":"))


# Returns the webhook ID and the request headers.
def sign_delivery(body: str, secret: str) -> tuple[str, dict[str, str]]:
    webhook_id = f"msg_{uuid.uuid4()}"
    timestamp = str(int(time.time()))
    key = base64.b64decode(secret.removeprefix("whsec_"))
    signature = base64.b64encode(hmac.new(key, f"{webhook_id}.{timestamp}.{body}".encode(), hashlib.sha256).digest())
    return webhook_id, {
        "content-type": "application/json",
        "webhook-id": webhook_id,
        "webhook-timestamp": timestamp,
        "webhook-signature": f"v1,{signature.decode()}",
    }
