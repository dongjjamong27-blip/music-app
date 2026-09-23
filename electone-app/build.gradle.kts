plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val buildNumber = (System.getenv("GITHUB_RUN_NUMBER") ?: "1").toInt()
val keystoreSecret: String = providers.gradleProperty("autocheckStorePass").get()

android {
    namespace = "com.electone.web"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.electone.web"
        minSdk = 26
        targetSdk = 34
        versionCode = buildNumber
        versionName = "1.$buildNumber"
    }

    // 출석체크 앱과 같은 도장(서명) 파일을 쓴다.
    signingConfigs {
        create("fixed") {
            storeFile = rootProject.file("keystore.jks")
            storePassword = keystoreSecret
            keyAlias = "autocheck"
            keyPassword = keystoreSecret
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("fixed")
        }
    }

    // electone/index.html (웹 엘렉톤) 을 앱 안에 그대로 넣는다.
    sourceSets["main"].assets.srcDirs(rootProject.file("electone"))

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}
