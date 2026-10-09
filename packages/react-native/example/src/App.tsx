// The example app: sign-in, the inbox, a conversation and the current call, for one signed-in user at a time.
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { BackHandler, StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ConvoHopProvider, useSessionRefresh } from "@convohop/react";
import { onNotification, takeInitialNotification, type NotificationResponse } from "@convohop/react-native";
import { signIn } from "./backend";
import { CallScreen } from "./screens/Call";
import { ConversationScreen } from "./screens/Conversation";
import { InboxScreen } from "./screens/Inbox";
import { SignInScreen } from "./screens/SignIn";
import { Session } from "./session";
import { Banner, Busy, colors, errorMessage } from "./ui";

type Stage =
  | { readonly name: "signedOut" }
  | { readonly name: "signingIn" }
  | { readonly name: "signedIn"; readonly session: Session }
  | { readonly name: "signingOut"; readonly session: Session };

export default function App() {
  const [stage, setStage] = useState<Stage>({ name: "signedOut" });
  const [error, setError] = useState<string>();
  const report = useCallback((value: unknown) => {
    setError(errorMessage(value));
  }, []);

  const start = useCallback((userName: string, password: string) => {
    setError(undefined);
    setStage({ name: "signingIn" });
    void signIn(userName, password).then(signedIn => Session.start(signedIn, report)).then(session => {
      setStage({ name: "signedIn", session });
    }, (failure: unknown) => {
      report(failure);
      setStage({ name: "signedOut" });
    });
  }, [report]);

  // Ends the session once the screens using it have unmounted.
  useEffect(() => {
    if (stage.name !== "signingOut") return;
    void stage.session.end().catch(report).finally(() => {
      setStage({ name: "signedOut" });
    });
  }, [stage, report]);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.app}>
        {error !== undefined && <Banner onDismiss={() => { setError(undefined); }} text={error} />}
        {stage.name === "signedIn" ? (
          <ConvoHopProvider client={stage.session.client} outbox={stage.session.outbox}>
            <SignedIn
              onError={report}
              onSignOut={() => { setStage({ name: "signingOut", session: stage.session }); }}
              session={stage.session}
            />
          </ConvoHopProvider>
        ) : stage.name === "signedOut" ? (
          <SignInScreen onSubmit={start} />
        ) : (
          <Busy text={stage.name === "signingIn" ? "Signing in…" : "Signing out…"} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

type Route =
  | { readonly name: "inbox" }
  | { readonly name: "conversation"; readonly conversationId: string; readonly title: string | undefined };

interface SignedInProps {
  readonly session: Session;
  readonly onSignOut: () => void;
  readonly onError: (error: unknown) => void;
}

function SignedIn({ session, onSignOut, onError }: SignedInProps) {
  const [route, setRoute] = useState<Route>({ name: "inbox" });
  /** Changes when a push arrives, so the inbox loads again. */
  const [version, setVersion] = useState(0);
  const call = useSyncExternalStore(session.calls.subscribe, session.calls.current);
  useSessionRefresh({ onError });

  useEffect(() => {
    const { client } = session;
    const handle = ({ action, notification }: NotificationResponse) => {
      // A push sent to whoever was signed in before can still arrive.
      if (notification.projectId !== client.projectId || notification.recipientId !== client.principalId) return;
      if (action === "opened") setRoute({ name: "conversation", conversationId: notification.conversationId, title: undefined });
      else setVersion(value => value + 1);
    };
    const stop = onNotification(handle);
    // The notification the user opened to launch the app, if any.
    void takeInitialNotification().then(response => {
      if (response !== null) handle(response);
    }, onError);
    return () => {
      stop();
    };
  }, [session, onError]);

  // Android's back button leaves a conversation.
  useEffect(() => {
    if (route.name === "inbox") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      setRoute({ name: "inbox" });
      return true;
    });
    return () => {
      subscription.remove();
    };
  }, [route.name]);

  return (
    <View style={styles.app}>
      {route.name === "inbox" ? (
        <InboxScreen
          onError={onError}
          onOpen={(conversationId, title) => { setRoute({ name: "conversation", conversationId, title }); }}
          onSignOut={onSignOut}
          session={session}
          version={version}
        />
      ) : (
        <ConversationScreen
          conversationId={route.conversationId}
          key={route.conversationId}
          onBack={() => { setRoute({ name: "inbox" }); }}
          onError={onError}
          session={session}
          title={route.title}
        />
      )}
      {call !== undefined && <CallScreen call={call} calls={session.calls} />}
    </View>
  );
}

const styles = StyleSheet.create({
  app: { backgroundColor: colors.background, flex: 1 },
});
