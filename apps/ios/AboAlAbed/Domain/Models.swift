import Foundation
import MapKit

struct SessionUser: Codable, Equatable {
    let id: UUID
    let email: String
    let roles: [String]
}

struct SavedAddress: Codable, Identifiable, Hashable {
    let id: UUID
    let label: String
    let line1: String
    let line2: String?
    let city: String
    let emirate: String
    let notes: String?
    let latitude: Double
    let longitude: Double
    let isDefault: Bool

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }
}

struct HomeBanner: Identifiable, Hashable {
    let id: UUID
    let title: String
    let subtitle: String
    let palette: [String]
}

struct MenuCategory: Identifiable, Hashable {
    let id: UUID
    let slug: String
    let title: String
    let subtitle: String
}

struct ProductModifierOption: Identifiable, Hashable {
    let id: UUID
    let name: String
    let priceDelta: Double
    let isDefault: Bool
}

struct ProductModifierGroup: Identifiable, Hashable {
    let id: UUID
    let name: String
    let minSelections: Int
    let maxSelections: Int
    let options: [ProductModifierOption]
}

struct ProductVariant: Identifiable, Hashable {
    let id: UUID
    let name: String
    let price: Double
}

struct Product: Identifiable, Hashable {
    let id: UUID
    let categorySlug: String
    let name: String
    let detail: String
    let imageURL: URL?
    let tags: [String]
    let variants: [ProductVariant]
    let modifiers: [ProductModifierGroup]
}

struct ProductSelection: Hashable {
    let group: ProductModifierGroup
    let options: [ProductModifierOption]
}

struct CartItem: Identifiable, Hashable {
    let id: UUID
    let product: Product
    let variant: ProductVariant
    let selections: [ProductSelection]
    let quantity: Int
    let unitPrice: Double

    var totalPrice: Double {
        unitPrice * Double(quantity)
    }
}

struct Branch: Identifiable, Hashable {
    let id: UUID
    let code: String
    let name: String
    let address: String
    let latitude: Double
    let longitude: Double
    let estimatedPrepMinutes: Int
    let distanceKm: Double
}

struct BranchRecommendation: Hashable {
    let primary: Branch
    let alternatives: [Branch]
}

enum CustomerOrderStatus: String, CaseIterable, Codable {
    case awaitingPayment = "Awaiting Pickup Payment"
    case paid = "Paid"
    case inPreparation = "In Preparation"
    case readyForPickup = "Ready for Pickup"
    case pickedUp = "Picked Up"
    case cancelled = "Cancelled"
    case expired = "Expired"
}

struct CustomerOrderTimeline: Identifiable, Hashable {
    let id = UUID()
    let title: String
    let subtitle: String
    let status: CustomerOrderStatus
}

struct CustomerOrder: Identifiable, Hashable {
    let id: UUID
    let orderCode: String
    let pickupToken: String
    let branch: Branch
    let address: SavedAddress
    let items: [CartItem]
    var status: CustomerOrderStatus
    var timeline: [CustomerOrderTimeline]
}

struct HomeSnapshot {
    let banners: [HomeBanner]
    let categories: [MenuCategory]
    let featured: [Product]
    let recommendations: [Product]

    static let empty = HomeSnapshot(
        banners: [],
        categories: [],
        featured: [],
        recommendations: []
    )
}
