import Foundation

@MainActor
struct AppEnvironment {
    let apiClient: any APIClient

    private static let liveBaseURL = URL(
        string: ProcessInfo.processInfo.environment["ABO_API_BASE_URL"] ?? "http://127.0.0.1:4000/api"
    )!

    static let live = AppEnvironment(
        apiClient: LiveAPIClient(baseURL: liveBaseURL)
    )

    static let preview = AppEnvironment(
        apiClient: MockAPIClient()
    )
}
