// The test service worker, written as an app's would be. Workers don't use the page's import map, so it imports
// the built module by URL; @convohop/client/push imports nothing else.
import { handlePushEvent } from "/packages/client/dist/push.js";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("push", event => handlePushEvent(self.registration, event, {
  // Browsers expect a notification for every push, including ones the handler rejects.
  onError: error => self.registration.showNotification("Couldn't read a notification", { tag: "push-error", body: error.message }),
}));
