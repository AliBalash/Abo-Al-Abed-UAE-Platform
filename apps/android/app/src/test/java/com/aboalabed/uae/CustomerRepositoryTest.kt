package com.aboalabed.uae

import com.aboalabed.uae.core.network.AboApiService
import com.aboalabed.uae.core.network.ApiOkResponse
import com.aboalabed.uae.core.network.AuthResponse
import com.aboalabed.uae.core.network.AuthTokenStore
import com.aboalabed.uae.core.network.BranchRecommendationResponse
import com.aboalabed.uae.core.network.CartItemBody
import com.aboalabed.uae.core.network.CartResponse
import com.aboalabed.uae.core.network.CreatedAddressResponse
import com.aboalabed.uae.core.network.HomeResponse
import com.aboalabed.uae.core.network.LoginBody
import com.aboalabed.uae.core.network.OrderResponse
import com.aboalabed.uae.core.network.OrderSummaryResponse
import com.aboalabed.uae.core.network.ProductResponse
import com.aboalabed.uae.core.network.SaveAddressBody
import com.aboalabed.uae.core.network.SetBranchBody
import com.aboalabed.uae.core.network.CreateOrderBody
import com.aboalabed.uae.core.repository.CustomerRepository
import com.aboalabed.uae.core.repository.RepositoryException
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.IOException

class CustomerRepositoryTest {
    @Test
    fun liveOnlyNetworkFailureReturnsBackendMessage() = runTest {
        val repository = CustomerRepository(NetworkDownApiService(), AuthTokenStore())

        val result = runCatching {
            repository.login("customer@aboalabed.ae", "ChangeMe123!")
        }

        val error = result.exceptionOrNull()
        assertTrue(error is RepositoryException)
        assertTrue(error?.message.orEmpty().contains("Unable to reach the live backend"))
    }
}

private class NetworkDownApiService : AboApiService {
    override suspend fun login(body: LoginBody): AuthResponse = throw IOException("offline")
    override suspend fun home(): HomeResponse = throw UnsupportedOperationException()
    override suspend fun products(): List<ProductResponse> = throw UnsupportedOperationException()
    override suspend fun favorites(): List<ProductResponse> = throw UnsupportedOperationException()
    override suspend fun favorite(productId: String): ApiOkResponse = throw UnsupportedOperationException()
    override suspend fun unfavorite(productId: String): ApiOkResponse = throw UnsupportedOperationException()
    override suspend fun addresses() = throw UnsupportedOperationException()
    override suspend fun createAddress(body: SaveAddressBody): CreatedAddressResponse = throw UnsupportedOperationException()
    override suspend fun branchRecommendation(addressId: String): BranchRecommendationResponse = throw UnsupportedOperationException()
    override suspend fun activeCart(): CartResponse = throw UnsupportedOperationException()
    override suspend fun removeCartItem(itemId: String): CartResponse = throw UnsupportedOperationException()
    override suspend fun addCartItem(body: CartItemBody): CartResponse = throw UnsupportedOperationException()
    override suspend fun setCartBranch(body: SetBranchBody): CartResponse = throw UnsupportedOperationException()
    override suspend fun createOrder(body: CreateOrderBody): OrderResponse = throw UnsupportedOperationException()
    override suspend fun orders(): List<OrderSummaryResponse> = throw UnsupportedOperationException()
    override suspend fun order(orderId: String): OrderResponse = throw UnsupportedOperationException()
}
