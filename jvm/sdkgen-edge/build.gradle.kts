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
    from(rootDir.resolve("convohop-server/src/main/java")) {
        include(
            "com/convohop/server/internal/Json.java",
            "com/convohop/server/internal/OperationCatalog.java",
            "com/convohop/server/internal/OperationDescriptor.java",
            "com/convohop/server/internal/OperationExecutor.java",
            "com/convohop/server/internal/Pages.java",
            "com/convohop/server/internal/Wire.java",
            "com/convohop/server/internal/WireEnum.java",
            "com/convohop/server/internal/WireException.java",
            "com/convohop/server/internal/WireValue.java",
            "com/convohop/server/internal/package-info.java",
        )
    }
    into(layout.buildDirectory.dir("runtime-sources"))
}

val kotlinRuntimeSources = tasks.register<Sync>("kotlinRuntimeSources") {
    from(rootDir.resolve("convohop-server-kotlin/src/main/kotlin")) {
        include("com/convohop/server/kotlin/Interruptible.kt", "com/convohop/server/kotlin/PageFlow.kt")
    }
    into(layout.buildDirectory.dir("kotlin-runtime-sources"))
}

sourceSets {
    main {
        java.srcDir(runtimeSources)
        java.srcDir(golden.resolve("convohop-server/src/generated/java"))
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
        kotlin.srcDir(golden.resolve("convohop-server-kotlin/src/generated/kotlin"))
    }
}

dependencies {
    implementation(libs.jspecify)
    implementation(libs.kotlinx.coroutines.core)

    testImplementation(platform(libs.junit.bom))
    testImplementation(libs.junit.jupiter)
    testRuntimeOnly(libs.junit.platform.launcher)
}
