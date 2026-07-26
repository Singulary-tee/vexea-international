# SIGNUP, AUTH & GATE ARCHITECTURE REFACTORING PLAN

This document outlines the formal plan for refining onboarding & authentication flows, implementing comprehensive input validation, renaming verification services, and centralizing all system gates.

---

## 1. Dev-Only Guest Account Wipe & Reset Control
- **Location**: `/client/dev_menu.ts` (Dev Overlay) and `/client/screens/main-menu.ts` (Profile / Auth Modal).
- **Gate Guard**: Strictly guarded by `IS_DEV` (Production Gate).
- **Functional Flow**:
  1. Add a prominent `[DEV] WIPE GUEST & RESET ONBOARDING` button in dev tools and auth overlay when in development mode.
  2. On click:
     - Execute `auth.signOut()`.
     - Clear local storage & session storage items (`vexPlayerUid`, `vex_codename`, cached guest profile flags).
     - Reset client state & trigger `showEnlistmentOverlay(db, auth)` or reset splash/onboarding triggers.
     - Display toast: `[DEV] GUEST SESSION WIPED — ONBOARDING RESET`.

---

## 2. Refactored Signup & Login Guest Session Warnings
- **Location**: `/client/screens/main-menu.ts` (`createUnifiedAuthOverlay`).
- **Logic Correction**:
  - **Account Registration (Signup)**:
    - Eliminate the false `⚠️ OVERWRITE GUEST SESSION WARNING` during account creation (`CREATE ACCOUNT`).
    - When an anonymous guest signs up with email/pass, convert/link the guest Firestore document (`Users/{guestUid}`) to the new authenticated user record or link credentials so that credits, energy, and codename progress are preserved seamlessly.
  - **Account Sign-In (Existing Account)**:
    - When a user attempts to sign into an *existing* account (`EMAIL LOGIN` or `SIGN IN WITH GOOGLE` for an existing user), check if their current session is an anonymous guest session with unsaved local progress.
    - If and ONLY if an existing remote profile will replace an unsaved guest session, display the `⚠️ OVERWRITE GUEST SESSION WARNING` asking for explicit confirmation before completing sign-in.

---

## 3. Client-Side Input Format Validation (Pre-Authentication)
- **Location**: `/client/screens/main-menu.ts` (`execEmailLogin`, `execCreateAccount`) integrated with `ValidatorGate`.
- **Validation Rules**:
  - **Email Format**: Must conform to RFC-compliant email regex (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`).
  - **Password Strength**: Minimum 6 characters (Firebase Auth constraint), no whitespace-only strings.
- **User Feedback**:
  - Instantly block invalid inputs prior to any network request or Firebase auth trigger.
  - Display clear, stylized error notices (e.g., `INVALID EMAIL FORMAT`, `PASSWORD MUST BE AT LEAST 6 CHARACTERS`) directly in the auth modal, preventing browser password saver popups for malformed entries (like "1").

---

## 4. Gate Verification Renaming & Centralized `ValidatorGate`
### A. Renaming "Validation" -> "Verification"
Rename terms, files, and imports where "validation" was used for purchase/reward/claim checking (reserving "validation" for input field checking):
- Rename `/server/validation/validation-service.ts` -> `/server/verification/verification-service.ts`.
- Rename `/shared/validation/` -> `/shared/verification/` (`types.ts`, `validator.ts` -> `verifier.ts`).
- Rename `/VALIDATION_AND_AUTH_PLAN.md` -> `/VERIFICATION_AND_AUTH_PLAN.md`.
- Update all import statements across `client/screens/main-menu.ts`, `server/index.ts`, `server/verification/verification-service.ts`, `shared/weapons.ts`.

### B. New Central `ValidatorGate` (`/shared/gates/validator.gate.ts`)
- **Location**: `/shared/gates/validator.gate.ts`.
- **Responsibilities**:
  - Serves as the central control for validating every user input field across the application.
  - Supported Input Types:
    - `email`: Standard email regex & domain checks.
    - `password`: Length, character complexity checks.
    - `codename` / `display_name`: 3-20 characters, alphanumeric & underscore `/^[a-zA-Z0-9_]+$/`.
    - `chat_text` / `user_text`: Length limit, profanity/abuse/harassment filter, XSS/script injection filter (`<script>`, `javascript:`).
    - `numerical_amount`: Bounds checking, NaN prevention, integer/float rules.
  - API Method:
    ```typescript
    export class ValidatorGate {
      static validate(type: InputType, value: string): ValidationResult;
    }
    ```

---

## 5. Gate System Re-Architecture & Renaming `gate.ts` -> `production.gate.ts`
### A. Renaming Master Environment Gate
- Rename `/shared/gate.ts` -> `/shared/gates/production.gate.ts`.
- Update all references to `shared/gate` across:
  - `/client/main.ts`
  - `/client/screens/main-menu.ts`
  - `/client/screens/stats-screen.ts`
  - `/client/screens/screen-manager.ts`
  - `/client/settings.ts`
  - `/client/social.ts`
  - `/client/dev_menu.ts`
  - `/server/index.ts`

### B. Centralized Gate Directory Hierarchy
Organize all system gates according to scope and function:
1. **Shared Gates (`/shared/gates/`)**:
   - `production.gate.ts` — Master `IS_DEV` environment assertions & production safety blocks.
   - `validator.gate.ts` — Centralized input format, sanitization, and harassment/abuse gate.
2. **Client Gates (`/client/gates/`)**:
   - `platform.gate.ts` — Moved from `/client/platform-gate.ts`, managing device mobile vs desktop capabilities.
   - `screen.gate.ts` — Centralized UI input blocking, orientation locks, and interaction gating:
     - **Hard / Full-Screen Locks**:
       - `rotate_device_lock`: Full-screen touch/click blocker preventing interaction when mobile device orientation is invalid.
       - `loading_lock`: Full input suppression layer during map loading, match asset initialization, and screen transitions.
       - `splash_lock`: Pre-gameplay input lock enforcing enlistment or onboarding completion before accessing match features.
     - **Selective / Contextual Input Suppression**:
       - `ui_editor_active_lock`: Selectively suppresses gameplay touch controls (HUD fire buttons, joysticks, weapon switching) while the player is actively editing their HUD layout in the UI Editor.
       - `overlay_modal_lock`: Disables click-through to underlying screen buttons whenever an active modal or overlay (e.g. Auth, Squad & Friends, Dev Menu) is open.
3. **Server Gates (`/server/gates/`)**:
   - `verification.gate.ts` — Server-authoritative purchase, reward, and match state verification gate.

---

## Verification & Execution Order
1. Create new plan file `/SIGNUP_AND_GATES_PLAN.md`.
2. Present plan summary to user and wait for approval.
3. Execute Phase 1: Wiping guest session tool in dev menu.
4. Execute Phase 2 & 3: Refactor signup/login flows, guest linking, and client-side pre-auth validation.
5. Execute Phase 4: Rename validation->verification and implement `ValidatorGate`.
6. Execute Phase 5: Rename `gate.ts` -> `production.gate.ts` and restructure all gates into centralized directories.
7. Run `lint_applet` and `compile_applet` to verify zero broken imports or build errors.
