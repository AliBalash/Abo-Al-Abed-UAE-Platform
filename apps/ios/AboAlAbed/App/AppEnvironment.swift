import Foundation

@MainActor
struct AppEnvironment {
    let apiClient: any APIClient

    static let live = AppEnvironment(
        apiClient: LiveAPIClient(baseURL: URL(string: "http://localhost:4000/api")!)
    )

    static let preview = AppEnvironment(
        apiClient: MockAPIClient()
    )
}
