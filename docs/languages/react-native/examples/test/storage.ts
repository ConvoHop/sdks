// AsyncStorage's native module, RNAsyncStorage, in memory. Its databases outlive the clients a test creates, as they
// outlive an app's launches. Each call completes in a later turn of the event loop, in the order it was made.

interface Entry {
  key: string;
  value: string | null;
}

const databases = new Map<string, Map<string, string>>();

function database(name: string): Map<string, string> {
  let values = databases.get(name);
  if (!values) databases.set(name, (values = new Map()));
  return values;
}

function later<T>(run: () => T): Promise<T> {
  return new Promise((resolve, reject) =>
    setImmediate(() => {
      try {
        resolve(run());
      } catch (error) {
        reject(error);
      }
    }),
  );
}

const legacy = async () => {
  throw new Error("The samples use createAsyncStorage, not the legacy storage");
};

export const nativeAsyncStorage = {
  getValues: (db: string, keys: string[]) => later(() => keys.map(key => ({ key, value: database(db).get(key) ?? null }))),
  setValues: (db: string, entries: Entry[]) =>
    later(() => {
      for (const { key, value } of entries) {
        if (typeof value !== "string" && value !== null) throw new TypeError(`AsyncStorage stores strings, not ${typeof value}`);
        if (value === null) database(db).delete(key);
        else database(db).set(key, value);
      }
      return entries;
    }),
  removeValues: (db: string, keys: string[]) =>
    later(() => {
      for (const key of keys) database(db).delete(key);
    }),
  getKeys: (db: string) => later(() => [...database(db).keys()]),
  clearStorage: (db: string) =>
    later(() => {
      database(db).clear();
    }),
  legacy_multiGet: legacy,
  legacy_multiSet: legacy,
  legacy_multiRemove: legacy,
  legacy_multiMerge: legacy,
  legacy_getAllKeys: legacy,
  legacy_clear: legacy,
};
