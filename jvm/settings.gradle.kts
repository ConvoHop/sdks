pluginManagement {
    repositories {
        gradlePluginPortal()
        mavenCentral()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        mavenCentral()
    }
}

rootProject.name = "convohop-jvm"

include("convohop-server", "convohop-server-kotlin", "sdkgen-edge", "conformance-driver")
// The conformance driver lives beside the other language drivers.
project(":conformance-driver").projectDir = file("../conformance/drivers/jvm")
