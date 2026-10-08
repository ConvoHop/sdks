pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        // LiveKit's audio routing dependency is published only on JitPack.
        exclusiveContent {
            forRepository { maven("https://jitpack.io") }
            filter { includeGroup("com.github.davidliu") }
        }
    }
}

rootProject.name = "convohop-android"

// The runtime shared by the SDK and the conformance driver; not a supported entry point.
include(":core")
// Push notifications and incoming calls, com.convohop:convohop-android-push. It stands alone so other
// Android SDKs, such as React Native's, can reuse it.
include(":push")
// The published Android library, com.convohop:convohop-android.
include(":convohop")
// Compiles the generator's edge goldens so emitter changes stay valid Kotlin.
include(":edge-fixture")
// The conformance driver lives beside the other drivers.
include(":conformance-driver")
project(":conformance-driver").projectDir = file("../conformance/drivers/android")
