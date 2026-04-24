import MapKit
import SwiftUI

struct AddressPickerView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var model: AppModel
    @State private var cameraPosition: MapCameraPosition = .automatic

    var body: some View {
        NavigationStack {
            VStack(spacing: 18) {
                Map(position: $cameraPosition) {
                    ForEach(model.savedAddresses) { address in
                        Marker(address.label, coordinate: address.coordinate)
                    }
                }
                .frame(height: 280)
                .clipShape(RoundedRectangle(cornerRadius: 28))

                List(model.savedAddresses) { address in
                    Button {
                        Task {
                            await model.selectAddress(address)
                            dismiss()
                        }
                    } label: {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text(address.label).font(.headline)
                                if address.isDefault {
                                    Text("Default")
                                        .font(.caption.weight(.semibold))
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 6)
                                        .background(BrandTheme.sand, in: Capsule())
                                }
                            }
                            Text(address.line1)
                                .foregroundStyle(.secondary)
                            Text("\(address.city), \(address.emirate)")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 8)
                    }
                }
                .listStyle(.plain)
            }
            .padding()
            .navigationTitle("Choose Address")
            .navigationBarTitleDisplayMode(.inline)
        }
        .onAppear {
            if let selected = model.selectedAddress {
                cameraPosition = .region(
                    MKCoordinateRegion(
                        center: selected.coordinate,
                        span: MKCoordinateSpan(latitudeDelta: 0.12, longitudeDelta: 0.12)
                    )
                )
            }
        }
    }
}
