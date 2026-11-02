plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val buildNumber = System.getenv("GITHUB_RUN_NUMBER")?.toIntOrNull() ?: 1

android {
    namespace = "com.mirinetic.cove"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.mirinetic.cove"
        minSdk = 24
        targetSdk = 35
        versionCode = buildNumber
        versionName = "1.0.$buildNumber"
    }

    // A fixed personal key so every build can be installed over the previous one (settings are kept).
    // This app is for sideloading on your own TV only, never for a store.
    signingConfigs {
        create("personal") {
            storeFile = rootProject.file("keystore/cove-personal.jks")
            storePassword = "cove-personal"
            keyAlias = "cove"
            keyPassword = "cove-personal"
        }
    }

    buildTypes {
        getByName("debug") {
            signingConfig = signingConfigs.getByName("personal")
        }
        getByName("release") {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("personal")
        }
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    lint {
        checkReleaseBuilds = false
        abortOnError = false
    }
}

dependencies {
    implementation("com.google.zxing:core:3.5.3")
}
