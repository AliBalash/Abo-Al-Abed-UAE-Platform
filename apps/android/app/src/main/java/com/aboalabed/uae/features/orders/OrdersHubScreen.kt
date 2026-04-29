package com.aboalabed.uae.features.orders

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aboalabed.uae.core.design.BrandColors
import com.aboalabed.uae.core.model.AppUiState
import com.aboalabed.uae.core.model.CustomerOrder
import com.aboalabed.uae.core.model.CustomerOrderStatus

@Composable
fun OrdersHubScreen(
    state: AppUiState,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier
) {
    val order = state.activeOrder
    if (order == null) {
        Column(
            modifier = modifier
                .fillMaxSize()
                .background(BrandColors.Cream)
                .padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("No active order", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text(
                "Place an order to track cashier payment and kitchen progress here.",
                textAlign = TextAlign.Center,
                color = Color.Gray,
                modifier = Modifier.padding(top = 8.dp)
            )
        }
        return
    }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(BrandColors.Cream),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text("Track Order", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        }
        item {
            PickupCodeCard(order)
        }
        item {
            TimelineCard(order)
        }
        item {
            Button(
                onClick = onRefresh,
                enabled = !state.isBusy,
                shape = RoundedCornerShape(20.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                if (state.isBusy) {
                    CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp)
                }
                Text(
                    if (state.isBusy) "Refreshing..." else "Refresh Order Status",
                    modifier = Modifier.padding(10.dp),
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}

@Composable
private fun PickupCodeCard(order: CustomerOrder) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(28.dp)
    ) {
        Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Pickup Code", fontWeight = FontWeight.Bold)
            Text(
                order.orderCode,
                fontSize = 42.sp,
                letterSpacing = 4.sp,
                fontWeight = FontWeight.Black
            )
            Text(
                "Show this code to the cashier. Payment is confirmed in-branch before kitchen prep starts.",
                color = Color.Gray
            )
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(BrandColors.Sand, RoundedCornerShape(18.dp))
                    .padding(14.dp)
            ) {
                Text("Pickup token ${order.pickupToken}", modifier = Modifier.weight(1f))
                Text(order.status.displayName, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun TimelineCard(order: CustomerOrder) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(28.dp)
    ) {
        Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text("Order Timeline", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            order.timeline.forEach { event ->
                Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Box(
                        modifier = Modifier
                            .padding(top = 5.dp)
                            .size(14.dp)
                            .background(statusColor(event.status), CircleShape)
                    )
                    Column {
                        Text(event.title, fontWeight = FontWeight.Bold)
                        Text(event.subtitle, color = Color.Gray)
                    }
                }
            }
        }
    }
}

private fun statusColor(status: CustomerOrderStatus): Color {
    return when (status) {
        CustomerOrderStatus.AwaitingPayment -> BrandColors.Warning
        CustomerOrderStatus.Paid -> BrandColors.Brand
        CustomerOrderStatus.InPreparation -> Color(0xFFFF8A00)
        CustomerOrderStatus.ReadyForPickup,
        CustomerOrderStatus.PickedUp -> BrandColors.Success
        CustomerOrderStatus.Cancelled,
        CustomerOrderStatus.Expired -> Color.Gray
    }
}
