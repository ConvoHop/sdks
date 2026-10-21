// Built by the Gradle build in jvm/ (see jvm/settings.gradle.kts).
plugins {
    application
}

description = "Relay conformance driver for the JVM server SDK."

dependencies {
    implementation(project(":relay-server"))
}

application {
    mainClass.set("dev.instantrelay.conformance.Driver")
    applicationName = "conformance-driver"
    // hello reports the artifact under test. A stdio driver that mostly waits on the network needs only a small
    // heap and a quick-starting JIT.
    applicationDefaultJvmArgs = listOf(
        "-Dconvohop.conformance.package=${project.group}:relay-server",
        "-Dconvohop.conformance.version=${project.version}",
        "-Xmx256m",
        "-XX:+UseSerialGC",
        "-XX:TieredStopAtLevel=1",
    )
}
