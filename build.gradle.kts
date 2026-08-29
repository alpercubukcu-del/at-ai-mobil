plugins {
    id("com.android.application") version "8.7.3" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
}

tasks.register<Exec>("buildAndroidWebAssets") {
    workingDir = rootDir
    commandLine("node", "tools/build-android-web-assets.cjs")
}
