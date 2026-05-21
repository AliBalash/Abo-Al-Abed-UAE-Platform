import SwiftUI

struct BrandBackground: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color.white,
                    BrandTheme.cream.opacity(0.88),
                    Color(red: 0.95, green: 0.95, blue: 0.95),
                ],
                startPoint: .top,
                endPoint: .bottom
            )

            Circle()
                .fill(BrandTheme.sun.opacity(0.12))
                .frame(width: 360, height: 360)
                .blur(radius: 36)
                .offset(x: 150, y: -250)

            Circle()
                .fill(BrandTheme.brand.opacity(0.05))
                .frame(width: 280, height: 280)
                .blur(radius: 28)
                .offset(x: -180, y: 320)
        }
        .ignoresSafeArea()
    }
}

struct BrandCard<Content: View>: View {
    let cornerRadius: CGFloat
    @ViewBuilder var content: Content

    init(cornerRadius: CGFloat = 24, @ViewBuilder content: () -> Content) {
        self.cornerRadius = cornerRadius
        self.content = content()
    }

    var body: some View {
        content
            .padding(16)
            .background(Color.white.opacity(0.96), in: RoundedRectangle(cornerRadius: cornerRadius))
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .stroke(BrandTheme.brand.opacity(0.06), lineWidth: 1)
            )
            .shadow(color: BrandTheme.brand.opacity(0.08), radius: 16, y: 10)
    }
}

struct PrimaryActionButtonStyle: ButtonStyle {
    var disabled = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline.weight(.semibold))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(BrandTheme.heroGradient, in: RoundedRectangle(cornerRadius: 18))
            .foregroundStyle(.white)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .opacity(disabled ? 0.62 : 1)
            .animation(.easeOut(duration: 0.18), value: configuration.isPressed)
    }
}

struct BrandLoadingView: View {
    let title: String
    let subtitle: String
    @State private var isAnimating = false

    init(title: String = "Preparing Experience", subtitle: String = "Syncing menu, branches, and checkout flow") {
        self.title = title
        self.subtitle = subtitle
    }

    var body: some View {
        VStack(spacing: 14) {
            ZStack {
                Circle()
                    .stroke(BrandTheme.brand.opacity(0.18), lineWidth: 10)
                    .frame(width: 72, height: 72)

                Circle()
                    .trim(from: 0.05, to: 0.72)
                    .stroke(
                        AngularGradient(colors: [BrandTheme.brandDeep, BrandTheme.brand, BrandTheme.sun], center: .center),
                        style: StrokeStyle(lineWidth: 10, lineCap: .round)
                    )
                    .frame(width: 72, height: 72)
                    .rotationEffect(.degrees(isAnimating ? 360 : 0))
                    .animation(.linear(duration: 1.0).repeatForever(autoreverses: false), value: isAnimating)
            }

            Text(title)
                .font(.headline)
                .foregroundStyle(BrandTheme.ink)

            Text(subtitle)
                .font(.subheadline)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
        }
        .padding(22)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24))
        .onAppear { isAnimating = true }
    }
}

struct BusyOverlay: ViewModifier {
    let isPresented: Bool
    let title: String
    let subtitle: String

    func body(content: Content) -> some View {
        content
            .overlay {
                if isPresented {
                    ZStack {
                        Color.black.opacity(0.15)
                            .ignoresSafeArea()

                        BrandLoadingView(title: title, subtitle: subtitle)
                            .padding(.horizontal, 24)
                    }
                    .transition(.opacity)
                    .animation(.easeInOut(duration: 0.2), value: isPresented)
                }
            }
    }
}

extension View {
    func busyOverlay(isPresented: Bool, title: String, subtitle: String) -> some View {
        modifier(BusyOverlay(isPresented: isPresented, title: title, subtitle: subtitle))
    }
}
