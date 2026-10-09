import { setupMedia } from "@convohop/react-native/media";

// Registers LiveKit's WebRTC globals before anything imports livekit-client. On iOS, CallKit activates the audio
// session for each call, and LiveKit's audio follows it.
setupMedia({ callKit: true });
