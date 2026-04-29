package com.aboalabed.uae.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Home
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.aboalabed.uae.AppViewModel
import com.aboalabed.uae.core.model.AppUiState
import com.aboalabed.uae.features.account.AccountScreen
import com.aboalabed.uae.features.auth.AuthScreen
import com.aboalabed.uae.features.home.FavoritesScreen
import com.aboalabed.uae.features.home.HomeScreen
import com.aboalabed.uae.features.orders.OrdersHubScreen

enum class MainTab(val label: String) {
    Menu("Menu"),
    Favorites("Favorites"),
    Orders("Orders"),
    Account("Account")
}

@Composable
fun AboAlAbedApp(state: AppUiState, actions: AppViewModel) {
    if (!state.isAuthenticated) {
        AuthScreen(state = state, onLogin = actions::login)
        return
    }

    var selectedTab by remember { mutableStateOf(MainTab.Menu) }

    Scaffold(
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    selected = selectedTab == MainTab.Menu,
                    onClick = { selectedTab = MainTab.Menu },
                    icon = { Icon(Icons.Default.Home, contentDescription = null) },
                    label = { Text(MainTab.Menu.label) }
                )
                NavigationBarItem(
                    selected = selectedTab == MainTab.Favorites,
                    onClick = { selectedTab = MainTab.Favorites },
                    icon = { Icon(Icons.Default.Favorite, contentDescription = null) },
                    label = { Text(MainTab.Favorites.label) }
                )
                NavigationBarItem(
                    selected = selectedTab == MainTab.Orders,
                    onClick = { selectedTab = MainTab.Orders },
                    icon = { Icon(Icons.AutoMirrored.Filled.ReceiptLong, contentDescription = null) },
                    label = { Text(MainTab.Orders.label) }
                )
                NavigationBarItem(
                    selected = selectedTab == MainTab.Account,
                    onClick = { selectedTab = MainTab.Account },
                    icon = { Icon(Icons.Default.AccountCircle, contentDescription = null) },
                    label = { Text(MainTab.Account.label) }
                )
            }
        }
    ) { padding ->
        when (selectedTab) {
            MainTab.Menu -> HomeScreen(
                state = state,
                actions = actions,
                modifier = Modifier.padding(padding),
                onOrderPlaced = { selectedTab = MainTab.Orders }
            )

            MainTab.Favorites -> FavoritesScreen(
                state = state,
                actions = actions,
                modifier = Modifier.padding(padding)
            )

            MainTab.Orders -> OrdersHubScreen(
                state = state,
                onRefresh = actions::refreshActiveOrder,
                modifier = Modifier.padding(padding)
            )

            MainTab.Account -> AccountScreen(
                state = state,
                modifier = Modifier.padding(padding)
            )
        }
    }
}
