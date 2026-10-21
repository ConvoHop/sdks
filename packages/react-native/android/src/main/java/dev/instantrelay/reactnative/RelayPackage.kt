package dev.instantrelay.reactnative

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

/** The Relay TurboModules. React Native autolinking adds this package to your app. */
public class RelayPackage : BaseReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? = when (name) {
        NativeRelayPlatformSpec.NAME -> RelayPlatformModule(reactContext)
        NativeRelayPushSpec.NAME -> RelayPushModule(reactContext)
        NativeRelayCallsSpec.NAME -> RelayCallsModule(reactContext)
        else -> null
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider = ReactModuleInfoProvider {
        mapOf(
            NativeRelayPlatformSpec.NAME to info(NativeRelayPlatformSpec.NAME, RelayPlatformModule::class.java, eager = false),
            // Eager, so it sees a notification the user opens before JavaScript first uses it.
            NativeRelayPushSpec.NAME to info(NativeRelayPushSpec.NAME, RelayPushModule::class.java, eager = true),
            NativeRelayCallsSpec.NAME to info(NativeRelayCallsSpec.NAME, RelayCallsModule::class.java, eager = false),
        )
    }

    private fun info(name: String, type: Class<*>, eager: Boolean): ReactModuleInfo =
        ReactModuleInfo(name, type.name, false, eager, false, true)
}
