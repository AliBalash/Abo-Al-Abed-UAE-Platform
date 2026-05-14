import SwiftUI

struct OrderTrackingView: View {
    let order: CustomerOrder

    @EnvironmentObject private var model: AppModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                BrandCard(cornerRadius: 28) {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Pickup Code")
                            .font(.headline)
                        Text(order.orderCode)
                            .font(.system(size: 42, weight: .heavy, design: .rounded))
                            .tracking(4)
                        Text("Show this code to the cashier. Payment is confirmed in-branch before kitchen prep starts.")
                            .foregroundStyle(.secondary)
                        HStack {
                            Text("Pickup token \(order.pickupToken)")
                            Spacer()
                            Text(order.status.rawValue)
                                .fontWeight(.semibold)
                        }
                        .padding()
                        .background(BrandTheme.panelGradient, in: RoundedRectangle(cornerRadius: 22))
                    }
                }

                BrandCard(cornerRadius: 28) {
                    VStack(alignment: .leading, spacing: 14) {
                        Text("Order Timeline")
                            .font(.title3.bold())
                        ForEach(order.timeline) { event in
                            HStack(alignment: .top, spacing: 12) {
                                Circle()
                                    .fill(color(for: event.status))
                                    .frame(width: 14, height: 14)
                                    .padding(.top, 5)
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(event.title)
                                        .font(.headline)
                                    Text(event.subtitle)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                }

                Button {
                    Task { await model.refreshActiveOrder() }
                } label: {
                    HStack {
                        if model.isBusy { ProgressView() }
                        Text(model.isBusy ? "Refreshing..." : "Refresh Order Status")
                    }
                }
                .buttonStyle(PrimaryActionButtonStyle(disabled: model.isBusy))
            }
            .padding()
        }
        .navigationTitle("Track Order")
        .background(BrandBackground())
    }

    private func color(for status: CustomerOrderStatus) -> Color {
        switch status {
        case .awaitingPayment:
            return BrandTheme.warning
        case .paid:
            return BrandTheme.brand
        case .inPreparation:
            return .orange
        case .readyForPickup, .pickedUp:
            return BrandTheme.success
        case .cancelled, .expired:
            return .gray
        }
    }
}
