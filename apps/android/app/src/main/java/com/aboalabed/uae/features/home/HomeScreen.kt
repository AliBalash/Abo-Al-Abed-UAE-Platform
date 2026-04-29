package com.aboalabed.uae.features.home

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Badge
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.aboalabed.uae.AppViewModel
import com.aboalabed.uae.R
import com.aboalabed.uae.core.design.BrandColors
import com.aboalabed.uae.core.model.AppUiState
import com.aboalabed.uae.core.model.Product
import com.aboalabed.uae.features.addresses.AddressPickerScreen
import com.aboalabed.uae.features.cart.CartScreen
import com.aboalabed.uae.features.product.ProductDetailScreen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    state: AppUiState,
    actions: AppViewModel,
    modifier: Modifier = Modifier,
    onOrderPlaced: () -> Unit
) {
    var selectedCategorySlug by remember { mutableStateOf<String?>(null) }
    var selectedProduct by remember { mutableStateOf<Product?>(null) }
    var showAddresses by remember { mutableStateOf(false) }
    var showCart by remember { mutableStateOf(false) }

    val allProducts by remember(state.home) {
        derivedStateOf {
            (state.home.featured + state.home.recommendations).distinctBy { it.id }
        }
    }
    val products = selectedCategorySlug?.let { slug ->
        allProducts.filter { it.categorySlug == slug }
    } ?: allProducts

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(BrandColors.Cream)
    ) {
        if (allProducts.isEmpty() && state.isBusy) {
            Column(
                modifier = Modifier.align(Alignment.Center),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                CircularProgressIndicator(color = BrandColors.Brand)
                Text("Preparing Menu", fontWeight = FontWeight.Bold)
                Text("Loading your menu, saved address, and pickup branch.")
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                item {
                    HomeHeader(
                        cartCount = state.cartCount,
                        onCartClick = { showCart = true }
                    )
                }
                item {
                    AddressBar(
                        state = state,
                        onClick = { showAddresses = true }
                    )
                }
                item {
                    BannerRail(state)
                }
                item {
                    CategoryRail(
                        state = state,
                        allProducts = allProducts,
                        selectedCategorySlug = selectedCategorySlug,
                        onSelect = { selectedCategorySlug = it }
                    )
                }
                item {
                    val category = state.home.categories.firstOrNull { it.slug == selectedCategorySlug }
                    ProductSection(
                        title = category?.title ?: "All Menu",
                        subtitle = category?.subtitle ?: "Filter the complete menu by category.",
                        products = products,
                        favoriteIds = state.favoriteIds,
                        onFavorite = actions::toggleFavorite,
                        onProduct = { selectedProduct = it }
                    )
                }
            }
        }
    }

    if (showAddresses) {
        ModalBottomSheet(onDismissRequest = { showAddresses = false }) {
            AddressPickerScreen(
                state = state,
                actions = actions,
                onDismiss = { showAddresses = false }
            )
        }
    }

    selectedProduct?.let { product ->
        ModalBottomSheet(onDismissRequest = { selectedProduct = null }) {
            ProductDetailScreen(
                product = product,
                onAddToCart = { variant, selections ->
                    actions.addToCart(product, variant, selections)
                    selectedProduct = null
                }
            )
        }
    }

    if (showCart) {
        ModalBottomSheet(onDismissRequest = { showCart = false }) {
            CartScreen(
                state = state,
                actions = actions,
                onOrderPlaced = {
                    showCart = false
                    onOrderPlaced()
                }
            )
        }
    }
}

@Composable
private fun HomeHeader(cartCount: Int, onCartClick: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Image(
            painter = painterResource(R.drawable.farooj_logo_english),
            contentDescription = null,
            contentScale = ContentScale.Fit,
            modifier = Modifier
                .size(width = 120.dp, height = 44.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(Color.White)
                .padding(8.dp)
        )
        Spacer(Modifier.weight(1f))
        Box {
            IconButton(onClick = onCartClick) {
                Icon(Icons.Default.ShoppingBag, contentDescription = "Cart", tint = BrandColors.Ink)
            }
            if (cartCount > 0) {
                Badge(
                    containerColor = BrandColors.Brand,
                    contentColor = Color.White,
                    modifier = Modifier.align(Alignment.TopEnd)
                ) {
                    Text(cartCount.toString())
                }
            }
        }
    }
}

@Composable
private fun AddressBar(state: AppUiState, onClick: () -> Unit) {
    Card(
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier.padding(18.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    "Deliver to pickup branch from",
                    style = MaterialTheme.typography.labelMedium,
                    color = Color.Gray
                )
                Text(
                    state.selectedAddress?.label ?: "Choose Address",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    state.selectedAddress?.line1 ?: "Add a saved location",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.Gray,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Icon(Icons.Default.KeyboardArrowDown, contentDescription = null)
        }
    }
}

@Composable
private fun BannerRail(state: AppUiState) {
    LazyRow(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
        items(state.home.banners) { banner ->
            Box(
                modifier = Modifier
                    .width(300.dp)
                    .height(184.dp)
                    .clip(RoundedCornerShape(30.dp))
                    .background(BrandColors.HeroGradient)
                    .padding(22.dp)
            ) {
                Column(
                    modifier = Modifier.fillMaxHeight(),
                    verticalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(
                            text = banner.title,
                            color = Color.White,
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = banner.subtitle,
                            color = Color.White.copy(alpha = 0.84f),
                            maxLines = 3,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.ShoppingCart, contentDescription = null, tint = Color.White)
                        Spacer(Modifier.width(8.dp))
                        Text("Self Pickup", color = Color.White, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
}

@Composable
private fun CategoryRail(
    state: AppUiState,
    allProducts: List<Product>,
    selectedCategorySlug: String?,
    onSelect: (String?) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Explore Menu", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                CategoryChip(
                    title = "All",
                    subtitle = "${allProducts.size} items",
                    selected = selectedCategorySlug == null,
                    onClick = { onSelect(null) }
                )
            }
            items(state.home.categories) { category ->
                val count = allProducts.count { it.categorySlug == category.slug }
                CategoryChip(
                    title = category.title,
                    subtitle = if (count == 1) "1 item" else "$count items",
                    selected = selectedCategorySlug == category.slug,
                    onClick = { onSelect(category.slug) }
                )
            }
        }
    }
}

@Composable
private fun CategoryChip(title: String, subtitle: String, selected: Boolean, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        color = if (selected) BrandColors.Brand else Color.White,
        contentColor = if (selected) Color.White else BrandColors.Ink,
        shape = RoundedCornerShape(22.dp),
        modifier = Modifier
            .width(180.dp)
            .height(88.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(title, fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Text(
                subtitle,
                style = MaterialTheme.typography.labelMedium,
                color = if (selected) Color.White.copy(alpha = 0.82f) else Color.Gray
            )
        }
    }
}

@Composable
private fun ProductSection(
    title: String,
    subtitle: String,
    products: List<Product>,
    favoriteIds: Set<String>,
    onFavorite: (String) -> Unit,
    onProduct: (Product) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text(title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Text(subtitle, color = Color.Gray)
        if (products.isEmpty()) {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(22.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    "No items in this category. Choose another menu category.",
                    modifier = Modifier.padding(20.dp)
                )
            }
        } else {
            products.forEach { product ->
                ProductCard(
                    product = product,
                    isFavorite = product.id in favoriteIds,
                    onFavorite = { onFavorite(product.id) },
                    onProduct = { onProduct(product) }
                )
            }
        }
    }
}

@Composable
fun ProductCard(
    product: Product,
    isFavorite: Boolean,
    onFavorite: () -> Unit,
    onProduct: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(28.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onProduct)
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            AsyncImage(
                model = product.imageUrl,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .size(width = 118.dp, height = 110.dp)
                    .clip(RoundedCornerShape(22.dp))
                    .background(BrandColors.Sand)
            )
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Row(verticalAlignment = Alignment.Top) {
                    Text(
                        product.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.weight(1f),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    IconButton(
                        onClick = onFavorite,
                        modifier = Modifier.size(34.dp)
                    ) {
                        Icon(
                            if (isFavorite) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                            contentDescription = null,
                            tint = BrandColors.Brand
                        )
                    }
                }
                Text(product.detail, color = Color.Gray, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        "AED ${product.variants.firstOrNull()?.price?.toInt() ?: 0}",
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(Modifier.weight(1f))
                    product.tags.take(2).forEach { tag ->
                        AssistChip(
                            onClick = {},
                            label = { Text(tag) },
                            modifier = Modifier.padding(start = 6.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun FavoritesScreen(
    state: AppUiState,
    actions: AppViewModel,
    modifier: Modifier = Modifier
) {
    val products = (state.home.featured + state.home.recommendations)
        .distinctBy { it.id }
        .filter { it.id in state.favoriteIds }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(BrandColors.Cream),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Text("Favorites", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        }
        if (products.isEmpty()) {
            item {
                Card(colors = CardDefaults.cardColors(containerColor = Color.White)) {
                    Text("Favorite menu items will appear here.", modifier = Modifier.padding(18.dp))
                }
            }
        } else {
            items(products) { product ->
                ProductCard(
                    product = product,
                    isFavorite = true,
                    onFavorite = { actions.toggleFavorite(product.id) },
                    onProduct = {}
                )
            }
        }
    }
}
