import org.jetbrains.kotlin.gradle.dsl.JvmTarget

// The snippets that the Android docs pages embed (docs/languages/android), built by the Gradle build in android/.
// The unit tests run them under Robolectric against the conformance mock. Run them with
// `npm run test:docs -- android` from the repository root, after `npm ci`: the tests start the mock with node.
// `npm run generate:docs` checks that every region the pages include exists.
plugins {
    alias(libs.plugins.android.library)
}

android {
    // The snippets' package, so they use R without an import.
    namespace = "com.convohop.examples"
    compileSdk = 36

    defaultConfig {
        minSdk = 24
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
                // The tests start the conformance mock from the repository.
                test.systemProperty("convohop.repoRoot", rootDir.parentFile.absolutePath)
            }
        }
    }

    lint {
        abortOnError = true
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
        allWarningsAsErrors.set(true)
    }
}

dependencies {
    implementation(project(":convohop"))
    // The SDK only compiles against FCM. Apps add it, and the push snippets extend its FirebaseMessagingService.
    implementation(libs.firebase.messaging)

    testImplementation(libs.junit)
    testImplementation(libs.robolectric)
    // Plays your backend's renewal endpoint, which the conformance mock doesn't have.
    testImplementation(libs.okhttp.mockwebserver)
}
