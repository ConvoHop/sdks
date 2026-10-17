import org.gradle.api.publish.PublishingExtension
import org.gradle.api.publish.maven.MavenPublication
import org.gradle.api.tasks.bundling.Jar
import org.gradle.plugins.signing.SigningExtension

val publication = extensions.getByType<PublishingExtension>()
val repositoryRoot = rootProject.rootDir.parentFile

publication.apply {
    publications.withType<MavenPublication>().configureEach {
        pom {
            name.set(project.name)
            description.set(provider { project.description })
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
    repositories.maven {
        name = "build"
        url = uri(rootProject.layout.buildDirectory.dir("repo"))
    }
}

// Kotlin-only modules have no Java Javadoc; ship the maintained SDK guide too.
tasks.withType<Jar>().configureEach {
    if (name == "javadocJar" || name.endsWith("JavadocJar")) {
        from(rootProject.file("README.md"))
        from(repositoryRoot.resolve("LICENSE"), repositoryRoot.resolve("NOTICE"))
    }
}

val signingKey = providers.environmentVariable("MAVEN_SIGNING_KEY").orNull
val signingPassword = providers.environmentVariable("MAVEN_SIGNING_PASSWORD").orNull
require((signingKey == null) == (signingPassword == null)) {
    "Set both MAVEN_SIGNING_KEY and MAVEN_SIGNING_PASSWORD, or neither for an unsigned local preparation"
}
if (signingKey != null) {
    require(signingKey.isNotBlank() && !signingPassword.isNullOrBlank()) {
        "MAVEN_SIGNING_KEY and MAVEN_SIGNING_PASSWORD must not be empty"
    }
    apply(plugin = "signing")
    extensions.configure<SigningExtension> {
        useInMemoryPgpKeys(signingKey, signingPassword)
        sign(publication.publications)
    }
}
