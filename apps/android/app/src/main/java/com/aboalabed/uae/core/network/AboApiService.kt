package com.aboalabed.uae.core.network

import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface AboApiService {
    @POST("auth/login")
    suspend fun login(@Body body: LoginBody): AuthResponse

    @GET("catalog/home")
    suspend fun home(): HomeResponse

    @GET("catalog/products")
    suspend fun products(): List<ProductResponse>

    @GET("catalog/favorites")
    suspend fun favorites(): List<ProductResponse>

    @POST("catalog/favorites/{productId}")
    suspend fun favorite(@Path("productId") productId: String): ApiOkResponse

    @DELETE("catalog/favorites/{productId}")
    suspend fun unfavorite(@Path("productId") productId: String): ApiOkResponse

    @GET("addresses")
    suspend fun addresses(): List<AddressResponse>

    @POST("addresses")
    suspend fun createAddress(@Body body: SaveAddressBody): CreatedAddressResponse

    @GET("branches/recommendation")
    suspend fun branchRecommendation(@Query("addressId") addressId: String): BranchRecommendationResponse

    @GET("cart/active")
    suspend fun activeCart(): CartResponse

    @DELETE("cart/items/{itemId}")
    suspend fun removeCartItem(@Path("itemId") itemId: String): CartResponse

    @POST("cart/items")
    suspend fun addCartItem(@Body body: CartItemBody): CartResponse

    @POST("cart/branch")
    suspend fun setCartBranch(@Body body: SetBranchBody): CartResponse

    @POST("orders")
    suspend fun createOrder(@Body body: CreateOrderBody): OrderResponse

    @GET("orders")
    suspend fun orders(): List<OrderSummaryResponse>

    @GET("orders/{orderId}")
    suspend fun order(@Path("orderId") orderId: String): OrderResponse
}
