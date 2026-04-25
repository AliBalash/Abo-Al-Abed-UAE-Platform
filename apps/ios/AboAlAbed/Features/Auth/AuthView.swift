import SwiftUI

struct AuthView: View {
    @EnvironmentObject private var model: AppModel
    @State private var email = "customer@aboalabed.ae"
    @State private var password = "ChangeMe123!"

    var body: some View {
        ZStack {
            BrandTheme.heroGradient
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    VStack(alignment: .leading, spacing: 12) {
                        Image("FaroojLogoEnglish")
                            .resizable()
                            .scaledToFit()
                            .frame(maxWidth: 220)
                            .padding(14)
                            .background(Color.white, in: RoundedRectangle(cornerRadius: 20))
                        Text("Pickup-first Farooj ordering with a sharper flow.")
                            .font(.system(size: 36, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                        Text("Login with email, lock your address, browse categories, and show your order code at pickup.")
                            .foregroundStyle(.white.opacity(0.88))
                    }

                    VStack(spacing: 16) {
                        LabeledContent("Email") {
                            TextField("Email", text: $email)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                                .padding()
                                .background(Color.white, in: RoundedRectangle(cornerRadius: 18))
                        }

                        LabeledContent("Password") {
                            SecureField("Password", text: $password)
                                .padding()
                                .background(Color.white, in: RoundedRectangle(cornerRadius: 18))
                        }

                        if let errorMessage = model.errorMessage {
                            Text(errorMessage)
                                .font(.footnote.weight(.medium))
                                .foregroundStyle(Color.red.opacity(0.9))
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(14)
                                .background(Color.red.opacity(0.08), in: RoundedRectangle(cornerRadius: 16))
                        }

                        Button {
                            Task { await model.login(email: email, password: password) }
                        } label: {
                            HStack {
                                if model.isBusy { ProgressView().tint(.white) }
                                Text(model.isBusy ? "Signing In..." : "Continue to Menu")
                                    .fontWeight(.semibold)
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.black.opacity(0.82), in: RoundedRectangle(cornerRadius: 18))
                            .foregroundStyle(.white)
                        }
                        .disabled(model.isBusy)
                        .opacity(model.isBusy ? 0.72 : 1)
                    }
                    .padding(24)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 28))

                    VStack(alignment: .leading, spacing: 12) {
                        Label("Seeded branch staff and admin logins exist in the backend.", systemImage: "checkmark.seal.fill")
                        Label("Customer ordering flow is optimized for self-pickup only.", systemImage: "checkmark.seal.fill")
                        Label("Arabic-ready data model is baked in from the first iteration.", systemImage: "checkmark.seal.fill")
                    }
                    .foregroundStyle(.white.opacity(0.92))
                    .font(.subheadline)
                }
                .padding(24)
            }
        }
    }
}
