package com.aboalabed.uae.core.model

data class AppUiState(
    val session: SessionUser? = null,
    val savedAddresses: List<SavedAddress> = emptyList(),
    val selectedAddress: SavedAddress? = null,
    val home: HomeSnapshot = HomeSnapshot.Empty,
    val favoriteIds: Set<String> = emptySet(),
    val cartItems: List<CartItem> = emptyList(),
    val branchRecommendation: BranchRecommendation? = null,
    val selectedBranch: Branch? = null,
    val activeOrder: CustomerOrder? = null,
    val isBusy: Boolean = false,
    val errorMessage: String? = null
) {
    val isAuthenticated: Boolean
        get() = session != null

    val cartTotal: Double
        get() = cartItems.sumOf { it.totalPrice }

    val cartCount: Int
        get() = cartItems.sumOf { it.quantity }
}
