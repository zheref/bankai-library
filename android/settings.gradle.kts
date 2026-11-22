// Bankai Library — Android / JVM package (Gradle).
//
// One Gradle build publishing two Maven artifacts that keep the coordinates the
// zheref/BankaiAndroid seed already used, so a consumer moving off the submodule only
// swaps `includeBuild(...)` for a versioned dependency:
//   io.zheref.bankai.core:BankaiCore
//   io.zheref.bankai.udf:BankaiUDF   (depends on BankaiCore)
plugins {
    id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"
}

rootProject.name = "bankai-library-android"

include(":BankaiCore", ":BankaiUDF")
