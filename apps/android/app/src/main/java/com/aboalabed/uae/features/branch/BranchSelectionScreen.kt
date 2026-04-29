package com.aboalabed.uae.features.branch

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.aboalabed.uae.core.design.BrandColors
import com.aboalabed.uae.core.model.AppUiState
import com.aboalabed.uae.core.model.Branch

@Composable
fun BranchSelectionScreen(
    state: AppUiState,
    onBranch: (Branch) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Text("Select Branch", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        val recommendation = state.branchRecommendation
        if (recommendation == null) {
            Card(colors = CardDefaults.cardColors(containerColor = Color.White)) {
                Text("Choose a saved address first.", modifier = Modifier.padding(18.dp))
            }
        } else {
            Text("Recommended", fontWeight = FontWeight.Bold)
            BranchCard(recommendation.primary, isRecommended = true, onClick = { onBranch(recommendation.primary) })
            if (recommendation.alternatives.isNotEmpty()) {
                Text("Alternatives", fontWeight = FontWeight.Bold)
                recommendation.alternatives.forEach { branch ->
                    BranchCard(branch, isRecommended = false, onClick = { onBranch(branch) })
                }
            }
        }
    }
}

@Composable
private fun BranchCard(branch: Branch, isRecommended: Boolean, onClick: () -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(18.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(branch.name, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                if (isRecommended) {
                    Surface(color = BrandColors.Sand, shape = RoundedCornerShape(50)) {
                        Text("Nearest", modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp))
                    }
                }
            }
            Text(branch.address, color = Color.Gray)
            Text(
                "${"%.1f".format(branch.distanceKm)} km · ${branch.estimatedPrepMinutes} min prep after payment",
                color = BrandColors.Success,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}
