# Fresh Mart Self-Billing — Full Task Guide (Tasks 1–14)

> Location: `doc/newly-improvement.md`
> This document details **all 14 tasks**: objective, what was implemented (files),
> the design reasoning, how to test (automated commands + manual demo), and
> verification status. Tasks **1–8 and 10** were completed in prior sessions and
> verified against the current codebase. Tasks **11, 12, 13, 14** were
> implemented this session. **Task 9 (Vision)** is not yet started (intentionally
> last) — its plan is included.
> Stack: `backend/` (Node + Express + TS + Mongoose, ESM), `frontend/` (React +
> Vite + Vitest), `mobile/` (Expo / React Native + Zustand).

## Status at a glance

| # | Task | Status |
|---|------|--------|
| 1 | Extend ProductService for full product fields | ✅ Done (prior) |
| 2 | Clearance price in SupermarketDomain & CartService | ✅ Done (prior) |
| 3 | Admin product form — extended fields (web) | ✅ Done (prior) |
| 4 | Shopping page — product detail panel & clearance badge (web) | ✅ Done (prior) |
| 5 | Mobile product detail bottom sheet | ✅ Done (prior) |
| 6 | Backend auth — profile endpoint & session cancellation | ✅ Done (prior) |
| 7 | React AuthContext & route guards (web) | ✅ Done (prior) |
| 8 | Store manager assignment UI (web) | ✅ Done (prior) |
| 9 | Vision service — Google Cloud Vision | ⏳ Not started (last) |
| 10 | PDF report export | ✅ Done (prior) |
| 11 | Loyalty/bounty backend (User schema + API) | ✅ Done (this session) |
| 12 | Loyalty/bounty UI — web and mobile | ✅ Done (this session)* |
| 13 | Mobile shared component library | ✅ Done (this session)* |
| 14 | Session cancel UI — web and mobile | ✅ Done (this session) |

\* Implementation complete; mobile snapshot tests outstanding (no mobile test runner yet).

## How to run the automated suites
```powershell
# Backend (Vitest + in-memory MongoDB)
cd backend
npm test                                            # all backend tests
npx vitest run src/tests/ProductService.test.ts      # Task 1
npx vitest run src/tests/SupermarketDomain.test.ts   # Task 2
npx vitest run src/tests/SessionService.test.ts      # Task 6
npx vitest run src/tests/BountyService.test.ts       # Task 11
npx tsc --noEmit

# Frontend (Vitest + jsdom + Testing Library)
cd frontend
npm test                                            # all frontend tests
npx vitest run src/services/sessionApi.test.ts       # Task 14
npm run typecheck

# Mobile (no test runner configured yet)
cd mobile
npm run typecheck
```

---

# Phase A — Extended Product Data (Tasks 1–5)

## Task 1 — Extend ProductService & ProductController for full product fields

**Objective:** make create/update read/write all extended schema fields and
expose full-detail endpoints.

**What's implemented:**
- `backend/src/services/ProductService.ts`
  - `createProduct(data)` maps **all extended fields** to `Product.create`:
    wayfinding (`aisle`, `shelf`, `bay`, `mapCoordinates`), nutrition
    (`nutriScore`, `allergens`, `dietaryFlags`, `calories`), clearance
    (`expiryDate`, `clearanceDiscountPercent`). Validates clearance 0–100 and
    rejects duplicate barcodes.
  - `updateProduct(id, data)` forwards the whole payload via
    `findByIdAndUpdate(id, data, { new: true, runValidators: true })` and
    re-validates clearance 0–100.
  - `getProductWithFullDetail(id)` and `getProductDetailByBarcode(barcode)`
    (with a prefix-match fallback) return a single product with all extended
    fields.
- **Routes:** admin `GET /api/v1/inventory/products/:id` and public
  `GET /api/products/:barcode/detail`.

**Why:** the extended fields already existed in the schema with defaults, so
omitting them was "safe" but they were never persisted. Explicit per-field
mapping (not a blind spread) keeps unknown keys out; clearance validation in
both paths prevents invalid markdowns.

**How to test:**
- Automated: `npx vitest run src/tests/ProductService.test.ts` (create/update
  with extended fields and clearance validation).
- Manual: `GET /api/products/8901/detail` returns `nutriScore`, `allergens`,
  `aisle`, `shelf`, `calories`, `expiryDate`, `clearanceDiscountPercent`; setting
  `clearanceDiscountPercent: 110` on create/update → 400.

---

## Task 2 — Clearance price calculation in SupermarketDomain & CartService

**Objective:** apply a time-gated clearance discount automatically in cart and
checkout.

**What's implemented:**
- `backend/src/utils/SupermarketDomain.ts` — `BarcodeEngine.effectivePrice(product)`
  returns `price * (1 - clearanceDiscountPercent/100)` **only when**
  `clearanceDiscountPercent > 0` **and** `expiryDate` is within 7 days;
  otherwise returns `price`. (`CLEARANCE_WINDOW_DAYS = 7`.)
- `backend/src/services/CartService.ts` — `addItemToCart` and
  `updateItemQuantity` use `effectivePrice(product)` instead of `product.price`.
- `backend/src/services/CheckoutService.ts` — `processCheckout` computes
  `unitPrice = effectivePrice(product)` and flags `clearanceApplied` per line.
- `backend/src/models/Order.ts` — `IOrderItemSnapshot` gained
  `clearanceApplied?: boolean` so receipts can flag discounted items.

**Why:** one central time-gated rule means the cart and final bill always agree;
the `clearanceApplied` snapshot makes the discount visible on the receipt even
after the product record changes later.

**How to test:**
- Automated: `npx vitest run src/tests/SupermarketDomain.test.ts` (no discount;
  20% + 3-day expiry → applies; 20% + 10-day expiry → does not apply; 20% + no
  expiry → does not apply).
- Manual: create a product with `clearanceDiscountPercent: 20` and `expiryDate`
  2 days ahead → the cart line total shows the 20% reduction; checkout confirms
  the same discounted total with `clearanceApplied: true`.

---

## Task 3 — Admin product form — extended fields UI (web)

**Objective:** the admin create/edit product modal gains inputs for all extended
attributes.

**What's implemented:**
- `frontend/src/pages/AdminDashboardPage.tsx` — create and edit panels add
  aisle, shelf, bay, **Nutri-Score** (select A–E), allergens (comma-separated →
  array), dietaryFlags (comma-separated → array), calories, expiryDate (date),
  and clearanceDiscountPercent (0–100 number). Comma strings are split to arrays
  on submit. Product rows show a **"CLEARANCE N%"** badge when
  `clearanceDiscountPercent > 0`.
- `frontend/src/services/adminApi.ts` — `createProductAdmin` /
  `updateProductAdmin` POST/PATCH the full payload (including extended fields)
  to `/api/products`.

**Why:** the form mirrors the schema 1:1; array fields as comma-separated text
keep the UI simple while the API receives clean arrays; the badge gives instant
visual confirmation of markdowns.

**How to test:**
- Manual: Admin → Inventory, create a product with NutriScore C, allergen
  "Gluten", clearance 15%, near expiry → the row shows a "CLEARANCE 15%" badge;
  editing it preserves all extended fields.

---

## Task 4 — Shopping page — product detail panel & clearance badge (web)

**Objective:** shoppers see nutrition, wayfinding, and clearance status while
scanning.

**What's implemented:**
- `frontend/src/pages/ShoppingPage.tsx` — after a scan/manual add, fetches
  `GET /api/products/:barcode/detail` and shows a **slide-in product detail
  card** that auto-dismisses after 4s. Renders: a color-coded Nutri-Score chip
  (A=green … E=red via `nutriScoreColor`), calories, allergen pills, diet pills,
  location (`aisle · shelf · Bay N`), and a clearance banner with expiry when set.

**Why:** the detail fetch is decoupled/best-effort — a failure never blocks the
cart add; auto-dismiss keeps scanning unobstructed.

**How to test:**
- Manual: scan barcode 8901 (Amul milk) → the detail card slides in showing
  Nutri-Score, allergens, location, and a clearance banner if applicable.

---

## Task 5 — Mobile shopping screen — product detail bottom sheet

**Objective:** mirror the product detail panel on mobile.

**What's implemented:**
- `mobile/src/components/ProductDetailSheet.tsx` — a bottom-sheet `Modal`
  showing nutriScore, allergens, dietaryFlags, calories, aisle/shelf/bay, and a
  clearance banner. (Now uses the shared `NutriScoreBadge` from Task 13.)
- `mobile/src/utils/nutriScore.ts` — `nutriScoreColor` (A→#22c55e … E→#ef4444)
  and `nutriScoreLabel`.
- `mobile/src/screens/ShoppingScreen.tsx` — after a successful barcode add,
  fetches the product detail and opens `ProductDetailSheet`.

**How to test:**
- Manual: scan barcode 8903 on mobile → a bottom sheet slides up showing
  "Fresh Shimla Royal Apples, NutriScore B, Produce, Aisle 1 / Shelf A".

---

# Phase B — Auth Layer (Tasks 6–8)

## Task 6 — Backend auth: profile endpoint & session cancellation

**Objective:** add a user profile-update endpoint and a session-cancellation
route.

**What's implemented:**
- `backend/src/models/User.ts` — `phone` and `dietaryPreferences`
  (`allergens[]`, `diet[]`) are real Mongoose schema fields (were on the TS
  interface only).
- `backend/src/services/AuthService.ts` + **routes** —
  `PATCH /api/v1/auth/profile` (auth) updates name/phone/dietaryPreferences.
- `backend/src/services/SessionService.ts` — `cancelSession(code, cancelledBy,
  actorRole)` sets status `CANCELLED`, broadcasts `SESSION_CANCELLED` via
  `sessionSyncService`, and writes an audit log.
- `backend/src/controllers/sessionController.ts` + **routes** —
  `DELETE /api/sessions/:code` (auth + role guard) → `sessionController.cancel`.
  *(Task 14, this session, relaxed the guard to include `customer` and threaded
  the real `actorRole` into the audit log.)*

**How to test:**
- Automated: `npx vitest run src/tests/SessionService.test.ts` (cancel on
  ACTIVE / COMPLETED / non-existent sessions).
- Manual: worker `DELETE /api/sessions/:code` → status `CANCELLED`; any
  connected SSE client receives `SESSION_CANCELLED`. `PATCH /auth/profile`
  updates name/phone/dietary prefs.

---

## Task 7 — React AuthContext & route guards (web)

**Objective:** add a proper auth layer so role-sensitive routes require a valid
JWT, with a dedicated `/login` page.

**What's implemented:**
- `frontend/src/context/AuthContext.tsx` — `{ user, token, isAuthenticated,
  login, logout }`, initialized from `sessionStorage` via `getStoredUser()`/
  `getStoredToken()`.
- `frontend/src/components/ProtectedRoute.tsx` — redirects to `/login` when
  unauthenticated, or `/join` when the role doesn't match.
- `frontend/src/pages/LoginPage.tsx` — email/password form with role-aware
  redirect (admin→`/admin`, worker→`/worker`, customer→`/join`).
- `frontend/src/App.tsx` — wraps the router in `AuthProvider`; adds `/login`;
  applies `ProtectedRoute` to `/worker`, `/admin`, `/inventory`, `/stores`,
  `/reports`; NavBar shows a logout button when authenticated.
- `frontend/src/pages/CustomerHistoryPage.tsx` — uses `GET /api/v1/orders/mine`
  when a JWT is present.

**How to test:**
- Manual: visit `/admin` unauthenticated → redirected to `/login`; log in as
  admin → `/admin`; as worker → `/worker`; logout clears the session.

---

## Task 8 — Store manager assignment UI (web)

**Objective:** expose the existing `POST /api/v1/stores/:id/assign-manager`
endpoint in the Store Management page.

**What's implemented:**
- `frontend/src/pages/StoreManagementPage.tsx` — "Assign Manager" /
  "Change Manager" button (admin only) opens a dropdown of workers;
  `handleAssignManager` calls `storeApi.assignManager(storeId, userId)` and
  updates the card to show the manager's name.
- `frontend/src/services/storeApi.ts` — `assignManager(storeId, userId)` →
  `POST /api/v1/stores/:id/assign-manager`.

**How to test:**
- Manual: Admin → Stores → "Assign Manager" on a store → pick a worker → the
  card shows "Manager: <name>".

---

# Phase C — Service Stubs (Task 10; Task 9 pending)

## Task 9 — Vision service — Google Cloud Vision integration (NOT STARTED)

**Objective:** implement `VisionService.decodeBarcodeFromBuffer` using Google
Cloud Vision (or AWS Rekognition) when `VISION_API_ENABLED=true`, and gate the
frontend cloud-decode button behind a status check.

**Planned implementation (to do last):**
- Install `@google-cloud/vision` and `@aws-sdk/client-rekognition` in the
  backend (the earlier install was interrupted — must verify/redo).
- In `VisionService.decodeBarcodeFromBuffer`: if `VISION_PROVIDER=google`,
  create an `ImageAnnotatorClient` (using `GOOGLE_APPLICATION_CREDENTIALS`) and
  call `client.textDetection({ image: { content: buffer.toString("base64") } })`.
  Parse `barcodeAnnotations` first (if present), then fall back to
  `textAnnotations` filtered for 8–14 digit strings matching the barcode regex.
  If `VISION_PROVIDER=aws`, use `@aws-sdk/client-rekognition` `DetectText` as an
  alternative. Use **dynamic `import()` per provider** so only the configured SDK
  is loaded (branch guard).
- Refactor `VisionService` to read `VISION_API_ENABLED`/`VISION_PROVIDER` at
  call time (not in the constructor) so tests can set env per test.
- Add `GET /api/v1/vision/status` → `{ enabled: boolean, provider: string }`
  (new `status` handler + route).
- Update `backend/.env.example` with clear instructions for both providers.
- In `frontend/src/services/visionApi.ts`, add `getVisionStatus()`; show the
  cloud-decode button only when `enabled: true` (remove the always-failing
  unconditional call).

**Planned tests:**
- Backend Vitest with a mocked `ImageAnnotatorClient`: a valid barcode in
  `textAnnotations` returns `{ barcode: "8901234567890", format: "EAN_13",
  confidence: 0.98 }`; an empty response throws.

**Planned demo:** with `VISION_API_ENABLED=true` and valid credentials,
uploading a barcode image to `POST /api/v1/vision/decode` returns the decoded
barcode string.

---

## Task 10 — PDF report export

**Objective:** produce a real PDF daily report.

**What's implemented:**
- `backend/src/services/ReportService.ts` — `exportToPdf(storeId, start, end)`
  builds an A4 `PDFDocument` (pdfkit) with a header + period, summary KPIs, a
  daily revenue table (date/orders/revenue/tax), a category breakdown section,
  and a top-5 peak-hours summary; resolves a `Buffer` on `doc.end`.
- `backend/src/controllers/ReportController.ts` + **routes** —
  `GET /api/v1/reports/export/pdf` sets `Content-Type: application/pdf` and
  `Content-Disposition: attachment; filename="freshmart-report-…pdf"`.
- `frontend/src/pages/ReportsPage.tsx` + `frontend/src/services/reportApi.ts` —
  an "Export PDF" button alongside "Export CSV"; `exportPdf()` returns a `Blob`
  downloaded as `freshmart-report-{start}-{end}.pdf`.
- `pdfkit` (+ `@types/pdfkit`) is installed.

**How to test:**
- Manual: Admin → Reports → "Export PDF" → the browser downloads
  `freshmart-report-…pdf` with a readable daily revenue table.

---

# Phase D — Loyalty/Bounty + Mobile Library (Tasks 11–14)

## Task 11 — Loyalty/bounty backend (User schema + API)

**Objective:** persist and manage Fresh Points and wallet balance on customer
accounts.

**Situation on entry:** most of this backend already existed — `User` schema had
`bountyPoints`/`bountyWalletBalance`; `CheckoutService.confirmPayment` already
awarded points (1/₹10, ₹0.50/point) with a `BOUNTY_EARNED` audit log;
`AuthService.getProfile`/`redeemBounty` and `GET /api/v1/auth/profile` existed.
This session filled the **genuine gaps**.

**What's implemented (this session):**
- `backend/src/controllers/AuthController.ts` — added the `redeemBounty` handler
  (reads `req.body.pointsToRedeem`, calls `authService.redeemBounty`, returns
  the result; 400 on error).
- `backend/src/routes/authRoutes.ts` — imported `requireRole`; registered
  `POST /redeem-bounty` with `authenticateToken` + `requireRole("customer")`.
- `backend/src/tests/BountyService.test.ts` — **new** integration test.

**Why:**
- Awarding only fires when `order.customerId` is set (an authenticated customer
  joined the session) — anonymous walk-ins earn nothing.
- `confirmPayment` early-returns when already `PAID`, so a second confirm never
  re-awards points or re-decrements stock (idempotent).
- Redemption is customer-only; each point removes 1 point + ₹0.50 wallet (floor 0).

**How to test:**
- Automated: `npx vitest run src/tests/BountyService.test.ts` → **4/4 pass**
  (₹500→50pts/₹25wallet + audit; idempotent; redeem-more-throws; valid redeem +
  audit).
- Manual: confirm a ₹500 paid order as a customer → `GET /auth/profile` shows
  `bountyPoints: 50, bountyWalletBalance: 25`; `POST /redeem-bounty`
  `{ pointsToRedeem: 10 }` → `40 / 20 / 10 / 5`; over-redeem → 400.

**Verification:** backend `npx tsc --noEmit` clean; `BountyService.test.ts` 4/4 pass.

---

## Task 12 — Loyalty/bounty UI (web + mobile)

**Objective:** show Fresh Points earned after checkout and the wallet balance in
the customer's profile.

**What's implemented — Web (this session):**
- `frontend/src/services/authApi.ts` — `getProfile()` → `GET /auth/profile` and
  `redeemBounty(points)` → `POST /auth/redeem-bounty` (both with auth headers);
  added `CustomerProfile`/`RedeemBountyResult` types.
- `frontend/src/components/DigitalBillModal.tsx`(+`.css`) — optional
  `pointsEarned`/`walletBalance` props + a **"Points Earned"** section below the
  total.
- `frontend/src/pages/CustomerHistoryPage.tsx`(+`.css`) — profile fetch + a
  **bounty wallet card** at the top; passes points into the bill modal for PAID
  orders.

**What's implemented — Mobile (this session):**
- `mobile/src/types/index.ts` — `CustomerProfile`, `RedeemBountyResult`; `Profile`
  in `RootStackParamList`.
- `mobile/src/services/authApi.ts` — `getProfile()` and `redeemBounty(points)`.
- `mobile/src/screens/ProfileScreen.tsx` — **new** (identity, Fresh Points +
  wallet, redeem control + 10/25/50 chips, logout).
- `mobile/src/navigation/RootNavigator.tsx` — registered the `Profile` screen.
- `mobile/src/screens/ReceiptScreen.tsx` — PAID orders show a **"🏆 You earned N
  Fresh Points! Wallet: ₹X.XX"** banner; header 👤 + body "Profile & Fresh
  Points" button.
- `mobile/src/screens/HistoryScreen.tsx` — header 👤 → `Profile`.

**Why:** points-earned is derived client-side as `Math.floor(totalAmount/10)`
(same as the backend award) so the banner needs no extra round-trip; the wallet
figure comes from the fetched profile. Profile is reachable via a header 👤
icon on History and Receipt (plus a visible body button on Receipt).

**How to test:**
- Automated (types): `cd frontend; npm run typecheck` ✅; `cd mobile; npm run
  typecheck` ✅ (mobile ProfileScreen snapshot test outstanding — no runner).
- Manual: Web — complete a paid order → My Bills → wallet card + bill "Points
  Earned". Mobile — ₹300 purchase → "You earned 30 Fresh Points"; tap Profile →
  redeem 10 → −10 pts/₹5.

---

## Task 13 — Mobile shared component library

**Objective:** extract duplicated inline UI into reusable components.

**What's implemented (this session):**
- New components: `AppButton` (variant primary/secondary/danger + `loading` →
  `ActivityIndicator`), `AppInput` (label/error/secureTextEntry), `CartItemRow`
  (editable stepper + read-only), `OrderCard` (absorbed `STATUS_COLORS`),
  `NutriScoreBadge` (colored grade badge + label), plus `theme/colors.ts`.
- Refactors (UI-only, output identical): `ShoppingScreen`, `CartReviewScreen`,
  `HistoryScreen`, `ProductDetailSheet` now use the shared components.

**Why:** `CartItemRow` carries both style sets and switches on `editable` so
each screen stays byte-identical — pure extraction, no behavior change.
`theme/colors.ts` centralizes the palette; existing screens intentionally
weren't refactored to use it (out of scope/risk).

**How to test:**
- Automated (types): `cd mobile; npm run typecheck` ✅ (component snapshots
  outstanding — no runner).
- Manual: Shopping / Cart Review / History / Product sheet all look identical;
  `mobile/src/components/` now has 5 documented reusable components.

---

## Task 14 — Session cancel UI (web + mobile)

**Objective:** let workers and customers cancel an active session so the backend
marks it `CANCELLED` and connected customers are sent back to the QR scanner.

**What's implemented — Backend (this session, small):**
- `backend/src/routes/sessionRoutes.ts` — `DELETE /api/sessions/:code` guard →
  `requireRole("worker","admin","customer")`.
- `backend/src/controllers/sessionController.ts` — `cancel` passes
  `req.user?.role`.
- `backend/src/services/SessionService.ts` — `cancelSession(code, cancelledBy,
  actorRole = "worker")` writes the audit log with the real role (was hardcoded
  `"worker"`). (Existing cancel already set `CANCELLED` + broadcast
  `SESSION_CANCELLED`.)

**What's implemented — Web (this session):**
- `frontend/src/services/sessionApi.ts` — `cancelSession(code)` (auth headers).
- `frontend/src/pages/WorkerDashboardPage.tsx`(+`.css`) — "Cancel Session" button
  on ACTIVE rows → confirm → remove + toast.
- `frontend/src/App.tsx` — `ShopRoute` `onLeaveSession` best-effort calls
  `cancelSession` (anonymous web customer 401s, handled gracefully).
- `frontend/src/services/sessionApi.test.ts` — **new** Vitest test.

**What's implemented — Mobile (this session):**
- `mobile/src/services/sessionApi.ts` — `cancelSession(code)`.
- `mobile/src/screens/ShoppingScreen.tsx` — "Leave" header button → confirm →
  cancel + `clearCart()` + `clearSession()` → reset to QRScan; **and** a
  `SESSION_CANCELLED` SSE listener (long-poll) that auto-navigates the customer
  back when the worker cancels.

**Why:** mobile customers are authenticated, so including `customer` lets their
Leave actually cancel server-side; web customers may be anonymous, so Leave is
best-effort (always clears + navigates). The audit now records the real role.
The ShoppingScreen long-polls the session stream and, on `SESSION_CANCELLED`,
alerts and resets to QRScan.

**How to test:**
- Automated: `cd frontend; npx vitest run src/services/sessionApi.test.ts` →
  **2/2 pass** (DELETE + Bearer header + credentials; 404 throws).
- Automated (types): backend ✅, frontend ✅, mobile ✅.
- Manual: worker Cancel on an ACTIVE row → row disappears + toast; connected
  mobile customer is alerted and sent to QRScan; mobile Shopping → Leave →
  cancel + clear + QRScan.

---

## Overall verification (this session)

| Area | Command | Result |
|------|---------|--------|
| Backend types | `cd backend; npx tsc --noEmit` | ✅ clean |
| Backend tests | `cd backend; npm test` | ✅ (BountyService 4/4 + existing suites) |
| Frontend types | `cd frontend; npm run typecheck` | ✅ clean |
| Frontend tests | `cd frontend; npm test` | ✅ (sessionApi 2/2 + existing suites) |
| Mobile types | `cd mobile; npm run typecheck` | ✅ clean |

## Known limitations / next steps
- **Mobile tests (Tasks 12 & 13):** no test runner configured (no
  jest/jest-expo/@testing-library/react-native). Snapshot tests for
  `ProfileScreen` and the five components need a one-time test-stack setup;
  components are written to be testable.
- **Task 9 (Vision):** not started — comes next/last. The earlier
  `npm install @google-cloud/vision @aws-sdk/client-rekognition` was interrupted
  and may not have completed; verify/redo the install when starting Task 9.
