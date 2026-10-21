// Built by the Gradle build in android/ (see android/settings.gradle.kts). tools/docgen/extractors/android.mjs runs
// the extract task, which parses the SDK's Kotlin sources and writes their public API in the docs pipeline's
// surface format.
import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import org.jetbrains.kotlin.gradle.tasks.KotlinCompile
import org.jetbrains.kotlin.gradle.tasks.KotlinCompilerExecutionStrategy

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

tasks.named<KotlinCompile>("compileKotlin") {
    compilerExecutionStrategy.set(KotlinCompilerExecutionStrategy.IN_PROCESS)
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
    mainClass.set("dev.instantrelay.docs.android.MainKt")
    // Arguments name repository-relative paths.
    workingDir = rootDir.parentFile
    maxHeapSize = "512m"
}
