import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

export interface Spec extends TurboModule {
  /** `length` (1–65536) bytes from the platform's cryptographically secure generator, as standard base64. */
  getRandomBytes(length: number): string;
}

export default TurboModuleRegistry.get<Spec>("ConvoHopPlatform");
