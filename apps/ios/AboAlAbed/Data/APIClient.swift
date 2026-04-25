import Foundation

@MainActor
protocol APIClient {
    func login(email: String, password: String) async throws -> SessionUser
    func loadHome() async throws -> HomeSnapshot
    func loadAddresses() async throws -> [SavedAddress]
    func createAddress(label: String, line1: String, line2: String?, city: String, emirate: String, notes: String?, latitude: Double, longitude: Double, isDefault: Bool) async throws -> SavedAddress
    func loadFavoriteIDs() async throws -> [UUID]
    func recommendBranches(for address: SavedAddress) async throws -> BranchRecommendation
    func placeOrder(cartItems: [CartItem], address: SavedAddress, branch: Branch) async throws -> CustomerOrder
    func loadActiveOrder() async throws -> CustomerOrder?
    func refreshOrder(id: UUID) async throws -> CustomerOrder
}

enum APIClientError: LocalizedError {
    case networkUnavailable(String)
    case unauthorized
    case server(String)

    var errorDescription: String? {
        switch self {
        case .networkUnavailable(let message):
            return message
        case .unauthorized:
            return "Your session expired. Sign in again."
        case .server(let message):
            return message
        }
    }
}

@MainActor
final class LiveAPIClient: APIClient {
    private let baseURL: URL
    private let session: URLSession
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()
    private var accessToken: String?

    init(baseURL: URL, session: URLSession = LiveAPIClient.makeDefaultSession()) {
        self.baseURL = baseURL
        self.session = session
    }

    private static func makeDefaultSession() -> URLSession {
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = 10
        configuration.timeoutIntervalForResource = 20
        configuration.waitsForConnectivity = false
        return URLSession(configuration: configuration)
    }

    func login(email: String, password: String) async throws -> SessionUser {
        struct Body: Encodable {
            let email: String
            let password: String
        }

        let response: AuthResponse = try await request(
            path: "/auth/login",
            method: "POST",
            body: Body(email: email, password: password),
            authorized: false
        )

        accessToken = response.accessToken
        return response.user.toDomain()
    }

    func loadHome() async throws -> HomeSnapshot {
        async let homeResponse: HomeResponse = request(path: "/catalog/home", authorized: false)
        async let productsResponse: [ProductResponse] = request(path: "/catalog/products", authorized: false)

        let home = try await homeResponse
        let products = try await productsResponse

        let featured = home.featuredProducts.map { $0.toDomain() }
        let featuredIDs = Set(featured.map(\.id))
        let recommendations = products
            .map { $0.toDomain() }
            .filter { !featuredIDs.contains($0.id) }

        return HomeSnapshot(
            banners: home.banners.map { $0.toDomain() },
            categories: home.categories.map { $0.toDomain() },
            featured: featured,
            recommendations: recommendations.isEmpty ? featured : recommendations
        )
    }

    func loadAddresses() async throws -> [SavedAddress] {
        let response: [AddressResponse] = try await request(path: "/addresses")
        return response.map { $0.toDomain() }
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
        let response: CreatedAddressResponse = try await request(
            path: "/addresses",
            method: "POST",
            body: SaveAddressBody(
                label: label,
                line1: line1,
                line2: line2?.nilIfBlank,
                city: city,
                emirate: emirate,
                notes: notes?.nilIfBlank,
                lat: latitude,
                lng: longitude,
                isDefault: isDefault
            )
        )
        let addresses = try await loadAddresses()
        guard let address = addresses.first(where: { $0.id == response.id }) else {
            throw APIClientError.server("The saved address could not be loaded.")
        }
        return address
    }

    func loadFavoriteIDs() async throws -> [UUID] {
        let response: [ProductResponse] = try await request(path: "/catalog/favorites")
        return response.map(\.id)
    }

    func recommendBranches(for address: SavedAddress) async throws -> BranchRecommendation {
        let response: BranchRecommendationResponse = try await request(
            path: "/branches/recommendation?addressId=\(address.id.uuidString)"
        )
        return response.toDomain()
    }

    func placeOrder(cartItems: [CartItem], address: SavedAddress, branch: Branch) async throws -> CustomerOrder {
        var cart = try await fetchActiveCart()

        for item in cart.items {
            try await requestWithoutResponse(path: "/cart/items/\(item.id.uuidString)", method: "DELETE")
        }

        for item in cartItems {
            let payload = CartItemBody(
                productId: item.product.id,
                variantId: item.variant.id,
                quantity: item.quantity,
                notes: nil,
                selections: item.selections.map { selection in
                    CartSelectionBody(
                        modifierGroupId: selection.group.id,
                        optionIds: selection.options.map(\.id)
                    )
                }
            )

            cart = try await request(path: "/cart/items", method: "POST", body: payload)
        }

        let branchPayload = SetBranchBody(branchId: branch.id)
        cart = try await request(path: "/cart/branch", method: "POST", body: branchPayload)

        let orderPayload = CreateOrderBody(
            addressId: address.id,
            branchId: branch.id,
            cartId: cart.id,
            idempotencyKey: UUID().uuidString
        )

        let response: OrderResponse = try await request(path: "/orders", method: "POST", body: orderPayload)
        return response.toDomain()
    }

    func loadActiveOrder() async throws -> CustomerOrder? {
        let response: [OrderSummaryResponse] = try await request(path: "/orders")
        guard let openOrder = response.first(where: { $0.status.isOpenOrderStatus }) else {
            return nil
        }

        return try await refreshOrder(id: openOrder.id)
    }

    func refreshOrder(id: UUID) async throws -> CustomerOrder {
        let response: OrderResponse = try await request(path: "/orders/\(id.uuidString)")
        return response.toDomain()
    }

    private func fetchActiveCart() async throws -> CartResponse {
        try await request(path: "/cart/active")
    }

    private func request<Response: Decodable>(
        path: String,
        method: String = "GET",
        authorized: Bool = true
    ) async throws -> Response {
        try await performRequest(path: path, method: method, body: nil, authorized: authorized)
    }

    private func request<Response: Decodable, Body: Encodable>(
        path: String,
        method: String,
        body: Body,
        authorized: Bool = true
    ) async throws -> Response {
        let data = try encoder.encode(body)
        return try await performRequest(path: path, method: method, body: data, authorized: authorized)
    }

    private func performRequest<Response: Decodable>(
        path: String,
        method: String,
        body: Data?,
        authorized: Bool
    ) async throws -> Response {
        let request = try buildRequest(path: path, method: method, body: body, authorized: authorized)

        do {
            let (data, response) = try await session.data(for: request)
            try validate(response: response, data: data)
            return try decoder.decode(Response.self, from: data)
        } catch let error as APIClientError {
            throw error
        } catch let error as URLError {
            throw networkError(from: error)
        } catch let error as DecodingError {
            throw APIClientError.server("Unable to decode API response: \(error.localizedDescription)")
        } catch {
            throw APIClientError.networkUnavailable("The app could not reach the live backend at \(baseURL.absoluteString).")
        }
    }

    private func requestWithoutResponse(
        path: String,
        method: String,
        body: Data? = nil,
        authorized: Bool = true
    ) async throws {
        let request = try buildRequest(path: path, method: method, body: body, authorized: authorized)

        do {
            let (data, response) = try await session.data(for: request)
            try validate(response: response, data: data)
        } catch let error as APIClientError {
            throw error
        } catch let error as URLError {
            throw networkError(from: error)
        } catch {
            throw APIClientError.networkUnavailable("The app could not reach the live backend at \(baseURL.absoluteString).")
        }
    }

    private func buildRequest(path: String, method: String, body: Data?, authorized: Bool) throws -> URLRequest {
        let base = baseURL.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let relativePath = path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))

        guard let url = URL(string: "\(base)/\(relativePath)") else {
            throw APIClientError.server("Invalid API path: \(path)")
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if authorized {
            guard let accessToken else {
                throw APIClientError.unauthorized
            }
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        }

        request.httpBody = body
        return request
    }

    private func validate(response: URLResponse, data: Data) throws {
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIClientError.networkUnavailable("The app received an invalid response from \(baseURL.absoluteString).")
        }

        guard 200..<300 ~= httpResponse.statusCode else {
            if httpResponse.statusCode == 401 {
                throw APIClientError.unauthorized
            }

            if
                let body = String(data: data, encoding: .utf8)?
                    .trimmingCharacters(in: .whitespacesAndNewlines),
                !body.isEmpty
            {
                throw APIClientError.server(body)
            }

            throw APIClientError.server("Request failed with status \(httpResponse.statusCode).")
        }
    }

    private func networkError(from error: URLError) -> APIClientError {
        switch error.code {
        case .notConnectedToInternet, .cannotFindHost, .cannotConnectToHost, .dnsLookupFailed, .networkConnectionLost, .timedOut:
            return .networkUnavailable(
                "Unable to reach the live backend at \(baseURL.absoluteString). Make sure the API server is running, then try again."
            )
        default:
            return .networkUnavailable(
                "The app could not contact the live backend at \(baseURL.absoluteString). \(error.localizedDescription)"
            )
        }
    }
}

@MainActor
struct HybridAPIClient: APIClient {
    let live: LiveAPIClient
    let mock: MockAPIClient

    func login(email: String, password: String) async throws -> SessionUser {
        if let user = try? await live.login(email: email, password: password) {
            return user
        }

        return try await mock.login(email: email, password: password)
    }

    func loadHome() async throws -> HomeSnapshot {
        if let home = try? await live.loadHome() {
            return home
        }

        return try await mock.loadHome()
    }

    func loadAddresses() async throws -> [SavedAddress] {
        if let addresses = try? await live.loadAddresses() {
            return addresses
        }

        return try await mock.loadAddresses()
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
        if let address = try? await live.createAddress(
            label: label,
            line1: line1,
            line2: line2,
            city: city,
            emirate: emirate,
            notes: notes,
            latitude: latitude,
            longitude: longitude,
            isDefault: isDefault
        ) {
            return address
        }

        return try await mock.createAddress(
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

    func loadFavoriteIDs() async throws -> [UUID] {
        if let favorites = try? await live.loadFavoriteIDs() {
            return favorites
        }

        return try await mock.loadFavoriteIDs()
    }

    func recommendBranches(for address: SavedAddress) async throws -> BranchRecommendation {
        if let branches = try? await live.recommendBranches(for: address) {
            return branches
        }

        return try await mock.recommendBranches(for: address)
    }

    func placeOrder(cartItems: [CartItem], address: SavedAddress, branch: Branch) async throws -> CustomerOrder {
        if let order = try? await live.placeOrder(cartItems: cartItems, address: address, branch: branch) {
            return order
        }

        return try await mock.placeOrder(cartItems: cartItems, address: address, branch: branch)
    }

    func loadActiveOrder() async throws -> CustomerOrder? {
        if let order = try? await live.loadActiveOrder() {
            return order
        }

        return try await mock.loadActiveOrder()
    }

    func refreshOrder(id: UUID) async throws -> CustomerOrder {
        if let order = try? await live.refreshOrder(id: id) {
            return order
        }

        return try await mock.refreshOrder(id: id)
    }
}

private struct AuthResponse: Decodable {
    let accessToken: String
    let user: SessionUserResponse
}

private struct SessionUserResponse: Decodable {
    let id: UUID
    let email: String
    let roles: [String]

    func toDomain() -> SessionUser {
        SessionUser(id: id, email: email, roles: roles)
    }
}

private struct LocalizedTextResponse: Decodable {
    let en: String
    let ar: String

    var primary: String { en }
}

private struct HomeResponse: Decodable {
    let banners: [BannerResponse]
    let categories: [CategoryResponse]
    let featuredProducts: [ProductResponse]
}

private struct BannerResponse: Decodable {
    let id: UUID
    let title: LocalizedTextResponse
    let subtitle: LocalizedTextResponse

    func toDomain() -> HomeBanner {
        HomeBanner(
            id: id,
            title: title.primary,
            subtitle: subtitle.primary,
            palette: ["#8B1116", "#CD2026", "#FFB848"]
        )
    }
}

private struct CategoryResponse: Decodable {
    let id: UUID
    let slug: String
    let titleEn: String?
    let titleAr: String?
    let title: LocalizedTextResponse?
    let descriptionEn: String?
    let descriptionAr: String?
    let description: LocalizedTextResponse?

    func toDomain() -> MenuCategory {
        let resolvedTitle = title?.primary ?? titleEn ?? titleAr ?? slug.replacingOccurrences(of: "-", with: " ").capitalized
        let resolvedSubtitle = description?.primary ?? descriptionEn ?? descriptionAr ?? "Pickup-ready selection"
        return MenuCategory(id: id, slug: slug, title: resolvedTitle, subtitle: resolvedSubtitle)
    }
}

private struct ProductResponse: Decodable {
    let id: UUID
    let categorySlug: String
    let name: LocalizedTextResponse
    let description: LocalizedTextResponse
    let heroImageUrl: String
    let tags: [String]
    let variants: [ProductVariantResponse]
    let modifierGroups: [ProductModifierGroupResponse]

    func toDomain() -> Product {
        Product(
            id: id,
            categorySlug: categorySlug,
            name: name.primary,
            detail: description.primary,
            imageURL: URL(string: heroImageUrl),
            tags: tags.map { $0.replacingOccurrences(of: "-", with: " ").capitalized },
            variants: variants.map { $0.toDomain() },
            modifiers: modifierGroups.map { $0.toDomain() }
        )
    }
}

private struct ProductVariantResponse: Decodable {
    let id: UUID
    let name: LocalizedTextResponse
    let price: MoneyResponse

    func toDomain() -> ProductVariant {
        ProductVariant(id: id, name: name.primary, price: price.amount)
    }
}

private struct ProductModifierGroupResponse: Decodable {
    let id: UUID
    let name: LocalizedTextResponse
    let minSelections: Int
    let maxSelections: Int
    let options: [ProductModifierOptionResponse]

    func toDomain() -> ProductModifierGroup {
        ProductModifierGroup(
            id: id,
            name: name.primary,
            minSelections: minSelections,
            maxSelections: maxSelections,
            options: options.map { $0.toDomain() }
        )
    }
}

private struct ProductModifierOptionResponse: Decodable {
    let id: UUID
    let name: LocalizedTextResponse
    let priceDelta: Double
    let isDefault: Bool

    func toDomain() -> ProductModifierOption {
        ProductModifierOption(id: id, name: name.primary, priceDelta: priceDelta, isDefault: isDefault)
    }
}

private struct MoneyResponse: Decodable {
    let amount: Double
}

private struct AddressResponse: Decodable {
    struct Coordinates: Decodable {
        let lat: Double
        let lng: Double
    }

    let id: UUID
    let label: String
    let line1: String
    let line2: String?
    let city: String
    let emirate: String
    let notes: String?
    let coordinates: Coordinates
    let isDefault: Bool

    func toDomain() -> SavedAddress {
        SavedAddress(
            id: id,
            label: label.capitalized,
            line1: line1,
            line2: line2,
            city: city,
            emirate: emirate,
            notes: notes,
            latitude: coordinates.lat,
            longitude: coordinates.lng,
            isDefault: isDefault
        )
    }
}

private struct CreatedAddressResponse: Decodable {
    let id: UUID
}

private struct SaveAddressBody: Encodable {
    let label: String
    let line1: String
    let line2: String?
    let city: String
    let emirate: String
    let notes: String?
    let lat: Double
    let lng: Double
    let isDefault: Bool
}

private struct BranchRecommendationResponse: Decodable {
    let primary: BranchResponse
    let alternatives: [BranchResponse]

    func toDomain() -> BranchRecommendation {
        BranchRecommendation(primary: primary.toDomain(), alternatives: alternatives.map { $0.toDomain() })
    }
}

private struct BranchResponse: Decodable {
    struct Coordinates: Decodable {
        let lat: Double
        let lng: Double
    }

    let id: UUID
    let code: String
    let name: LocalizedTextResponse
    let address: LocalizedTextResponse
    let coordinates: Coordinates
    let estimatedPrepMinutes: Int
    let distanceKm: Double?

    func toDomain() -> Branch {
        Branch(
            id: id,
            code: code,
            name: name.primary,
            address: address.primary,
            latitude: coordinates.lat,
            longitude: coordinates.lng,
            estimatedPrepMinutes: estimatedPrepMinutes,
            distanceKm: distanceKm ?? 0
        )
    }
}

private struct CartResponse: Decodable {
    let id: UUID
    let items: [CartItemResponse]
}

private struct CartItemResponse: Decodable {
    let id: UUID
}

private struct CartSelectionBody: Encodable {
    let modifierGroupId: UUID
    let optionIds: [UUID]
}

private struct CartItemBody: Encodable {
    let productId: UUID
    let variantId: UUID
    let quantity: Int
    let notes: String?
    let selections: [CartSelectionBody]
}

private struct SetBranchBody: Encodable {
    let branchId: UUID
}

private struct CreateOrderBody: Encodable {
    let addressId: UUID
    let branchId: UUID
    let cartId: UUID
    let idempotencyKey: String
}

private struct OrderSummaryResponse: Decodable {
    let id: UUID
    let status: String
}

private struct OrderResponse: Decodable {
    struct AddressPayload: Decodable {
        struct Coordinates: Decodable {
            let lat: Double
            let lng: Double
        }

        let id: UUID
        let label: String
        let line1: String
        let line2: String?
        let city: String
        let emirate: String
        let notes: String?
        let coordinates: Coordinates
        let isDefault: Bool

        func toDomain() -> SavedAddress {
            SavedAddress(
                id: id,
                label: label.capitalized,
                line1: line1,
                line2: line2,
                city: city,
                emirate: emirate,
                notes: notes,
                latitude: coordinates.lat,
                longitude: coordinates.lng,
                isDefault: isDefault
            )
        }
    }

    struct ItemPayload: Decodable {
        let id: UUID
        let productId: UUID
        let variantId: UUID
        let quantity: Int
        let unitPrice: MoneyResponse
        let totalPrice: MoneyResponse
        let name: String
        let variantName: String

        func toDomain() -> CartItem {
            let product = Product(
                id: productId,
                categorySlug: "",
                name: name,
                detail: "",
                imageURL: nil,
                tags: [],
                variants: [ProductVariant(id: variantId, name: variantName, price: unitPrice.amount)],
                modifiers: []
            )

            return CartItem(
                id: id,
                product: product,
                variant: ProductVariant(id: variantId, name: variantName, price: unitPrice.amount),
                selections: [],
                quantity: quantity,
                unitPrice: unitPrice.amount
            )
        }
    }

    struct TimelinePayload: Decodable {
        let status: String
        let note: String?

        func toDomain() -> CustomerOrderTimeline {
            CustomerOrderTimeline(
                title: status.displayStatusTitle,
                subtitle: note ?? "Status updated",
                status: status.toCustomerOrderStatus()
            )
        }
    }

    let id: UUID
    let orderCode: String
    let pickupToken: String?
    let branch: BranchResponse
    let address: AddressPayload
    let items: [ItemPayload]
    let status: String
    let timeline: [TimelinePayload]

    func toDomain() -> CustomerOrder {
        CustomerOrder(
            id: id,
            orderCode: orderCode,
            pickupToken: pickupToken ?? "-",
            branch: branch.toDomain(),
            address: address.toDomain(),
            items: items.map { $0.toDomain() },
            status: status.toCustomerOrderStatus(),
            timeline: timeline.map { $0.toDomain() }
        )
    }
}

private extension String {
    var nilIfBlank: String? {
        let trimmed = trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}

private extension String {
    var isOpenOrderStatus: Bool {
        switch self {
        case "awaiting_payment", "paid", "in_preparation", "ready_for_pickup":
            return true
        default:
            return false
        }
    }

    func toCustomerOrderStatus() -> CustomerOrderStatus {
        switch self {
        case "awaiting_payment":
            return .awaitingPayment
        case "paid":
            return .paid
        case "in_preparation":
            return .inPreparation
        case "ready_for_pickup":
            return .readyForPickup
        case "picked_up":
            return .pickedUp
        case "cancelled":
            return .cancelled
        case "expired":
            return .expired
        default:
            return .awaitingPayment
        }
    }

    var displayStatusTitle: String {
        switch self {
        case "awaiting_payment":
            return "Awaiting Payment"
        case "in_preparation":
            return "In Preparation"
        case "ready_for_pickup":
            return "Ready for Pickup"
        case "picked_up":
            return "Picked Up"
        case "cancelled":
            return "Cancelled"
        case "expired":
            return "Expired"
        default:
            return replacingOccurrences(of: "_", with: " ").capitalized
        }
    }
}
