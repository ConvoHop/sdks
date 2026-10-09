import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Button, colors } from "../ui";

export interface SignInScreenProps {
  /** Signs in with your backend. */
  readonly onSubmit: (userName: string, password: string) => void;
}

export function SignInScreen({ onSubmit }: SignInScreenProps) {
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const ready = userName.trim() !== "" && password !== "";
  const submit = () => {
    if (ready) onSubmit(userName.trim(), password);
  };
  return (
    <View style={styles.screen}>
      <Text accessibilityRole="header" style={styles.title}>ConvoHop</Text>
      <TextInput
        autoCapitalize="none"
        autoComplete="username"
        autoCorrect={false}
        onChangeText={setUserName}
        placeholder="User name"
        returnKeyType="next"
        style={styles.input}
        textContentType="username"
        value={userName}
      />
      <TextInput
        autoComplete="current-password"
        onChangeText={setPassword}
        onSubmitEditing={submit}
        placeholder="Password"
        returnKeyType="go"
        secureTextEntry
        style={styles.input}
        textContentType="password"
        value={password}
      />
      <Button disabled={!ready} onPress={submit} title="Sign in" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 12, padding: 24, paddingTop: 64 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 12 },
  input: { borderColor: colors.border, borderRadius: 8, borderWidth: 1, fontSize: 16, padding: 12 },
});
