// The push quickstart's service worker. test/service-worker.test.ts runs it on every Web Push vector in
// spec/push-payload. tsconfig.worker.json compiles it with the WebWorker library instead of the DOM.

// #region service-worker
import { handleNotificationClick, handlePushEvent } from "@convohop/client/push";

declare const self: ServiceWorkerGlobalScope;

self.addEventListener("push", event =>
  handlePushEvent(self.registration, event, {
    // Pushes that aren't ConvoHop notifications end here, including your app's own. Browsers expect every push to
    // show a notification, so show one.
    onError: () => self.registration.showNotification("New activity", { tag: "app-activity" }),
  }),
);

self.addEventListener("notificationclick", event => {
  // Opens the notification's conversation, or focuses a window that already shows it.
  if (handleNotificationClick(self.clients, event, notification => `/conversations/${notification.conversationId}`)) return;
  event.notification.close(); // Your app's own notifications, such as the one above.
  event.waitUntil(self.clients.openWindow("/"));
});
// #endregion service-worker
