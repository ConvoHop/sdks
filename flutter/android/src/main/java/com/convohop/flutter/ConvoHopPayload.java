package com.convohop.flutter;

import android.util.JsonReader;
import android.util.JsonToken;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import java.io.IOException;
import java.io.StringReader;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The {@code convohop} object of a push, checked like the Dart parser does: it follows
 * {@code $defs/data} in spec/push-payload/push-payload.schema.json. Problems name the field,
 * never its value.
 */
final class ConvoHopPayload {
  static final String MESSAGE = "notification.message";
  static final String CALL = "notification.call";
  static final String CALL_CANCELLED = "notification.callCancelled";

  private static final String TAG = "ConvoHop";
  private static final Pattern UUID =
      Pattern.compile("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}");
  private static final String NIL_UUID = "00000000-0000-0000-0000-000000000000";
  private static final Pattern TIMESTAMP =
      Pattern.compile(
          "([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\\.[0-9]{1,9})?"
              + "(?:Z|([+-])([0-9]{2}):([0-9]{2}))");
  private static final Pattern IDENTIFIER = Pattern.compile("[A-Za-z][A-Za-z0-9_]{0,63}");
  // A field whose value isn't a JSON string.
  private static final Object NOT_TEXT = new Object();

  /** The object as JSON, for handing it to Dart. */
  @NonNull final String json;

  @NonNull final String eventType;
  @NonNull final String eventId;
  final long occurredAtMillis;
  @NonNull final String conversationId;
  @Nullable final String title;
  @Nullable final String body;
  // Rings only.
  @Nullable final String alertId;
  final long expiresAtMillis;
  final boolean video;
  // Cancellations only.
  @Nullable final String reason;

  @SuppressWarnings("serial")
  static final class InvalidException extends Exception {
    InvalidException(String field) {
      super("convohop." + field + " is invalid");
    }
  }

  private ConvoHopPayload(@NonNull String json, @NonNull Map<String, Object> fields)
      throws InvalidException {
    this.json = json;
    title = text(fields, "title");
    body = text(fields, "body");
    Object type = fields.get("eventType");
    if (!MESSAGE.equals(type) && !CALL.equals(type) && !CALL_CANCELLED.equals(type)) {
      throw new InvalidException("eventType");
    }
    eventType = (String) type;
    eventId = uuid(fields, "eventId");
    occurredAtMillis = timestamp(fields, "occurredAt");
    uuid(fields, "projectId");
    uuid(fields, "recipientId");
    conversationId = uuid(fields, "conversationId");
    uuid(fields, "senderId");
    if (MESSAGE.equals(eventType)) {
      uuid(fields, "messageId");
      alertId = null;
      expiresAtMillis = 0;
      video = false;
      reason = null;
      return;
    }
    uuid(fields, "liveSessionId");
    alertId = uuid(fields, "alertId");
    expiresAtMillis = timestamp(fields, "expiresAt");
    video = "AUDIO_VIDEO".equals(identifier(fields, "mediaProfile"));
    reason = CALL_CANCELLED.equals(eventType) ? identifier(fields, "reason") : null;
  }

  @NonNull
  static ConvoHopPayload parse(@NonNull String json) throws InvalidException {
    Map<String, Object> fields;
    try {
      fields = read(json);
    } catch (IOException | RuntimeException e) {
      throw new InvalidException("json");
    }
    return new ConvoHopPayload(json, fields);
  }

  /** The payload, or null when it's invalid. */
  @Nullable
  static ConvoHopPayload tryParse(@Nullable String json) {
    if (json == null) return null;
    try {
      return parse(json);
    } catch (InvalidException e) {
      Log.w(TAG, "Ignoring an invalid push: " + e.getMessage());
      return null;
    }
  }

  boolean isRing() {
    return alertId != null;
  }

  // Strict JSON, like Dart's jsonDecode: one object and nothing after it. Fields that aren't
  // strings are kept as NOT_TEXT.
  private static Map<String, Object> read(String json) throws IOException {
    Map<String, Object> fields = new HashMap<>();
    try (JsonReader reader = new JsonReader(new StringReader(json))) {
      reader.beginObject();
      while (reader.hasNext()) {
        String name = reader.nextName();
        if (reader.peek() == JsonToken.STRING) {
          fields.put(name, reader.nextString());
        } else {
          reader.skipValue();
          fields.put(name, NOT_TEXT);
        }
      }
      reader.endObject();
      if (reader.peek() != JsonToken.END_DOCUMENT) throw new IOException("trailing content");
    }
    return fields;
  }

  private static String uuid(Map<String, Object> fields, String field) throws InvalidException {
    Object value = fields.get(field);
    if (!(value instanceof String)
        || !UUID.matcher((String) value).matches()
        || NIL_UUID.equals(value)) {
      throw new InvalidException(field);
    }
    return (String) value;
  }

  private static long timestamp(Map<String, Object> fields, String field)
      throws InvalidException {
    Object value = fields.get(field);
    Long seconds = value instanceof String ? epochSeconds((String) value) : null;
    if (seconds == null) throw new InvalidException(field);
    return seconds * 1000;
  }

  private static String identifier(Map<String, Object> fields, String field)
      throws InvalidException {
    Object value = fields.get(field);
    if (!(value instanceof String) || !IDENTIFIER.matcher((String) value).matches()) {
      throw new InvalidException(field);
    }
    return (String) value;
  }

  @Nullable
  private static String text(Map<String, Object> fields, String field) throws InvalidException {
    if (!fields.containsKey(field)) return null;
    Object value = fields.get(field);
    if (!(value instanceof String) || ((String) value).isEmpty() || !wellFormed((String) value)) {
      throw new InvalidException(field);
    }
    return (String) value;
  }

  private static boolean wellFormed(String value) {
    for (int index = 0; index < value.length(); index++) {
      char unit = value.charAt(index);
      if (Character.isHighSurrogate(unit)) {
        if (index + 1 == value.length() || !Character.isLowSurrogate(value.charAt(index + 1))) {
          return false;
        }
        index++;
      } else if (Character.isLowSurrogate(unit)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Unix seconds of an RFC 3339 timestamp with an uppercase T, and Z or an offset, ignoring any
   * fraction, or null when the value isn't one. The date must exist; second 60 isn't accepted.
   */
  @Nullable
  static Long epochSeconds(String value) {
    Matcher match = TIMESTAMP.matcher(value);
    if (!match.matches()) return null;
    int year = Integer.parseInt(match.group(1));
    int month = Integer.parseInt(match.group(2));
    int day = Integer.parseInt(match.group(3));
    int hour = Integer.parseInt(match.group(4));
    int minute = Integer.parseInt(match.group(5));
    int second = Integer.parseInt(match.group(6));
    int offsetHour = match.group(8) == null ? 0 : Integer.parseInt(match.group(8));
    int offsetMinute = match.group(9) == null ? 0 : Integer.parseInt(match.group(9));
    if (month < 1
        || month > 12
        || day < 1
        || day > daysIn(year, month)
        || hour > 23
        || minute > 59
        || second > 59
        || offsetHour > 23
        || offsetMinute > 59) {
      return null;
    }
    long local = daysFromCivil(year, month, day) * 86400L + hour * 3600L + minute * 60L + second;
    int sign = "-".equals(match.group(7)) ? -1 : 1;
    return local - sign * (offsetHour * 3600L + offsetMinute * 60L);
  }

  private static int daysIn(int year, int month) {
    if (month == 2) return year % 4 == 0 && (year % 100 != 0 || year % 400 == 0) ? 29 : 28;
    return month == 4 || month == 6 || month == 9 || month == 11 ? 30 : 31;
  }

  // Days since 1970-01-01 in the proleptic Gregorian calendar (Howard Hinnant's algorithm).
  private static long daysFromCivil(long year, int month, int day) {
    year -= month <= 2 ? 1 : 0;
    long era = (year >= 0 ? year : year - 399) / 400;
    long yearOfEra = year - era * 400;
    long dayOfYear = (153L * (month + (month > 2 ? -3 : 9)) + 2) / 5 + day - 1;
    long dayOfEra = yearOfEra * 365 + yearOfEra / 4 - yearOfEra / 100 + dayOfYear;
    return era * 146097 + dayOfEra - 719468;
  }
}
