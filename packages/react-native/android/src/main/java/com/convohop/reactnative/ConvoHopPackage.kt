package com.convohop.reactnative

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

/** The ConvoHop TurboModules. React Native autolinking adds this package to your app. */
public class ConvoHopPackage : BaseReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? = when (name) {
        NativeConvoHopPlatformSpec.NAME -> ConvoHopPlatformModule(reactContext)
        NativeConvoHopPushSpec.NAME -> ConvoHopPushModule(reactContext)
        NativeConvoHopCallsSpec.NAME -> ConvoHopCallsModule(reactContext)
        else -> null
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider = ReactModuleInfoProvider {
        mapOf(
            NativeConvoHopPlatformSpec.NAME to info(NativeConvoHopPlatformSpec.NAME, ConvoHopPlatformModule::class.java, eager = false),
            // Eager, so it sees a notification the user opens before JavaScript first uses it.
            NativeConvoHopPushSpec.NAME to info(NativeConvoHopPushSpec.NAME, ConvoHopPushModule::class.java, eager = true),
            NativeConvoHopCallsSpec.NAME to info(NativeConvoHopCallsSpec.NAME, ConvoHopCallsModule::class.java, eager = false),
        )
    }

    private fun info(name: String, type: Class<*>, eager: Boolean): ReactModuleInfo =
        ReactModuleInfo(name, type.name, false, eager, false, true)
}
