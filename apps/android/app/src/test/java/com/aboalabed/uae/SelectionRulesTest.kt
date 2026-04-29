package com.aboalabed.uae

import com.aboalabed.uae.core.model.ProductModifierGroup
import com.aboalabed.uae.core.model.ProductModifierOption
import com.aboalabed.uae.core.model.defaultOptionIds
import com.aboalabed.uae.core.model.toggleModifierOption
import org.junit.Assert.assertEquals
import org.junit.Test

class SelectionRulesTest {
    private val normal = ProductModifierOption("normal", "Normal", 0.0, true)
    private val spicy = ProductModifierOption("spicy", "Spicy", 0.0, false)
    private val extra = ProductModifierOption("extra", "Extra", 2.0, false)

    @Test
    fun defaultOptionIdsPreferBackendDefaults() {
        val group = ProductModifierGroup(
            id = "spice",
            name = "Spice",
            minSelections = 1,
            maxSelections = 1,
            options = listOf(normal, spicy)
        )

        assertEquals(setOf("normal"), defaultOptionIds(group))
    }

    @Test
    fun toggleModifierOptionRespectsMinAndMax() {
        val group = ProductModifierGroup(
            id = "sauce",
            name = "Sauce",
            minSelections = 1,
            maxSelections = 2,
            options = listOf(normal, spicy, extra)
        )

        val first = toggleModifierOption(group, setOf("normal"), "spicy")
        assertEquals(setOf("normal", "spicy"), first)

        val second = toggleModifierOption(group, first, "extra")
        assertEquals(setOf("spicy", "extra"), second)

        val third = toggleModifierOption(group, setOf("spicy"), "spicy")
        assertEquals(setOf("spicy"), third)
    }
}
