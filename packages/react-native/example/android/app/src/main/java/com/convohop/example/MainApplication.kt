package com.convohop.example

import android.app.Application
import com.convohop.android.push.ConvoHopNotificationOptions
import com.convohop.reactnative.ConvoHopReactNative
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.livekit.reactnative.LiveKitReactNative
import com.livekit.reactnative.audio.AudioType

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList = PackageList(this).packages,
    )
  }

  override fun onCreate() {
    super.onCreate()
    // LiveKit sets up WebRTC's audio before React Native loads. Calls play on the voice-call stream.
    LiveKitReactNative.setup(this, AudioType.CommunicationAudioType())
    // A push can start the app without an activity, so the push SDK is configured here, before React Native loads.
    ConvoHopReactNative.configure(this, ConvoHopNotificationOptions().apply { smallIcon = R.drawable.ic_notification })
    loadReactNative(this)
  }
}
