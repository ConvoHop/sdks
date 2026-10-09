// A signed-in user's client, outbox, calls and push registration, and a sign-out that leaves none of their data behind.
import { Platform } from "react-native";
import { createAsyncStorage } from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { ConvoHopClient, Outbox, type ProjectCapabilities } from "@convohop/client";
import { createPlatform, registerForPush, setPushRecipient, unregisterFromPush, watchRingingCalls } from "@convohop/react-native";
import { registerPush, renewSession, signOut, unregisterPush, type SignedIn, type UserBootstrap } from "./backend";
import { CallController } from "./calls";

/** The client's platform adapter: Hermes crypto and URL, connectivity from NetInfo and the app's lifecycle. */
export const platform = createPlatform({ netInfo: NetInfo });
/** Unconfirmed sends, replay cursors and the outbox. Never tokens. */
const recoveryStorage = createAsyncStorage("convohop");
/** The example's own records: whose recovery state `recoveryStorage` holds. */
const appStorage = createAsyncStorage("convohop-example");
const OWNER = "recoveryOwner";

/**
 * Recovery state belongs to one user. The same user keeps theirs, so the outbox finishes the messages they left unsent.
 * If the app stopped while someone else was signed in, this deletes that user's unsent messages and replay cursors.
 */
async function claimRecoveryStorage({ projectId, session }: UserBootstrap): Promise<void> {
  const owner = JSON.stringify([projectId, session.principalId]);
  if (await appStorage.getItem(OWNER) === owner) return;
  await recoveryStorage.clear();
  await appStorage.setItem(OWNER, owner);
}

export type ProjectFeatures = ProjectCapabilities["features"];

export class Session {
  readonly client: ConvoHopClient;
  readonly outbox: Outbox;
  readonly calls: CallController;
  readonly #appToken: string;
  readonly #onError: (error: unknown) => void;
  readonly #stopWatching: () => void;
  /** Aborts push registration at sign-out, even while the platform or the backend hasn't answered. */
  readonly #stopPush = new AbortController();
  /** Settles once push registration started, failed or was aborted. Never rejects. */
  readonly #push: Promise<void>;
  /** Requests the app doesn't wait for. Each resolves, never rejects. */
  readonly #requests = new Set<Promise<void>>();
  #ended: Promise<void> | undefined;
  #features: Promise<ProjectFeatures> | undefined;

  /**
   * Connects a signed-in user. The client asks your backend for a new session before the current one expires. If it
   * can't connect, it signs out with your backend, which would otherwise keep a session the app has lost.
   */
  static async start({ appToken, bootstrap }: SignedIn, onError: (error: unknown) => void): Promise<Session> {
    try {
      await claimRecoveryStorage(bootstrap);
      const client = new ConvoHopClient({
        baseUrl: bootstrap.baseUrl,
        projectId: bootstrap.projectId,
        sessionToken: bootstrap.sessionToken,
        incarnation: bootstrap.session.incarnation,
        principalId: bootstrap.session.principalId,
        asyncRecoveryStorage: recoveryStorage,
        platform,
        sessionRefresh: current => renewSession(appToken, current),
      });
      await client.initialize();
      return new Session(appToken, client, onError);
    } catch (error) {
      await signOut(appToken).catch(onError);
      throw error;
    }
  }

  private constructor(appToken: string, client: ConvoHopClient, onError: (error: unknown) => void) {
    this.#appToken = appToken;
    this.#onError = onError;
    this.client = client;
    // The outbox finishes the sends an earlier launch left unconfirmed. Don't also call client.recoverPending, which
    // would retry the same sends next to it.
    this.outbox = new Outbox(client, { persist: true, connectivity: platform.connectivity, onError });
    this.calls = new CallController(client, { randomUUID: platform.randomUUID, onError });
    // Stops a ring whose cancellation push is late or lost.
    this.#stopWatching = watchRingingCalls(client, { onError });
    // In the background: the app works without pushes. The device shows and rings only this user's pushes, so it
    // learns who that is before registering, including for pushes that start the app before JavaScript runs.
    const signal = this.#stopPush.signal;
    this.#push = setPushRecipient({ projectId: client.projectId, recipientId: client.principalId })
      .then(() => registerForPush({
        register: registration => registerPush(appToken, registration),
        unregister: registration => unregisterPush(appToken, registration),
        onError,
        signal,
      }))
      .then(() => {}, (error: unknown) => {
        if (!signal.aborted) onError(error);
      });
  }

  /**
   * Keeps track of a request the app doesn't wait for, such as a read receipt, and returns it. Such a request saves a
   * recovery record when it settles, so signing out waits for it before deleting them.
   */
  track<T>(request: Promise<T>): Promise<T> {
    const settled = request.then(() => {}, () => {}).then(() => { this.#requests.delete(settled); });
    this.#requests.add(settled);
    return request;
  }

  /** Whether signing out now would delete messages that weren't sent. Tries to send them first. */
  async hasUnsent(): Promise<boolean> {
    await this.outbox.flush();
    return this.outbox.entries.some(entry => entry.status !== "sent");
  }

  /** The project's features, such as typing indicators and calls. Asked once; a failure is asked again next time. */
  features(): Promise<ProjectFeatures> {
    this.#features ??= this.client.capabilities().then(({ features }) => features, (error: unknown) => {
      this.#features = undefined;
      throw error;
    });
    return this.#features;
  }

  /**
   * Signs out: hangs up, stops sending, signs out with your backend, and deletes the user's unsent messages and
   * replay cursors from this device. Unmount the screens using this session first. Every call returns the same promise.
   */
  end(): Promise<void> {
    this.#ended ??= this.#end();
    return this.#ended;
  }
  async #end(): Promise<void> {
    this.#stopWatching();
    this.#stopPush.abort();
    await this.#push;
    // The device drops this user's pushes from now on, even if the backend can't delete their registrations.
    await setPushRecipient(null).catch(this.#onError);
    // Everything that writes recovery records stops before they are deleted, or a late write would restore them, along
    // with the text of unsent messages. Closing waits for each one's requests to settle.
    await this.calls.close();
    await this.outbox.close();
    while (this.#requests.size > 0) await Promise.allSettled([...this.#requests]);
    try {
      // Android: stop FCM pushes to this device even if the backend can't be reached. The backend's sign-out deletes
      // the registration too. iOS can't unregister; the backend deletes its tokens.
      if (Platform.OS === "android") await unregisterFromPush().catch(this.#onError);
      await signOut(this.#appToken);
    } finally {
      await recoveryStorage.clear();
      await appStorage.removeItem(OWNER);
    }
  }
}
