package com.aboalabed.uae.core.design

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

object BrandColors {
    val Brand = Color(0xFFCD2026)
    val BrandDeep = Color(0xFF8B1116)
    val Cream = Color(0xFFFFF7EF)
    val Sand = Color(0xFFF7E4C7)
    val Sun = Color(0xFFFFB848)
    val Ink = Color(0xFF1C1C1C)
    val Success = Color(0xFF1F7A4D)
    val Warning = Color(0xFFD18017)

    val HeroGradient = Brush.linearGradient(listOf(BrandDeep, Brand, Sun))
    val PanelGradient = Brush.verticalGradient(listOf(Color.White, Cream))
}

@Composable
fun AboAlAbedTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = BrandColors.Brand,
            onPrimary = Color.White,
            secondary = BrandColors.Sun,
            background = BrandColors.Cream,
            surface = Color.White,
            onSurface = BrandColors.Ink,
            error = BrandColors.BrandDeep
        ),
        content = content
    )
}
