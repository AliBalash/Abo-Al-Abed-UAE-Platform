import Foundation

@MainActor
struct MockAPIClient: APIClient {
    func login(email: String, password: String) async throws -> SessionUser {
        let roles: [String]

        if email.contains("admin") {
            roles = ["super_admin"]
        } else if email.contains("cashier") {
            roles = ["cashier"]
        } else if email.contains("kitchen") {
            roles = ["kitchen_staff"]
        } else {
            roles = []
        }

        return SessionUser(id: UUID(), email: email, roles: roles)
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
            MenuCategory(id: UUID(), slug: "golden-sandwich", title: "Golden Sandwich", subtitle: "Hero category"),
            MenuCategory(id: UUID(), slug: "new-items", title: "New Items", subtitle: "Latest launches"),
            MenuCategory(id: UUID(), slug: "baby-size", title: "Baby Size", subtitle: "Quick grab"),
            MenuCategory(id: UUID(), slug: "meals", title: "Meals", subtitle: "Full pickup bundles"),
            MenuCategory(id: UUID(), slug: "el-abodi", title: "El-Abodi", subtitle: "Signature line"),
            MenuCategory(id: UUID(), slug: "appetizers", title: "Appetizers", subtitle: "Sides + sauces"),
            MenuCategory(id: UUID(), slug: "drinks", title: "Drinks", subtitle: "Cold pairing")
        ]

        let products = [
            Product(
                id: UUID(),
                categorySlug: categories[0].slug,
                name: "Golden Chicken Sandwich",
                detail: "Crispy signature sandwich built for fast self-pickup.",
                imageURL: nil,
                tags: ["Featured", "Best Seller"],
                variants: [
                    ProductVariant(id: UUID(), name: "Regular", price: 19),
                    ProductVariant(id: UUID(), name: "Meal", price: 27)
                ],
                modifiers: [spiceGroup, sauceGroup]
            ),
            Product(
                id: UUID(),
                categorySlug: categories[4].slug,
                name: "El-Abodi Meal",
                detail: "Loaded meal with fries and drink.",
                imageURL: nil,
                tags: ["Featured", "Meal"],
                variants: [
                    ProductVariant(id: UUID(), name: "Regular", price: 29)
                ],
                modifiers: [spiceGroup, sauceGroup]
            ),
            Product(
                id: UUID(),
                categorySlug: categories[5].slug,
                name: "Loaded Fries",
                detail: "Crisp fries with signature sauce.",
                imageURL: nil,
                tags: ["Quick"],
                variants: [
                    ProductVariant(id: UUID(), name: "Regular", price: 10)
                ],
                modifiers: [sauceGroup]
            )
        ]

        return HomeSnapshot(
            banners: [
                HomeBanner(
                    id: UUID(),
                    title: "Hareeq Offer",
                    subtitle: "Hot slider deal for fast pickup.",
                    imageURL: URL(string: "https://picsum.photos/500/240?1"),
                    ctaLabel: "View Offer",
                    ctaTarget: "/menu",
                    placement: .topStrip,
                    displayOrder: 1
                ),
                HomeBanner(
                    id: UUID(),
                    title: "Taghmisat Box",
                    subtitle: "Sharing box deal.",
                    imageURL: URL(string: "https://picsum.photos/500/240?2"),
                    ctaLabel: "View Offer",
                    ctaTarget: "/menu",
                    placement: .topStrip,
                    displayOrder: 2
                ),
                HomeBanner(
                    id: UUID(),
                    title: "30% App Deal",
                    subtitle: "Order from app and save.",
                    imageURL: URL(string: "https://picsum.photos/900/360?3"),
                    ctaLabel: "Use Deal",
                    ctaTarget: "/menu",
                    placement: .bottomFeature,
                    displayOrder: 10
                ),
            ],
            categories: categories,
            featured: products,
            recommendations: Array(products.reversed())
        )
    }

    func loadAddresses() async throws -> [SavedAddress] {
        [
            SavedAddress(id: UUID(), label: "Home", line1: "Port Saeed Residential Tower", line2: "Apartment 1204", city: "Dubai", emirate: "Dubai", notes: "Call on arrival", latitude: 25.2665, longitude: 55.3334, isDefault: true),
            SavedAddress(id: UUID(), label: "Office", line1: "Business Bay Bay Square", line2: nil, city: "Dubai", emirate: "Dubai", notes: nil, latitude: 25.1865, longitude: 55.2787, isDefault: false)
        ]
    }

    func createAddress(
        label: String,
        line1: String,
        line2: String?,
        city: String,
        emirate: String,
        notes: String?,
        latitude: Double,
        longitude: Double,
        isDefault: Bool
    ) async throws -> SavedAddress {
        SavedAddress(
            id: UUID(),
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
    }

    func loadFavoriteIDs() async throws -> [UUID] { [] }

    func setFavorite(productID: UUID, isFavorite: Bool) async throws {}

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
