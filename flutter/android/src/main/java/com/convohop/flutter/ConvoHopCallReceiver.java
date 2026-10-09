package com.convohop.flutter;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Declines a ring from its notification without opening the app. */
public final class ConvoHopCallReceiver extends BroadcastReceiver {
  @Override
  public void onReceive(Context context, Intent intent) {
    if (!ConvoHopNotifier.ACTION_DECLINE_CALL.equals(intent.getAction())) return;
    String alertId = intent.getStringExtra(ConvoHopNotifier.EXTRA_ALERT_ID);
    if (alertId != null) ConvoHopCalls.decline(context, alertId);
  }
}
