// The test service worker, written as an app's would be, except that it tells the test page when it has finished
// with a push. Workers don't use the page's import map, so it imports the built module by URL;
// @convohop/client/push imports nothing else.
import { handlePushEvent } from "/packages/client/dist/push.js";

/**
 * Posts "push handled" to the pages once the push's work settles. The test reads notifications only then: Chromium's
 * getNotifications() deletes a notification that it reads while the notification is still being shown.
 */
function reportingWhenHandled(event) {
  return {
    data: event.data,
    waitUntil: work => event.waitUntil(work.finally(async () => {
      for (const client of await self.clients.matchAll({ type: "window", includeUncontrolled: true })) client.postMessage("push handled");
    })),
  };
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("push", event => handlePushEvent(self.registration, reportingWhenHandled(event), {
  // Browsers expect a notification for every push, including ones the handler rejects.
  onError: error => self.registration.showNotification("Couldn't read a notification", { tag: "push-error", body: error.message }),
}));
