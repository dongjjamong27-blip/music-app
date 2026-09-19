plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

// GitHub 에서 빌드할 때마다 버전 번호가 1씩 올라간다. (앱 안 업데이트 확인에 쓰임)
val buildNumber = (System.getenv("GITHUB_RUN_NUMBER") ?: "1").toInt()

// 도장 파일의 비밀번호. gradle.properties 에 적어 두고 여기서 읽는다.
val keystoreSecret: String = providers.gradleProperty("autocheckStorePass").get()

android {
    namespace = "com.autocheck.attendance"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.autocheck.attendance"
        minSdk = 26
        targetSdk = 34
        versionCode = buildNumber
        versionName = "1.$buildNumber"
    }

    // 항상 같은 도장(서명)으로 찍는다.
    // 도장이 매번 바뀌면 "앱이 설치되지 않음" 이 나고, 앱 안 업데이트도 실패한다.
    //
    // 이 도장은 개인용 앱 전용이며 저장소에 함께 들어 있다. (README 참고)
    // 앱스토어에 올릴 앱이라면 절대 이렇게 하면 안 된다.
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

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation(platform("androidx.compose:compose-bom:2024.10.01"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    debugImplementation("androidx.compose.ui:ui-tooling")
}
