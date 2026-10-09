import org.jetbrains.kotlin.gradle.dsl.JvmTarget

// The Android SDK's conformance driver. It runs the SDK's pure-JVM runtime
// (android/core) on the host JVM and speaks spec/conformance/driver-protocol.md.
// Build it from android/: ./gradlew :conformance-driver:installDist
plugins {
    alias(libs.plugins.kotlin.jvm)
    application
}

version = providers.gradleProperty("convohopVersion").get()

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
        allWarningsAsErrors.set(true)
    }
}

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

application {
    applicationName = "convohop-conformance-android"
    mainClass.set("com.convohop.conformance.DriverKt")
    // hello reports the artifact under test: the runtime that convohop-android wraps, since an Android library can't
    // load on a host JVM. A stdio driver that mostly waits on the network needs only a small heap and a quick-starting JIT.
    applicationDefaultJvmArgs = listOf(
        "-Dconvohop.conformance.package=com.convohop:convohop-android-core",
        "-Dconvohop.conformance.version=$version",
        "-Xmx256m",
        "-XX:+UseSerialGC",
        "-XX:TieredStopAtLevel=1",
    )
}

dependencies {
    implementation(project(":core"))
}
