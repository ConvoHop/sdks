// Built by the Gradle build in android/ (see android/settings.gradle.kts). tools/docgen/extractors/android.mjs runs
// the extract task, which parses the SDK's Kotlin sources and writes their public API in the docs pipeline's
// surface format.
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.kotlin.jvm)
}

description = "Extracts the public API of the Android SDK for the docs generator."

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
        allWarningsAsErrors.set(true)
    }
}

dependencies {
    implementation(libs.kotlin.compiler.embeddable)

    testImplementation(libs.junit)
}

tasks.test {
    maxHeapSize = "512m"
}

tasks.register<JavaExec>("extract") {
    description = "Writes the Android SDK's public API. Run it through tools/docgen/extractors/android.mjs."
    classpath = sourceSets.main.get().runtimeClasspath
    mainClass.set("com.convohop.docs.android.MainKt")
    // Arguments name repository-relative paths.
    workingDir = rootDir.parentFile
    maxHeapSize = "512m"
}
