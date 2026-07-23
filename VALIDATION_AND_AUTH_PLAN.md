# Validation Architecture, Connection Resilience & Profile Auth Implementation Plan

## 1. High-Level Architectural Summary
This plan outlines the design and decoupling strategy for server-authoritative validation, connection-aware UI rollbacks, client data separation, and full Firebase authentication options for player profiles.

---

## 2. Plan Breakdown & Components

### Phase 1: Modular Validation Architecture (`/shared/validation/` & `/server/validation/`)
- **Decoupled API Contracts**: Create a dedicated validation folder (`shared/validation/`) containing pure interfaces and validator functions for:
  - **Post-Match Validation**: Auditing match duration, kills, damage dealt, and verifying legit XP & Credit rewards.
  - **Store & Skin Purchase Validation**: Validating user balance against item cost catalog, checking level/class prerequisites, and approving unlock claims.
  - **Credits & Daily Claims Validation**: Rate-limiting daily reward claims and verifying eligibility for energy/credit refills.
  - **Level & Progression Validation**: Computing XP thresholds and preventing manual client-side level manipulation.
- **Worker Ready (No Monolithic Bloat)**: Keep validation handlers as pure, isolated functions/classes in modular files rather than stuffing logic into `server/index.ts` or `server/MatchRoom.ts`. This ensures they can easily be executed by a background worker, Cloud Function, or microservice without refactoring.

### Phase 2: Client Data & Default Value Separation
- **Catalog & Offers JSON (`/client/data/`)**: Extract promotional offers, store items, skin catalogs, and challenge definitions into structured client JSON files (e.g., `offers.json`, `catalog.json`, `challenges.json`).
  - Enables clean client rendering.
  - Provides a single source of truth that can be duplicated/imported into validator services.
- **Player Firestore Schema & Initializer**: Ensure player-specific defaults (Level 1, 0 XP, 100 Credits, 100 Energy, default loadout) are initialized directly in Firestore (`Users/{uid}`) upon first sign-in/registration.

### Phase 3: Connection State, Rollbacks & Error Toasts
- **Optimistic State with Rollback**: When a player attempts to buy an item or claim a reward:
  1. Optimistically reflect changes locally or show a pending spinner.
  2. If the connection fails or validation rejects the claim, roll back the client state immediately.
  3. Display a clear notification toast: *"Connection Error: Unable to validate request. Please check your connection and try again."*
- **Reconnection Handling**: Implement exponential backoff listener retry logic for Firestore and transport sockets so pending operations cleanly fail or retry without locking UI inputs.

### Phase 4: Full Authentication & Profile Options (`/client/screens/`)
- **Profile Modal Enhancements (`main-menu.ts` / Auth Overlay)**:
  - Add explicit UI options when opening the Profile panel:
    - **Google Sign-In**: Integrate Firebase `signInWithPopup(auth, googleProvider)`.
    - **Email/Password Auth**: Tabbed interface for Login and Registration.
    - **Guest Upgrade**: Allow Guest users to link/convert their session to a permanent account without losing stats.
  - Real-time binding with `onAuthStateChanged` to pull verified player document data from Firestore (`Users/{uid}`).

---

## 3. Scope Boundaries & Next Steps
- **No Direct Wire-Up to Monolith**: API contracts and validation modules will be prepared and tested as isolated units, ready for integration when the backend worker choice is finalized.
- **File Changes Planned**:
  - `VALIDATION_AND_AUTH_PLAN.md` (This proposal file)
  - `/shared/validation/*` (Validation signatures & schemas)
  - `/client/data/*` (Catalog & offer JSON files)
  - `/client/screens/main-menu.ts` (Profile auth overlay & rollback toast integration)
  - `/client/src/auth.ts` or auth service helpers (Firebase Auth flow)

*Awaiting approval to begin implementation.*
