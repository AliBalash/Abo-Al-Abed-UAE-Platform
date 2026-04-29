# Abo Al-Abed UAE Platform

Monorepo for the self-pickup ordering ecosystem:

- `apps/api`: NestJS backend with Prisma/PostgreSQL contracts
- `apps/web`: Next.js operations and admin web app
- `apps/ios`: SwiftUI iPhone client scaffold generated via XcodeGen
- `apps/android`: Native Kotlin/Jetpack Compose customer app
- `packages/contracts`: shared API schemas and domain types
- `packages/ui`: shared web design tokens and presentational helpers

## Quick start

1. Copy `.env.example` to `.env`.
2. Start infrastructure:

```bash
docker compose up -d
```

3. Install dependencies:

```bash
pnpm install
```

4. Generate Prisma client and seed data:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

5. Run API and web:

```bash
pnpm dev
```

6. Generate the iOS Xcode project:

```bash
pnpm ios:project
```

7. Build or open the Android app:

```bash
pnpm android:build
pnpm android:studio
```

For Google Maps, copy `apps/android/secrets.defaults.properties` to
`apps/android/secrets.properties` and set `MAPS_API_KEY`.

## Product coverage

- Email/password auth
- Multi-address customer profiles
- Shared menu with branch availability controls
- Self-pickup order flow with in-branch payment confirmation
- Cashier and kitchen operational views
- Admin catalog, branches, reporting, and governance scaffolding

## Notes

- The repo is `English-first` but content models are `i18n-ready`.
- Production image assets must be re-hosted to S3-compatible storage. Source menu content currently lives in seeding and import tooling, not hotlinked in runtime flows.
