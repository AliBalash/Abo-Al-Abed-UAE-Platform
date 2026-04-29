package com.aboalabed.uae.core.network

import com.aboalabed.uae.core.model.Branch
import com.aboalabed.uae.core.model.BranchRecommendation
import com.aboalabed.uae.core.model.CartItem
import com.aboalabed.uae.core.model.CustomerOrder
import com.aboalabed.uae.core.model.CustomerOrderStatus
import com.aboalabed.uae.core.model.CustomerOrderTimeline
import com.aboalabed.uae.core.model.HomeBanner
import com.aboalabed.uae.core.model.MenuCategory
import com.aboalabed.uae.core.model.Product
import com.aboalabed.uae.core.model.ProductModifierGroup
import com.aboalabed.uae.core.model.ProductModifierOption
import com.aboalabed.uae.core.model.ProductVariant
import com.aboalabed.uae.core.model.SavedAddress
import com.aboalabed.uae.core.model.SessionUser

data class LoginBody(val email: String, val password: String)

data class AuthResponse(
    val accessToken: String,
    val user: SessionUserResponse
)

data class SessionUserResponse(
    val id: String,
    val email: String,
    val roles: List<String> = emptyList()
) {
    fun toDomain() = SessionUser(id = id, email = email, roles = roles)
}

data class LocalizedTextResponse(
    val en: String? = null,
    val ar: String? = null
) {
    val primary: String
        get() = en?.takeIf { it.isNotBlank() } ?: ar.orEmpty()
}

data class HomeResponse(
    val banners: List<BannerResponse> = emptyList(),
    val categories: List<CategoryResponse> = emptyList(),
    val featuredProducts: List<ProductResponse> = emptyList()
)

data class BannerResponse(
    val id: String,
    val title: LocalizedTextResponse? = null,
    val subtitle: LocalizedTextResponse? = null,
    val imageUrl: String? = null,
    val theme: String? = null
) {
    fun toDomain() = HomeBanner(
        id = id,
        title = title?.primary.orEmpty(),
        subtitle = subtitle?.primary.orEmpty(),
        imageUrl = imageUrl,
        palette = when (theme) {
            "dark" -> listOf(0xFF1C1C1C, 0xFF8B1116, 0xFFF7BE63)
            "promo" -> listOf(0xFF8B1116, 0xFFCD2026, 0xFFFFB848)
            else -> listOf(0xFF8B1116, 0xFFCD2026, 0xFFFFB848)
        }
    )
}

data class CategoryResponse(
    val id: String,
    val slug: String,
    val title: LocalizedTextResponse? = null,
    val titleEn: String? = null,
    val titleAr: String? = null,
    val description: LocalizedTextResponse? = null,
    val descriptionEn: String? = null,
    val descriptionAr: String? = null
) {
    fun toDomain(): MenuCategory {
        val resolvedTitle = title?.primary
            ?: titleEn
            ?: titleAr
            ?: slug.replace("-", " ").replaceFirstChar { it.uppercaseChar() }
        val resolvedSubtitle = description?.primary
            ?: descriptionEn
            ?: descriptionAr
            ?: "Pickup-ready selection"
        return MenuCategory(id = id, slug = slug, title = resolvedTitle, subtitle = resolvedSubtitle)
    }
}

data class ProductResponse(
    val id: String,
    val slug: String? = null,
    val categorySlug: String,
    val name: LocalizedTextResponse,
    val description: LocalizedTextResponse,
    val heroImageUrl: String? = null,
    val tags: List<String> = emptyList(),
    val variants: List<ProductVariantResponse> = emptyList(),
    val modifierGroups: List<ProductModifierGroupResponse> = emptyList()
) {
    fun toDomain() = Product(
        id = id,
        slug = slug.orEmpty(),
        categorySlug = categorySlug,
        name = name.primary,
        detail = description.primary,
        imageUrl = heroImageUrl,
        tags = tags.map { tag -> tag.replace("-", " ").replaceFirstChar { it.uppercaseChar() } },
        variants = variants.map { it.toDomain() },
        modifiers = modifierGroups.map { it.toDomain() }
    )
}

data class ProductVariantResponse(
    val id: String,
    val name: LocalizedTextResponse,
    val price: MoneyResponse
) {
    fun toDomain() = ProductVariant(id = id, name = name.primary, price = price.amount)
}

data class ProductModifierGroupResponse(
    val id: String,
    val name: LocalizedTextResponse,
    val minSelections: Int = 0,
    val maxSelections: Int = 1,
    val options: List<ProductModifierOptionResponse> = emptyList()
) {
    fun toDomain() = ProductModifierGroup(
        id = id,
        name = name.primary,
        minSelections = minSelections,
        maxSelections = maxSelections,
        options = options.map { it.toDomain() }
    )
}

data class ProductModifierOptionResponse(
    val id: String,
    val name: LocalizedTextResponse,
    val priceDelta: Double = 0.0,
    val isDefault: Boolean = false
) {
    fun toDomain() = ProductModifierOption(
        id = id,
        name = name.primary,
        priceDelta = priceDelta,
        isDefault = isDefault
    )
}

data class MoneyResponse(
    val amount: Double = 0.0,
    val currency: String = "AED"
)

data class CoordinatesResponse(
    val lat: Double = 0.0,
    val lng: Double = 0.0
)

data class AddressResponse(
    val id: String,
    val label: String,
    val line1: String,
    val line2: String? = null,
    val city: String,
    val emirate: String,
    val notes: String? = null,
    val coordinates: CoordinatesResponse,
    val isDefault: Boolean = false
) {
    fun toDomain() = SavedAddress(
        id = id,
        label = label.replaceFirstChar { it.uppercaseChar() },
        line1 = line1,
        line2 = line2,
        city = city,
        emirate = emirate,
        notes = notes,
        latitude = coordinates.lat,
        longitude = coordinates.lng,
        isDefault = isDefault
    )
}

data class CreatedAddressResponse(val id: String)

data class SaveAddressBody(
    val label: String,
    val line1: String,
    val line2: String?,
    val city: String,
    val emirate: String,
    val notes: String?,
    val lat: Double,
    val lng: Double,
    val isDefault: Boolean
)

data class BranchRecommendationResponse(
    val primary: BranchResponse,
    val alternatives: List<BranchResponse> = emptyList()
) {
    fun toDomain() = BranchRecommendation(
        primary = primary.toDomain(),
        alternatives = alternatives.map { it.toDomain() }
    )
}

data class BranchResponse(
    val id: String,
    val code: String,
    val name: LocalizedTextResponse,
    val address: LocalizedTextResponse,
    val coordinates: CoordinatesResponse,
    val estimatedPrepMinutes: Int = 0,
    val distanceKm: Double? = null
) {
    fun toDomain() = Branch(
        id = id,
        code = code,
        name = name.primary,
        address = address.primary,
        latitude = coordinates.lat,
        longitude = coordinates.lng,
        estimatedPrepMinutes = estimatedPrepMinutes,
        distanceKm = distanceKm ?: 0.0
    )
}

data class CartResponse(
    val id: String,
    val items: List<CartItemResponse> = emptyList()
)

data class CartItemResponse(val id: String)

data class CartSelectionBody(
    val modifierGroupId: String,
    val optionIds: List<String>
)

data class CartItemBody(
    val productId: String,
    val variantId: String,
    val quantity: Int,
    val notes: String?,
    val selections: List<CartSelectionBody>
)

data class SetBranchBody(val branchId: String)

data class CreateOrderBody(
    val addressId: String,
    val branchId: String,
    val cartId: String,
    val idempotencyKey: String
)

data class OrderSummaryResponse(
    val id: String,
    val status: String
)

data class OrderResponse(
    val id: String,
    val orderCode: String,
    val pickupToken: String? = null,
    val branch: BranchResponse,
    val address: AddressResponse,
    val items: List<OrderItemResponse> = emptyList(),
    val status: String,
    val timeline: List<TimelineResponse> = emptyList()
) {
    fun toDomain() = CustomerOrder(
        id = id,
        orderCode = orderCode,
        pickupToken = pickupToken ?: "-",
        branch = branch.toDomain(),
        address = address.toDomain(),
        items = items.map { it.toDomain() },
        status = CustomerOrderStatus.fromCode(status),
        timeline = timeline.mapIndexed { index, event -> event.toDomain(index) }
    )
}

data class OrderItemResponse(
    val id: String,
    val productId: String,
    val variantId: String,
    val quantity: Int,
    val unitPrice: MoneyResponse,
    val totalPrice: MoneyResponse,
    val name: String,
    val variantName: String
) {
    fun toDomain(): CartItem {
        val variant = ProductVariant(id = variantId, name = variantName, price = unitPrice.amount)
        val product = Product(
            id = productId,
            slug = "",
            categorySlug = "",
            name = name,
            detail = "",
            imageUrl = null,
            tags = emptyList(),
            variants = listOf(variant),
            modifiers = emptyList()
        )
        return CartItem(
            id = id,
            product = product,
            variant = variant,
            selections = emptyList(),
            quantity = quantity,
            unitPrice = unitPrice.amount
        )
    }
}

data class TimelineResponse(
    val status: String,
    val note: String? = null
) {
    fun toDomain(index: Int): CustomerOrderTimeline {
        val mapped = CustomerOrderStatus.fromCode(status)
        return CustomerOrderTimeline(
            id = "$status-$index",
            title = when (mapped) {
                CustomerOrderStatus.AwaitingPayment -> "Awaiting Payment"
                CustomerOrderStatus.InPreparation -> "In Preparation"
                CustomerOrderStatus.ReadyForPickup -> "Ready for Pickup"
                CustomerOrderStatus.PickedUp -> "Picked Up"
                else -> mapped.displayName
            },
            subtitle = note ?: "Status updated",
            status = mapped
        )
    }
}

data class ApiOkResponse(val ok: Boolean = true)
