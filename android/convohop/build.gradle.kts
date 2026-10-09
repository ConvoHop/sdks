import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.android.library)
    `maven-publish`
}

group = "com.convohop"
version = providers.gradleProperty("convohopVersion").get()

android {
    namespace = "com.convohop.android"
    compileSdk = 36

    defaultConfig {
        minSdk = 24
        consumerProguardFiles("consumer-rules.pro")
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    testOptions {
        unitTests {
            isIncludeAndroidResources = true
            all { test ->
                test.maxHeapSize = "1g"
                // -ProbolectricSdks=34 runs only those Android versions, so local runs download fewer of them.
                providers.gradleProperty("robolectricSdks").orNull?.let { test.systemProperty("robolectric.enabledSdks", it) }
            }
        }
    }

    lint {
        abortOnError = true
        // Also check the pure-JVM runtime against minSdk 24.
        checkDependencies = true
        textReport = true
        textOutput = file("stdout")
    }

    publishing {
        singleVariant("release") {
            withSourcesJar()
        }
    }
}

kotlin {
    explicitApi()
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
        allWarningsAsErrors.set(true)
    }
}

dependencies {
    api(project(":core"))
    api(project(":push"))
    api(libs.livekit.android)
    implementation(libs.androidx.core)
    implementation(libs.kotlinx.coroutines.android)
    // Apps that use FCM bring Firebase themselves; the SDK only adapts to it.
    compileOnly(libs.firebase.messaging)

    testImplementation(libs.junit)
    testImplementation(libs.robolectric)
    testImplementation(libs.kotlinx.coroutines.test)
}

publishing {
    publications {
        create<MavenPublication>("release") {
            artifactId = "convohop-android"
            afterEvaluate { from(components["release"]) }
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
