// A stand-in for @react-native-community/netinfo's default export. test/setup.ts resolves the samples' import to it.

type Listener = (state: { isConnected: boolean | null }) => void;
const listeners = new Set<Listener>();
let isConnected: boolean | null = true;

export default {
  addEventListener(listener: Listener): () => void {
    listeners.add(listener);
    listener({ isConnected });
    return () => {
      listeners.delete(listener);
    };
  },
};

// Takes the device offline or back online.
export function setConnected(connected: boolean): void {
  isConnected = connected;
  for (const listener of [...listeners]) listener({ isConnected });
}
