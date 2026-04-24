import SwiftUI

struct BranchSelectionView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var model: AppModel

    var body: some View {
        NavigationStack {
            List {
                if let recommendation = model.branchRecommendation {
                    Section("Recommended") {
                        branchCell(recommendation.primary, isRecommended: true)
                    }

                    Section("Alternatives") {
                        ForEach(recommendation.alternatives) { branch in
                            branchCell(branch, isRecommended: false)
                        }
                    }
                }
            }
            .navigationTitle("Select Branch")
        }
    }

    @ViewBuilder
    private func branchCell(_ branch: Branch, isRecommended: Bool) -> some View {
        Button {
            model.selectedBranch = branch
            dismiss()
        } label: {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text(branch.name)
                        .font(.headline)
                    if isRecommended {
                        Text("Nearest")
                            .font(.caption.weight(.semibold))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(BrandTheme.sand, in: Capsule())
                    }
                }
                Text(branch.address)
                    .foregroundStyle(.secondary)
                Text("\(branch.distanceKm, specifier: "%.1f") km · \(branch.estimatedPrepMinutes) min prep after payment")
                    .font(.subheadline)
                    .foregroundStyle(BrandTheme.success)
            }
            .padding(.vertical, 8)
        }
        .buttonStyle(.plain)
    }
}
