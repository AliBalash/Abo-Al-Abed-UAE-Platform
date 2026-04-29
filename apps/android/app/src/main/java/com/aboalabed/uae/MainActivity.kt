package com.aboalabed.uae

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.aboalabed.uae.core.design.AboAlAbedTheme
import com.aboalabed.uae.navigation.AboAlAbedApp

class MainActivity : ComponentActivity() {
    private val viewModel: AppViewModel by viewModels {
        AppViewModelFactory((application as AboAlAbedApplication).repository)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            val state by viewModel.uiState.collectAsStateWithLifecycle()
            AboAlAbedTheme {
                AboAlAbedApp(state = state, actions = viewModel)
                state.errorMessage?.let { message ->
                    AlertDialog(
                        onDismissRequest = viewModel::clearError,
                        confirmButton = {
                            TextButton(onClick = viewModel::clearError) {
                                Text("OK")
                            }
                        },
                        title = { Text("Something needs attention") },
                        text = { Text(message) }
                    )
                }
            }
        }
    }
}
