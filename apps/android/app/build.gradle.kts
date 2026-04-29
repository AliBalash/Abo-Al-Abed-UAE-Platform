import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
}

val localProperties = Properties().apply {
    val file = rootProject.file("local.properties")
    if (file.exists()) {
        file.inputStream().use(::load)
    }
}

val secretsProperties = Properties().apply {
    val file = rootProject.file("secrets.properties")
    if (file.exists()) {
        file.inputStream().use(::load)
    }
}

fun propertyValue(name: String, default: String = ""): String {
    return (localProperties.getProperty(name)
        ?: secretsProperties.getProperty(name)
        ?: default).trim()
}

android {
    namespace = "com.aboalabed.uae"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.aboalabed.uae"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"

        val mapsApiKey = propertyValue("MAPS_API_KEY")
        val apiBaseUrl = propertyValue("ABO_API_BASE_URL", "http://10.0.2.2:4000/api")

        manifestPlaceholders["MAPS_API_KEY"] = mapsApiKey
        buildConfigField("String", "ABO_API_BASE_URL", "\"$apiBaseUrl\"")
        buildConfigField("String", "MAPS_API_KEY", "\"$mapsApiKey\"")

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildFeatures {
        buildConfig = true
        compose = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation(platform(libs.compose.bom))
    androidTestImplementation(platform(libs.compose.bom))

    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.coil.compose)
    implementation(libs.compose.foundation)
    implementation(libs.compose.material.icons)
    implementation(libs.compose.material3)
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.gson)
    implementation(libs.google.material)
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.maps.compose)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging)
    implementation(libs.places)
    implementation(libs.retrofit)
    implementation(libs.retrofit.gson)

    debugImplementation(libs.compose.ui.tooling)
    debugImplementation(libs.compose.ui.test.manifest)

    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)

    androidTestImplementation(libs.compose.ui.test.junit4)
}
