import CoreLocation
import MapKit
import SwiftUI

struct AddressPickerView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var model: AppModel
    @State private var cameraPosition: MapCameraPosition = .automatic
    @State private var draftAddress: DraftAddress?
    @State private var isResolvingAddress = false
    @State private var searchQuery = ""

    var body: some View {
        NavigationStack {
            VStack(spacing: 18) {
                searchBar
                mapPicker
                Label("Tap anywhere on the map to add a new address", systemImage: "mappin.and.ellipse")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(BrandTheme.brand)
                    .frame(maxWidth: .infinity, alignment: .leading)

                if model.savedAddresses.isEmpty {
                    ContentUnavailableView(
                        "No saved addresses",
                        systemImage: "mappin.circle",
                        description: Text("Tap the map to add your pickup location details.")
                    )
                } else {
                    List(model.savedAddresses) { address in
                        Button {
                            Task {
                                await model.selectAddress(address)
                                dismiss()
                            }
                        } label: {
                            addressCell(address)
                        }
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                }
            }
            .padding()
            .navigationTitle("Choose Address")
            .navigationBarTitleDisplayMode(.inline)
            .background(BrandBackground())
        }
        .sheet(item: $draftAddress) { draft in
            AddressEditorView(draft: draft)
                .environmentObject(model)
        }
        .onAppear {
            if let selected = model.selectedAddress {
                cameraPosition = .region(
                    MKCoordinateRegion(
                        center: selected.coordinate,
                        span: MKCoordinateSpan(latitudeDelta: 0.12, longitudeDelta: 0.12)
                    )
                )
            } else {
                cameraPosition = .region(
                    MKCoordinateRegion(
                        center: CLLocationCoordinate2D(latitude: 25.2048, longitude: 55.2708),
                        span: MKCoordinateSpan(latitudeDelta: 0.2, longitudeDelta: 0.2)
                    )
                )
            }
        }
    }

    private var searchBar: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(.secondary)
            TextField("Search building, street, or area", text: $searchQuery)
                .textInputAutocapitalization(.words)
                .submitLabel(.search)
                .onSubmit {
                    Task { await searchAddress() }
                }
            Button {
                Task { await searchAddress() }
            } label: {
                Image(systemName: "location.magnifyingglass")
                    .font(.headline)
            }
            .disabled(searchQuery.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isResolvingAddress)
        }
        .padding(14)
        .background(Color.white, in: RoundedRectangle(cornerRadius: 18))
        .overlay(
            RoundedRectangle(cornerRadius: 18)
                .stroke(BrandTheme.brand.opacity(0.08), lineWidth: 1)
        )
        .shadow(color: BrandTheme.brand.opacity(0.08), radius: 12, y: 8)
    }

    private var mapPicker: some View {
        MapReader { proxy in
            ZStack {
                Map(position: $cameraPosition) {
                    ForEach(model.savedAddresses) { address in
                        Marker(address.label, coordinate: address.coordinate)
                    }
                    if let draftAddress {
                        Marker("New Address", coordinate: draftAddress.coordinate)
                            .tint(BrandTheme.brand)
                    }
                }
                .frame(height: 300)
                .clipShape(RoundedRectangle(cornerRadius: 28))
                .gesture(
                    DragGesture(minimumDistance: 0)
                        .onEnded { value in
                            guard let coordinate = proxy.convert(value.location, from: .local) else { return }
                            Task { await prepareDraftAddress(at: coordinate) }
                        }
                )

                if isResolvingAddress {
                    ProgressView("Finding address...")
                        .padding(14)
                        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))
                }
            }
        }
    }

    private func addressCell(_ address: SavedAddress) -> some View {
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
            if let line2 = address.line2, !line2.isEmpty {
                Text(line2)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            Text("\(address.city), \(address.emirate)")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 8)
    }

    private func searchAddress() async {
        let query = searchQuery.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else { return }

        isResolvingAddress = true
        defer { isResolvingAddress = false }

        let request = MKLocalSearch.Request()
        request.naturalLanguageQuery = query
        request.region = MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 25.2048, longitude: 55.2708),
            span: MKCoordinateSpan(latitudeDelta: 0.7, longitudeDelta: 0.7)
        )

        guard let item = try? await MKLocalSearch(request: request).start().mapItems.first else { return }
        let coordinate = item.placemark.coordinate
        cameraPosition = .region(
            MKCoordinateRegion(
                center: coordinate,
                span: MKCoordinateSpan(latitudeDelta: 0.04, longitudeDelta: 0.04)
            )
        )
        draftAddress = DraftAddress(
            coordinate: coordinate,
            label: model.savedAddresses.isEmpty ? "Home" : "Custom",
            line1: item.name ?? query,
            city: item.placemark.locality ?? item.placemark.subAdministrativeArea ?? "Dubai",
            emirate: item.placemark.administrativeArea ?? "Dubai"
        )
    }

    private func prepareDraftAddress(at coordinate: CLLocationCoordinate2D) async {
        isResolvingAddress = true
        defer { isResolvingAddress = false }

        let location = CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)
        let placemark = try? await CLGeocoder().reverseGeocodeLocation(location).first
        let streetParts = [
            placemark?.subThoroughfare,
            placemark?.thoroughfare,
            placemark?.name,
        ]
        let line1 = streetParts.compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: ", ")

        draftAddress = DraftAddress(
            coordinate: coordinate,
            label: model.savedAddresses.isEmpty ? "Home" : "Custom",
            line1: line1.isEmpty ? "Selected map location" : line1,
            city: placemark?.locality ?? placemark?.subAdministrativeArea ?? "Dubai",
            emirate: placemark?.administrativeArea ?? "Dubai"
        )
    }
}

private struct DraftAddress: Identifiable {
    let id = UUID()
    let coordinate: CLLocationCoordinate2D
    var label: String
    var line1: String
    var city: String
    var emirate: String
}

private struct AddressEditorView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var model: AppModel

    let draft: DraftAddress
    @State private var label: String
    @State private var line1: String
    @State private var line2 = ""
    @State private var city: String
    @State private var emirate: String
    @State private var notes = ""
    @State private var makeDefault = true

    init(draft: DraftAddress) {
        self.draft = draft
        _label = State(initialValue: draft.label)
        _line1 = State(initialValue: draft.line1)
        _city = State(initialValue: draft.city)
        _emirate = State(initialValue: draft.emirate)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Map Location") {
                    Text(line1)
                    Text("\(draft.coordinate.latitude, specifier: "%.5f"), \(draft.coordinate.longitude, specifier: "%.5f")")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Section("Address Details") {
                    TextField("Label", text: $label)
                    TextField("Street / Area", text: $line1, axis: .vertical)
                    TextField("Building, villa, floor, unit", text: $line2)
                    TextField("City", text: $city)
                    TextField("Emirate", text: $emirate)
                    TextField("Delivery notes", text: $notes, axis: .vertical)
                    Toggle("Make default", isOn: $makeDefault)
                }

                Section {
                    Button {
                        Task {
                            let saved = await model.addAddress(
                                label: label,
                                line1: line1,
                                line2: line2,
                                city: city,
                                emirate: emirate,
                                notes: notes,
                                latitude: draft.coordinate.latitude,
                                longitude: draft.coordinate.longitude,
                                isDefault: makeDefault
                            )
                            if saved { dismiss() }
                        }
                    } label: {
                        HStack {
                            if model.isBusy { ProgressView() }
                            Text(model.isBusy ? "Saving..." : "Save Address")
                        }
                    }
                    .disabled(model.isBusy || line1.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
            .navigationTitle("Add Address")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}
