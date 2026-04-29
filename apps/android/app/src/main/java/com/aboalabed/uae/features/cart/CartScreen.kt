package com.aboalabed.uae.features.cart

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Store
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.aboalabed.uae.AppViewModel
import com.aboalabed.uae.core.design.BrandColors
import com.aboalabed.uae.core.model.AppUiState
import com.aboalabed.uae.core.model.CartItem
import com.aboalabed.uae.features.branch.BranchSelectionScreen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CartScreen(
    state: AppUiState,
    actions: AppViewModel,
    onOrderPlaced: () -> Unit
) {
    var showBranches by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("Cart", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        if (state.cartItems.isEmpty()) {
            Card(colors = CardDefaults.cardColors(containerColor = Color.White)) {
                Text(
                    "Cart is empty. Add a few items from the menu and come back here to choose the pickup branch.",
                    modifier = Modifier.padding(18.dp)
                )
            }
        } else {
            state.cartItems.forEach { item ->
                CartItemCard(item = item, onRemove = { actions.removeCartItem(item) })
            }
            PickupBranchCard(state = state, onClick = { showBranches = true })
            Card(
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(26.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row {
                        Text("Total")
                        Spacer(Modifier.weight(1f))
                        Text("AED ${state.cartTotal.toInt()}", fontWeight = FontWeight.Bold)
                    }
                    Button(
                        onClick = { actions.placeOrder(onOrderPlaced) },
                        enabled = !state.isBusy,
                        shape = RoundedCornerShape(20.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        if (state.isBusy) {
                            CircularProgressIndicator(
                                color = Color.White,
                                strokeWidth = 2.dp,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                        Text(
                            if (state.isBusy) "Placing Order..." else "Place Pickup Order",
                            modifier = Modifier.padding(10.dp),
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }
        }
    }

    if (showBranches) {
        ModalBottomSheet(onDismissRequest = { showBranches = false }) {
            BranchSelectionScreen(
                state = state,
                onBranch = {
                    actions.selectBranch(it)
                    showBranches = false
                }
            )
        }
    }
}

@Composable
private fun CartItemCard(item: CartItem, onRemove: () -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(22.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(item.product.name, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                IconButton(onClick = onRemove) {
                    Icon(Icons.Default.Delete, contentDescription = "Remove", tint = BrandColors.Brand)
                }
            }
            Text("${item.variant.name} · Qty ${item.quantity}", color = Color.Gray)
            Text("AED ${item.totalPrice.toInt()}", fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun PickupBranchCard(state: AppUiState, onClick: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Suggested Pickup Branch", fontWeight = FontWeight.Bold)
        val branch = state.selectedBranch
        if (branch != null) {
            Card(
                shape = RoundedCornerShape(24.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(onClick = onClick)
            ) {
                Column(
                    modifier = Modifier
                        .background(BrandColors.PanelGradient)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Store, contentDescription = null, tint = BrandColors.Brand)
                        Spacer(Modifier.size(10.dp))
                        Text(branch.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    }
                    Text("${branch.address} · ${"%.1f".format(branch.distanceKm)} km away", color = Color.Gray)
                    Text(
                        "Estimated prep after payment: ${branch.estimatedPrepMinutes} min",
                        color = BrandColors.Success,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }
    }
}
