import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.kotlin.jvm)
    `java-library`
    `maven-publish`
}

group = "com.convohop"
version = providers.gradleProperty("convohopVersion").get()

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
    withSourcesJar()
}

kotlin {
    explicitApi()
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
        allWarningsAsErrors.set(true)
    }
}

dependencies {
    api(libs.kotlinx.coroutines.core)
    api(libs.kotlinx.serialization.json)
    api(libs.okhttp)

    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.okhttp.mockwebserver)
}

tasks.test {
    // The push vectors and conformance fixtures are shared with the other SDKs.
    systemProperty("convohop.repoRoot", rootDir.parentFile.absolutePath)
    maxHeapSize = "512m"
}

publishing {
    publications {
        create<MavenPublication>("release") {
            // The pure-JVM runtime the Android library builds on; not a supported entry point.
            artifactId = "convohop-android-core"
            from(components["java"])
        }
    }
    repositories {
        // Registry publishing is not approved yet; publish only into the build directory.
        maven {
            name = "build"
            url = uri(rootProject.layout.buildDirectory.dir("repo"))
        }
    }
}
