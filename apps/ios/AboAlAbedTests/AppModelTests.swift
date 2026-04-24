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
}
