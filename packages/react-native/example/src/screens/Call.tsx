import { Platform, StyleSheet, Text, View } from "react-native";
import type { CallController, CallView } from "../calls";
import { Button, colors } from "../ui";

const STATUS: Readonly<Record<CallView["status"], string>> = {
  joining: "Joining…",
  calling: "Calling…",
  connected: "Connected",
  reconnecting: "Reconnecting…",
  held: "On hold",
};
/** Names for Telecom's routes and for the outputs LiveKit's audio session reports. */
const OUTPUTS: Readonly<Record<string, string>> = {
  earpiece: "Phone",
  speaker: "Speaker",
  bluetooth: "Bluetooth",
  wiredHeadset: "Headset",
  headset: "Headset",
  streaming: "Streaming",
};

export interface CallScreenProps {
  readonly call: CallView;
  readonly calls: CallController;
}

/** The current call, over the other screens. CallKit or Telecom show it in the system UI too. */
export function CallScreen({ call, calls }: CallScreenProps) {
  const status = call.status === "connected" && call.others > 1 ? `${call.others} others connected` : STATUS[call.status];
  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]}>
      <Text accessibilityRole="header" numberOfLines={2} style={styles.title}>{call.title}</Text>
      <Text style={styles.status}>{status}</Text>
      <View style={styles.controls}>
        <Button kind={call.muted ? "primary" : "plain"} onPress={() => { calls.setMuted(!call.muted); }} title={call.muted ? "Unmute" : "Mute"} />
        {Platform.OS === "ios" && <Button kind="plain" onPress={() => { calls.showOutputPicker(); }} title="Audio output" />}
      </View>
      {Platform.OS === "android" && call.outputs.length > 1 && (
        <View style={styles.controls}>
          {call.outputs.map(output => (
            <Button
              key={output}
              kind={output === call.output ? "primary" : "plain"}
              onPress={() => { calls.chooseOutput(output); }}
              title={OUTPUTS[output] ?? output}
            />
          ))}
        </View>
      )}
      <Button kind="danger" onPress={() => { calls.hangUp(); }} title="Hang up" />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { alignItems: "center", backgroundColor: colors.background, gap: 24, justifyContent: "center", padding: 24 },
  title: { fontSize: 26, fontWeight: "700", textAlign: "center" },
  status: { color: colors.muted, fontSize: 16 },
  controls: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" },
});
