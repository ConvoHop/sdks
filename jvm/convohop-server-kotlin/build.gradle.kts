import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import org.jetbrains.kotlin.gradle.dsl.KotlinVersion

plugins {
    alias(libs.plugins.kotlin.jvm)
    `java-library`
    `maven-publish`
}

description = "Kotlin coroutine extensions for the ConvoHop server SDK."

java {
    withSourcesJar()
    withJavadocJar()
}

kotlin {
    jvmToolchain(17)
    explicitApi()
    // Consumers may compile with an older Kotlin than the one that builds this module.
    coreLibrariesVersion = "2.2.20"
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_11)
        apiVersion.set(KotlinVersion.KOTLIN_2_2)
        languageVersion.set(KotlinVersion.KOTLIN_2_2)
        allWarningsAsErrors.set(true)
        freeCompilerArgs.add("-Xjdk-release=11")
    }
    sourceSets.named("main") {
        kotlin.srcDir("src/generated/kotlin")
    }
}

dependencies {
    api(project(":convohop-server"))
    api(libs.kotlinx.coroutines.core)

    testImplementation(testFixtures(project(":convohop-server")))
    testImplementation(platform(libs.junit.bom))
    testImplementation(libs.junit.jupiter)
    testRuntimeOnly(libs.junit.platform.launcher)
}

tasks.jar {
    manifest.attributes("Automatic-Module-Name" to "com.convohop.server.kotlin")
}

publishing {
    publications {
        create<MavenPublication>("maven") {
            from(components["java"])
        }
    }
}
