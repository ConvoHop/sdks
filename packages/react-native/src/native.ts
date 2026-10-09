import { TurboModuleRegistry, type TurboModule } from "react-native";
import type { Spec as CallsSpec } from "./specs/NativeConvoHopCalls.js";
import type { Spec as PlatformSpec } from "./specs/NativeConvoHopPlatform.js";
import type { Spec as PushSpec } from "./specs/NativeConvoHopPush.js";

// The spec modules' default exports exist for Codegen; looking modules up lazily keeps importing this package safe
// where a module isn't linked, and reports which one is missing when it is first used.
const linked = new Map<string, TurboModule>();
function lookup<T extends TurboModule>(name: string): T {
  let module = linked.get(name) as T | undefined;
  if (!module) {
    module = TurboModuleRegistry.get<T>(name) ?? undefined;
    if (!module) throw new Error(`The ${name} native module is not linked. @convohop/react-native needs React Native 0.76 or ` +
      "later with the New Architecture; rebuild the app after installing it.");
    linked.set(name, module);
  }
  return module;
}

export const platformModule = (): PlatformSpec => lookup<PlatformSpec>("ConvoHopPlatform");
export const pushModule = (): PushSpec => lookup<PushSpec>("ConvoHopPush");
export const callsModule = (): CallsSpec => lookup<CallsSpec>("ConvoHopCalls");

/** Reports an error without throwing: React Native's handler shows it in development and passes it to crash reporters. */
export function report(error: unknown): void {
  const handler = (globalThis as { ErrorUtils?: { reportError?: (error: unknown) => void } }).ErrorUtils;
  if (typeof handler?.reportError === "function") handler.reportError(error);
  else console.error(error);
}
