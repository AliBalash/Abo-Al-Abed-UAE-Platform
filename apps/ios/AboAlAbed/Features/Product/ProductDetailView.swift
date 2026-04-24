import SwiftUI

struct ProductDetailView: View {
    let product: Product

    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var model: AppModel
    @State private var selectedVariantIndex = 0
    @State private var selectionMap: [UUID: Set<UUID>] = [:]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    AsyncImage(url: product.imageURL) { image in
                        image.resizable().scaledToFill()
                    } placeholder: {
                        BrandTheme.panelGradient
                    }
                    .frame(height: 280)
                    .clipShape(RoundedRectangle(cornerRadius: 30))

                    VStack(alignment: .leading, spacing: 12) {
                        Text(product.name)
                            .font(.system(size: 30, weight: .bold, design: .rounded))
                        Text(product.detail)
                            .foregroundStyle(.secondary)
                        Picker("Variant", selection: $selectedVariantIndex) {
                            ForEach(Array(product.variants.enumerated()), id: \.offset) { index, variant in
                                Text("\(variant.name) · AED \(variant.price, specifier: "%.0f")").tag(index)
                            }
                        }
                        .pickerStyle(.segmented)
                    }

                    ForEach(product.modifiers) { group in
                        VStack(alignment: .leading, spacing: 12) {
                            Text(group.name)
                                .font(.headline)
                            ForEach(group.options) { option in
                                Button {
                                    toggle(option: option, in: group)
                                } label: {
                                    HStack {
                                        Text(option.name)
                                        Spacer()
                                        Text(option.priceDelta > 0 ? "+AED \(option.priceDelta, specifier: "%.0f")" : "Included")
                                            .foregroundStyle(.secondary)
                                        Image(systemName: isSelected(option: option, in: group) ? "checkmark.circle.fill" : "circle")
                                            .foregroundStyle(isSelected(option: option, in: group) ? BrandTheme.brand : .secondary)
                                    }
                                    .padding()
                                    .background(Color.white, in: RoundedRectangle(cornerRadius: 18))
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
                .padding(20)
            }
            .background(BrandTheme.cream.ignoresSafeArea())
            .safeAreaInset(edge: .bottom) {
                Button {
                    let variant = product.variants[selectedVariantIndex]
                    let selections = product.modifiers.map { group in
                        ProductSelection(
                            group: group,
                            options: group.options.filter { selectionMap[group.id, default: defaultOptionIDs(for: group)].contains($0.id) }
                        )
                    }
                    model.addToCart(product: product, variant: variant, selections: selections)
                    dismiss()
                } label: {
                    Text("Add to Cart · AED \(selectedVariant.price + modifierPrice, specifier: "%.0f")")
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(BrandTheme.heroGradient, in: RoundedRectangle(cornerRadius: 22))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 20)
                        .padding(.top, 8)
                        .padding(.bottom, 16)
                }
            }
        }
    }

    private var selectedVariant: ProductVariant {
        product.variants[selectedVariantIndex]
    }

    private var modifierPrice: Double {
        product.modifiers
            .flatMap { group in
                group.options.filter { selectionMap[group.id, default: defaultOptionIDs(for: group)].contains($0.id) }
            }
            .reduce(0) { $0 + $1.priceDelta }
    }

    private func toggle(option: ProductModifierOption, in group: ProductModifierGroup) {
        var selections = selectionMap[group.id, default: defaultOptionIDs(for: group)]
        if selections.contains(option.id) {
            if selections.count > group.minSelections {
                selections.remove(option.id)
            }
        } else {
            if selections.count >= group.maxSelections, let first = selections.first {
                selections.remove(first)
            }
            selections.insert(option.id)
        }
        selectionMap[group.id] = selections
    }

    private func isSelected(option: ProductModifierOption, in group: ProductModifierGroup) -> Bool {
        selectionMap[group.id, default: defaultOptionIDs(for: group)].contains(option.id)
    }

    private func defaultOptionIDs(for group: ProductModifierGroup) -> Set<UUID> {
        let defaults = group.options.filter(\.isDefault).map(\.id)
        return Set(defaults.isEmpty ? group.options.prefix(group.minSelections).map(\.id) : defaults)
    }
}
