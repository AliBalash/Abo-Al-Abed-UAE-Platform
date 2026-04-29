package com.aboalabed.uae.core.model

data class SessionUser(
    val id: String,
    val email: String,
    val roles: List<String>
)

data class SavedAddress(
    val id: String,
    val label: String,
    val line1: String,
    val line2: String?,
    val city: String,
    val emirate: String,
    val notes: String?,
    val latitude: Double,
    val longitude: Double,
    val isDefault: Boolean
)

data class HomeBanner(
    val id: String,
    val title: String,
    val subtitle: String,
    val imageUrl: String?,
    val palette: List<Long>
)

data class MenuCategory(
    val id: String,
    val slug: String,
    val title: String,
    val subtitle: String
)

data class ProductModifierOption(
    val id: String,
    val name: String,
    val priceDelta: Double,
    val isDefault: Boolean
)

data class ProductModifierGroup(
    val id: String,
    val name: String,
    val minSelections: Int,
    val maxSelections: Int,
    val options: List<ProductModifierOption>
)

data class ProductVariant(
    val id: String,
    val name: String,
    val price: Double
)

data class Product(
    val id: String,
    val slug: String,
    val categorySlug: String,
    val name: String,
    val detail: String,
    val imageUrl: String?,
    val tags: List<String>,
    val variants: List<ProductVariant>,
    val modifiers: List<ProductModifierGroup>
)

data class ProductSelection(
    val group: ProductModifierGroup,
    val options: List<ProductModifierOption>
)

data class CartItem(
    val id: String,
    val product: Product,
    val variant: ProductVariant,
    val selections: List<ProductSelection>,
    val quantity: Int,
    val unitPrice: Double
) {
    val totalPrice: Double
        get() = unitPrice * quantity
}

data class Branch(
    val id: String,
    val code: String,
    val name: String,
    val address: String,
    val latitude: Double,
    val longitude: Double,
    val estimatedPrepMinutes: Int,
    val distanceKm: Double
)

data class BranchRecommendation(
    val primary: Branch,
    val alternatives: List<Branch>
)

enum class CustomerOrderStatus(val code: String, val displayName: String) {
    AwaitingPayment("awaiting_payment", "Awaiting Pickup Payment"),
    Paid("paid", "Paid"),
    InPreparation("in_preparation", "In Preparation"),
    ReadyForPickup("ready_for_pickup", "Ready for Pickup"),
    PickedUp("picked_up", "Picked Up"),
    Cancelled("cancelled", "Cancelled"),
    Expired("expired", "Expired");

    companion object {
        fun fromCode(code: String): CustomerOrderStatus {
            return entries.firstOrNull { it.code == code } ?: AwaitingPayment
        }
    }
}

data class CustomerOrderTimeline(
    val id: String,
    val title: String,
    val subtitle: String,
    val status: CustomerOrderStatus
)

data class CustomerOrder(
    val id: String,
    val orderCode: String,
    val pickupToken: String,
    val branch: Branch,
    val address: SavedAddress,
    val items: List<CartItem>,
    val status: CustomerOrderStatus,
    val timeline: List<CustomerOrderTimeline>
)

data class HomeSnapshot(
    val banners: List<HomeBanner>,
    val categories: List<MenuCategory>,
    val featured: List<Product>,
    val recommendations: List<Product>
) {
    companion object {
        val Empty = HomeSnapshot(
            banners = emptyList(),
            categories = emptyList(),
            featured = emptyList(),
            recommendations = emptyList()
        )
    }
}
