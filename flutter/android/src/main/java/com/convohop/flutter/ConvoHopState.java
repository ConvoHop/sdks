package com.convohop.flutter;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.SharedPreferences;
import android.util.Base64;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

/**
 * Push state that outlives the process: event IDs already handled, rings that stopped, call
 * actions Dart hasn't taken yet, and the secret the plugin's notification intents carry.
 */
final class ConvoHopState {
  private static final String PREFERENCES = "com.convohop.flutter.push";
  private static final String SEEN = "seen";
  private static final String STOPPED = "stopped";
  private static final String ACTIONS = "actions";
  private static final String INTENT_SECRET = "intentSecret";
  private static final int SEEN_CAPACITY = 128;
  private static final int STOPPED_CAPACITY = 128;
  private static final int ACTIONS_CAPACITY = 32;
  private static final long ACTION_LIFETIME_MILLIS = 5 * 60 * 1000L;
  private static final long DAY_MILLIS = 24 * 60 * 60 * 1000L;
  private static final Object LOCK = new Object();

  private ConvoHopState() {}

  /** Records an event ID. Returns false when it was already handled. */
  static boolean remember(@NonNull Context context, @NonNull String eventId) {
    synchronized (LOCK) {
      SharedPreferences preferences = preferences(context);
      JSONArray seen = array(preferences, SEEN);
      for (int index = 0; index < seen.length(); index++) {
        if (eventId.equals(seen.optString(index))) return false;
      }
      JSONArray next = new JSONArray();
      for (int index = Math.max(0, seen.length() - SEEN_CAPACITY + 1);
          index < seen.length();
          index++) {
        next.put(seen.optString(index));
      }
      next.put(eventId);
      preferences.edit().putString(SEEN, next.toString()).apply();
      return true;
    }
  }

  /**
   * Records that the ring {@code alertId} stopped. Returns the earlier reason when it had already
   * stopped, which it keeps, or null.
   */
  @Nullable
  static String stop(
      @NonNull Context context, @NonNull String alertId, long expiresAtMillis, @NonNull String reason) {
    synchronized (LOCK) {
      SharedPreferences preferences = preferences(context);
      JSONObject stopped = prune(object(preferences, STOPPED));
      JSONObject earlier = stopped.optJSONObject(alertId);
      if (earlier != null) return earlier.optString("reason", "ended");
      try {
        stopped.put(
            alertId, new JSONObject().put("expiresAt", expiresAtMillis).put("reason", reason));
      } catch (JSONException e) {
        throw new IllegalStateException(e);
      }
      while (stopped.length() > STOPPED_CAPACITY) stopped.remove(earliest(stopped));
      preferences.edit().putString(STOPPED, stopped.toString()).apply();
      return null;
    }
  }

  /** Why the ring {@code alertId} stopped, or null when it didn't. */
  @Nullable
  static String stopped(@NonNull Context context, @NonNull String alertId) {
    synchronized (LOCK) {
      JSONObject stopped = object(preferences(context), STOPPED).optJSONObject(alertId);
      return stopped == null ? null : stopped.optString("reason", "ended");
    }
  }

  /** Keeps a call action for Dart, which isn't listening. */
  static void queueAction(
      @NonNull Context context,
      @NonNull String action,
      @NonNull String alertId,
      @Nullable String payload) {
    synchronized (LOCK) {
      SharedPreferences preferences = preferences(context);
      JSONArray actions = array(preferences, ACTIONS);
      JSONArray next = new JSONArray();
      for (int index = Math.max(0, actions.length() - ACTIONS_CAPACITY + 1);
          index < actions.length();
          index++) {
        JSONObject queued = actions.optJSONObject(index);
        if (queued != null) next.put(queued);
      }
      try {
        JSONObject queued =
            new JSONObject()
                .put("action", action)
                .put("alertId", alertId)
                .put("at", System.currentTimeMillis());
        if (payload != null) queued.put("payload", payload);
        next.put(queued);
      } catch (JSONException e) {
        throw new IllegalStateException(e);
      }
      preferences.edit().putString(ACTIONS, next.toString()).apply();
    }
  }

  /** Removes and returns the queued call actions from the last five minutes, as events. */
  @NonNull
  static List<Map<String, Object>> takeActions(@NonNull Context context) {
    synchronized (LOCK) {
      SharedPreferences preferences = preferences(context);
      JSONArray actions = array(preferences, ACTIONS);
      preferences.edit().remove(ACTIONS).apply();
      List<Map<String, Object>> events = new ArrayList<>();
      long oldest = System.currentTimeMillis() - ACTION_LIFETIME_MILLIS;
      for (int index = 0; index < actions.length(); index++) {
        JSONObject queued = actions.optJSONObject(index);
        if (queued == null || queued.optLong("at") < oldest) continue;
        String payload = queued.optString("payload", null);
        events.add(
            ConvoHopEvents.callAction(
                queued.optString("action"), queued.optString("alertId"), payload));
      }
      return events;
    }
  }

  /**
   * A random secret, made once per install, that the plugin's notification intents carry. The
   * activity they open is exported, so other apps can send it intents too.
   */
  @NonNull
  @SuppressLint("ApplySharedPref")
  static String intentSecret(@NonNull Context context) {
    synchronized (LOCK) {
      SharedPreferences preferences = preferences(context);
      String secret = preferences.getString(INTENT_SECRET, null);
      if (secret != null) return secret;
      byte[] random = new byte[32];
      new SecureRandom().nextBytes(random);
      secret = Base64.encodeToString(random, Base64.NO_WRAP | Base64.NO_PADDING | Base64.URL_SAFE);
      // Written now: notifications outlive the process.
      preferences.edit().putString(INTENT_SECRET, secret).commit();
      return secret;
    }
  }

  /** Whether {@code secret}, from an intent, is this install's, so the plugin made the intent. */
  static boolean isIntentSecret(@NonNull Context context, @Nullable String secret) {
    String expected;
    synchronized (LOCK) {
      expected = preferences(context).getString(INTENT_SECRET, null);
    }
    return secret != null
        && expected != null
        && MessageDigest.isEqual(
            expected.getBytes(StandardCharsets.UTF_8), secret.getBytes(StandardCharsets.UTF_8));
  }

  private static SharedPreferences preferences(Context context) {
    return context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
  }

  private static JSONArray array(SharedPreferences preferences, String key) {
    try {
      return new JSONArray(preferences.getString(key, "[]"));
    } catch (JSONException e) {
      return new JSONArray();
    }
  }

  private static JSONObject object(SharedPreferences preferences, String key) {
    try {
      return new JSONObject(preferences.getString(key, "{}"));
    } catch (JSONException e) {
      return new JSONObject();
    }
  }

  // Keeps a stopped ring for a day after it would have expired, so a late duplicate of the call
  // doesn't ring again.
  private static JSONObject prune(JSONObject stopped) {
    long horizon = System.currentTimeMillis() - DAY_MILLIS;
    List<String> old = new ArrayList<>();
    for (Iterator<String> keys = stopped.keys(); keys.hasNext(); ) {
      String alertId = keys.next();
      JSONObject entry = stopped.optJSONObject(alertId);
      if (entry == null || entry.optLong("expiresAt") < horizon) old.add(alertId);
    }
    for (String alertId : old) stopped.remove(alertId);
    return stopped;
  }

  private static String earliest(JSONObject stopped) {
    String earliest = null;
    long expiresAt = Long.MAX_VALUE;
    for (Iterator<String> keys = stopped.keys(); keys.hasNext(); ) {
      String alertId = keys.next();
      JSONObject entry = stopped.optJSONObject(alertId);
      long value = entry == null ? Long.MIN_VALUE : entry.optLong("expiresAt");
      if (earliest == null || value < expiresAt) {
        earliest = alertId;
        expiresAt = value;
      }
    }
    return earliest;
  }
}
