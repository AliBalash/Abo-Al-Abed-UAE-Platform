import Foundation

@MainActor
final class AppModel: ObservableObject {
    @Published var session: SessionUser?
    @Published var savedAddresses: [SavedAddress] = []
    @Published var selectedAddress: SavedAddress?
    @Published var home: HomeSnapshot = .empty
    @Published var favoriteIDs: Set<UUID> = []
    @Published var cartItems: [CartItem] = []
    @Published var branchRecommendation: BranchRecommendation?
    @Published var selectedBranch: Branch?
    @Published var activeOrder: CustomerOrder?
    @Published var isBusy = false
    @Published var errorMessage: String?

    private let environment: AppEnvironment

    init(environment: AppEnvironment) {
        self.environment = environment
    }

    var isAuthenticated: Bool { session != nil }
    var cartTotal: Double { cartItems.reduce(0) { $0 + $1.totalPrice } }
    var cartCount: Int { cartItems.reduce(0) { $0 + $1.quantity } }

    func login(email: String, password: String) async {
        errorMessage = nil
        isBusy = true

        do {
            let result = try await environment.apiClient.login(email: email, password: password)
            session = result
            await loadBootstrapData()
        } catch {
            isBusy = false
            session = nil
            savedAddresses = []
            selectedAddress = nil
            home = .empty
            favoriteIDs = []
            branchRecommendation = nil
            selectedBranch = nil
            activeOrder = nil
            errorMessage = error.localizedDescription
        }
    }

    private func loadBootstrapData() async {
        let addresses = (try? await environment.apiClient.loadAddresses()) ?? []
        let homeSnapshot = (try? await environment.apiClient.loadHome()) ?? .empty
        let favorites = (try? await environment.apiClient.loadFavoriteIDs()) ?? []
        let order = try? await environment.apiClient.loadActiveOrder()
        let defaultAddress = addresses.first(where: \.isDefault) ?? addresses.first

        savedAddresses = addresses
        selectedAddress = defaultAddress
        home = homeSnapshot
        favoriteIDs = Set(favorites)
        activeOrder = order

        if let defaultAddress {
            let recommendation = try? await environment.apiClient.recommendBranches(for: defaultAddress)
            branchRecommendation = recommendation
            selectedBranch = recommendation?.primary
        } else {
            branchRecommendation = nil
            selectedBranch = nil
        }

        isBusy = false
    }

    func selectAddress(_ address: SavedAddress) async {
        errorMessage = nil
        selectedAddress = address
        do {
            let recommendation = try await environment.apiClient.recommendBranches(for: address)
            branchRecommendation = recommendation
            selectedBranch = recommendation.primary
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func addAddress(
        label: String,
        line1: String,
        line2: String?,
        city: String,
        emirate: String,
        notes: String?,
        latitude: Double,
        longitude: Double,
        isDefault: Bool
    ) async -> Bool {
        errorMessage = nil
        isBusy = true
        defer { isBusy = false }

        do {
            let address = try await environment.apiClient.createAddress(
                label: label,
                line1: line1,
                line2: line2,
                city: city,
                emirate: emirate,
                notes: notes,
                latitude: latitude,
                longitude: longitude,
                isDefault: isDefault
            )
            savedAddresses = try await environment.apiClient.loadAddresses()
            await selectAddress(address)
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func toggleFavorite(for productID: UUID) async {
        errorMessage = nil

        let wasFavorite = favoriteIDs.contains(productID)
        if wasFavorite {
            favoriteIDs.remove(productID)
        } else {
            favoriteIDs.insert(productID)
        }

        do {
            try await environment.apiClient.setFavorite(productID: productID, isFavorite: !wasFavorite)
        } catch {
            if wasFavorite {
                favoriteIDs.insert(productID)
            } else {
                favoriteIDs.remove(productID)
            }
            errorMessage = error.localizedDescription
        }
    }

    func addToCart(product: Product, variant: ProductVariant, selections: [ProductSelection]) {
        let modifierTotal = selections.flatMap(\.options).reduce(0) { $0 + $1.priceDelta }
        let unitPrice = variant.price + modifierTotal
        let newItem = CartItem(
            id: UUID(),
            product: product,
            variant: variant,
            selections: selections,
            quantity: 1,
            unitPrice: unitPrice
        )
        cartItems.append(newItem)
    }

    func removeCartItem(_ item: CartItem) {
        cartItems.removeAll { $0.id == item.id }
    }

    func placeOrder() async {
        guard let address = selectedAddress, let branch = selectedBranch, !cartItems.isEmpty else {
            errorMessage = "Select an address, branch, and at least one item before placing the order."
            return
        }

        errorMessage = nil
        isBusy = true
        defer { isBusy = false }

        do {
            activeOrder = try await environment.apiClient.placeOrder(
                cartItems: cartItems,
                address: address,
                branch: branch
            )
            cartItems = []
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func refreshActiveOrder() async {
        guard let order = activeOrder else { return }

        errorMessage = nil
        isBusy = true
        defer { isBusy = false }

        do {
            activeOrder = try await environment.apiClient.refreshOrder(id: order.id)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
