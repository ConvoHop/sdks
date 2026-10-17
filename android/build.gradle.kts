plugins {
    alias(libs.plugins.android.library) apply false
    alias(libs.plugins.kotlin.jvm) apply false
}

subprojects {
    pluginManager.withPlugin("maven-publish") {
        apply(from = rootDir.parentFile.resolve("scripts/release/maven-publishing.gradle.kts"))
    }
}
