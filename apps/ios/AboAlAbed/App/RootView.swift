import SwiftUI

struct RootView: View {
    @EnvironmentObject private var model: AppModel

    var body: some View {
        Group {
            if model.isAuthenticated {
                MainTabView()
            } else {
                AuthView()
            }
        }
        .busyOverlay(
            isPresented: model.isAuthenticated && model.isBusy,
            title: "Processing Request",
            subtitle: "Please wait while we sync your action with the service."
        )
        .alert("Something needs attention", isPresented: Binding(
            get: { model.errorMessage != nil },
            set: { if !$0 { model.errorMessage = nil } }
        ), actions: {
            Button("OK") { model.errorMessage = nil }
        }, message: {
            Text(model.errorMessage ?? "")
        })
    }
}

private struct MainTabView: View {
    @EnvironmentObject private var model: AppModel

    var body: some View {
        TabView {
            NavigationStack {
                HomeView()
            }
            .tabItem {
                Label("Menu", systemImage: "house.fill")
            }

            NavigationStack {
                FavoritesView()
            }
            .tabItem {
                Label("Favorites", systemImage: "heart.fill")
            }

            NavigationStack {
                OrdersHubView()
            }
            .tabItem {
                Label("Orders", systemImage: "receipt.fill")
            }

            NavigationStack {
                AccountView()
            }
            .tabItem {
                Label("Account", systemImage: "person.crop.circle")
            }
        }
        .tint(BrandTheme.brand)
    }
}
