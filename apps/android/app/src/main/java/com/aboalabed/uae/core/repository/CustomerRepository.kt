package com.aboalabed.uae.core.repository

import com.aboalabed.uae.BuildConfig
import com.aboalabed.uae.core.model.Branch
import com.aboalabed.uae.core.model.BranchRecommendation
import com.aboalabed.uae.core.model.CartItem
import com.aboalabed.uae.core.model.CustomerOrder
import com.aboalabed.uae.core.model.HomeSnapshot
import com.aboalabed.uae.core.model.SavedAddress
import com.aboalabed.uae.core.model.SessionUser
import com.aboalabed.uae.core.network.AboApiService
import com.aboalabed.uae.core.network.AuthTokenStore
import com.aboalabed.uae.core.network.CartItemBody
import com.aboalabed.uae.core.network.CartSelectionBody
import com.aboalabed.uae.core.network.CreateOrderBody
import com.aboalabed.uae.core.network.LoginBody
import com.aboalabed.uae.core.network.SaveAddressBody
import com.aboalabed.uae.core.network.SetBranchBody
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import retrofit2.HttpException
import java.io.IOException
import java.util.UUID

class RepositoryException(message: String) : Exception(message)

class CustomerRepository(
    private val api: AboApiService,
    private val tokenStore: AuthTokenStore
) {
    suspend fun login(email: String, password: String): SessionUser = apiCall {
        val response = api.login(LoginBody(email = email, password = password))
        tokenStore.accessToken = response.accessToken
        response.user.toDomain()
    }

    suspend fun loadHome(): HomeSnapshot = apiCall {
        coroutineScope {
            val homeDeferred = async { api.home() }
            val productsDeferred = async { api.products() }
            val home = homeDeferred.await()
            val products = productsDeferred.await().map { it.toDomain() }
            val featured = home.featuredProducts.map { it.toDomain() }
            val featuredIds = featured.map { it.id }.toSet()
            val recommendations = products.filterNot { it.id in featuredIds }.ifEmpty { featured }

            HomeSnapshot(
                banners = home.banners.map { it.toDomain() },
                categories = home.categories.map { it.toDomain() },
                featured = featured,
                recommendations = recommendations
            )
        }
    }

    suspend fun loadAddresses(): List<SavedAddress> = apiCall {
        api.addresses().map { it.toDomain() }
    }

    suspend fun createAddress(
        label: String,
        line1: String,
        line2: String?,
        city: String,
        emirate: String,
        notes: String?,
        latitude: Double,
        longitude: Double,
        isDefault: Boolean
    ): SavedAddress = apiCall {
        val created = api.createAddress(
            SaveAddressBody(
                label = label,
                line1 = line1,
                line2 = line2.nilIfBlank(),
                city = city,
                emirate = emirate,
                notes = notes.nilIfBlank(),
                lat = latitude,
                lng = longitude,
                isDefault = isDefault
            )
        )
        val addresses = api.addresses().map { it.toDomain() }
        addresses.firstOrNull { it.id == created.id }
            ?: throw RepositoryException("The saved address could not be loaded.")
    }

    suspend fun loadFavoriteIds(): Set<String> = apiCall {
        api.favorites().map { it.id }.toSet()
    }

    suspend fun setFavorite(productId: String, favorite: Boolean) = apiCall {
        if (favorite) {
            api.favorite(productId)
        } else {
            api.unfavorite(productId)
        }
        Unit
    }

    suspend fun recommendBranches(address: SavedAddress): BranchRecommendation = apiCall {
        api.branchRecommendation(address.id).toDomain()
    }

    suspend fun placeOrder(
        cartItems: List<CartItem>,
        address: SavedAddress,
        branch: Branch
    ): CustomerOrder = apiCall {
        var cart = api.activeCart()
        cart.items.forEach { item ->
            cart = api.removeCartItem(item.id)
        }

        cartItems.forEach { item ->
            cart = api.addCartItem(
                CartItemBody(
                    productId = item.product.id,
                    variantId = item.variant.id,
                    quantity = item.quantity,
                    notes = null,
                    selections = item.selections.map { selection ->
                        CartSelectionBody(
                            modifierGroupId = selection.group.id,
                            optionIds = selection.options.map { it.id }
                        )
                    }
                )
            )
        }

        cart = api.setCartBranch(SetBranchBody(branch.id))
        api.createOrder(
            CreateOrderBody(
                addressId = address.id,
                branchId = branch.id,
                cartId = cart.id,
                idempotencyKey = UUID.randomUUID().toString()
            )
        ).toDomain()
    }

    suspend fun loadActiveOrder(): CustomerOrder? = apiCall {
        val openOrder = api.orders().firstOrNull { it.status.isOpenOrderStatus() }
        openOrder?.let { api.order(it.id).toDomain() }
    }

    suspend fun refreshOrder(id: String): CustomerOrder = apiCall {
        api.order(id).toDomain()
    }

    private suspend fun <T> apiCall(block: suspend () -> T): T = withContext(Dispatchers.IO) {
        try {
            block()
        } catch (error: RepositoryException) {
            throw error
        } catch (error: HttpException) {
            val body = error.response()?.errorBody()?.string()?.trim().orEmpty()
            val fallback = when (error.code()) {
                401 -> "Your session expired. Sign in again."
                else -> "Request failed with status ${error.code()}."
            }
            throw RepositoryException(body.ifBlank { fallback })
        } catch (error: IOException) {
            throw RepositoryException(
                "Unable to reach the live backend at ${BuildConfig.ABO_API_BASE_URL}. Make sure the API server is running, then try again."
            )
        } catch (error: Exception) {
            throw RepositoryException(error.localizedMessage ?: "Unexpected application error.")
        }
    }

    private fun String?.nilIfBlank(): String? {
        val trimmed = this?.trim().orEmpty()
        return trimmed.ifBlank { null }
    }

    private fun String.isOpenOrderStatus(): Boolean {
        return this in setOf("awaiting_payment", "paid", "in_preparation", "ready_for_pickup")
    }
}
