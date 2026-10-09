package com.convohop.flutter;

import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.app.Person;
import androidx.core.content.ContextCompat;

/** Builds the notifications for ConvoHop pushes. */
final class ConvoHopNotifier {
  static final String ACTION_OPEN = "com.convohop.flutter.OPEN";
  static final String ACTION_INCOMING_CALL = "com.convohop.flutter.INCOMING_CALL";
  static final String ACTION_ANSWER_CALL = "com.convohop.flutter.ANSWER_CALL";
  static final String ACTION_DECLINE_CALL = "com.convohop.flutter.DECLINE_CALL";
  static final String EXTRA_PAYLOAD = "com.convohop.flutter.PAYLOAD";
  static final String EXTRA_ALERT_ID = "com.convohop.flutter.ALERT_ID";
  static final String EXTRA_SECRET = "com.convohop.flutter.SECRET";

  private static final String TAG = "ConvoHop";
  // Marks the plugin's message notifications, whose tag is this conversation ID.
  private static final String EXTRA_CONVERSATION_ID = "com.convohop.flutter.CONVERSATION_ID";
  private static final String MESSAGES_CHANNEL = "convohop_messages";
  private static final String CALLS_CHANNEL = "convohop_calls";
  private static final String MISSED_CALLS_CHANNEL = "convohop_missed_calls";
  private static final String META_ICON = "com.convohop.flutter.notification_icon";
  private static final String META_COLOR = "com.convohop.flutter.notification_color";
  private static final String FULL_SCREEN_PERMISSION = "android.permission.USE_FULL_SCREEN_INTENT";
  // Tagged with the conversation ID or the alert ID, so they don't replace the app's own.
  private static final int MESSAGE_ID = 1;
  private static final int CALL_ID = 2;
  private static final int MISSED_CALL_ID = 3;
  private static final long[] RING_VIBRATION = {0, 1000, 1000};

  private ConvoHopNotifier() {}

  static void showMessage(@NonNull Context context, @NonNull ConvoHopPayload message) {
    createChannels(context);
    String generic = context.getString(R.string.convohop_message_title);
    Bundle extras = new Bundle();
    extras.putString(EXTRA_CONVERSATION_ID, message.conversationId);
    NotificationCompat.Builder builder =
        base(context, MESSAGES_CHANNEL, message)
            .addExtras(extras)
            .setContentTitle(message.title != null ? message.title : generic)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(
                activity(
                    context,
                    ACTION_OPEN,
                    "message:" + message.conversationId,
                    message.json,
                    null));
    if (message.body != null) {
      builder
          .setContentText(message.body)
          .setStyle(new NotificationCompat.BigTextStyle().bigText(message.body));
    }
    if (message.title != null || message.body != null) {
      // Previews stay off the lock screen.
      builder
          .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
          .setPublicVersion(
              base(context, MESSAGES_CHANNEL, message)
                  .setContentTitle(generic)
                  .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                  .build());
    }
    notify(context, message.conversationId, MESSAGE_ID, builder.build());
  }

  static void showRing(@NonNull Context context, @NonNull ConvoHopPayload call) {
    createChannels(context);
    String alertId = call.alertId;
    if (alertId == null) return;
    String name = call.title != null ? call.title : context.getString(R.string.convohop_call_title);
    String text =
        call.body != null
            ? call.body
            : context.getString(call.video ? R.string.convohop_call_video : R.string.convohop_call_voice);
    PendingIntent incoming =
        activity(context, ACTION_INCOMING_CALL, "ring:" + alertId, call.json, alertId);
    PendingIntent answer =
        activity(context, ACTION_ANSWER_CALL, "answer:" + alertId, call.json, alertId);
    PendingIntent decline = declineIntent(context, alertId);
    Bundle extras = new Bundle();
    extras.putString(EXTRA_PAYLOAD, call.json);
    NotificationCompat.Builder builder =
        base(context, CALLS_CHANNEL, call)
            .setContentTitle(name)
            .setContentText(text)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(incoming)
            .addExtras(extras);
    long timeout = call.expiresAtMillis - System.currentTimeMillis();
    if (timeout > 0) builder.setTimeoutAfter(timeout);
    // Android 12 and 13 reject a call-style notification without a full-screen intent.
    boolean fullScreen = Build.VERSION.SDK_INT < 29 || granted(context, FULL_SCREEN_PERMISSION);
    if (fullScreen) builder.setFullScreenIntent(incoming, true);
    if (fullScreen || Build.VERSION.SDK_INT < 31) {
      Person caller = new Person.Builder().setName(name).setImportant(true).build();
      builder.setStyle(
          NotificationCompat.CallStyle.forIncomingCall(caller, decline, answer)
              .setIsVideo(call.video));
    } else {
      builder
          .addAction(0, context.getString(R.string.convohop_call_decline), decline)
          .addAction(0, context.getString(R.string.convohop_call_answer), answer);
    }
    if (Build.VERSION.SDK_INT < 26) {
      builder
          .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE), AudioManager.STREAM_RING)
          .setVibrate(RING_VIBRATION);
    }
    Notification notification = builder.build();
    notification.flags |= Notification.FLAG_INSISTENT;
    notify(context, alertId, CALL_ID, notification);
  }

  @SuppressLint("InlinedApi")
  static void showMissedCall(@NonNull Context context, @NonNull ConvoHopPayload cancelled) {
    createChannels(context);
    String alertId = cancelled.alertId;
    if (alertId == null) return;
    NotificationCompat.Builder builder =
        base(context, MISSED_CALLS_CHANNEL, cancelled)
            .setContentTitle(
                cancelled.title != null
                    ? cancelled.title
                    : context.getString(R.string.convohop_missed_call_title))
            .setCategory(Notification.CATEGORY_MISSED_CALL)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(
                activity(context, ACTION_OPEN, "missed:" + alertId, cancelled.json, alertId));
    if (cancelled.body != null) builder.setContentText(cancelled.body);
    notify(context, alertId, MISSED_CALL_ID, builder.build());
  }

  static void cancelRing(@NonNull Context context, @NonNull String alertId) {
    NotificationManagerCompat.from(context).cancel(alertId, CALL_ID);
  }

  /**
   * Removes the plugin's message notifications: {@code conversationId}'s, or all when it's null.
   * The app's own notifications may use the same ID and tags, so it removes only marked ones.
   */
  static void removeMessages(@NonNull Context context, @Nullable String conversationId) {
    NotificationManager manager = context.getSystemService(NotificationManager.class);
    if (manager == null) return;
    for (StatusBarNotification shown : manager.getActiveNotifications()) {
      String tag = shown.getTag();
      if (shown.getId() == MESSAGE_ID
          && tag != null
          && (conversationId == null || conversationId.equals(tag))
          && tag.equals(shown.getNotification().extras.getString(EXTRA_CONVERSATION_ID))) {
        manager.cancel(tag, MESSAGE_ID);
      }
    }
  }

  /** The payload of the ring {@code alertId} the device shows, if any. */
  @Nullable
  static String ringPayload(@NonNull Context context, @NonNull String alertId) {
    NotificationManager manager = context.getSystemService(NotificationManager.class);
    if (manager == null) return null;
    for (StatusBarNotification shown : manager.getActiveNotifications()) {
      if (shown.getId() == CALL_ID && alertId.equals(shown.getTag())) {
        return shown.getNotification().extras.getString(EXTRA_PAYLOAD);
      }
    }
    return null;
  }

  static boolean canUseFullScreenIntent(@NonNull Context context) {
    if (Build.VERSION.SDK_INT >= 34) {
      NotificationManager manager = context.getSystemService(NotificationManager.class);
      return manager != null && manager.canUseFullScreenIntent();
    }
    return Build.VERSION.SDK_INT < 29 || granted(context, FULL_SCREEN_PERMISSION);
  }

  private static NotificationCompat.Builder base(
      Context context, String channel, ConvoHopPayload payload) {
    NotificationCompat.Builder builder =
        new NotificationCompat.Builder(context, channel)
            .setSmallIcon(icon(context))
            .setWhen(payload.occurredAtMillis)
            .setShowWhen(true);
    Bundle meta = metaData(context);
    int color = meta == null ? 0 : meta.getInt(META_COLOR, 0);
    if (color != 0) {
      try {
        builder.setColor(ContextCompat.getColor(context, color));
      } catch (RuntimeException e) {
        Log.w(TAG, "Ignoring an invalid " + META_COLOR);
      }
    }
    return builder;
  }

  // Created each time, so the names follow the device's language. Android keeps the user's
  // settings of an existing channel.
  private static void createChannels(Context context) {
    if (Build.VERSION.SDK_INT < 26) return;
    NotificationManager manager = context.getSystemService(NotificationManager.class);
    if (manager == null) return;
    NotificationChannel messages =
        new NotificationChannel(
            MESSAGES_CHANNEL,
            context.getString(R.string.convohop_channel_messages),
            NotificationManager.IMPORTANCE_HIGH);
    NotificationChannel calls =
        new NotificationChannel(
            CALLS_CHANNEL,
            context.getString(R.string.convohop_channel_calls),
            NotificationManager.IMPORTANCE_HIGH);
    Uri ringtone = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
    calls.setSound(
        ringtone,
        new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build());
    calls.enableVibration(true);
    calls.setVibrationPattern(RING_VIBRATION);
    calls.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
    NotificationChannel missed =
        new NotificationChannel(
            MISSED_CALLS_CHANNEL,
            context.getString(R.string.convohop_channel_missed_calls),
            NotificationManager.IMPORTANCE_DEFAULT);
    manager.createNotificationChannel(messages);
    manager.createNotificationChannel(calls);
    manager.createNotificationChannel(missed);
  }

  // Opens the app's launcher activity. No data URI, so deep-link handlers ignore it. Other apps can
  // start that activity too, so the intent carries the install's secret.
  private static PendingIntent activity(
      Context context, String action, String key, @Nullable String payload, @Nullable String alertId) {
    Intent intent = new Intent(action);
    Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
    if (launch != null && launch.getComponent() != null) {
      intent.setComponent(launch.getComponent());
    } else {
      intent.setPackage(context.getPackageName());
    }
    intent.addFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK
            | Intent.FLAG_ACTIVITY_SINGLE_TOP
            | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    if (payload != null) intent.putExtra(EXTRA_PAYLOAD, payload);
    if (alertId != null) intent.putExtra(EXTRA_ALERT_ID, alertId);
    intent.putExtra(EXTRA_SECRET, ConvoHopState.intentSecret(context));
    return PendingIntent.getActivity(
        context,
        key.hashCode(),
        intent,
        PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
  }

  private static PendingIntent declineIntent(Context context, String alertId) {
    Intent intent =
        new Intent(ACTION_DECLINE_CALL)
            .setClass(context, ConvoHopCallReceiver.class)
            .putExtra(EXTRA_ALERT_ID, alertId);
    return PendingIntent.getBroadcast(
        context,
        ("decline:" + alertId).hashCode(),
        intent,
        PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
  }

  @SuppressLint("MissingPermission")
  private static void notify(Context context, String tag, int id, Notification notification) {
    NotificationManagerCompat manager = NotificationManagerCompat.from(context);
    if (!manager.areNotificationsEnabled()) return;
    try {
      manager.notify(tag, id, notification);
    } catch (SecurityException | IllegalArgumentException e) {
      Log.w(TAG, "Couldn't show a notification: " + e.getClass().getSimpleName());
    }
  }

  private static int icon(Context context) {
    Bundle meta = metaData(context);
    int icon = meta == null ? 0 : meta.getInt(META_ICON, 0);
    if (icon == 0) icon = context.getApplicationInfo().icon;
    return icon != 0 ? icon : android.R.drawable.sym_def_app_icon;
  }

  @Nullable
  @SuppressWarnings("deprecation")
  static Bundle metaData(Context context) {
    try {
      ApplicationInfo info =
          context
              .getPackageManager()
              .getApplicationInfo(context.getPackageName(), PackageManager.GET_META_DATA);
      return info.metaData;
    } catch (PackageManager.NameNotFoundException e) {
      return null;
    }
  }

  private static boolean granted(Context context, String permission) {
    return ContextCompat.checkSelfPermission(context, permission)
        == PackageManager.PERMISSION_GRANTED;
  }
}
