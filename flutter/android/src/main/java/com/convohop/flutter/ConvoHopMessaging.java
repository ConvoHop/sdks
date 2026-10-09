package com.convohop.flutter;

import android.app.ActivityManager;
import android.content.Context;
import android.os.Bundle;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import java.util.HashMap;
import java.util.Map;

/**
 * Handles ConvoHop FCM messages. {@link ConvoHopMessagingService} calls it; an app with its own
 * {@code FirebaseMessagingService} calls it from that service instead.
 */
public final class ConvoHopMessaging {
  // FCM's switch from registration tokens to Firebase installation IDs, for the whole app.
  private static final String INSTALLATION_ID_ENABLED = "firebase_messaging_installation_id_enabled";

  // The conversation the user is looking at, set from Dart.
  @Nullable static volatile String activeConversation;

  private ConvoHopMessaging() {}

  /**
   * Shows a notification for an FCM data message, rings for a call or stops a ring, and reports
   * the message to Dart. Call it from {@code FirebaseMessagingService.onMessageReceived} with
   * {@code RemoteMessage.getData()}.
   *
   * @return false when the message isn't ConvoHop's.
   */
  public static boolean handleMessage(@NonNull Context context, @NonNull Map<String, String> data) {
    String json = data.get("convohop");
    if (json == null) return false;
    Context application = application(context);
    ConvoHopPayload payload = ConvoHopPayload.tryParse(json);
    if (payload != null && ConvoHopState.remember(application, payload.eventId)) {
      switch (payload.eventType) {
        case ConvoHopPayload.MESSAGE:
          if (!showing(payload.conversationId)) ConvoHopNotifier.showMessage(application, payload);
          break;
        case ConvoHopPayload.CALL:
          ConvoHopCalls.ring(application, payload);
          break;
        default:
          ConvoHopCalls.cancelled(application, payload);
          break;
      }
    }
    // Dart reports invalid and duplicate messages itself.
    Map<String, Object> event = new HashMap<>();
    event.put("type", "notification");
    event.put("payload", new HashMap<String, Object>(data));
    ConvoHopEvents.emit(event);
    return true;
  }

  /**
   * Reports a new FCM registration token to Dart. Call it from {@code
   * FirebaseMessagingService.onNewToken}.
   */
  public static void handleNewToken(@NonNull String token) {
    emitRegistration("token", token);
  }

  /**
   * Reports the Firebase installation ID that FCM registered to Dart, when the app's manifest
   * switches FCM to installation IDs. Call it from {@code FirebaseMessagingService.onRegistered}.
   */
  public static void handleRegistered(@NonNull String installationId) {
    emitRegistration("fid", installationId);
  }

  /**
   * Whether the app's manifest switches FCM from registration tokens to Firebase installation IDs,
   * read as FCM reads it.
   */
  static boolean installationIdEnabled(@NonNull Context context) {
    Bundle meta = ConvoHopNotifier.metaData(application(context));
    return meta != null && meta.getBoolean(INSTALLATION_ID_ENABLED, false);
  }

  /** An FCM registration for Dart: {@code field} is {@code token} or {@code fid}. */
  @NonNull
  static Map<String, Object> registration(@NonNull String field, @NonNull String value) {
    Map<String, Object> registration = new HashMap<>();
    registration.put("kind", "fcm");
    registration.put(field, value);
    return registration;
  }

  private static void emitRegistration(@NonNull String field, @NonNull String value) {
    Map<String, Object> event = registration(field, value);
    event.put("type", "registration");
    ConvoHopEvents.emit(event);
  }

  @NonNull
  static Context application(@NonNull Context context) {
    Context application = context.getApplicationContext();
    return application != null ? application : context;
  }

  // Whether the app is in the foreground showing the conversation.
  private static boolean showing(String conversationId) {
    if (!conversationId.equals(activeConversation)) return false;
    ActivityManager.RunningAppProcessInfo process = new ActivityManager.RunningAppProcessInfo();
    ActivityManager.getMyMemoryState(process);
    return process.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND;
  }
}
