# `@convohop/client/push`

Web Push for browsers and service workers: subscribe a browser, then show and open the notifications your backend sends. It ships with the client SDK.

**Layer:** Client. **Runtime:** Current browsers and their service workers. No dependencies. **Source:** `packages/client`.

## Classes

### `NotificationHandler` class

```ts
class NotificationHandler
```

Decides how to present pushes. It remembers recent events and stopped rings, so it recognizes duplicates and stops
a call whose cancellation arrived first. A service worker keeps this memory only while it runs.

#### `NotificationHandler.handle` method

```ts
handle(payload: unknown, now?: number): NotificationAction
```

Validates a push, recognizes duplicates by `eventId`, and treats a call as stopped once a cancellation of its ring
arrived (in either order) or its `expiresAt` passed. Throws a `TypeError` for a payload that isn't a valid
notification. `now` is in milliseconds.

## Interfaces

### `CallCancelledPushNotification` interface

```ts
interface CallCancelledPushNotification extends PushNotificationFields
```

#### `CallCancelledPushNotification.eventType` property

```ts
eventType: "notification.callCancelled"
```

#### `CallCancelledPushNotification.liveSessionId` property

```ts
liveSessionId: string
```

#### `CallCancelledPushNotification.alertId` property

```ts
alertId: string
```

The ring that stopped.

#### `CallCancelledPushNotification.expiresAt` property

```ts
expiresAt: string
```

#### `CallCancelledPushNotification.mediaProfile` property

```ts
mediaProfile: string
```

#### `CallCancelledPushNotification.reason` property

```ts
reason: string
```

`answered`, `declined`, `ended`, `expired` or a later reason.

#### `CallCancelledPushNotification.eventId` property

```ts
eventId: string
```

Identifies the event across retries and replays of its webhook.

Inherited from `PushNotificationFields`.

#### `CallCancelledPushNotification.occurredAt` property

```ts
occurredAt: string
```

Inherited from `PushNotificationFields`.

#### `CallCancelledPushNotification.projectId` property

```ts
projectId: string
```

Inherited from `PushNotificationFields`.

#### `CallCancelledPushNotification.recipientId` property

```ts
recipientId: string
```

Inherited from `PushNotificationFields`.

#### `CallCancelledPushNotification.conversationId` property

```ts
conversationId: string
```

Inherited from `PushNotificationFields`.

#### `CallCancelledPushNotification.senderId` property

```ts
senderId: string
```

Inherited from `PushNotificationFields`.

#### `CallCancelledPushNotification.title` property

```ts
title?: string
```

The visible title your backend set, if any.

Inherited from `PushNotificationFields`.

#### `CallCancelledPushNotification.body` property

```ts
body?: string
```

The visible body your backend set, if any.

Inherited from `PushNotificationFields`.

### `CallPushNotification` interface

```ts
interface CallPushNotification extends PushNotificationFields
```

#### `CallPushNotification.eventType` property

```ts
eventType: "notification.call"
```

#### `CallPushNotification.liveSessionId` property

```ts
liveSessionId: string
```

#### `CallPushNotification.alertId` property

```ts
alertId: string
```

Identifies this ring. A later ring of the same call has a new `alertId`.

#### `CallPushNotification.expiresAt` property

```ts
expiresAt: string
```

When the ring stops if nobody answers.

#### `CallPushNotification.mediaProfile` property

```ts
mediaProfile: string
```

`AUDIO_ONLY`, `AUDIO_VIDEO` or a later profile.

#### `CallPushNotification.eventId` property

```ts
eventId: string
```

Identifies the event across retries and replays of its webhook.

Inherited from `PushNotificationFields`.

#### `CallPushNotification.occurredAt` property

```ts
occurredAt: string
```

Inherited from `PushNotificationFields`.

#### `CallPushNotification.projectId` property

```ts
projectId: string
```

Inherited from `PushNotificationFields`.

#### `CallPushNotification.recipientId` property

```ts
recipientId: string
```

Inherited from `PushNotificationFields`.

#### `CallPushNotification.conversationId` property

```ts
conversationId: string
```

Inherited from `PushNotificationFields`.

#### `CallPushNotification.senderId` property

```ts
senderId: string
```

Inherited from `PushNotificationFields`.

#### `CallPushNotification.title` property

```ts
title?: string
```

The visible title your backend set, if any.

Inherited from `PushNotificationFields`.

#### `CallPushNotification.body` property

```ts
body?: string
```

The visible body your backend set, if any.

Inherited from `PushNotificationFields`.

### `MessagePushNotification` interface

```ts
interface MessagePushNotification extends PushNotificationFields
```

#### `MessagePushNotification.eventType` property

```ts
eventType: "notification.message"
```

#### `MessagePushNotification.messageId` property

```ts
messageId: string
```

#### `MessagePushNotification.eventId` property

```ts
eventId: string
```

Identifies the event across retries and replays of its webhook.

Inherited from `PushNotificationFields`.

#### `MessagePushNotification.occurredAt` property

```ts
occurredAt: string
```

Inherited from `PushNotificationFields`.

#### `MessagePushNotification.projectId` property

```ts
projectId: string
```

Inherited from `PushNotificationFields`.

#### `MessagePushNotification.recipientId` property

```ts
recipientId: string
```

Inherited from `PushNotificationFields`.

#### `MessagePushNotification.conversationId` property

```ts
conversationId: string
```

Inherited from `PushNotificationFields`.

#### `MessagePushNotification.senderId` property

```ts
senderId: string
```

Inherited from `PushNotificationFields`.

#### `MessagePushNotification.title` property

```ts
title?: string
```

The visible title your backend set, if any.

Inherited from `PushNotificationFields`.

#### `MessagePushNotification.body` property

```ts
body?: string
```

The visible body your backend set, if any.

Inherited from `PushNotificationFields`.

### `NotificationAction` interface

```ts
interface NotificationAction
```

#### `NotificationAction.kind` property

```ts
kind: NotificationKind
```

#### `NotificationAction.notification` property

```ts
notification: PushNotification
```

#### `NotificationAction.tag` property

```ts
tag: string
```

A stable notification ID: the message ID for messages, and for calls the ring's collapse key (its `alertId`
without hyphens). Presenting a notification with the same tag replaces the earlier one.

#### `NotificationAction.duplicate` property

```ts
duplicate: boolean
```

Whether this event was already handled. Delivery is at least once, so the same event can arrive again.

### `WebClients` interface

```ts
interface WebClients
```

The parts of a service worker's `clients` these helpers use.

#### `WebClients.matchAll` method

```ts
matchAll(options: {
    type: "window";
    includeUncontrolled: boolean;
}): Promise<readonly WindowClientLike[]>
```

#### `WebClients.openWindow` method

```ts
openWindow(url: string): Promise<unknown>
```

### `WebNotification` interface

```ts
interface WebNotification
```

A notification to show with `ServiceWorkerRegistration.showNotification`.

#### `WebNotification.title` property

```ts
title: string
```

#### `WebNotification.options` property

```ts
options: NotificationOptions
```

### `WebNotificationClickEvent` interface

```ts
interface WebNotificationClickEvent
```

The parts of a service worker `notificationclick` event these helpers use.

#### `WebNotificationClickEvent.notification` property

```ts
readonly notification: { … }
```

##### `WebNotificationClickEvent.notification.data` property

```ts
readonly data: unknown
```

##### `WebNotificationClickEvent.notification.tag` property

```ts
readonly tag: string
```

##### `WebNotificationClickEvent.notification.close` method

```ts
close(): void
```

#### `WebNotificationClickEvent.action` property

```ts
readonly action?: string
```

#### `WebNotificationClickEvent.waitUntil` method

```ts
waitUntil(promise: Promise<unknown>): void
```

### `WebPushEvent` interface

```ts
interface WebPushEvent
```

The parts of a service worker `push` event these helpers use.

#### `WebPushEvent.data` property

```ts
readonly data: {
    json(): unknown;
} | null
```

#### `WebPushEvent.waitUntil` method

```ts
waitUntil(promise: Promise<unknown>): void
```

### `WebPushEventOptions` interface

```ts
interface WebPushEventOptions extends WebPushHandlerOptions
```

#### `WebPushEventOptions.onError` property

```ts
onError?: (error: Error) => Promise<void> | void
```

Receives payloads that aren't ConvoHop notifications and failures to show them. The event waits for it, so it
can show a notification of its own: browsers expect one for every push.

#### `WebPushEventOptions.handler` property

```ts
handler?: NotificationHandler
```

Decides what to show. Default: the handler `handleNotification` uses.

Inherited from `WebPushHandlerOptions`.

#### `WebPushEventOptions.render` property

```ts
render?: (action: NotificationAction) => WebNotification
```

Builds the notification to show. Default `defaultWebNotification`.

Inherited from `WebPushHandlerOptions`.

### `WebPushHandlerOptions` interface

```ts
interface WebPushHandlerOptions
```

#### `WebPushHandlerOptions.handler` property

```ts
handler?: NotificationHandler
```

Decides what to show. Default: the handler `handleNotification` uses.

#### `WebPushHandlerOptions.render` property

```ts
render?: (action: NotificationAction) => WebNotification
```

Builds the notification to show. Default `defaultWebNotification`.

### `WebPushSubscribeOptions` interface

```ts
interface WebPushSubscribeOptions
```

#### `WebPushSubscribeOptions.applicationServerKey` property

```ts
applicationServerKey: string | Uint8Array
```

Your VAPID public key, as base64url or bytes. Your backend signs pushes with its private key.

#### `WebPushSubscribeOptions.register` property

```ts
register: (registration: PushRegistration) => Promise<void> | void
```

Stores the registration with your backend, for the signed-in user, so it can send pushes to this browser.
Called on every subscribe, so your backend can refresh what it stored.

### `WebPushSubscription` interface

```ts
interface WebPushSubscription
```

A Web Push subscription, as `PushSubscription.toJSON()` returns it.

#### `WebPushSubscription.endpoint` property

```ts
readonly endpoint?: string
```

#### `WebPushSubscription.expirationTime` property

```ts
readonly expirationTime?: number | null
```

#### `WebPushSubscription.keys` property

```ts
readonly keys?: Readonly<Record<string, string>>
```

## Types

### `NotificationKind` type

```ts
type NotificationKind = "message" | "ring" | "stopRinging" | "missedCall"
```

What to present for a push:
- `message`: a new message.
- `ring`: an incoming call that is still ringing.
- `stopRinging`: the call stopped ringing without being missed: it was answered or declined, on any device, or
  stopped for a reason this SDK doesn't know.
- `missedCall`: nobody answered: the call ended first or the ring expired.

### `PushNotification` type

```ts
type PushNotification = MessagePushNotification | CallPushNotification | CallCancelledPushNotification
```

The `convohop` object a push carries, with only the fields the contract defines for its type.

### `PushNotificationType` type

```ts
type PushNotificationType = "notification.message" | "notification.call" | "notification.callCancelled"
```

### `PushRegistration` type

```ts
type PushRegistration = {
    readonly kind: "webPush";
    readonly subscription: WebPushSubscription;
} | {
    readonly kind: "apns" | "apnsVoip";
    readonly token: string;
    readonly environment?: "development" | "production";
} | {
    readonly kind: "fcm";
    readonly token: string;
    readonly fid?: never;
} | {
    readonly kind: "fcm";
    readonly fid: string;
    readonly token?: never;
}
```

Where your backend sends one device's pushes. Every ConvoHop client hands your app this shape, so one backend
endpoint can store registrations from browsers and native apps. ConvoHop never sees them.

- `webPush`: a browser subscription; your backend signs pushes with its VAPID private key.
- `apns`: an iOS device token for alerts. `environment` says which APNs host accepts it, when the app knows.
- `apnsVoip`: an iOS PushKit token for incoming calls.
- `fcm`: an Android app's Firebase Cloud Messaging target, with exactly one of `token` and `fid`. `token` is the
  registration token, which apps get by default. `fid` is the Firebase Installation ID, which apps get instead when
  their manifest sets `firebase_messaging_installation_id_enabled`. Send to it with the FCM HTTP v1 target of the
  same name.

## Functions

### `defaultWebNotification` function

```ts
function defaultWebNotification(action: NotificationAction): WebNotification
```

The default presentation. It uses the title and body your backend set, with English fallback titles, and the
action's tag, so a duplicate or a stopped ring replaces its earlier notification. A ring stays until it is handled;
a ring that stopped without being missed is replaced silently.

### `handleNotification` function

```ts
function handleNotification(payload: unknown, now?: number): NotificationAction
```

`NotificationHandler.handle` with a handler shared by this module.

### `handleNotificationClick` function

```ts
function handleNotificationClick(clients: WebClients, event: WebNotificationClickEvent, url: (notification: PushNotification, action: string | undefined) => string): boolean
```

Handles a `notificationclick` for a ConvoHop notification: closes it, then focuses a window already showing `url`
or opens one. `url` maps the notification (and the clicked action, if any) to a URL of your app: relative to the
service worker, such as `/conversations/${notification.conversationId}`, or absolute on its origin. Another origin
is a TypeError, and the notification stays open. Returns whether the notification was a ConvoHop one.

### `handlePushEvent` function

```ts
function handlePushEvent(registration: ServiceWorkerRegistration, event: WebPushEvent, options?: WebPushEventOptions): void
```

Handles a service worker `push` event: `self.addEventListener("push", event => handlePushEvent(self.registration, event))`.

### `parsePushNotification` function

```ts
function parsePushNotification(value: unknown): PushNotification
```

Validates the `convohop` object of a push against the push payload contract. Returns its known fields and ignores
fields the contract doesn't define for its type. Throws a `TypeError` for anything else.

### `parsePushPayload` function

```ts
function parsePushPayload(payload: unknown): PushNotification
```

Finds and validates the notification in a push: a Web Push or APNs payload (`{ convohop: {...} }`), FCM data
(`{ convohop: "<json>" }`) or the `convohop` object itself.

### `showPushNotification` function

```ts
function showPushNotification(registration: ServiceWorkerRegistration, payload: unknown, options?: WebPushHandlerOptions): Promise<NotificationAction>
```

Shows the notification for a decrypted Web Push payload (`event.data.json()`) and returns the action taken.

Browsers expect every push to show a notification: Safari revokes the subscription after a few pushes that don't,
and Chrome shows a generic one. So every action, including duplicates and stopped rings, shows or replaces one.

### `subscribePush` function

```ts
function subscribePush(registration: ServiceWorkerRegistration, options: WebPushSubscribeOptions): Promise<PushSubscription>
```

Subscribes this browser to Web Push with your VAPID key and registers the subscription with your backend.
Reuses a subscription for the same key and replaces one made with another key. Call it from a user gesture:
subscribing asks for notification permission, and some browsers only ask from a gesture.

### `unsubscribePush` function

```ts
function unsubscribePush(registration: ServiceWorkerRegistration, unregister?: (registration: PushRegistration) => Promise<void> | void): Promise<boolean>
```

Unsubscribes this browser and, first, lets your backend forget the subscription. Resolves whether a subscription
existed.
