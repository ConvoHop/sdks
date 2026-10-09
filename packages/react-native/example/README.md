# ConvoHop React Native example

A React Native app built on [`@convohop/react-native`](../README.md). It signs
a user in through your backend and lists their conversations. It chats with
offline-safe sends, typing and read receipts, receives push notifications,
and makes and answers calls through CallKit or Android's Telecom framework.
License: [Apache-2.0](../LICENSE).

> [!IMPORTANT]
> This directory holds the app's JavaScript only. The `ios/` and `android/`
> projects aren't here yet, and neither are the package's native modules, so
> the app doesn't run on a device yet. CI type-checks it. The
> [design](../../../docs/react-native.md#status) says what comes next.

Type-check it from the repository root:

```sh
npm ci
npm run typecheck:example --workspace @convohop/react-native
```

The example isn't an npm workspace. It type-checks against the repository's
root `node_modules`, where npm links `@convohop/client`, `@convohop/react` and
`@convohop/react-native` and installs the package's development
dependencies. [`test/example.test.mjs`](../test/example.test.mjs) keeps the
versions in `package.json` in step with those, so update both together.
Running the app will need its own `npm install`. React Native 0.87.1 renders
with React 19.2.3, and the `react` package must have exactly that version,
so `package.json` pins it; the test checks that too.

## Your backend

The app never holds a ConvoHop backend key. Your backend signs users in,
issues their ConvoHop sessions with
[`@convohop/server`](../../server/README.md#application-backend), stores their
push registrations and sends their pushes. Set its URL in
[`src/config.ts`](src/config.ts). [`src/backend.ts`](src/backend.ts) calls
these endpoints. The paths and bodies are this example's, not part of
ConvoHop:

| Request | Body | Response |
| --- | --- | --- |
| `POST /sign-in` | `{ userName, password }` | `{ appToken, convohop }`: your own credential for the user, and a ConvoHop session (`baseUrl`, `projectId`, `sessionToken`, `tokenExpiresAt` and `session`) |
| `POST /convohop/session` | `{ sessionId }` of the current session | A new ConvoHop session, the same shape as `convohop` |
| `POST /push-registrations` | A registration: `{ kind: "apns" \| "apnsVoip", token, environment? }` on iOS; `{ kind: "fcm", token }` or `{ kind: "fcm", fid }` on Android | Nothing. Store it for the user, keyed by its token or FID: when another user signs in on the device, it moves to them. |
| `DELETE /push-registrations` | A registration that FCM unregistered | Nothing. Stop sending to it. |
| `POST /sign-out` | `{}` | Nothing. End the user's ConvoHop sessions on this device and delete its push registrations. |

Every request but `/sign-in` sends `Authorization: Bearer <appToken>`.
Errors report the method, path and HTTP status, never the response body,
which can hold credentials. A malformed session fails in `parseBootstrap`,
before the SDK sees it.

To send pushes, subscribe a webhook endpoint to `notification.message`,
`notification.call` and `notification.callCancelled`, and build the requests
with the [push payload builders](../../server/README.md#push-payloads):

- **iOS.** Send `push.apnsAlert()` requests to the `apns` token and
  `push.apnsVoip()` requests, for incoming calls, to the `apnsVoip` token.
- **Android.** Send `push.fcm()` requests to the registration's `token` or
  `fid`, whichever the app registered.

## What it shows

- [`src/session.ts`](src/session.ts) connects a signed-in user. It creates
  the client with the React Native platform (`createPlatform`), AsyncStorage
  for recovery state and `sessionRefresh`. It also starts a persistent
  `Outbox`, the call controller, `watchRingingCalls`, `setPushRecipient`
  and `registerForPush`.
- [`src/calls.ts`](src/calls.ts) joins the calls the user answers in the
  system call UI and starts the user's own. It connects media with
  `createRoom` and `createRoomConnector`, and mutes through the system call
  so both stay in step. On Android it shows the call's audio routes; on iOS,
  the system route picker.
- [`src/screens/Inbox.tsx`](src/screens/Inbox.tsx) pages through the inbox,
  asks for notification permission, and offers the settings when
  notifications or full-screen calls are off.
- [`src/screens/Conversation.tsx`](src/screens/Conversation.tsx) uses
  `useConversation` and `useTyping` from
  [`@convohop/react`](../../react/README.md). It reports reading while the
  conversation is on screen, loads older messages, and resends or deletes
  messages that weren't sent.
- [`src/App.tsx`](src/App.tsx) opens the conversation of a notification the
  user tapped, including the one that launched the app, and reloads the inbox
  when a push arrives.

## Behavior to keep in your app

- **Whose pushes.** `Session.start()` sets the push recipient to the
  signed-in user before it registers, so the device shows and rings only
  their pushes. Sign-out sets it to `null`, and the device drops every
  ConvoHop push until the next sign-in, even if your backend couldn't delete
  the registrations.
- **Sign-out order.** `Session.end()` stops watching rings, aborts push
  registration, clears the push recipient, hangs up, and awaits
  `outbox.close()` and the read receipts still in flight. Then, on Android,
  it unregisters from FCM. It signs out with your backend and deletes the
  user's recovery state. Anything still running could write recovery records
  after the deletion, and with them the text of unsent messages. The app
  unmounts the signed-in screens before it starts.
- **One user's recovery state.** Recovery state on the device belongs to the
  user who last signed in. When someone else signs in, the app deletes it
  first. The same user keeps theirs, so the outbox sends the messages they
  left unsent.
- **Calls.** One call at a time. The caller's hang-up ends the call for
  everyone; anyone else who hangs up just leaves.

## Limits

- **Sign-in on each launch.** The app keeps its backend credential in memory
  only. A real app keeps its own credential in the Keychain or Android's
  Keystore and gets a new ConvoHop session at launch. A call answered on the
  lock screen before sign-in is joined once the user signs in, while it's
  still current.
- **No author names.** Messages carry the author's principal ID. Look up
  names in your own user directory.
- **Not verified on a device.** Hermes, the native modules, push delivery,
  CallKit and Telecom, and real WebRTC media haven't run yet. Nobody has
  checked how Android's Telecom audio routes and LiveKit's audio session
  interact.
