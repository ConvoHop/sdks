package com.convohop.examples;

// #region imports
import com.convohop.server.push.ApnsRequest;
import com.convohop.server.push.FcmRequest;
import com.convohop.server.push.PushOptions;
import com.convohop.server.push.PushPayloads;
import com.convohop.server.push.WebPushRequest;
import com.convohop.server.webhooks.WebhookNotificationEvent;
import java.util.List;
// #endregion imports
// #region fcm-imports
import com.google.firebase.messaging.AndroidConfig;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import java.util.concurrent.TimeUnit;
// #endregion fcm-imports

/** Push quickstart snippets. PushTest runs them on every vector in spec/push-payload. */
public final class Push {
  private Push() {}

  // #region notify
  // The devices that your app registered for a user, from your own database.
  public interface Device {}

  public static final class IosDevice implements Device {
    public final String token;
    public final String voipToken; // The PushKit token of an app that uses CallKit, or null.

    public IosDevice(String token, String voipToken) {
      this.token = token;
      this.voipToken = voipToken;
    }
  }

  // An Android app's registration token, or its Firebase Installation ID (FID) when its manifest sets
  // firebase_messaging_installation_id_enabled. Exactly one is non-null.
  public static final class FcmTarget {
    public final String token;
    public final String fid;

    private FcmTarget(String token, String fid) {
      this.token = token;
      this.fid = fid;
    }

    public static FcmTarget token(String token) {
      return new FcmTarget(token, null);
    }

    public static FcmTarget fid(String fid) {
      return new FcmTarget(null, fid);
    }
  }

  public static final class AndroidDevice implements Device {
    public final FcmTarget target;

    public AndroidDevice(FcmTarget target) {
      this.target = target;
    }
  }

  public static final class WebDevice implements Device {
    public final String subscription; // The JSON of a browser's PushSubscription.

    public WebDevice(String subscription) {
      this.subscription = subscription;
    }
  }

  // Your push clients: an APNs HTTP/2 client, the Firebase Admin SDK and a Web Push library.
  public interface PushSenders {
    void apns(String token, ApnsRequest request);

    void fcm(FcmTarget target, FcmRequest request);

    void webPush(String subscription, WebPushRequest request);
  }

  // bundleId is your iOS app's bundle ID. options sets your own text, such as the sender's name as the title.
  public static void notifyDevices(
      WebhookNotificationEvent event, List<Device> devices, PushSenders senders, String bundleId, PushOptions options) {
    for (Device device : devices) {
      // Each builder returns null when the event doesn't apply to the platform or is stale. Send nothing then.
      if (device instanceof IosDevice) {
        IosDevice ios = (IosDevice) device;
        // A CallKit app gets incoming calls as VoIP pushes, and must report each one to CallKit.
        ApnsRequest voip = ios.voipToken == null ? null : PushPayloads.apnsVoip(event, bundleId, options);
        if (voip != null) {
          senders.apns(ios.voipToken, voip);
        } else {
          ApnsRequest alert = PushPayloads.apnsAlert(event, bundleId, options); // null when a ring was answered or declined.
          if (alert != null) {
            senders.apns(ios.token, alert);
          }
        }
      } else if (device instanceof AndroidDevice) {
        FcmRequest request = PushPayloads.fcm(event, options);
        if (request != null) {
          senders.fcm(((AndroidDevice) device).target, request);
        }
      } else if (device instanceof WebDevice) {
        WebPushRequest request = PushPayloads.webPush(event, options);
        if (request != null) {
          senders.webPush(((WebDevice) device).subscription, request);
        }
      }
    }
  }
  // #endregion notify

  // #region fcm
  // The Firebase Admin SDK takes the Android options in its own form. setTtl takes milliseconds: passing
  // getTtlSeconds() as is would make a ring expire almost at once.
  @SuppressWarnings("deprecation") // setToken
  public static Message firebaseMessage(FcmTarget target, FcmRequest request) {
    AndroidConfig.Builder android = AndroidConfig.builder()
        .setPriority(AndroidConfig.Priority.valueOf(request.getPriority()))
        .setTtl(TimeUnit.SECONDS.toMillis(request.getTtlSeconds()));
    if (request.getCollapseKey() != null) {
      android.setCollapseKey(request.getCollapseKey());
    }
    Message.Builder message = Message.builder().putAllData(request.getData()).setAndroidConfig(android.build());
    // The Firebase Admin SDK sends to a fid from 9.10.0. That version deprecates setToken, which still sends.
    return (target.fid != null ? message.setFid(target.fid) : message.setToken(target.token)).build();
  }

  // messaging is FirebaseMessaging.getInstance(), after you call FirebaseApp.initializeApp() with your service
  // account. Returns FCM's ID for the message.
  public static String sendFcm(FirebaseMessaging messaging, FcmTarget target, FcmRequest request)
      throws FirebaseMessagingException {
    return messaging.send(firebaseMessage(target, request));
  }
  // #endregion fcm
}
