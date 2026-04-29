package com.aboalabed.uae.features.product

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Circle
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.aboalabed.uae.core.design.BrandColors
import com.aboalabed.uae.core.model.Product
import com.aboalabed.uae.core.model.ProductModifierGroup
import com.aboalabed.uae.core.model.ProductModifierOption
import com.aboalabed.uae.core.model.ProductSelection
import com.aboalabed.uae.core.model.ProductVariant
import com.aboalabed.uae.core.model.defaultOptionIds
import com.aboalabed.uae.core.model.toggleModifierOption

@Composable
fun ProductDetailScreen(
    product: Product,
    onAddToCart: (ProductVariant, List<ProductSelection>) -> Unit
) {
    var selectedVariantIndex by remember(product.id) { mutableIntStateOf(0) }
    var selectionMap by remember(product.id) {
        mutableStateOf(product.modifiers.associate { it.id to defaultOptionIds(it) })
    }

    val selectedVariant = product.variants.getOrNull(selectedVariantIndex)
        ?: product.variants.first()
    val modifierPrice = product.modifiers
        .flatMap { group -> group.options.filter { it.id in selectionMap.getValue(group.id) } }
        .sumOf { it.priceDelta }
    val total = selectedVariant.price + modifierPrice

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp)
            .padding(bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        AsyncImage(
            model = product.imageUrl,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .fillMaxWidth()
                .height(280.dp)
                .clip(RoundedCornerShape(30.dp))
                .background(BrandColors.Sand)
        )
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(
                product.name,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold
            )
            Text(product.detail, color = Color.Gray)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                product.variants.forEachIndexed { index, variant ->
                    FilterChip(
                        selected = selectedVariantIndex == index,
                        onClick = { selectedVariantIndex = index },
                        label = { Text("${variant.name} · AED ${variant.price.toInt()}") }
                    )
                }
            }
        }
        product.modifiers.forEach { group ->
            ModifierGroup(
                group = group,
                selectedIds = selectionMap.getValue(group.id),
                onToggle = { option ->
                    selectionMap = selectionMap + (
                        group.id to toggleModifierOption(group, selectionMap.getValue(group.id), option.id)
                        )
                }
            )
        }
        Button(
            onClick = {
                val selections = product.modifiers.map { group ->
                    ProductSelection(
                        group = group,
                        options = group.options.filter { it.id in selectionMap.getValue(group.id) }
                    )
                }
                onAddToCart(selectedVariant, selections)
            },
            shape = RoundedCornerShape(22.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(
                "Add to Cart · AED ${total.toInt()}",
                modifier = Modifier.padding(10.dp),
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
private fun ModifierGroup(
    group: ProductModifierGroup,
    selectedIds: Set<String>,
    onToggle: (ProductModifierOption) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(group.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        group.options.forEach { option ->
            Card(
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(18.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onToggle(option) }
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(option.name, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(
                        if (option.priceDelta > 0) "+AED ${option.priceDelta.toInt()}" else "Included",
                        color = Color.Gray
                    )
                    Spacer(Modifier.size(10.dp))
                    Icon(
                        if (option.id in selectedIds) Icons.Default.CheckCircle else Icons.Default.Circle,
                        contentDescription = null,
                        tint = if (option.id in selectedIds) BrandColors.Brand else Color.LightGray
                    )
                }
            }
        }
        if (group.minSelections > 0) {
            Surface(
                color = BrandColors.Sand,
                shape = RoundedCornerShape(14.dp)
            ) {
                Text(
                    "Choose ${group.minSelections} to ${group.maxSelections}",
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                    style = MaterialTheme.typography.labelMedium
                )
            }
        }
    }
}
