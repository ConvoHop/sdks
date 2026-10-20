import org.jetbrains.kotlin.gradle.dsl.JvmTarget

// Compiles the sdkgen edge golden against the self-contained part of the
// runtime, so emitter changes that break the runtime contract fail here.
plugins {
    alias(libs.plugins.kotlin.jvm)
    `java-library`
}

description = "Compiles the sdkgen edge golden against the JVM runtime. Not published."

val golden = rootDir.resolve("../tools/sdkgen/test/golden/edge/jvm")

val runtimeSources = tasks.register<Sync>("runtimeSources") {
    from(rootDir.resolve("relay-server/src/main/java")) {
        include(
            "dev/instantrelay/server/internal/Json.java",
            "dev/instantrelay/server/internal/OperationCatalog.java",
            "dev/instantrelay/server/internal/OperationDescriptor.java",
            "dev/instantrelay/server/internal/OperationExecutor.java",
            "dev/instantrelay/server/internal/Pages.java",
            "dev/instantrelay/server/internal/Wire.java",
            "dev/instantrelay/server/internal/WireEnum.java",
            "dev/instantrelay/server/internal/WireException.java",
            "dev/instantrelay/server/internal/WireValue.java",
            "dev/instantrelay/server/internal/package-info.java",
        )
    }
    into(layout.buildDirectory.dir("runtime-sources"))
}

val kotlinRuntimeSources = tasks.register<Sync>("kotlinRuntimeSources") {
    from(rootDir.resolve("relay-server-kotlin/src/main/kotlin")) {
        include("dev/instantrelay/server/kotlin/Interruptible.kt", "dev/instantrelay/server/kotlin/PageFlow.kt")
    }
    into(layout.buildDirectory.dir("kotlin-runtime-sources"))
}

sourceSets {
    main {
        java.srcDir(runtimeSources)
        java.srcDir(golden.resolve("relay-server/src/generated/java"))
    }
}

kotlin {
    jvmToolchain(17)
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_11)
        allWarningsAsErrors.set(true)
        freeCompilerArgs.add("-Xjdk-release=11")
    }
    sourceSets.named("main") {
        kotlin.srcDir(kotlinRuntimeSources)
        kotlin.srcDir(golden.resolve("relay-server-kotlin/src/generated/kotlin"))
    }
}

dependencies {
    implementation(libs.jspecify)
    implementation(libs.kotlinx.coroutines.core)

    testImplementation(platform(libs.junit.bom))
    testImplementation(libs.junit.jupiter)
    testRuntimeOnly(libs.junit.platform.launcher)
}
