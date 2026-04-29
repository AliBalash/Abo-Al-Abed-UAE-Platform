package com.aboalabed.uae

import com.aboalabed.uae.core.model.CartItem
import com.aboalabed.uae.core.model.CustomerOrderStatus
import com.aboalabed.uae.core.model.Product
import com.aboalabed.uae.core.model.ProductVariant
import org.junit.Assert.assertEquals
import org.junit.Test

class DomainMappingTest {
    @Test
    fun statusCodesMapToCustomerStatuses() {
        assertEquals(CustomerOrderStatus.AwaitingPayment, CustomerOrderStatus.fromCode("awaiting_payment"))
        assertEquals(CustomerOrderStatus.InPreparation, CustomerOrderStatus.fromCode("in_preparation"))
        assertEquals(CustomerOrderStatus.ReadyForPickup, CustomerOrderStatus.fromCode("ready_for_pickup"))
        assertEquals(CustomerOrderStatus.AwaitingPayment, CustomerOrderStatus.fromCode("unknown"))
    }

    @Test
    fun cartItemTotalUsesUnitPriceAndQuantity() {
        val variant = ProductVariant(id = "variant", name = "Meal", price = 27.0)
        val item = CartItem(
            id = "item",
            product = Product(
                id = "product",
                slug = "golden",
                categorySlug = "sandwich",
                name = "Golden Chicken Sandwich",
                detail = "Crispy signature sandwich",
                imageUrl = null,
                tags = emptyList(),
                variants = listOf(variant),
                modifiers = emptyList()
            ),
            variant = variant,
            selections = emptyList(),
            quantity = 3,
            unitPrice = 29.0
        )

        assertEquals(87.0, item.totalPrice, 0.0)
    }
}
