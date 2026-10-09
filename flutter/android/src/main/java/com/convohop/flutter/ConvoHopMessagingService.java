package com.convohop.flutter;

import androidx.annotation.NonNull;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

/**
 * Receives FCM messages and registrations for ConvoHop. An app that handles FCM messages of its own
 * extends it and calls {@code super}, or calls {@link ConvoHopMessaging} from its own service.
 */
public class ConvoHopMessagingService extends FirebaseMessagingService {
  @Override
  public void onMessageReceived(@NonNull RemoteMessage message) {
    ConvoHopMessaging.handleMessage(this, message.getData());
  }

  // FCM calls onNewToken, or onRegistered when the app's manifest switches it to installation IDs.
  @Override
  @SuppressWarnings("deprecation")
  public void onNewToken(@NonNull String token) {
    ConvoHopMessaging.handleNewToken(token);
  }

  @Override
  public void onRegistered(@NonNull String installationId) {
    ConvoHopMessaging.handleRegistered(installationId);
  }
}
