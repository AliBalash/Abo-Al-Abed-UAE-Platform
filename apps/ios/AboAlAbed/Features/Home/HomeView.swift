import SwiftUI
import WebKit

struct HomeView: View {
    @EnvironmentObject private var model: AppModel
    @State private var selectedProduct: Product?
    @State private var isAddressSheetPresented = false
    @State private var isCartPresented = false
    @State private var selectedCategorySlug: String?

    var body: some View {
        ScrollView {
            if model.home.featured.isEmpty && model.home.recommendations.isEmpty && model.isBootstrapping {
                BrandLoadingView(
                    title: "Preparing Menu",
                    subtitle: "Loading your menu, saved address, and pickup branch."
                )
                .padding(.top, 100)
            } else {
                VStack(alignment: .leading, spacing: 20) {
                    addressBar
                    offerBanners
                    categories
                    productSection(title: selectedCategoryTitle, subtitle: selectedCategorySubtitle, products: filteredProducts)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 20)
                .padding(.vertical, 16)
            }
        }
        .background(BrandBackground())
        .navigationTitle("Menu")
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Image("FaroojLogoEnglish")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 96, height: 34)
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    isCartPresented = true
                } label: {
                    ZStack(alignment: .topTrailing) {
                        Image(systemName: "bag.fill")
                        if model.cartCount > 0 {
                            Text("\(model.cartCount)")
                                .font(.caption2.bold())
                                .foregroundStyle(.white)
                                .padding(6)
                                .background(BrandTheme.brand, in: Circle())
                                .offset(x: 8, y: -8)
                        }
                    }
                }
            }
        }
        .sheet(isPresented: $isAddressSheetPresented) {
            AddressPickerView()
                .environmentObject(model)
        }
        .sheet(item: $selectedProduct) { product in
            ProductDetailView(product: product)
                .environmentObject(model)
        }
        .sheet(isPresented: $isCartPresented) {
            CartView()
                .environmentObject(model)
        }
    }

    private var addressBar: some View {
        Button {
            isAddressSheetPresented = true
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Deliver to pickup branch from")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.secondary)
                    Text(model.selectedAddress?.label ?? "Choose Address")
                        .font(.headline.weight(.semibold))
                    Text(model.selectedAddress?.line1 ?? "Add a saved location")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Image(systemName: "chevron.down")
                    .font(.headline.weight(.bold))
            }
            .padding(18)
            .background(Color.white, in: RoundedRectangle(cornerRadius: 24))
            .overlay(
                RoundedRectangle(cornerRadius: 24)
                    .stroke(BrandTheme.brand.opacity(0.06), lineWidth: 1)
            )
            .shadow(color: BrandTheme.brand.opacity(0.08), radius: 16, y: 10)
        }
        .buttonStyle(.plain)
    }

    private var topStripAdBanners: [PromoBannerAsset] {
        [
            PromoBannerAsset(id: "hareeq", baseName: "hareeq-offer-slider", fileExtension: "jpg", isGif: false),
            PromoBannerAsset(id: "taghmisat", baseName: "taghmisat-offer-slider", fileExtension: "jpg", isGif: false),
            PromoBannerAsset(id: "baby-satl", baseName: "baby-satl-offer-slider", fileExtension: "jpg", isGif: false),
        ]
    }

    private var bottomGifBanner: PromoBannerAsset {
        PromoBannerAsset(id: "app-deal", baseName: "app-deal-30", fileExtension: "gif", isGif: true)
    }

    private func bundledBannerURL(for banner: PromoBannerAsset) -> URL? {
        Bundle.main.url(forResource: banner.baseName, withExtension: banner.fileExtension, subdirectory: "Banners")
            ?? Bundle.main.url(forResource: banner.baseName, withExtension: banner.fileExtension)
    }

    private var hasOfferContent: Bool {
        !topStripAdBanners.isEmpty || bundledBannerURL(for: bottomGifBanner) != nil
    }

    @ViewBuilder
    private var offerBanners: some View {
        if hasOfferContent {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 6) {
                    Text("EXCLUSIVE OFFERS")
                        .font(.subheadline.weight(.black))
                    Text("🎁")
                    Spacer()
                    Image(systemName: "arrow.up.forward.square")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.secondary)
                }

                if !topStripAdBanners.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(topStripAdBanners) { banner in
                                BannerMediaView(url: bundledBannerURL(for: banner), isGif: banner.isGif)
                                    .frame(width: 248)
                                    .aspectRatio(1206.0 / 621.0, contentMode: .fit)
                                    .clipShape(RoundedRectangle(cornerRadius: 10))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 10)
                                            .stroke(Color.black.opacity(0.08), lineWidth: 1)
                                    )
                            }
                        }
                        .padding(.trailing, 2)
                    }
                }

                Rectangle()
                    .fill(Color.black.opacity(0.06))
                    .frame(height: 1)

                BannerMediaView(url: bundledBannerURL(for: bottomGifBanner), isGif: true)
                    .frame(maxWidth: .infinity)
                    .aspectRatio(904.0 / 310.0, contentMode: .fit)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(Color.black.opacity(0.08), lineWidth: 1)
                    )
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(12)
            .background(
                LinearGradient(
                    colors: [Color.white, Color.white.opacity(0.97)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ),
                in: RoundedRectangle(cornerRadius: 16)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color.black.opacity(0.08), lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.04), radius: 12, y: 4)
        }
    }

    private var categories: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Explore Menu")
                .font(.title3.bold())
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    categoryFilterButton(title: "All", subtitle: "\(allProducts.count) items", slug: nil)
                    ForEach(model.home.categories) { category in
                        let count = allProducts.filter { $0.categorySlug == category.slug }.count
                        categoryFilterButton(title: category.title, subtitle: count == 1 ? "1 item" : "\(count) items", slug: category.slug)
                    }
                }
            }
        }
    }

    private func categoryFilterButton(title: String, subtitle: String, slug: String?) -> some View {
        let isSelected = selectedCategorySlug == slug

        return Button {
            selectedCategorySlug = slug
        } label: {
            VStack(alignment: .leading, spacing: 8) {
                Text(title)
                    .font(.headline)
                    .foregroundStyle(isSelected ? .white : .primary)
                    .lineLimit(2)
                Text(subtitle)
                    .font(.caption.weight(.medium))
                    .foregroundStyle(isSelected ? .white.opacity(0.82) : .secondary)
            }
            .padding(16)
            .frame(width: 180, alignment: .leading)
            .frame(minHeight: 86)
            .background(isSelected ? BrandTheme.brand : Color.white, in: RoundedRectangle(cornerRadius: 22))
            .overlay(
                RoundedRectangle(cornerRadius: 22)
                    .stroke(isSelected ? BrandTheme.brand.opacity(0.32) : BrandTheme.brand.opacity(0.08), lineWidth: 1)
            )
            .scaleEffect(isSelected ? 1 : 0.985)
            .animation(.spring(response: 0.35, dampingFraction: 0.8), value: isSelected)
        }
        .buttonStyle(.plain)
    }

    private var allProducts: [Product] {
        var seen = Set<UUID>()
        return (model.home.featured + model.home.recommendations).filter { product in
            guard !seen.contains(product.id) else { return false }
            seen.insert(product.id)
            return true
        }
    }

    private var filteredProducts: [Product] {
        guard let selectedCategorySlug else { return allProducts }
        return allProducts.filter { $0.categorySlug == selectedCategorySlug }
    }

    private var selectedCategoryTitle: String {
        guard let selectedCategorySlug,
              let category = model.home.categories.first(where: { $0.slug == selectedCategorySlug })
        else { return "All Menu" }

        return category.title
    }

    private var selectedCategorySubtitle: String {
        guard let selectedCategorySlug,
              let category = model.home.categories.first(where: { $0.slug == selectedCategorySlug })
        else { return "Filter the complete menu by category." }

        return category.subtitle
    }

    private func productSection(title: String, subtitle: String, products: [Product]) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(title)
                .font(.title3.bold())
            Text(subtitle)
                .font(.subheadline)
                .foregroundStyle(.secondary)

            if products.isEmpty {
                ContentUnavailableView(
                    "No items in this category",
                    systemImage: "fork.knife",
                    description: Text("Choose another menu category.")
                )
                .padding(.vertical, 24)
            } else {
                ForEach(products) { product in
                    BrandCard(cornerRadius: 28) {
                        HStack(spacing: 16) {
                            AsyncImage(url: product.imageURL) { phase in
                                switch phase {
                                case .success(let image):
                                    image
                                        .resizable()
                                        .scaledToFill()
                                case .failure, .empty:
                                    Image(systemName: "photo")
                                        .font(.title2)
                                        .foregroundStyle(.secondary)
                                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                                        .background(BrandTheme.panelGradient)
                                @unknown default:
                                    ZStack {
                                        BrandTheme.panelGradient
                                        ProgressView()
                                    }
                                }
                            }
                            .frame(width: 118, height: 110)
                            .clipShape(RoundedRectangle(cornerRadius: 22))

                            VStack(alignment: .leading, spacing: 8) {
                                HStack {
                                    Text(product.name)
                                        .font(.headline)
                                    Spacer()
                                    Button {
                                        Task {
                                            await model.toggleFavorite(for: product.id)
                                        }
                                    } label: {
                                        Image(systemName: model.favoriteIDs.contains(product.id) ? "heart.fill" : "heart")
                                            .foregroundStyle(BrandTheme.brand)
                                    }
                                    .buttonStyle(.plain)
                                }
                                Text(product.detail)
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                                    .lineLimit(2)
                                HStack {
                                    Text("AED \(product.variants.first?.price ?? 0, specifier: "%.0f")")
                                        .font(.subheadline.bold())
                                    Spacer()
                                    ForEach(product.tags.prefix(2), id: \.self) { tag in
                                        Text(tag)
                                            .font(.caption2.weight(.semibold))
                                            .padding(.horizontal, 10)
                                            .padding(.vertical, 6)
                                            .background(BrandTheme.sand, in: Capsule())
                                    }
                                }
                            }
                        }
                    }
                    .contentShape(RoundedRectangle(cornerRadius: 28))
                    .onTapGesture {
                        selectedProduct = product
                    }
                }
            }
        }
    }
}

private struct PromoBannerAsset: Identifiable {
    let id: String
    let baseName: String
    let fileExtension: String
    let isGif: Bool
}

private struct BannerMediaView: View {
    let url: URL?
    let isGif: Bool

    var body: some View {
        ZStack {
            if let url {
                if isGif {
                    GIFWebView(url: url)
                } else {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .scaledToFill()
                        case .empty:
                            ProgressView()
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                        case .failure:
                            BannerPlaceholder()
                        @unknown default:
                            BannerPlaceholder()
                        }
                    }
                }
            } else {
                BannerPlaceholder()
            }
        }
        .background(Color(red: 0.97, green: 0.97, blue: 0.97))
    }
}

private struct BannerPlaceholder: View {
    var body: some View {
        ZStack {
            BrandTheme.panelGradient
            Image(systemName: "photo")
                .font(.title3)
                .foregroundStyle(.secondary)
        }
    }
}

private struct GIFWebView: UIViewRepresentable {
    let url: URL

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let webView = WKWebView(frame: .zero)
        webView.isUserInteractionEnabled = false
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.backgroundColor = .clear
        webView.backgroundColor = .clear
        webView.isOpaque = false
        webView.contentMode = .scaleToFill
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        if context.coordinator.loadedURL != url {
            let escapedURL = url.absoluteString.replacingOccurrences(of: "\"", with: "%22")
            let html = """
            <html>
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
                <style>
                  html, body {
                    margin: 0;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    background: transparent;
                  }
                  img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                  }
                </style>
              </head>
              <body>
                <img src="\(escapedURL)" />
              </body>
            </html>
            """
            webView.loadHTMLString(html, baseURL: url.deletingLastPathComponent())
            context.coordinator.loadedURL = url
        }
    }

    final class Coordinator {
        var loadedURL: URL?
    }
}

struct FavoritesView: View {
    @EnvironmentObject private var model: AppModel

    private var favoriteProducts: [Product] {
        var seen = Set<UUID>()
        return (model.home.featured + model.home.recommendations)
            .filter { product in
                guard model.favoriteIDs.contains(product.id), !seen.contains(product.id) else {
                    return false
                }
                seen.insert(product.id)
                return true
            }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                if favoriteProducts.isEmpty {
                    ContentUnavailableView(
                        "No favorites yet",
                        systemImage: "heart",
                        description: Text("Save menu items from the Menu tab to keep them synced here.")
                    )
                    .padding(.top, 80)
                } else {
                    ForEach(favoriteProducts) { product in
                        BrandCard {
                            Text(product.name)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }
                }
            }
            .padding()
        }
        .navigationTitle("Favorites")
        .background(BrandBackground())
    }
}

struct OrdersHubView: View {
    @EnvironmentObject private var model: AppModel

    var body: some View {
        Group {
            if let order = model.activeOrder {
                OrderTrackingView(order: order)
                    .environmentObject(model)
            } else {
                VStack {
                    ContentUnavailableView("No active order", systemImage: "bag", description: Text("Place an order to track cashier payment and kitchen progress here."))
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .navigationTitle("Orders")
        .background(BrandBackground())
    }
}

struct AccountView: View {
    @EnvironmentObject private var model: AppModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                BrandCard {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Account")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.secondary)
                        Text(model.session?.email ?? "Guest")
                            .font(.headline)
                    }
                }

                BrandCard {
                    Text("Saved Addresses")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.secondary)
                    Divider()
                }

                ForEach(model.savedAddresses) { address in
                    BrandCard {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(address.label).bold()
                            Text(address.line1).font(.subheadline).foregroundStyle(.secondary)
                            if let line2 = address.line2, !line2.isEmpty {
                                Text(line2).font(.caption).foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
            .padding()
        }
        .navigationTitle("Account")
        .background(BrandBackground())
    }
}
