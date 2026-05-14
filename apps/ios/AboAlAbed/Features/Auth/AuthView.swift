import SwiftUI

struct AuthView: View {
    @EnvironmentObject private var model: AppModel
    @State private var email = "customer@aboalabed.ae"
    @State private var password = "ChangeMe123!"
    @State private var revealHero = false

    var body: some View {
        ZStack {
            BrandBackground()

            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    VStack(alignment: .leading, spacing: 12) {
                        Image("FaroojLogoEnglish")
                            .resizable()
                            .scaledToFit()
                            .frame(maxWidth: 220)
                            .padding(14)
                            .background(Color.white, in: RoundedRectangle(cornerRadius: 20))
                        Text("Pickup-first ordering with a sharper, faster flow.")
                            .font(.system(size: 36, weight: .bold, design: .rounded))
                            .foregroundStyle(BrandTheme.ink)
                        Text("Login with email, lock your address, browse categories, and show your order code at pickup.")
                            .foregroundStyle(.secondary)
                    }
                    .scaleEffect(revealHero ? 1 : 0.98)
                    .opacity(revealHero ? 1 : 0)
                    .animation(.spring(response: 0.5, dampingFraction: 0.82), value: revealHero)

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
                            }
                        }
                        .buttonStyle(PrimaryActionButtonStyle(disabled: model.isBusy))
                        .disabled(model.isBusy)
                    }
                    .padding(24)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 28))

                    VStack(alignment: .leading, spacing: 12) {
                        Label("Seeded branch staff and admin logins exist in the backend.", systemImage: "checkmark.seal.fill")
                        Label("Customer ordering flow is optimized for self-pickup only.", systemImage: "checkmark.seal.fill")
                        Label("Arabic-ready data model is baked in from the first iteration.", systemImage: "checkmark.seal.fill")
                    }
                    .foregroundStyle(BrandTheme.ink.opacity(0.88))
                    .font(.subheadline)
                }
                .padding(24)
            }
        }
        .onAppear { revealHero = true }
    }
}
