import XCTest
@testable import AboAlAbed

@MainActor
final class AppModelTests: XCTestCase {
    func testPlaceOrderClearsCart() async throws {
        let model = AppModel(environment: AppEnvironment(apiClient: MockAPIClient()))
        await model.login(email: "customer@aboalabed.ae", password: "ChangeMe123!")
        let product = model.home.featured[0]
        model.addToCart(product: product, variant: product.variants[0], selections: [])
        XCTAssertEqual(model.cartCount, 1)

        await model.placeOrder()

        XCTAssertEqual(model.cartCount, 0)
        XCTAssertNotNil(model.activeOrder)
    }

    func testLoginKeepsAuthenticatedSessionWhenBootstrapDataFails() async {
        let user = SessionUser(
            id: UUID(),
            email: "customer@aboalabed.ae",
            roles: []
        )
        let model = AppModel(
            environment: AppEnvironment(
                apiClient: StubAPIClient(
                    loginResult: .success(user),
                    addressesResult: .failure(APIClientError.server("Addresses failed to load."))
                )
            )
        )

        await model.login(email: "customer@aboalabed.ae", password: "ChangeMe123!")

        XCTAssertTrue(model.isAuthenticated)
        XCTAssertEqual(model.session?.email, "customer@aboalabed.ae")
        XCTAssertTrue(model.savedAddresses.isEmpty)
        XCTAssertNil(model.selectedAddress)
        XCTAssertTrue(model.home.featured.isEmpty)
        XCTAssertNil(model.errorMessage)
    }
}

@MainActor
private struct StubAPIClient: APIClient {
    var loginResult: Result<SessionUser, Error>
    var homeResult: Result<HomeSnapshot, Error> = .success(.empty)
    var addressesResult: Result<[SavedAddress], Error> = .success([])
    var favoriteIDsResult: Result<[UUID], Error> = .success([])
    var recommendationResult: Result<BranchRecommendation, Error> = .failure(APIClientError.server("No branch recommendation configured."))
    var placeOrderResult: Result<CustomerOrder, Error> = .failure(APIClientError.server("No order configured."))
    var activeOrderResult: Result<CustomerOrder?, Error> = .success(nil)
    var refreshOrderResult: Result<CustomerOrder, Error> = .failure(APIClientError.server("No order configured."))

    func login(email: String, password: String) async throws -> SessionUser {
        try loginResult.get()
    }

    func loadHome() async throws -> HomeSnapshot {
        try homeResult.get()
    }

    func loadAddresses() async throws -> [SavedAddress] {
        try addressesResult.get()
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

    func loadFavoriteIDs() async throws -> [UUID] {
        try favoriteIDsResult.get()
    }

    func recommendBranches(for address: SavedAddress) async throws -> BranchRecommendation {
        try recommendationResult.get()
    }

    func placeOrder(cartItems: [CartItem], address: SavedAddress, branch: Branch) async throws -> CustomerOrder {
        try placeOrderResult.get()
    }

    func loadActiveOrder() async throws -> CustomerOrder? {
        try activeOrderResult.get()
    }

    func refreshOrder(id: UUID) async throws -> CustomerOrder {
        try refreshOrderResult.get()
    }
}
