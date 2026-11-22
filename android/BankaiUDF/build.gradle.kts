group = "io.zheref.bankai.udf"
description = "Unidirectional-data-flow primitives of the Bankai library (Redux-style store, middleware, thunks, flow helpers)."

dependencies {
    // The seed declared this compileOnly, which leaves the runtime classpath to the
    // consumer; BankaiUDF calls BankaiCore at runtime (getThreadName, isPlainObject), so
    // the published artifact declares it as a real dependency.
    "implementation"(project(":BankaiCore"))
    // api: Flow and Job appear in createFlow's public signature.
    "api"("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.6.4")

    "testImplementation"(kotlin("test"))
    "testImplementation"("junit:junit:4.13.2")
    "testImplementation"("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.6.4")
}
