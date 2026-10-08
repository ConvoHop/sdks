plugins {
    `java-library`
    `java-test-fixtures`
    `maven-publish`
}

description = "ConvoHop server SDK for trusted JVM backends."

java {
    withSourcesJar()
    withJavadocJar()
}

sourceSets {
    main {
        java.srcDir("src/generated/java")
    }
}

dependencies {
    api(libs.jspecify)

    testImplementation(platform(libs.junit.bom))
    testImplementation(libs.junit.jupiter)
    testRuntimeOnly(libs.junit.platform.launcher)
}

// The fake authority and fixtures are shared with the Kotlin module tests and never published.
val javaComponent = components["java"] as AdhocComponentWithVariants
javaComponent.withVariantsFromConfiguration(configurations["testFixturesApiElements"]) { skip() }
javaComponent.withVariantsFromConfiguration(configurations["testFixturesRuntimeElements"]) { skip() }

tasks.jar {
    manifest.attributes("Automatic-Module-Name" to "com.convohop.server")
}

publishing {
    publications {
        create<MavenPublication>("maven") {
            from(components["java"])
        }
    }
}
