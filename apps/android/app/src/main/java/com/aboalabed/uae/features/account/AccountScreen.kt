package com.aboalabed.uae.features.account

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.aboalabed.uae.core.design.BrandColors
import com.aboalabed.uae.core.model.AppUiState
import com.aboalabed.uae.core.model.SavedAddress

@Composable
fun AccountScreen(
    state: AppUiState,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(BrandColors.Cream),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text("Account", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        }
        item {
            Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(18.dp)) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Account", fontWeight = FontWeight.Bold)
                    Text(state.session?.email ?: "Guest", color = Color.Gray)
                }
            }
        }
        item {
            Text("Saved Addresses", fontWeight = FontWeight.Bold)
        }
        if (state.savedAddresses.isEmpty()) {
            item {
                Card(colors = CardDefaults.cardColors(containerColor = Color.White)) {
                    Text("No saved addresses yet.", modifier = Modifier.padding(16.dp))
                }
            }
        } else {
            items(state.savedAddresses) { address ->
                AddressSummary(address)
            }
        }
    }
}

@Composable
private fun AddressSummary(address: SavedAddress) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(18.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row {
                Text(address.label, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                if (address.isDefault) {
                    Text(
                        "Default",
                        modifier = Modifier
                            .background(BrandColors.Sand, RoundedCornerShape(50))
                            .padding(horizontal = 10.dp, vertical = 5.dp)
                    )
                }
            }
            Text(address.line1, color = Color.Gray, maxLines = 1, overflow = TextOverflow.Ellipsis)
            address.line2?.takeIf { it.isNotBlank() }?.let {
                Text(it, color = Color.Gray)
            }
            Text("${address.city}, ${address.emirate}", color = Color.Gray)
        }
    }
}
