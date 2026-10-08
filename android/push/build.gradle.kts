import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import org.jetbrains.kotlin.gradle.dsl.KotlinVersion

// Push and incoming-call handling with no networking, LiveKit or coroutines,
// so wrappers such as the React Native SDK can ship it on its own. Its
// floors are lower than the rest of the build: Kotlin 1.9 compilers can read
// it (language and API version 2.0, stdlib 2.0.21) and compileSdk 35 apps
// can consume it.
plugins {
    alias(libs.plugins.android.library)
    `maven-publish`
}

group = "com.convohop"
version = providers.gradleProperty("convohopVersion").get()

android {
    namespace = "com.convohop.android.push"
    compileSdk = 35

    defaultConfig {
        minSdk = 24
        consumerProguardFiles("consumer-rules.pro")
        aarMetadata {
            minCompileSdk = 34
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    testOptions {
        unitTests {
            isIncludeAndroidResources = true
            all { test ->
                test.maxHeapSize = "1g"
                // The push vectors are shared with the other SDKs.
                test.systemProperty("convohop.repoRoot", rootDir.parentFile.absolutePath)
                // -ProbolectricSdks=34 runs only those Android versions, so local runs download fewer of them.
                providers.gradleProperty("robolectricSdks").orNull?.let { test.systemProperty("robolectric.enabledSdks", it) }
            }
        }
    }

    lint {
        abortOnError = true
    }

    publishing {
        singleVariant("release") {
            withSourcesJar()
        }
    }
}

kotlin {
    explicitApi()
    coreLibrariesVersion = "2.0.21"
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_11)
        languageVersion.set(KotlinVersion.KOTLIN_2_0)
        apiVersion.set(KotlinVersion.KOTLIN_2_0)
        allWarningsAsErrors.set(true)
    }
}

dependencies {
    implementation(libs.androidx.core)
    // Apps that use FCM bring Firebase themselves; the SDK only adapts to it.
    compileOnly(libs.firebase.messaging)

    testImplementation(libs.junit)
    testImplementation(libs.robolectric)
    // RemoteMessage and FirebaseMessagingService, faked: tests never reach Firebase.
    testImplementation(libs.firebase.messaging)
}

publishing {
    publications {
        create<MavenPublication>("release") {
            artifactId = "convohop-android-push"
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
