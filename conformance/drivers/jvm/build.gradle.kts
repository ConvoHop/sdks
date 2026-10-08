// Built by the Gradle build in jvm/ (see jvm/settings.gradle.kts).
plugins {
    application
}

description = "ConvoHop conformance driver for the JVM server SDK."

dependencies {
    implementation(project(":convohop-server"))
}

application {
    mainClass.set("com.convohop.conformance.Driver")
    applicationName = "conformance-driver"
    // hello reports the artifact under test. A stdio driver that mostly waits on the network needs only a small
    // heap and a quick-starting JIT.
    applicationDefaultJvmArgs = listOf(
        "-Dconvohop.conformance.package=${project.group}:convohop-server",
        "-Dconvohop.conformance.version=${project.version}",
        "-Xmx256m",
        "-XX:+UseSerialGC",
        "-XX:TieredStopAtLevel=1",
    )
}
