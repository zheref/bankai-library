plugins {
    kotlin("jvm") version "2.3.20" apply false
}

val bankaiVersion = providers.gradleProperty("bankaiVersion").get()

subprojects {
    version = bankaiVersion

    repositories {
        mavenCentral()
    }

    apply(plugin = "org.jetbrains.kotlin.jvm")
    apply(plugin = "java-library") // the `api` configuration
    apply(plugin = "maven-publish")

    extensions.configure<org.jetbrains.kotlin.gradle.dsl.KotlinJvmProjectExtension> {
        // Aligned with Android consumers (JDK 17): class files at version 61.
        jvmToolchain(17)
    }

    extensions.configure<JavaPluginExtension> {
        withSourcesJar()
        withJavadocJar() // Maven Central requires one; empty for Kotlin sources until Dokka is added
    }

    tasks.withType<Test>().configureEach {
        useJUnitPlatform()
    }

    extensions.configure<PublishingExtension> {
        publications {
            create<MavenPublication>("maven") {
                from(components["java"])
                artifactId = project.name
                pom {
                    name.set(project.name)
                    // Lazy: each module's script sets `description` after this block runs.
                    description.set(provider { project.description })
                    url.set("https://github.com/zheref/bankai-library")
                    licenses {
                        license {
                            name.set("MIT License")
                            url.set("https://github.com/zheref/bankai-library/blob/main/LICENSE")
                        }
                    }
                    developers {
                        developer {
                            id.set("zheref")
                            name.set("Sergio Daniel Lozano")
                        }
                    }
                    scm {
                        url.set("https://github.com/zheref/bankai-library")
                        connection.set("scm:git:https://github.com/zheref/bankai-library.git")
                    }
                }
            }
        }
        repositories {
            // GitHub Packages, used only when the release job supplies credentials.
            // Choosing the public registry (GitHub Packages or Maven Central) is the
            // maintainer's call at publish time; see android/README.md.
            val ghUser = providers.environmentVariable("GITHUB_ACTOR")
            val ghToken = providers.environmentVariable("GITHUB_TOKEN")
            if (ghUser.isPresent && ghToken.isPresent) {
                maven {
                    name = "GitHubPackages"
                    url = uri("https://maven.pkg.github.com/zheref/bankai-library")
                    credentials {
                        username = ghUser.get()
                        password = ghToken.get()
                    }
                }
            }
        }
    }
}
