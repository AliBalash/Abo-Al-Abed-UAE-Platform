import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var model: AppModel
    @State private var selectedProduct: Product?
    @State private var isAddressSheetPresented = false
    @State private var isCartPresented = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                addressBar
                banners
                categories
                productSection(title: "Featured Menu", subtitle: "Built from your Abo Al-Abed source categories.", products: model.home.featured)
                productSection(title: "Recommended for Pickup", subtitle: "Fast-prep items for a smooth in-branch journey.", products: model.home.recommendations)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
        }
        .background(BrandTheme.cream.ignoresSafeArea())
        .navigationTitle("Menu")
        .toolbar {
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
            .shadow(color: BrandTheme.brand.opacity(0.08), radius: 16, y: 10)
        }
        .buttonStyle(.plain)
    }

    private var banners: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 16) {
                ForEach(model.home.banners) { banner in
                    VStack(alignment: .leading, spacing: 10) {
                        Text(banner.title)
                            .font(.title3.bold())
                            .foregroundStyle(.white)
                        Text(banner.subtitle)
                            .foregroundStyle(.white.opacity(0.84))
                            .multilineTextAlignment(.leading)
                        Spacer()
                        Label("Self Pickup", systemImage: "bag.badge.checkmark")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.white)
                    }
                    .padding(22)
                    .frame(width: 300, height: 184)
                    .background(BrandTheme.heroGradient, in: RoundedRectangle(cornerRadius: 30))
                }
            }
        }
    }

    private var categories: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Explore Menu")
                .font(.title3.bold())
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(model.home.categories) { category in
                        VStack(alignment: .leading, spacing: 8) {
                            Text(category.title)
                                .font(.headline)
                            Text(category.subtitle)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .padding(16)
                        .frame(width: 180, alignment: .leading)
                        .background(Color.white, in: RoundedRectangle(cornerRadius: 22))
                    }
                }
            }
        }
    }

    private func productSection(title: String, subtitle: String, products: [Product]) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(title)
                .font(.title3.bold())
            Text(subtitle)
                .font(.subheadline)
                .foregroundStyle(.secondary)

            ForEach(products) { product in
                HStack(spacing: 16) {
                    AsyncImage(url: product.imageURL) { image in
                        image
                            .resizable()
                            .scaledToFill()
                    } placeholder: {
                        BrandTheme.panelGradient
                    }
                    .frame(width: 118, height: 110)
                    .clipShape(RoundedRectangle(cornerRadius: 22))

                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text(product.name)
                                .font(.headline)
                            Spacer()
                            Button {
                                model.toggleFavorite(for: product.id)
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
                .padding(14)
                .background(Color.white, in: RoundedRectangle(cornerRadius: 28))
                .shadow(color: BrandTheme.brand.opacity(0.08), radius: 18, y: 10)
                .contentShape(RoundedRectangle(cornerRadius: 28))
                .onTapGesture {
                    selectedProduct = product
                }
            }
        }
    }
}

struct FavoritesView: View {
    @EnvironmentObject private var model: AppModel

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                ForEach(model.home.featured.filter { model.favoriteIDs.contains($0.id) }) { product in
                    Text(product.name)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding()
                        .background(Color.white, in: RoundedRectangle(cornerRadius: 18))
                }
            }
            .padding()
        }
        .navigationTitle("Favorites")
        .background(BrandTheme.cream.ignoresSafeArea())
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
                ContentUnavailableView("No active order", systemImage: "bag", description: Text("Place an order to track cashier payment and kitchen progress here."))
            }
        }
        .navigationTitle("Orders")
        .background(BrandTheme.cream.ignoresSafeArea())
    }
}

struct AccountView: View {
    @EnvironmentObject private var model: AppModel

    var body: some View {
        List {
            Section("Account") {
                Text(model.session?.email ?? "Guest")
            }

            Section("Saved Addresses") {
                ForEach(model.savedAddresses) { address in
                    VStack(alignment: .leading) {
                        Text(address.label).bold()
                        Text(address.line1).font(.subheadline).foregroundStyle(.secondary)
                    }
                }
            }
        }
        .navigationTitle("Account")
    }
}
