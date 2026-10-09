// Built by the Gradle build in jvm/ (see jvm/settings.gradle.kts). tools/docgen/extractors/jvm.mjs runs the
// extract task, which reads the SDK sources and writes their public API in the docs pipeline's surface format.
plugins {
    java
}

description = "Extracts the public API of the JVM SDK for the docs generator."

dependencies {
    implementation(libs.kotlin.compiler.embeddable)
    // The compiler needs the standard library only at run time, but javac reads its annotations on the compiler's API.
    compileOnly(libs.kotlin.stdlib)
    // javac resolves the SDK's nullness annotations from the extractor's own classpath.
    implementation(libs.jspecify)

    testCompileOnly(libs.kotlin.stdlib)
    testImplementation(platform(libs.junit.bom))
    testImplementation(libs.junit.jupiter)
    testRuntimeOnly(libs.junit.platform.launcher)
}

// A build tool that runs on the build JDK, not a library: Java 17, whatever -PtestJavaVersion says.
val buildJdk = javaToolchains.launcherFor { languageVersion.set(JavaLanguageVersion.of(17)) }

tasks.withType<JavaCompile>().configureEach {
    options.release.set(17)
}

tasks.withType<Test>().configureEach {
    javaLauncher.set(buildJdk)
    maxHeapSize = "512m"
}

tasks.register<JavaExec>("extract") {
    description = "Writes the JVM SDK's public API. Run it through tools/docgen/extractors/jvm.mjs."
    classpath = sourceSets.main.get().runtimeClasspath
    mainClass.set("com.convohop.docs.surface.Main")
    javaLauncher.set(buildJdk)
    // Arguments name repository-relative paths.
    workingDir = rootDir.parentFile
    maxHeapSize = "512m"
}
