package com.aboalabed.uae

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.aboalabed.uae.core.model.AppUiState
import com.aboalabed.uae.core.model.Branch
import com.aboalabed.uae.core.model.CartItem
import com.aboalabed.uae.core.model.HomeSnapshot
import com.aboalabed.uae.core.model.Product
import com.aboalabed.uae.core.model.ProductSelection
import com.aboalabed.uae.core.model.ProductVariant
import com.aboalabed.uae.core.model.SavedAddress
import com.aboalabed.uae.core.repository.CustomerRepository
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.UUID

class AppViewModel(
    private val repository: CustomerRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow(AppUiState())
    val uiState: StateFlow<AppUiState> = _uiState.asStateFlow()

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isBusy = true, errorMessage = null) }
            try {
                val session = repository.login(email, password)
                val bootstrap = loadBootstrapData()
                _uiState.update {
                    it.copy(
                        session = session,
                        savedAddresses = bootstrap.addresses,
                        selectedAddress = bootstrap.defaultAddress,
                        home = bootstrap.home,
                        favoriteIds = bootstrap.favoriteIds,
                        branchRecommendation = bootstrap.branchRecommendation,
                        selectedBranch = bootstrap.branchRecommendation?.primary,
                        activeOrder = bootstrap.activeOrder,
                        isBusy = false,
                        errorMessage = bootstrap.errorMessage
                    )
                }
            } catch (error: Exception) {
                _uiState.value = AppUiState(errorMessage = error.displayMessage())
            }
        }
    }

    private suspend fun loadBootstrapData(): BootstrapResults {
        val errors = mutableListOf<String>()
        val bootstrap = coroutineScope {
            val addresses = async { runCatching { repository.loadAddresses() } }
            val home = async { runCatching { repository.loadHome() } }
            val favorites = async { runCatching { repository.loadFavoriteIds() } }
            val order = async { runCatching { repository.loadActiveOrder() } }
            BootstrapResults(
                addresses = addresses.await().getOrElse {
                    errors.add(it.displayMessage())
                    emptyList()
                },
                defaultAddress = null,
                home = home.await().getOrElse {
                    errors.add(it.displayMessage())
                    HomeSnapshot.Empty
                },
                favoriteIds = favorites.await().getOrElse {
                    errors.add(it.displayMessage())
                    emptySet()
                },
                branchRecommendation = null,
                activeOrder = order.await().getOrElse {
                    errors.add(it.displayMessage())
                    null
                },
                errorMessage = null
            )
        }

        val defaultAddress = bootstrap.addresses.firstOrNull { it.isDefault }
            ?: bootstrap.addresses.firstOrNull()
        val branchRecommendation = defaultAddress?.let { address ->
            runCatching { repository.recommendBranches(address) }
                .onFailure { errors.add(it.displayMessage()) }
                .getOrNull()
        }

        return BootstrapResults(
            addresses = bootstrap.addresses,
            defaultAddress = defaultAddress,
            home = bootstrap.home,
            favoriteIds = bootstrap.favoriteIds,
            branchRecommendation = branchRecommendation,
            activeOrder = bootstrap.activeOrder,
            errorMessage = errors.firstOrNull()
        )
    }

    fun selectAddress(address: SavedAddress) {
        viewModelScope.launch {
            _uiState.update { it.copy(selectedAddress = address, errorMessage = null) }
            try {
                val recommendation = repository.recommendBranches(address)
                _uiState.update {
                    it.copy(
                        branchRecommendation = recommendation,
                        selectedBranch = recommendation.primary
                    )
                }
            } catch (error: Exception) {
                _uiState.update { it.copy(errorMessage = error.displayMessage()) }
            }
        }
    }

    fun addAddress(
        label: String,
        line1: String,
        line2: String?,
        city: String,
        emirate: String,
        notes: String?,
        latitude: Double,
        longitude: Double,
        isDefault: Boolean,
        onSaved: () -> Unit
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isBusy = true, errorMessage = null) }
            try {
                val address = repository.createAddress(
                    label = label,
                    line1 = line1,
                    line2 = line2,
                    city = city,
                    emirate = emirate,
                    notes = notes,
                    latitude = latitude,
                    longitude = longitude,
                    isDefault = isDefault
                )
                val addresses = repository.loadAddresses()
                _uiState.update {
                    it.copy(
                        savedAddresses = addresses,
                        selectedAddress = address,
                        isBusy = false
                    )
                }
                selectAddress(address)
                onSaved()
            } catch (error: Exception) {
                _uiState.update { it.copy(isBusy = false, errorMessage = error.displayMessage()) }
            }
        }
    }

    fun toggleFavorite(productId: String) {
        val shouldFavorite = productId !in _uiState.value.favoriteIds
        val previous = _uiState.value.favoriteIds
        _uiState.update { state ->
            state.copy(
                favoriteIds = if (shouldFavorite) {
                    state.favoriteIds + productId
                } else {
                    state.favoriteIds - productId
                }
            )
        }

        viewModelScope.launch {
            runCatching { repository.setFavorite(productId, shouldFavorite) }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            favoriteIds = previous,
                            errorMessage = error.displayMessage()
                        )
                    }
                }
        }
    }

    fun addToCart(product: Product, variant: ProductVariant, selections: List<ProductSelection>) {
        val modifierTotal = selections.flatMap { it.options }.sumOf { it.priceDelta }
        val unitPrice = variant.price + modifierTotal
        val item = CartItem(
            id = UUID.randomUUID().toString(),
            product = product,
            variant = variant,
            selections = selections,
            quantity = 1,
            unitPrice = unitPrice
        )
        _uiState.update { it.copy(cartItems = it.cartItems + item) }
    }

    fun removeCartItem(item: CartItem) {
        _uiState.update { state ->
            state.copy(cartItems = state.cartItems.filterNot { it.id == item.id })
        }
    }

    fun selectBranch(branch: Branch) {
        _uiState.update { it.copy(selectedBranch = branch) }
    }

    fun placeOrder(onPlaced: () -> Unit) {
        viewModelScope.launch {
            val state = _uiState.value
            val address = state.selectedAddress
            val branch = state.selectedBranch
            if (address == null || branch == null || state.cartItems.isEmpty()) {
                _uiState.update {
                    it.copy(errorMessage = "Select an address, branch, and at least one item before placing the order.")
                }
                return@launch
            }

            _uiState.update { it.copy(isBusy = true, errorMessage = null) }
            try {
                val order = repository.placeOrder(state.cartItems, address, branch)
                _uiState.update {
                    it.copy(
                        activeOrder = order,
                        cartItems = emptyList(),
                        isBusy = false
                    )
                }
                onPlaced()
            } catch (error: Exception) {
                _uiState.update { it.copy(isBusy = false, errorMessage = error.displayMessage()) }
            }
        }
    }

    fun refreshActiveOrder() {
        viewModelScope.launch {
            val order = _uiState.value.activeOrder ?: return@launch
            _uiState.update { it.copy(isBusy = true, errorMessage = null) }
            try {
                val refreshed = repository.refreshOrder(order.id)
                _uiState.update { it.copy(activeOrder = refreshed, isBusy = false) }
            } catch (error: Exception) {
                _uiState.update { it.copy(isBusy = false, errorMessage = error.displayMessage()) }
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }

    private fun Throwable.displayMessage(): String {
        return localizedMessage ?: "Unexpected application error."
    }

    private data class BootstrapResults(
        val addresses: List<SavedAddress>,
        val defaultAddress: SavedAddress?,
        val home: HomeSnapshot,
        val favoriteIds: Set<String>,
        val branchRecommendation: com.aboalabed.uae.core.model.BranchRecommendation?,
        val activeOrder: com.aboalabed.uae.core.model.CustomerOrder?,
        val errorMessage: String?
    )
}

class AppViewModelFactory(
    private val repository: CustomerRepository
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(AppViewModel::class.java)) {
            return AppViewModel(repository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class: ${modelClass.name}")
    }
}
