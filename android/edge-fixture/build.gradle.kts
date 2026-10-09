import org.jetbrains.kotlin.gradle.dsl.JvmTarget

// Compiles tools/sdkgen's edge-schema goldens for the Kotlin emitter so a
// generator change that emits invalid Kotlin fails the Android build.
plugins {
    alias(libs.plugins.kotlin.jvm)
}

kotlin {
    explicitApi()
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
        allWarningsAsErrors.set(true)
    }
    sourceSets {
        main {
            kotlin.srcDir("../../tools/sdkgen/test/golden/edge/android/core/src/main/kotlin")
        }
    }
}

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

dependencies {
    implementation(libs.kotlinx.serialization.json)
}
