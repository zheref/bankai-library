group = "io.zheref.bankai.core"
description = "Core Kotlin/JVM utilities of the Bankai library: string and collection helpers, parity types."

dependencies {
    // api: kotlinx-datetime types (LocalTime, TimeZone, …) appear in public signatures.
    "api"("org.jetbrains.kotlinx:kotlinx-datetime:0.7.1")

    "testImplementation"(kotlin("test"))
    "testImplementation"("junit:junit:4.13.2")
}

tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile>().configureEach {
    compilerOptions {
        freeCompilerArgs.add("-opt-in=kotlin.time.ExperimentalTime")
    }
}
