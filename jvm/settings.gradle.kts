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

include("convohop-server", "convohop-server-kotlin", "sdkgen-edge", "conformance-driver", "docs-surface", "docs-examples")
// The conformance driver lives beside the other language drivers.
project(":conformance-driver").projectDir = file("../conformance/drivers/jvm")
// The docs generator's API extractor and the documentation examples live beside the other languages'.
project(":docs-surface").projectDir = file("../tools/docgen/extractors/jvm")
project(":docs-examples").projectDir = file("../docs/languages/jvm/examples")
