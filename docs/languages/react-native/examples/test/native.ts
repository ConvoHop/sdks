// Typed handles on packages/react-native's stand-ins for React Native and the SDK's native modules. They are the same
// modules that test/setup.ts resolves the samples' react-native imports to.

const support = (file: string) => new URL(`../../../../../packages/react-native/test/support/${file}`, import.meta.url).href;

type Methods = Record<string, (...args: never[]) => unknown>;

// A linked fake module. emit sends one of its events, and log lists its calls, each as [method, ...arguments].
export interface FakeModule {
  emit(event: string, value: unknown): void;
  listenerCount(event: string): number;
  readonly log: unknown[][];
}

interface NativeStandIns {
  linkPlatform(overrides?: Methods): FakeModule;
  linkPush(overrides?: Methods): FakeModule;
  linkCalls(overrides?: Methods): FakeModule;
  // Lets pending promise callbacks and native events run.
  turn(): Promise<void>;
}

interface ReactNativeStandIn {
  Platform: { OS: "ios" | "android" };
  linkModule(name: string, methods: object, events?: string[]): unknown;
}

export const native = (await import(support("native.mjs"))) as NativeStandIns;
export const reactNative = (await import(support("react-native.mjs"))) as ReactNativeStandIn;

// Runs test as if on Android, then switches back to iOS.
export async function onAndroid<T>(test: () => Promise<T>): Promise<T> {
  reactNative.Platform.OS = "android";
  try {
    return await test();
  } finally {
    reactNative.Platform.OS = "ios";
  }
}
