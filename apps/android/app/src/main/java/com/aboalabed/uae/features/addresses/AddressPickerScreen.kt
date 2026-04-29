package com.aboalabed.uae.features.addresses

import android.content.Context
import android.location.Address
import android.location.Geocoder
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddLocationAlt
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.aboalabed.uae.AppViewModel
import com.aboalabed.uae.BuildConfig
import com.aboalabed.uae.core.design.BrandColors
import com.aboalabed.uae.core.model.AppUiState
import com.aboalabed.uae.core.model.SavedAddress
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.Marker
import com.google.maps.android.compose.MarkerState
import com.google.maps.android.compose.rememberCameraPositionState
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.Locale

private val DubaiCenter = LatLng(25.2048, 55.2708)

@Composable
fun AddressPickerScreen(
    state: AppUiState,
    actions: AppViewModel,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val isLiveMapEnabled = BuildConfig.MAPS_API_KEY.isNotBlank()
    var searchQuery by remember { mutableStateOf("") }
    var draftAddress by remember { mutableStateOf<DraftAddress?>(null) }
    var isResolving by remember { mutableStateOf(false) }

    val initialLocation = state.selectedAddress?.let { LatLng(it.latitude, it.longitude) } ?: DubaiCenter
    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(initialLocation, 11f)
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("Choose Address", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Row(verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                label = { Text("Search building, street, or area") },
                singleLine = true,
                modifier = Modifier.weight(1f)
            )
            IconButton(
                enabled = searchQuery.isNotBlank() && !isResolving,
                onClick = {
                    scope.launch {
                        isResolving = true
                        val found = geocodeQuery(context, searchQuery)
                        isResolving = false
                        if (found != null) {
                            draftAddress = found
                            if (isLiveMapEnabled) {
                                cameraPositionState.animate(
                                    CameraUpdateFactory.newLatLngZoom(
                                        LatLng(found.latitude, found.longitude),
                                        15f
                                    )
                                )
                            }
                        }
                    }
                }
            ) {
                Icon(Icons.Default.Search, contentDescription = "Search")
            }
        }

        MapPicker(
            state = state,
            draftAddress = draftAddress,
            isResolving = isResolving,
            onMapClick = { latLng ->
                scope.launch {
                    isResolving = true
                    draftAddress = reverseGeocode(context, latLng.latitude, latLng.longitude)
                        ?: DraftAddress(
                            latitude = latLng.latitude,
                            longitude = latLng.longitude,
                            label = if (state.savedAddresses.isEmpty()) "Home" else "Custom",
                            line1 = "Selected map location",
                            city = "Dubai",
                            emirate = "Dubai"
                        )
                    isResolving = false
                }
            },
            cameraContent = {
                if (isLiveMapEnabled) {
                    GoogleMap(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(300.dp),
                        cameraPositionState = cameraPositionState,
                        onMapClick = it
                    ) {
                        state.savedAddresses.forEach { address ->
                            Marker(
                                state = MarkerState(LatLng(address.latitude, address.longitude)),
                                title = address.label
                            )
                        }
                        draftAddress?.let { draft ->
                            Marker(
                                state = MarkerState(LatLng(draft.latitude, draft.longitude)),
                                title = "New Address"
                            )
                        }
                    }
                } else {
                    MapKeyMissingFallback(
                        onUseDubai = {
                            draftAddress = DraftAddress(
                                latitude = DubaiCenter.latitude,
                                longitude = DubaiCenter.longitude,
                                label = if (state.savedAddresses.isEmpty()) "Home" else "Custom",
                                line1 = "Dubai selected location",
                                city = "Dubai",
                                emirate = "Dubai"
                            )
                        }
                    )
                }
            }
        )

        Text(
            if (isLiveMapEnabled) {
                "Tap the map or use search to add a new address."
            } else {
                "Search for an address or use Dubai Center while the live map key is unavailable."
            },
            color = BrandColors.Brand,
            fontWeight = FontWeight.SemiBold
        )

        draftAddress?.let { draft ->
            AddressEditor(
                draft = draft,
                state = state,
                actions = actions,
                onSaved = {
                    draftAddress = null
                    onDismiss()
                }
            )
        }

        if (state.savedAddresses.isEmpty()) {
            Card(colors = CardDefaults.cardColors(containerColor = Color.White)) {
                Text(
                    "No saved addresses. Search or tap the map to add your pickup location details.",
                    modifier = Modifier.padding(18.dp)
                )
            }
        } else {
            state.savedAddresses.forEach { address ->
                AddressCard(
                    address = address,
                    onClick = {
                        actions.selectAddress(address)
                        onDismiss()
                    }
                )
            }
        }
    }

    LaunchedEffect(state.selectedAddress?.id) {
        if (isLiveMapEnabled) {
            state.selectedAddress?.let {
                cameraPositionState.move(CameraUpdateFactory.newLatLngZoom(LatLng(it.latitude, it.longitude), 12f))
            }
        }
    }
}

@Composable
private fun MapPicker(
    state: AppUiState,
    draftAddress: DraftAddress?,
    isResolving: Boolean,
    onMapClick: (LatLng) -> Unit,
    cameraContent: @Composable ((LatLng) -> Unit) -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(300.dp)
            .background(BrandColors.Sand, RoundedCornerShape(28.dp))
    ) {
        cameraContent(onMapClick)
        if (isResolving) {
            Row(
                modifier = Modifier
                    .align(Alignment.Center)
                    .background(Color.White.copy(alpha = 0.92f), RoundedCornerShape(16.dp))
                    .padding(14.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                Text("Finding address...")
            }
        }
        if (draftAddress == null && state.savedAddresses.isEmpty() && BuildConfig.MAPS_API_KEY.isNotBlank()) {
            Icon(
                Icons.Default.AddLocationAlt,
                contentDescription = null,
                tint = BrandColors.Brand,
                modifier = Modifier
                    .align(Alignment.Center)
                    .size(34.dp)
            )
        }
    }
}

@Composable
private fun MapKeyMissingFallback(onUseDubai: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .height(300.dp)
            .padding(20.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(Icons.Default.MyLocation, contentDescription = null, tint = BrandColors.Brand)
        Text("Google Maps key is not configured.", fontWeight = FontWeight.Bold)
        Text("Add MAPS_API_KEY in apps/android/secrets.properties to enable the live map.")
        Text(
            "Address search and Dubai Center fallback still work without it.",
            modifier = Modifier.padding(top = 8.dp),
            color = Color.Gray
        )
        Button(onClick = onUseDubai, modifier = Modifier.padding(top = 12.dp)) {
            Text("Use Dubai Center")
        }
    }
}

@Composable
private fun AddressCard(address: SavedAddress, onClick: () -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(18.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.LocationOn, contentDescription = null, tint = BrandColors.Brand)
                Text(address.label, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 8.dp))
                if (address.isDefault) {
                    Text(
                        "Default",
                        modifier = Modifier
                            .padding(start = 10.dp)
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

@Composable
private fun AddressEditor(
    draft: DraftAddress,
    state: AppUiState,
    actions: AppViewModel,
    onSaved: () -> Unit
) {
    var label by remember(draft) { mutableStateOf(draft.label) }
    var line1 by remember(draft) { mutableStateOf(draft.line1) }
    var line2 by remember(draft) { mutableStateOf("") }
    var city by remember(draft) { mutableStateOf(draft.city) }
    var emirate by remember(draft) { mutableStateOf(draft.emirate) }
    var notes by remember(draft) { mutableStateOf("") }
    var makeDefault by remember(draft) { mutableStateOf(true) }

    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(22.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Add Address", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text(
                "%.5f, %.5f".format(draft.latitude, draft.longitude),
                color = Color.Gray,
                style = MaterialTheme.typography.labelMedium
            )
            OutlinedTextField(value = label, onValueChange = { label = it }, label = { Text("Label") })
            OutlinedTextField(value = line1, onValueChange = { line1 = it }, label = { Text("Street / Area") })
            OutlinedTextField(value = line2, onValueChange = { line2 = it }, label = { Text("Building, villa, floor, unit") })
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(value = city, onValueChange = { city = it }, label = { Text("City") }, modifier = Modifier.weight(1f))
                OutlinedTextField(value = emirate, onValueChange = { emirate = it }, label = { Text("Emirate") }, modifier = Modifier.weight(1f))
            }
            OutlinedTextField(value = notes, onValueChange = { notes = it }, label = { Text("Pickup notes") })
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Make default", modifier = Modifier.weight(1f))
                Switch(checked = makeDefault, onCheckedChange = { makeDefault = it })
            }
            Button(
                onClick = {
                    actions.addAddress(
                        label = label,
                        line1 = line1,
                        line2 = line2,
                        city = city,
                        emirate = emirate,
                        notes = notes,
                        latitude = draft.latitude,
                        longitude = draft.longitude,
                        isDefault = makeDefault,
                        onSaved = onSaved
                    )
                },
                enabled = !state.isBusy && line1.isNotBlank(),
                shape = RoundedCornerShape(18.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(if (state.isBusy) "Saving..." else "Save Address", modifier = Modifier.padding(8.dp))
            }
        }
    }
}

data class DraftAddress(
    val latitude: Double,
    val longitude: Double,
    val label: String,
    val line1: String,
    val city: String,
    val emirate: String
)

@Suppress("DEPRECATION")
private suspend fun geocodeQuery(context: Context, query: String): DraftAddress? = withContext(Dispatchers.IO) {
    val result = Geocoder(context, Locale.getDefault())
        .getFromLocationName(query, 1)
        ?.firstOrNull()
        ?: return@withContext null

    result.toDraft(defaultLine = query)
}

@Suppress("DEPRECATION")
private suspend fun reverseGeocode(context: Context, latitude: Double, longitude: Double): DraftAddress? =
    withContext(Dispatchers.IO) {
        val result = Geocoder(context, Locale.getDefault())
            .getFromLocation(latitude, longitude, 1)
            ?.firstOrNull()
            ?: return@withContext null

        result.toDraft(defaultLine = "Selected map location")
    }

private fun Address.toDraft(defaultLine: String): DraftAddress {
    val line = listOfNotNull(subThoroughfare, thoroughfare, featureName)
        .filter { it.isNotBlank() }
        .distinct()
        .joinToString(", ")
        .ifBlank { getAddressLine(0) ?: defaultLine }

    return DraftAddress(
        latitude = latitude,
        longitude = longitude,
        label = "Custom",
        line1 = line,
        city = locality ?: subAdminArea ?: "Dubai",
        emirate = adminArea ?: "Dubai"
    )
}
