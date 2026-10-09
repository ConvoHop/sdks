// The part of @livekit/react-native-webrtc the SDK uses: what WebRTC's shared audio session was told.
export const audioSession = [];
export const RTCAudioSession = {
  audioSessionDidActivate() { audioSession.push("activate"); },
  audioSessionDidDeactivate() { audioSession.push("deactivate"); },
};
