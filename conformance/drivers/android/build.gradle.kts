import org.jetbrains.kotlin.gradle.dsl.JvmTarget

// The Android SDK's conformance driver. It runs the SDK's pure-JVM runtime
// (android/core) on the host JVM and speaks spec/conformance/driver-protocol.md.
// Build it from android/: ./gradlew :conformance-driver:installDist
plugins {
    alias(libs.plugins.kotlin.jvm)
    application
}

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
}

dependencies {
    implementation(project(":core"))
}
