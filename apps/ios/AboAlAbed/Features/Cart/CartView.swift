import SwiftUI

struct CartView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var model: AppModel
    @State private var isBranchSheetPresented = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 18) {
                if model.cartItems.isEmpty {
                    ContentUnavailableView("Cart is empty", systemImage: "bag", description: Text("Add a few items from the menu and come back here to choose the pickup branch."))
                } else {
                    ScrollView {
                        VStack(spacing: 14) {
                            ForEach(model.cartItems) { item in
                                BrandCard(cornerRadius: 22) {
                                    VStack(alignment: .leading, spacing: 10) {
                                        HStack {
                                            Text(item.product.name).font(.headline)
                                            Spacer()
                                            Button(role: .destructive) {
                                                model.removeCartItem(item)
                                            } label: {
                                                Image(systemName: "trash")
                                            }
                                        }
                                        Text("\(item.variant.name) · Qty \(item.quantity)")
                                            .foregroundStyle(.secondary)
                                        Text("AED \(item.totalPrice, specifier: "%.0f")")
                                            .font(.subheadline.bold())
                                    }
                                }
                            }

                            VStack(alignment: .leading, spacing: 12) {
                                Text("Suggested Pickup Branch")
                                    .font(.headline)
                                if let branch = model.selectedBranch {
                                    Button {
                                        isBranchSheetPresented = true
                                    } label: {
                                        VStack(alignment: .leading, spacing: 8) {
                                            Text(branch.name)
                                                .font(.title3.bold())
                                            Text("\(branch.address) · \(branch.distanceKm, specifier: "%.1f") km away")
                                                .foregroundStyle(.secondary)
                                            Text("Estimated prep after payment: \(branch.estimatedPrepMinutes) min")
                                                .font(.subheadline.weight(.semibold))
                                                .foregroundStyle(BrandTheme.success)
                                        }
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                        .padding()
                                        .background(BrandTheme.panelGradient, in: RoundedRectangle(cornerRadius: 24))
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .padding()
                    }

                    VStack(spacing: 12) {
                        HStack {
                            Text("Total")
                            Spacer()
                            Text("AED \(model.cartTotal, specifier: "%.0f")")
                                .font(.title3.bold())
                        }

                        Button {
                            Task {
                                await model.placeOrder()
                                if model.activeOrder != nil { dismiss() }
                            }
                        } label: {
                            Text(model.isBusy ? "Placing Order..." : "Place Pickup Order")
                        }
                        .buttonStyle(PrimaryActionButtonStyle(disabled: model.isBusy))
                    }
                    .padding()
                    .background(Color.white, in: RoundedRectangle(cornerRadius: 26))
                    .padding(.horizontal)
                    .padding(.bottom)
                }
            }
            .navigationTitle("Cart")
            .sheet(isPresented: $isBranchSheetPresented) {
                BranchSelectionView()
                    .environmentObject(model)
            }
            .background(BrandBackground())
        }
    }
}
