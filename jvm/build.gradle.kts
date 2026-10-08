plugins {
    alias(libs.plugins.kotlin.jvm) apply false
}

// Compilation always runs on JDK 17 and emits Java 11 bytecode. Pass
// -PtestJavaVersion=N to run the tests on another installed JDK.
val testJavaVersion: Provider<Int> = providers.gradleProperty("testJavaVersion").map(String::toInt)
val repositoryRoot: File = rootDir.parentFile

subprojects {
    pluginManager.withPlugin("java") {
        val toolchains = the<JavaToolchainService>()
        the<JavaPluginExtension>().toolchain.languageVersion.set(JavaLanguageVersion.of(17))

        tasks.withType<JavaCompile>().configureEach {
            options.release.set(11)
            options.encoding = "UTF-8"
            options.compilerArgs.addAll(listOf("-Xlint:all", "-Werror"))
        }
        tasks.withType<Javadoc>().configureEach {
            (options as StandardJavadocDocletOptions).apply {
                encoding = "UTF-8"
                addStringOption("-release", "11")
                addBooleanOption("Xdoclint:all,-missing", true)
                addBooleanOption("Werror", true)
                addBooleanOption("quiet", true)
            }
        }
        tasks.withType<Test>().configureEach {
            useJUnitPlatform()
            systemProperty("convohop.repositoryRoot", repositoryRoot.absolutePath)
            inputs.dir(repositoryRoot.resolve("spec")).withPathSensitivity(PathSensitivity.RELATIVE)
            if (testJavaVersion.isPresent) {
                javaLauncher.set(toolchains.launcherFor {
                    languageVersion.set(JavaLanguageVersion.of(testJavaVersion.get()))
                })
                systemProperty("convohop.testJavaVersion", testJavaVersion.get())
            }
        }
    }

    pluginManager.withPlugin("maven-publish") {
        val module = this@subprojects
        the<PublishingExtension>().publications.withType<MavenPublication>().configureEach {
            pom {
                name.set(module.name)
                description.set(module.provider { module.description })
                url.set("https://github.com/ConvoHop/sdks")
                licenses {
                    license {
                        name.set("Apache-2.0")
                        url.set("https://www.apache.org/licenses/LICENSE-2.0")
                    }
                }
                developers {
                    developer {
                        id.set("convohop")
                        name.set("ConvoHop")
                    }
                }
                scm {
                    url.set("https://github.com/ConvoHop/sdks")
                    connection.set("scm:git:https://github.com/ConvoHop/sdks.git")
                    developerConnection.set("scm:git:https://github.com/ConvoHop/sdks.git")
                }
            }
        }
    }
}
