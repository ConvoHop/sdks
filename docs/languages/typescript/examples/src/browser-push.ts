// The push quickstart's browser snippets. They need a browser with a push service, so the tests only typecheck them.

// #region subscribe
import { subscribePush, unsubscribePush, type PushRegistration } from "@convohop/client/push";

// Run it from a click, such as on a "Turn on notifications" button: subscribing asks for permission, and some
// browsers only ask from a click. Once the user has allowed notifications, also run it when your app starts: it
// reuses the subscription and registers it again, so your backend keeps it current.
export async function enableNotifications(vapidPublicKey: string): Promise<void> {
  const registration = await navigator.serviceWorker.register("/service-worker.js", { type: "module" });
  await subscribePush(registration, { applicationServerKey: vapidPublicKey, register: device => saveDevice("POST", device) });
}

// Run it when the user signs out, before your backend ends their sign-in: your backend forgets this browser, and
// then the browser unsubscribes.
export async function disableNotifications(): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration("/");
  if (registration) await unsubscribePush(registration, device => saveDevice("DELETE", device));
}

// Your backend's endpoint, behind your app's own sign-in. It stores or deletes the signed-in user's device:
// { kind: "webPush", subscription }, where subscription is the browser's PushSubscription.toJSON().
async function saveDevice(method: "POST" | "DELETE", device: PushRegistration): Promise<void> {
  const response = await fetch("/api/push/devices", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(device),
  });
  if (!response.ok) throw new Error(`Saving the device failed with HTTP ${response.status}`);
}
// #endregion subscribe
