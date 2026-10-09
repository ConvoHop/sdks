package com.convohop.flutter;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import io.flutter.plugin.common.EventChannel;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

/** Delivers native events to every Dart listener, on the main thread. */
final class ConvoHopEvents {
  private static final Handler MAIN = new Handler(Looper.getMainLooper());
  // Touched on the main thread only.
  private static final Set<EventChannel.EventSink> SINKS = new LinkedHashSet<>();

  private ConvoHopEvents() {}

  static void add(@NonNull EventChannel.EventSink sink) {
    SINKS.add(sink);
  }

  static void remove(@NonNull EventChannel.EventSink sink) {
    SINKS.remove(sink);
  }

  static void emit(@NonNull Map<String, Object> event) {
    onMain(
        () -> {
          for (EventChannel.EventSink sink : new ArrayList<>(SINKS)) sink.success(event);
        });
  }

  /** Reports a call action to Dart, or keeps it until Dart takes it when nothing listens. */
  static void action(
      @NonNull Context context,
      @NonNull String action,
      @NonNull String alertId,
      @Nullable String payload) {
    Context application = ConvoHopMessaging.application(context);
    onMain(
        () -> {
          if (SINKS.isEmpty()) {
            ConvoHopState.queueAction(application, action, alertId, payload);
            return;
          }
          Map<String, Object> event = callAction(action, alertId, payload);
          for (EventChannel.EventSink sink : new ArrayList<>(SINKS)) sink.success(event);
        });
  }

  @NonNull
  static Map<String, Object> callAction(
      @NonNull String action, @NonNull String alertId, @Nullable String payload) {
    Map<String, Object> event = new HashMap<>();
    event.put("type", "callAction");
    event.put("action", action);
    event.put("alertId", alertId);
    if (payload != null) event.put("payload", convohop(payload));
    return event;
  }

  /** An event for a notification the user opened. */
  @NonNull
  static Map<String, Object> opened(@NonNull String payload) {
    Map<String, Object> event = new HashMap<>();
    event.put("type", "opened");
    event.put("payload", convohop(payload));
    return event;
  }

  private static Map<String, Object> convohop(String payload) {
    Map<String, Object> data = new HashMap<>();
    data.put("convohop", payload);
    return data;
  }

  static void onMain(@NonNull Runnable action) {
    if (Looper.myLooper() == Looper.getMainLooper()) {
      action.run();
    } else {
      MAIN.post(action);
    }
  }
}
