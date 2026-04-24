import SwiftUI

enum BrandTheme {
    static let brand = Color(red: 0.804, green: 0.125, blue: 0.149)
    static let brandDeep = Color(red: 0.545, green: 0.067, blue: 0.086)
    static let cream = Color(red: 1.0, green: 0.969, blue: 0.937)
    static let sand = Color(red: 0.969, green: 0.894, blue: 0.78)
    static let sun = Color(red: 1.0, green: 0.722, blue: 0.282)
    static let ink = Color(red: 0.11, green: 0.11, blue: 0.11)
    static let success = Color(red: 0.12, green: 0.48, blue: 0.30)
    static let warning = Color(red: 0.82, green: 0.50, blue: 0.09)

    static let heroGradient = LinearGradient(
        colors: [brandDeep, brand, sun],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let panelGradient = LinearGradient(
        colors: [Color.white.opacity(0.96), cream],
        startPoint: .top,
        endPoint: .bottom
    )
}
