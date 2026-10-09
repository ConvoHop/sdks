package com.convohop.flutter;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.view.WindowManager;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.google.android.gms.tasks.Task;
import com.google.firebase.installations.FirebaseInstallations;
import com.google.firebase.messaging.FirebaseMessaging;

import io.flutter.embedding.engine.plugins.FlutterPlugin;
import io.flutter.embedding.engine.plugins.activity.ActivityAware;
import io.flutter.embedding.engine.plugins.activity.ActivityPluginBinding;
import io.flutter.plugin.common.EventChannel;
import io.flutter.plugin.common.MethodCall;
import io.flutter.plugin.common.MethodChannel;
import io.flutter.plugin.common.PluginRegistry;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** The Android side of {@code ConvoHopPush}. */
public final class ConvoHopPlugin
    implements FlutterPlugin,
        MethodChannel.MethodCallHandler,
        EventChannel.StreamHandler,
        ActivityAware,
        PluginRegistry.NewIntentListener,
        PluginRegistry.RequestPermissionsResultListener {
  private static final String POST_NOTIFICATIONS = "android.permission.POST_NOTIFICATIONS";
  private static final String EXTRA_HANDLED = "com.convohop.flutter.HANDLED";
  private static final int PERMISSION_REQUEST = 6470;
  // Plugins with an activity. Touched on the main thread only.
  private static final Set<ConvoHopPlugin> WITH_ACTIVITY = new LinkedHashSet<>();

  private Context context;
  private MethodChannel methods;
  private EventChannel events;
  @Nullable private EventChannel.EventSink sink;
  @Nullable private ActivityPluginBinding activity;
  // The notification that opened the app before Dart listened.
  @Nullable private Map<String, Object> initial;
  private boolean overLockScreen;
  private final List<MethodChannel.Result> permissionResults = new ArrayList<>();

  @Override
  public void onAttachedToEngine(@NonNull FlutterPluginBinding binding) {
    context = binding.getApplicationContext();
    methods = new MethodChannel(binding.getBinaryMessenger(), "convohop/push");
    methods.setMethodCallHandler(this);
    events = new EventChannel(binding.getBinaryMessenger(), "convohop/push/events");
    events.setStreamHandler(this);
  }

  @Override
  public void onDetachedFromEngine(@NonNull FlutterPluginBinding binding) {
    methods.setMethodCallHandler(null);
    events.setStreamHandler(null);
    if (sink != null) ConvoHopEvents.remove(sink);
    sink = null;
  }

  @Override
  public void onListen(Object arguments, EventChannel.EventSink listener) {
    if (sink != null) ConvoHopEvents.remove(sink);
    sink = listener;
    ConvoHopEvents.add(listener);
  }

  @Override
  public void onCancel(Object arguments) {
    if (sink != null) ConvoHopEvents.remove(sink);
    sink = null;
  }

  @Override
  public void onAttachedToActivity(@NonNull ActivityPluginBinding binding) {
    activity = binding;
    binding.addOnNewIntentListener(this);
    binding.addRequestPermissionsResultListener(this);
    WITH_ACTIVITY.add(this);
    handleIntent(binding.getActivity().getIntent());
    if (overLockScreen && ConvoHopCalls.hasActive()) showOverLockScreen(true);
  }

  @Override
  public void onDetachedFromActivityForConfigChanges() {
    detachActivity(false);
  }

  @Override
  public void onReattachedToActivityForConfigChanges(@NonNull ActivityPluginBinding binding) {
    onAttachedToActivity(binding);
  }

  @Override
  public void onDetachedFromActivity() {
    detachActivity(true);
  }

  @Override
  public boolean onNewIntent(@NonNull Intent intent) {
    return handleIntent(intent);
  }

  @Override
  public boolean onRequestPermissionsResult(
      int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
    if (requestCode != PERMISSION_REQUEST) return false;
    completePermission(
        grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED);
    return true;
  }

  @Override
  public void onMethodCall(@NonNull MethodCall call, @NonNull MethodChannel.Result result) {
    switch (call.method) {
      case "getInitialNotification":
        result.success(initial);
        initial = null;
        break;
      case "takeCallActions":
        result.success(ConvoHopState.takeActions(context));
        break;
      case "requestPermission":
        requestPermission(result);
        break;
      case "register":
        register(result);
        break;
      case "registerVoip":
        result.success(null);
        break;
      case "canUseFullScreenIntent":
        result.success(ConvoHopNotifier.canUseFullScreenIntent(context));
        break;
      case "showNotification":
        {
          String json = string(call, "convohop");
          if (json == null) {
            invalid(result);
            return;
          }
          result.success(
              ConvoHopMessaging.handleMessage(context, Collections.singletonMap("convohop", json)));
          break;
        }
      case "showIncomingCall":
        {
          ConvoHopPayload payload = null;
          Object value = call.argument("convohop");
          if (value instanceof Map) {
            try {
              payload = ConvoHopPayload.tryParse(new JSONObject((Map<?, ?>) value).toString());
            } catch (RuntimeException e) {
              payload = null;
            }
          }
          if (payload == null || !ConvoHopPayload.CALL.equals(payload.eventType)) {
            invalid(result);
            return;
          }
          ConvoHopCalls.ring(context, payload);
          result.success(null);
          break;
        }
      case "answerCall":
      case "declineCall":
        {
          String alertId = string(call, "alertId");
          if (alertId == null) {
            invalid(result);
            return;
          }
          result.success(
              "answerCall".equals(call.method)
                  ? ConvoHopCalls.answer(context, alertId)
                  : ConvoHopCalls.decline(context, alertId));
          break;
        }
      case "endCall":
        {
          String alertId = string(call, "alertId");
          String reason = string(call, "reason");
          if (alertId == null || reason == null) {
            invalid(result);
            return;
          }
          ConvoHopCalls.end(context, alertId, reason);
          result.success(null);
          break;
        }
      case "removeDeliveredNotifications":
        ConvoHopNotifier.removeMessages(context, string(call, "conversationId"));
        result.success(null);
        break;
      case "setActiveConversation":
        ConvoHopMessaging.activeConversation = string(call, "conversationId");
        result.success(null);
        break;
      default:
        result.notImplemented();
    }
  }

  /** Drops the lock-screen flags once no call is on. */
  static void callsChanged() {
    if (ConvoHopCalls.hasActive()) return;
    for (ConvoHopPlugin plugin : new ArrayList<>(WITH_ACTIVITY)) {
      if (plugin.overLockScreen) plugin.showOverLockScreen(false);
    }
  }

  // Handles an intent from a ConvoHop notification. Returns whether it was one.
  private boolean handleIntent(@Nullable Intent intent) {
    if (intent == null) return false;
    String action = intent.getAction();
    if (!ConvoHopNotifier.ACTION_OPEN.equals(action)
        && !ConvoHopNotifier.ACTION_INCOMING_CALL.equals(action)
        && !ConvoHopNotifier.ACTION_ANSWER_CALL.equals(action)) {
      return false;
    }
    // The activity is exported: ignore intents that another app made.
    if (!ConvoHopState.isIntentSecret(
        context, intent.getStringExtra(ConvoHopNotifier.EXTRA_SECRET))) {
      return false;
    }
    // A relaunch from Recents or a configuration change replays the intent.
    if (intent.getBooleanExtra(EXTRA_HANDLED, false)
        || (intent.getFlags() & Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY) != 0) {
      return true;
    }
    intent.putExtra(EXTRA_HANDLED, true);
    String alertId = intent.getStringExtra(ConvoHopNotifier.EXTRA_ALERT_ID);
    if (ConvoHopNotifier.ACTION_ANSWER_CALL.equals(action)
        && alertId != null
        && ConvoHopCalls.answer(context, alertId)) {
      showOverLockScreen(true);
      return true;
    }
    String json = intent.getStringExtra(ConvoHopNotifier.EXTRA_PAYLOAD);
    if (json == null) return true;
    Map<String, Object> event = ConvoHopEvents.opened(json);
    ConvoHopPayload payload = ConvoHopPayload.tryParse(json);
    if (payload != null && ConvoHopPayload.CALL.equals(payload.eventType)) {
      String stopped = ConvoHopCalls.stopped(context, payload);
      event.put("ringing", stopped == null);
      if (stopped != null) {
        event.put("reason", stopped);
      } else {
        showOverLockScreen(true);
      }
    }
    if (sink != null) {
      sink.success(event);
    } else {
      initial = event;
    }
    return true;
  }

  @SuppressWarnings("deprecation")
  private void showOverLockScreen(boolean show) {
    overLockScreen = show;
    if (activity == null) return;
    Activity current = activity.getActivity();
    if (Build.VERSION.SDK_INT >= 27) {
      current.setShowWhenLocked(show);
      current.setTurnScreenOn(show);
    } else {
      int flags =
          WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
              | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON;
      if (show) {
        current.getWindow().addFlags(flags);
      } else {
        current.getWindow().clearFlags(flags);
      }
    }
  }

  private void detachActivity(boolean finished) {
    if (activity == null) return;
    boolean wasOverLockScreen = overLockScreen;
    if (overLockScreen) showOverLockScreen(false);
    // Keep the flag for the activity that replaces this one after a configuration change.
    overLockScreen = !finished && wasOverLockScreen;
    activity.removeOnNewIntentListener(this);
    activity.removeRequestPermissionsResultListener(this);
    activity = null;
    WITH_ACTIVITY.remove(this);
    completePermission(false);
  }

  private void requestPermission(MethodChannel.Result result) {
    if (Build.VERSION.SDK_INT < 33
        || ContextCompat.checkSelfPermission(context, POST_NOTIFICATIONS)
            == PackageManager.PERMISSION_GRANTED) {
      result.success(NotificationManagerCompat.from(context).areNotificationsEnabled());
      return;
    }
    if (activity == null) {
      result.success(false);
      return;
    }
    permissionResults.add(result);
    if (permissionResults.size() == 1) {
      ActivityCompat.requestPermissions(
          activity.getActivity(), new String[] {POST_NOTIFICATIONS}, PERMISSION_REQUEST);
    }
  }

  private void completePermission(boolean granted) {
    List<MethodChannel.Result> results = new ArrayList<>(permissionResults);
    permissionResults.clear();
    for (MethodChannel.Result result : results) result.success(granted);
  }

  // FCM issues a registration token, or registers the app's Firebase installation ID when the
  // app's manifest switches it to installation IDs. Its callbacks go to the app's messaging
  // service, which may not be ConvoHop's, so the result carries the registration too.
  private void register(MethodChannel.Result result) {
    FirebaseMessaging messaging;
    try {
      messaging = FirebaseMessaging.getInstance();
    } catch (IllegalStateException e) {
      result.error("FIREBASE_UNAVAILABLE", "Firebase isn't configured", null);
      return;
    }
    boolean installationId = ConvoHopMessaging.installationIdEnabled(context);
    Task<String> registration =
        installationId
            ? messaging
                .register()
                .onSuccessTask(unused -> FirebaseInstallations.getInstance().getId())
            : token(messaging);
    registration.addOnCompleteListener(
        task -> {
          String value = task.isSuccessful() ? task.getResult() : null;
          if (value == null || value.isEmpty()) {
            result.error("FIREBASE_UNAVAILABLE", "Couldn't register with FCM", null);
            return;
          }
          result.success(ConvoHopMessaging.registration(installationId ? "fid" : "token", value));
        });
  }

  // FCM deprecated registration tokens for installation IDs, which are an app-wide switch.
  @SuppressWarnings("deprecation")
  private static Task<String> token(FirebaseMessaging messaging) {
    return messaging.getToken();
  }

  @Nullable
  private static String string(MethodCall call, String key) {
    Object value = call.argument(key);
    return value instanceof String && !((String) value).isEmpty() ? (String) value : null;
  }

  private static void invalid(MethodChannel.Result result) {
    result.error("INVALID_ARGUMENT", "Invalid arguments", null);
  }
}
