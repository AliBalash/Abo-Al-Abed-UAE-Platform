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
                Label("Menu", systemImage: "fork.knife")
            }

            NavigationStack {
                FavoritesView()
            }
            .tabItem {
                Label("Favorites", systemImage: "heart")
            }

            NavigationStack {
                OrdersHubView()
            }
            .tabItem {
                Label("Orders", systemImage: "bag")
            }

            NavigationStack {
                AccountView()
            }
            .tabItem {
                Label("Account", systemImage: "person.crop.circle")
            }
            .badge(model.cartCount > 0 ? model.cartCount : 0)
        }
        .tint(BrandTheme.brand)
    }
}
