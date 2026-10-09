// Built by the Gradle build in jvm/ (see jvm/settings.gradle.kts). The Java and Kotlin pages include code from
// src/main, and the tests in src/test run it against the conformance mock. Run them with
// `npm run test:docs -- jvm` from the repository root, after `npm ci`: the tests start the mock with node.
import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import org.jetbrains.kotlin.gradle.dsl.KotlinVersion

plugins {
    alias(libs.plugins.kotlin.jvm)
    java
}

description = "The tested examples in the Java and Kotlin documentation."

kotlin {
    jvmToolchain(17)
    // The examples compile with the oldest Kotlin and Java that the SDK supports.
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_11)
        apiVersion.set(KotlinVersion.KOTLIN_2_2)
        languageVersion.set(KotlinVersion.KOTLIN_2_2)
        allWarningsAsErrors.set(true)
        freeCompilerArgs.add("-Xjdk-release=11")
    }
}

dependencies {
    implementation(project(":convohop-server-kotlin"))
    implementation(libs.firebase.admin)

    testImplementation(testFixtures(project(":convohop-server")))
    testImplementation(platform(libs.junit.bom))
    testImplementation(libs.junit.jupiter)
    testRuntimeOnly(libs.junit.platform.launcher)
}

tasks.withType<Test>().configureEach {
    inputs.dir(rootDir.parentFile.resolve("conformance/mock")).withPathSensitivity(PathSensitivity.RELATIVE)
}
