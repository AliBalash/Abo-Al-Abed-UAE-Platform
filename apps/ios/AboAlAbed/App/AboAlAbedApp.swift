import SwiftUI

@main
struct AboAlAbedApp: App {
    @StateObject private var model = AppModel(environment: .live)

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(model)
        }
    }
}
