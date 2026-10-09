package com.convohop.flutter;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Rings for incoming calls with a call-style notification, and keeps them in step with
 * cancellations, the user's actions and Dart.
 */
final class ConvoHopCalls {
  private static final Object LOCK = new Object();
  private static final Handler MAIN = new Handler(Looper.getMainLooper());
  // Ringing alert IDs and their payloads.
  private static final Map<String, String> RINGING = new HashMap<>();
  // Rings and answered calls, which may show over the lock screen.
  private static final Set<String> ACTIVE = new HashSet<>();

  private ConvoHopCalls() {}

  /** Rings for {@code call} unless the ring stopped, expired or rings already. */
  static void ring(@NonNull Context context, @NonNull ConvoHopPayload call) {
    String alertId = call.alertId;
    if (alertId == null) return;
    long delay;
    synchronized (LOCK) {
      delay = call.expiresAtMillis - System.currentTimeMillis();
      if (delay <= 0
          || RINGING.containsKey(alertId)
          || ConvoHopState.stopped(context, alertId) != null) {
        return;
      }
      RINGING.put(alertId, call.json);
      ACTIVE.add(alertId);
      ConvoHopNotifier.showRing(context, call);
    }
    MAIN.postDelayed(() -> expire(context, alertId), delay);
    changed();
  }

  /** Stops the ring {@code cancelled} names, and shows a missed call when the user missed it. */
  static void cancelled(@NonNull Context context, @NonNull ConvoHopPayload cancelled) {
    String alertId = cancelled.alertId;
    String reason = cancelled.reason;
    if (alertId == null || reason == null) return;
    synchronized (LOCK) {
      String earlier = ConvoHopState.stop(context, alertId, cancelled.expiresAtMillis, reason);
      RINGING.remove(alertId);
      ConvoHopNotifier.cancelRing(context, alertId);
      if (!"answered".equals(earlier)) ACTIVE.remove(alertId);
      boolean missed = "ended".equals(reason) || "expired".equals(reason);
      if (missed && !"answered".equals(earlier) && !"declined".equals(earlier)) {
        ConvoHopNotifier.showMissedCall(context, cancelled);
      }
    }
    changed();
  }

  /**
   * Answers the ring {@code alertId} and reports it to Dart. Returns false when the ring stopped.
   */
  static boolean answer(@NonNull Context context, @NonNull String alertId) {
    String payload = act(context, alertId, "answered");
    if (payload == null) return false;
    ConvoHopEvents.action(context, "answer", alertId, payload.isEmpty() ? null : payload);
    changed();
    return true;
  }

  /**
   * Declines the ring {@code alertId} on this device and reports it to Dart. Returns false when
   * the ring stopped.
   */
  static boolean decline(@NonNull Context context, @NonNull String alertId) {
    String payload = act(context, alertId, "declined");
    if (payload == null) return false;
    ConvoHopEvents.action(context, "decline", alertId, payload.isEmpty() ? null : payload);
    changed();
    return true;
  }

  /** Ends the ring or call {@code alertId} without a call action. */
  static void end(@NonNull Context context, @NonNull String alertId, @NonNull String reason) {
    synchronized (LOCK) {
      String payload = payload(context, alertId);
      ConvoHopPayload call = ConvoHopPayload.tryParse(payload);
      long expiresAt = call != null ? call.expiresAtMillis : System.currentTimeMillis();
      ConvoHopState.stop(context, alertId, expiresAt, reason);
      RINGING.remove(alertId);
      ACTIVE.remove(alertId);
      ConvoHopNotifier.cancelRing(context, alertId);
    }
    changed();
  }

  /** Why {@code call}'s ring stopped, or null while it rings. */
  @Nullable
  static String stopped(@NonNull Context context, @NonNull ConvoHopPayload call) {
    String alertId = call.alertId;
    if (alertId == null) return null;
    String reason = ConvoHopState.stopped(context, alertId);
    if (reason != null) return reason;
    return call.expiresAtMillis <= System.currentTimeMillis() ? "expired" : null;
  }

  /** Whether a ring or an answered call is on. */
  static boolean hasActive() {
    synchronized (LOCK) {
      return !ACTIVE.isEmpty();
    }
  }

  // Stops the ring for a user action. Returns its payload, empty when unknown, or null when the
  // ring had stopped.
  @Nullable
  private static String act(Context context, String alertId, String reason) {
    synchronized (LOCK) {
      String payload = payload(context, alertId);
      ConvoHopPayload call = ConvoHopPayload.tryParse(payload);
      long now = System.currentTimeMillis();
      if (ConvoHopState.stopped(context, alertId) != null
          || (call != null && call.expiresAtMillis <= now)) {
        return null;
      }
      ConvoHopState.stop(context, alertId, call != null ? call.expiresAtMillis : now, reason);
      RINGING.remove(alertId);
      if ("answered".equals(reason)) {
        ACTIVE.add(alertId);
      } else {
        ACTIVE.remove(alertId);
      }
      ConvoHopNotifier.cancelRing(context, alertId);
      return call != null ? call.json : "";
    }
  }

  @Nullable
  private static String payload(Context context, String alertId) {
    String payload = RINGING.get(alertId);
    return payload != null ? payload : ConvoHopNotifier.ringPayload(context, alertId);
  }

  private static void expire(Context context, String alertId) {
    synchronized (LOCK) {
      if (RINGING.remove(alertId) == null) return;
      ACTIVE.remove(alertId);
      ConvoHopNotifier.cancelRing(context, alertId);
    }
    changed();
  }

  private static void changed() {
    ConvoHopEvents.onMain(ConvoHopPlugin::callsChanged);
  }
}
