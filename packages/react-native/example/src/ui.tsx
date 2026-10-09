// Small pieces the example's screens share.
import { useSyncExternalStore } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { ConversationMessage } from "@convohop/client";
import { platform } from "./session";

export const colors = {
  accent: "#2563eb",
  danger: "#dc2626",
  muted: "#6b7280",
  border: "#e5e7eb",
  banner: "#fef3c7",
  background: "#ffffff",
};

/** Whether the app is in the foreground. */
export function useForeground(): boolean {
  return useSyncExternalStore(platform.lifecycle.subscribe, () => platform.lifecycle.state) === "active";
}

/** What the app shows for an error. Errors from the SDK and the backend calls carry no credentials. */
export function errorMessage(error: unknown): string {
  return error instanceof Error && error.message !== "" ? error.message : "Something went wrong";
}

export interface ButtonProps {
  readonly title: string;
  readonly onPress: () => void;
  readonly disabled?: boolean;
  readonly kind?: "primary" | "plain" | "danger";
}

export function Button({ title, onPress, disabled = false, kind = "primary" }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, styles[kind], (pressed || disabled) && styles.dimmed]}
    >
      <Text style={kind === "plain" ? styles.plainLabel : styles.label}>{title}</Text>
    </Pressable>
  );
}

export interface BannerProps {
  readonly text: string;
  readonly action?: { readonly title: string; readonly onPress: () => void };
  readonly onDismiss?: () => void;
}

export function Banner({ text, action, onDismiss }: BannerProps) {
  return (
    <View accessibilityRole="alert" style={styles.banner}>
      <Text style={styles.bannerText}>{text}</Text>
      {action !== undefined && <Button kind="plain" onPress={action.onPress} title={action.title} />}
      {onDismiss !== undefined && <Button kind="plain" onPress={onDismiss} title="Dismiss" />}
    </View>
  );
}

export function Busy({ text }: { readonly text: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator />
      <Text style={styles.muted}>{text}</Text>
    </View>
  );
}

/** A message's text. A deleted message stays in the history without it. `lines` 0 shows all of it. */
export function MessageText({ message, lines = 0 }: {
  readonly message: Readonly<Pick<ConversationMessage, "deleted" | "text">>;
  readonly lines?: number;
}) {
  if (message.deleted || message.text === null) {
    return <Text style={styles.placeholder}>{message.deleted ? "Message deleted" : "No text"}</Text>;
  }
  return <Text numberOfLines={lines}>{message.text}</Text>;
}

const styles = StyleSheet.create({
  button: { alignItems: "center", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  primary: { backgroundColor: colors.accent },
  danger: { backgroundColor: colors.danger },
  plain: { backgroundColor: "transparent" },
  dimmed: { opacity: 0.5 },
  label: { color: "#ffffff", fontWeight: "600" },
  plainLabel: { color: colors.accent, fontWeight: "600" },
  banner: { alignItems: "center", backgroundColor: colors.banner, flexDirection: "row", paddingLeft: 12 },
  bannerText: { flex: 1, paddingVertical: 10 },
  center: { alignItems: "center", flex: 1, gap: 12, justifyContent: "center" },
  muted: { color: colors.muted },
  placeholder: { color: colors.muted, fontStyle: "italic" },
});
