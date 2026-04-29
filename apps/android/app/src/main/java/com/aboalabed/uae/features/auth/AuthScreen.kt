package com.aboalabed.uae.features.auth

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aboalabed.uae.R
import com.aboalabed.uae.core.design.BrandColors
import com.aboalabed.uae.core.model.AppUiState

@Composable
fun AuthScreen(
    state: AppUiState,
    onLogin: (String, String) -> Unit
) {
    var email by remember { mutableStateOf("customer@aboalabed.ae") }
    var password by remember { mutableStateOf("ChangeMe123!") }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandColors.HeroGradient)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            verticalArrangement = Arrangement.Center
        ) {
            Image(
                painter = painterResource(R.drawable.farooj_logo_english),
                contentDescription = null,
                contentScale = ContentScale.Fit,
                modifier = Modifier
                    .size(width = 220.dp, height = 92.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .background(Color.White)
                    .padding(14.dp)
            )
            Spacer(Modifier.height(22.dp))
            Text(
                text = "Pickup-first Farooj ordering with a sharper flow.",
                color = Color.White,
                fontSize = 34.sp,
                lineHeight = 38.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(Modifier.height(10.dp))
            Text(
                text = "Login with email, lock your address, browse categories, and show your order code at pickup.",
                color = Color.White.copy(alpha = 0.88f),
                style = MaterialTheme.typography.bodyLarge
            )
            Spacer(Modifier.height(24.dp))
            Surface(
                color = Color.White.copy(alpha = 0.88f),
                shape = RoundedCornerShape(28.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it },
                        label = { Text("Email") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = { Text("Password") },
                        singleLine = true,
                        visualTransformation = PasswordVisualTransformation(),
                        modifier = Modifier.fillMaxWidth()
                    )
                    Button(
                        onClick = { onLogin(email.trim(), password) },
                        enabled = !state.isBusy,
                        colors = ButtonDefaults.buttonColors(containerColor = BrandColors.Ink),
                        shape = RoundedCornerShape(18.dp),
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
                            text = if (state.isBusy) "Preparing Menu..." else "Continue to Menu",
                            modifier = Modifier.padding(10.dp),
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                    if (state.isBusy) {
                        Text(
                            text = "Signing in, loading your menu, and syncing your saved address.",
                            color = Color.Gray,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }
            Spacer(Modifier.height(20.dp))
            Text(
                text = "Seeded customer and branch operations accounts are available from the shared backend.",
                color = Color.White.copy(alpha = 0.9f),
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.align(Alignment.Start)
            )
        }

        if (state.isBusy) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.22f))
                    .padding(24.dp),
                contentAlignment = Alignment.Center
            ) {
                Surface(
                    color = Color.White,
                    shape = RoundedCornerShape(28.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(horizontal = 24.dp, vertical = 22.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        CircularProgressIndicator(
                            color = BrandColors.Brand,
                            strokeWidth = 3.dp,
                            modifier = Modifier.size(28.dp)
                        )
                        Text(
                            text = "Preparing Menu",
                            color = BrandColors.Ink,
                            fontWeight = FontWeight.Bold,
                            style = MaterialTheme.typography.titleMedium
                        )
                        Text(
                            text = "Signing in, loading your menu, and syncing your saved address.",
                            color = Color.Gray,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }
        }
    }
}
