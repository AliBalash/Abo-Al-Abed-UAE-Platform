package com.aboalabed.uae

import android.app.Application
import com.aboalabed.uae.core.network.AuthTokenStore
import com.aboalabed.uae.core.network.NetworkModule
import com.aboalabed.uae.core.repository.CustomerRepository
import com.google.android.libraries.places.api.Places

class AboAlAbedApplication : Application() {
    private val tokenStore = AuthTokenStore()
    val repository: CustomerRepository by lazy {
        CustomerRepository(NetworkModule.createApi(tokenStore), tokenStore)
    }

    override fun onCreate() {
        super.onCreate()
        if (BuildConfig.MAPS_API_KEY.isNotBlank() && !Places.isInitialized()) {
            Places.initialize(applicationContext, BuildConfig.MAPS_API_KEY)
        }
    }
}
