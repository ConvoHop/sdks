package dev.instantrelay.flutter;

import androidx.annotation.NonNull;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

/**
 * Receives FCM messages and registrations for Relay. An app that handles FCM messages of its own
 * extends it and calls {@code super}, or calls {@link RelayMessaging} from its own service.
 */
public class RelayMessagingService extends FirebaseMessagingService {
  @Override
  public void onMessageReceived(@NonNull RemoteMessage message) {
    RelayMessaging.handleMessage(this, message.getData());
  }

  // FCM calls onNewToken, or onRegistered when the app's manifest switches it to installation IDs.
  @Override
  @SuppressWarnings("deprecation")
  public void onNewToken(@NonNull String token) {
    RelayMessaging.handleNewToken(token);
  }

  @Override
  public void onRegistered(@NonNull String installationId) {
    RelayMessaging.handleRegistered(installationId);
  }
}
