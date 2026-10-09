// Calling quickstart setup. It needs LiveKit's native WebRTC, so the tests only typecheck it.

// #region setup
// src/setup.ts. Import it first in index.js, before any module that imports LiveKit: import "./src/setup";
import { setupMedia } from "@convohop/react-native/media";

// Registers LiveKit's WebRTC globals. On iOS, CallKit activates each call's audio session, and LiveKit's audio follows.
setupMedia({ callKit: true });
// #endregion setup
