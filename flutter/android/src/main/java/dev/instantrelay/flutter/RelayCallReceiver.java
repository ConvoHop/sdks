package dev.instantrelay.flutter;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Declines a ring from its notification without opening the app. */
public class RelayCallReceiver extends BroadcastReceiver {
  @Override
  public void onReceive(Context context, Intent intent) {
    if (!RelayNotifier.ACTION_DECLINE_CALL.equals(intent.getAction())) return;
    String alertId = intent.getStringExtra(RelayNotifier.EXTRA_ALERT_ID);
    if (alertId != null) RelayCalls.decline(context, alertId);
  }
}
