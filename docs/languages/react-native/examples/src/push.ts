// Push notifications quickstart snippets. test/push.test.ts runs them on Node.js with stand-ins for the package's
// native modules, which answer the way its iOS and Android code does, and with your backend's endpoints on a local
// HTTP server. messageText runs against the conformance mock.

// #region register
import type { ConvoHopClient } from "@convohop/client";
import {
  registerForPush,
  requestPushPermission,
  setPushRecipient,
  type NativePushRegistration,
} from "@convohop/react-native";
import type { Backend } from "./client.ts";

export interface Push {
  // true once your backend stored the APNs token (iOS) or the FCM registration (Android), false if that failed or
  // push stopped first.
  readonly registered: Promise<boolean>;
  // Stops registering, and resolves once it stopped.
  stop(): Promise<void>;
}

// After connectUser, at every launch. The app works without pushes, so this registers in the background.
export function startPush(client: ConvoHopClient, backend: Backend): Push {
  const registering = new AbortController();
  const registered = (async () => {
    // From now on, the device shows and rings only this user's pushes, even one that starts the app before
    // JavaScript runs.
    await setPushRecipient({ projectId: client.projectId, recipientId: client.principalId });
    await registerForPush({
      register: registration => sendRegistration(backend, "POST", registration),
      unregister: registration => sendRegistration(backend, "DELETE", registration), // Android, when FCM ends one.
      onError: error => console.warn("A push registration failed", error), // The next launch offers it again.
      signal: registering.signal,
    });
    return true;
  })().catch((error: unknown) => {
    if (!registering.signal.aborted) console.warn("Couldn't register for push notifications", error);
    return false;
  });
  return {
    registered,
    async stop() {
      registering.abort(); // registerForPush stops at once, even while it waits for the platform or your backend.
      await registered;
    },
  };
}

// Your backend's endpoint for the signed-in user's devices. It stores each registration idempotently, keyed by its
// token or FID, for the sign-in that sent it, and deletes it when that sign-in ends.
async function sendRegistration(
  backend: Backend,
  method: "POST" | "DELETE",
  registration: NativePushRegistration,
): Promise<void> {
  const response = await fetch(`${backend.url}/push-registrations`, {
    method,
    headers: { "content-type": "application/json", authorization: `Bearer ${backend.appToken}` },
    body: JSON.stringify(registration),
  });
  if (!response.ok) throw new Error(`Push registration failed with HTTP ${response.status}`);
}

// When it suits your app, such as when the user turns notifications on. It asks the user once, and afterwards resolves
// what they chose. "provisional" is iOS's quiet delivery to Notification Center.
export async function allowNotifications(): Promise<boolean> {
  const permission = await requestPushPermission();
  return permission === "granted" || permission === "provisional";
}
// #endregion register

// #region open
import type { PushNotification } from "@convohop/client/push";
import { onNotification, takeInitialNotification, type NotificationResponse } from "@convohop/react-native";

// A device keeps its registrations across sign-ins, so a push for an earlier user can still arrive.
export const isFor = (client: ConvoHopClient, { projectId, recipientId }: PushNotification): boolean =>
  projectId === client.projectId && recipientId === client.principalId;

// Opens the conversation of each notification that the user taps, including the one that launched the app. Call it
// once the user is signed in, and the function it returns at sign-out.
export function openNotifications(client: ConvoHopClient, open: (conversationId: string) => void): () => void {
  let listening = true;
  const handle = ({ action, notification }: NotificationResponse) => {
    if (!listening || !isFor(client, notification)) return;
    // A message, an incoming call or a missed call. The system call UI answers calls itself.
    if (action === "opened") open(notification.conversationId);
    // "received": a push arrived while the app was running, and the native code presented it. Refresh the screen.
  };
  const stopListening = onNotification(handle);
  takeInitialNotification().then(
    response => {
      if (response) handle(response);
    },
    (error: unknown) => console.warn("Couldn't read the notification that launched the app", error),
  );
  return () => {
    listening = false;
    stopListening();
  };
}
// #endregion open

// #region message-text
import type { MessagePushNotification } from "@convohop/client/push";

// A message push's text, for example for a banner in the app. Message previews are off by default, so a push carries
// no text unless the project turned them on or your backend set a body. Then this reads the message.
export async function messageText(
  client: ConvoHopClient,
  notification: MessagePushNotification,
): Promise<string | undefined> {
  const { body, conversationId, messageId } = notification;
  return body ?? (await client.getMessage(conversationId, messageId)).text ?? undefined;
}
// #endregion message-text

// #region sign-out
import { Platform } from "react-native";
import { unregisterFromPush } from "@convohop/react-native";

// When the user signs out, before you sign out with your backend, which deletes the push registrations that it stored
// for this sign-in. Then sign out as the client quickstart shows.
export async function stopPush(push: Push): Promise<void> {
  await push.stop();
  const warn = (error: unknown) => console.warn("Couldn't stop push notifications", error); // Sign out anyway.
  // The device drops every ConvoHop push from now on, including those your backend sends before it deletes the
  // registrations.
  await setPushRecipient(null).catch(warn);
  // Android: FCM stops sending to this device, even if your backend can't be reached. iOS can't unregister: Apple
  // advises against it, and the APNs and PushKit tokens don't change between users.
  if (Platform.OS === "android") await unregisterFromPush().catch(warn);
}
// #endregion sign-out
