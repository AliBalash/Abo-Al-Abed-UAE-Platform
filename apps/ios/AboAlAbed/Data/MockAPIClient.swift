import Foundation

@MainActor
struct MockAPIClient: APIClient {
    func login(email: String, password: String) async throws -> SessionUser {
        SessionUser(id: UUID(), email: email, roles: email.contains("admin") ? ["super_admin"] : ["cashier", "kitchen_staff"])
    }

    func loadHome() async throws -> HomeSnapshot {
        let spiceGroup = ProductModifierGroup(
            id: UUID(),
            name: "Spice Level",
            minSelections: 1,
            maxSelections: 1,
            options: [
                ProductModifierOption(id: UUID(), name: "Normal", priceDelta: 0, isDefault: true),
                ProductModifierOption(id: UUID(), name: "Spicy", priceDelta: 0, isDefault: false)
            ]
        )

        let sauceGroup = ProductModifierGroup(
            id: UUID(),
            name: "Sauce Choice",
            minSelections: 1,
            maxSelections: 2,
            options: [
                ProductModifierOption(id: UUID(), name: "Garlic", priceDelta: 0, isDefault: true),
                ProductModifierOption(id: UUID(), name: "Pink Sauce", priceDelta: 0, isDefault: false),
                ProductModifierOption(id: UUID(), name: "Tahini", priceDelta: 0, isDefault: false)
            ]
        )

        let categories = [
            MenuCategory(id: UUID(), title: "Golden Sandwich", subtitle: "Hero category"),
            MenuCategory(id: UUID(), title: "New Items", subtitle: "Latest launches"),
            MenuCategory(id: UUID(), title: "Baby Size", subtitle: "Quick grab"),
            MenuCategory(id: UUID(), title: "Meals", subtitle: "Full pickup bundles"),
            MenuCategory(id: UUID(), title: "El-Abodi", subtitle: "Signature line"),
            MenuCategory(id: UUID(), title: "Appetizers", subtitle: "Sides + sauces"),
            MenuCategory(id: UUID(), title: "Drinks", subtitle: "Cold pairing")
        ]

        let products = [
            Product(
                id: UUID(),
                categoryID: categories[0].id,
                name: "Golden Chicken Sandwich",
                detail: "Crispy signature sandwich built for fast self-pickup.",
                imageURL: URL(string: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=1200&q=80"),
                tags: ["Featured", "Best Seller"],
                variants: [
                    ProductVariant(id: UUID(), name: "Regular", price: 19),
                    ProductVariant(id: UUID(), name: "Meal", price: 27)
                ],
                modifiers: [spiceGroup, sauceGroup]
            ),
            Product(
                id: UUID(),
                categoryID: categories[4].id,
                name: "El-Abodi Meal",
                detail: "Loaded meal with fries and drink.",
                imageURL: URL(string: "https://images.unsplash.com/photo-1562967914-01efa7b7a2b9?auto=format&fit=crop&w=1200&q=80"),
                tags: ["Featured", "Meal"],
                variants: [
                    ProductVariant(id: UUID(), name: "Regular", price: 29)
                ],
                modifiers: [spiceGroup, sauceGroup]
            ),
            Product(
                id: UUID(),
                categoryID: categories[5].id,
                name: "Loaded Fries",
                detail: "Crisp fries with signature sauce.",
                imageURL: URL(string: "https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=1200&q=80"),
                tags: ["Quick"],
                variants: [
                    ProductVariant(id: UUID(), name: "Regular", price: 10)
                ],
                modifiers: [sauceGroup]
            )
        ]

        return HomeSnapshot(
            banners: [
                HomeBanner(id: UUID(), title: "Self Pickup, Zero Waiting", subtitle: "Order ahead and collect with your code.", palette: ["#8B1116", "#CD2026", "#FFB848"]),
                HomeBanner(id: UUID(), title: "Golden Sandwich Collection", subtitle: "Warm, bold, and repeat-order ready.", palette: ["#1C1C1C", "#8B1116", "#F7BE63"])
            ],
            categories: categories,
            featured: products,
            recommendations: Array(products.reversed())
        )
    }

    func loadAddresses() async throws -> [SavedAddress] {
        [
            SavedAddress(id: UUID(), label: "Home", line1: "Port Saeed Residential Tower", city: "Dubai", emirate: "Dubai", latitude: 25.2665, longitude: 55.3334, isDefault: true),
            SavedAddress(id: UUID(), label: "Office", line1: "Business Bay Bay Square", city: "Dubai", emirate: "Dubai", latitude: 25.1865, longitude: 55.2787, isDefault: false)
        ]
    }

    func loadFavoriteIDs() async throws -> [UUID] { [] }

    func recommendBranches(for address: SavedAddress) async throws -> BranchRecommendation {
        let primary = Branch(
            id: UUID(),
            code: "DXB-BVV",
            name: "Dubai Business Village",
            address: "Port Saeed, Dubai",
            latitude: 25.2647,
            longitude: 55.3356,
            estimatedPrepMinutes: 18,
            distanceKm: 0.8
        )

        return BranchRecommendation(
            primary: primary,
            alternatives: [
                Branch(id: UUID(), code: "SHJ-MAJAZ", name: "Sharjah Al Majaz", address: "Sharjah", latitude: 25.3364, longitude: 55.3773, estimatedPrepMinutes: 20, distanceKm: 14.5),
                Branch(id: UUID(), code: "AJM-CORNICHE", name: "Ajman Corniche", address: "Ajman", latitude: 25.4164, longitude: 55.4411, estimatedPrepMinutes: 22, distanceKm: 29.1)
            ]
        )
    }

    func placeOrder(cartItems: [CartItem], address: SavedAddress, branch: Branch) async throws -> CustomerOrder {
        CustomerOrder(
            id: UUID(),
            orderCode: "AA\(Int.random(in: 1000...9999))",
            pickupToken: UUID().uuidString.prefix(8).uppercased(),
            branch: branch,
            address: address,
            items: cartItems,
            status: .awaitingPayment,
            timeline: [
                CustomerOrderTimeline(title: "Order Created", subtitle: "Use this code at the cashier.", status: .awaitingPayment)
            ]
        )
    }

    func loadActiveOrder() async throws -> CustomerOrder? { nil }

    func refreshOrder(id: UUID) async throws -> CustomerOrder {
        throw APIClientError.server("Mock client does not track a live order.")
    }
}
