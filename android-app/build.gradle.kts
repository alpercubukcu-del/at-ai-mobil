plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.ataimobil"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.ataimobil"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
    }

    sourceSets["main"].assets.srcDir(rootProject.layout.projectDirectory.dir("public"))

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        debug {
            isDebuggable = true
        }
        release {
            isMinifyEnabled = false
        }
    }
}

tasks.named("preBuild") {
    dependsOn(rootProject.tasks.named("buildAndroidWebAssets"))
}

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
}
