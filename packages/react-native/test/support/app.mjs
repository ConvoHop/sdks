// One launch of an app that keeps its outbox in AsyncStorage, as the example app does. device.mjs imports it with
// `?context=N`, so each launch evaluates its own copies of the SDKs, AsyncStorage and React Native, as a new process
// would; only the device outlives it.
import { linkModule } from "react-native";
import { linkPlatform } from "./native.mjs";

export async function start(phone, launch) {
  // AsyncStorage looks its native module up as it loads.
  linkModule("RNAsyncStorage", phone.storage.bind(launch));
  linkPlatform();
  const { createAsyncStorage } = await import("@react-native-async-storage/async-storage");
  const { ConvoHopClient, Outbox } = await import("@convohop/client");
  const { createPlatform } = await import("@convohop/react-native");
  const platform = createPlatform({ netInfo: phone.network.bind(launch) });
  const recoveryStorage = createAsyncStorage("convohop"), outboxes = [];
  return {
    /** Signs the user in: a client and its persistent outbox, as the example's Session.start creates them. */
    open() {
      const client = new ConvoHopClient({ ...phone.account, fetch: phone.authority.bind(launch),
        asyncRecoveryStorage: recoveryStorage, platform });
      const errors = [], outbox = new Outbox(client, { persist: true, onError: error => { errors.push(error); } });
      outboxes.push(outbox);
      return { client, outbox, errors };
    },
    /**
     * Signs the user out in the order the example's Session.end does: the outboxes stop writing, the client's other
     * requests in `work` settle, and only then is the storage cleared, so no late save brings the user's data back.
     */
    async signOut(work = []) {
      await Promise.all(outboxes.map(outbox => outbox.close()));
      await Promise.allSettled(work);
      await recoveryStorage.clear();
    },
    /** Stops sending and listening. Doesn't wait for the outboxes, since a killed launch's storage never answers. */
    stop() {
      for (const outbox of outboxes) void outbox.close();
      platform.dispose();
    },
  };
}
