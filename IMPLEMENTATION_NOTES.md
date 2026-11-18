# Fresh Mart Self-Billing — Full Implementation, Testing & Explanation Guide (Tasks 1–14)

This document explains **every task (1–14)**: what was implemented, the design
behind it, how to test it (automated commands + manual demo), and its
verification status. Tasks **1–8 and 10** were completed in prior sessions and
have been verified against the current codebase. Tasks **11, 12, 13, 14** were
implemented this session. **Task 9 (Vision) is not yet started** (intentionally
last).

> Stack: `backend/` (Node + Express + TS + Mongoose, ESM), `frontend/` (React +
> Vite + Vitest), `mobile/` (Expo / React Native + Zustand).

## Status at a glance

| # | Task | Status |
|---|------|--------|
| 1 | Extend ProductService/ProductController for full product fields | ✅ Done (prior) |
| 2 | Clearance price in SupermarketDomain & CartService | ✅ Done (prior) |
| 3 | Admin product form — extended fields (web) | ✅ Done (prior) |
| 4 | Shopping page — product detail panel & clearance badge (web) | ✅ Done (prior) |
| 5 | Mobile shopping screen — product detail bottom sheet | ✅ Done (prior) |
| 6 | Backend auth — profile endpoint & session cancellation | ✅ Done (prior) |
| 7 | React AuthContext & route guards (web) | ✅ Done (prior) |
| 8 | Store manager assignment UI (web) | ✅ Done (prior) |
| 9 | Vision service — Google Cloud Vision | ⏳ Pending (last) |
| 10 | PDF report export | ✅ Done (prior) |
| 11 | Loyalty/bounty backend (User schema + API) | ✅ Done (this session) |
| 12 | Loyalty/bounty UI — web and mobile | ✅ Done (this session)* |
| 13 | Mobile shared component library | ✅ Done (this session)* |
| 14 | Session cancel UI — web and mobile | ✅ Done (this session) |

\* Implementation complete; mobile snapshot tests outstanding (no mobile test runner yet).

---

## How to run the automated suites

```powershell
# Backend (Vitest + in-memory MongoDB)
cd backend
npm test                      # runs all backend tests
npx vitest run src/tests/BountyService.test.ts          # Task 11
npx vitest run src/tests/ProductService.test.ts         # Task 1
npx vitest run src/tests/SupermarketDomain.test.ts      # Task 2
npx vitest run src/tests/SessionService.test.ts         # Task 6
npx tsc --noEmit              # type-check

# Frontend (Vitest + jsdom + Testing Library)
cd frontend
npm test                      # runs all frontend tests
npx vitest run src/services/sessionApi.test.ts          # Task 14
npm run typecheck             # tsc -b

# Mobile (no test runner configured yet)
cd mobile
npm run typecheck             # tsc --noEmit
```

---

# Phase A — Extended Product Data (Tasks 1–5)

## Task 1 — Extend ProductService & ProductController for full product fields

### What's implemented
- **`backend/src/services/ProductService.ts`**
  - `createProduct(data)` passes **all extended fields** to `Product.create`:
    wayfinding (`aisle`, `shelf`, `bay`, `mapCoordinates`), nutrition
    (`nutriScore`, `allergens`, `dietaryFlags`, `calories`), and clearance
    (`expiryDate`, `clearanceDiscountPercent`). It validates
    `clearanceDiscountPercent` is 0–100 and rejects duplicate barcodes.
  - `updateProduct(id, data)` forwards the whole `data` object via
    `findByIdAndUpdate(id, data, { new: true, runValidators: true })` and
    re-validates clearance 0–100.
  - `getProductWithFullDetail(id)` and `getProductDetailByBarcode(barcode)`
    return a single product with all extended fields (with a prefix-match
    fallback on barcode).
- **Routes**: admin detail `GET /api/v1/inventory/products/:id` and public
  detail `GET /api/products/:barcode/detail` expose the full detail objects.

### Explanation
The extended fields already existed in the `Product` schema with defaults, so
omitting them was "safe" but meant they were never persisted. The fix is to
explicitly map each extended field in `createProduct` (rather than spread
`data` blindly) so unknown/empty values don't leak, while `updateProduct` can
safely forward the whole payload (Mongoose ignores non-schema keys).
Clearance validation lives in both methods so an invalid value can't be written
via either path.

### How to test
- **Automated:** `npx vitest run src/tests/ProductService.test.ts` (covers
  create/update with extended fields and clearance validation).
- **Manual demo:** `GET /api/products/8901/detail` returns `nutriScore`,
  `allergens`, `aisle`, `shelf`, `calories`, `expiryDate`,
  `clearanceDiscountPercent` alongside core fields. Setting
  `clearanceDiscountPercent: 110` on create/update returns a 400.

---

## Task 2 — Clearance price calculation in SupermarketDomain & CartService

### What's implemented
- **`backend/src/utils/SupermarketDomain.ts`** — `BarcodeEngine.effectivePrice(product)`
  returns `price * (1 - clearanceDiscountPercent/100)` **only when**
  `clearanceDiscountPercent > 0` **and** `expiryDate` is within 7 days;
  otherwise returns the standard `price`. (`CLEARANCE_WINDOW_DAYS = 7`.)
- **`backend/src/services/CartService.ts`** — `addItemToCart` and
  `updateItemQuantity` use `effectivePrice(product)` instead of `product.price`.
- **`backend/src/services/CheckoutService.ts`** — `processCheckout` computes
  `unitPrice = SupermarketDomain.BarcodeEngine.effectivePrice(product)` and
  flags `clearanceApplied` per line.
- **`backend/src/models/Order.ts`** — `IOrderItemSnapshot` gained
  `clearanceApplied?: boolean` so receipts can flag discounted items.

### Explanation
Clearance is a *time-gated* discount: a 20%-off product is only discounted while
it's near expiry (≤7 days). Centralizing the rule in `effectivePrice` means the
cart and checkout can't drift — both call the same function, so the scanned
cart total and the final bill always agree. The `clearanceApplied` snapshot on
each order item makes the discount visible on the receipt even after the product
record changes later.

### How to test
- **Automated:** `npx vitest run src/tests/SupermarketDomain.test.ts` (unit
  tests `effectivePrice`: no discount; 20% + 3-day expiry → applies; 20% +
  10-day expiry → does not apply; 20% + no expiry → does not apply).
- **Manual demo:** Create a product with `clearanceDiscountPercent: 20` and
  `expiryDate` 2 days ahead. Add it to a cart — the line total reflects the 20%
  reduction; checkout confirms the same discounted total with `clearanceApplied: true`.

---

## Task 3 — Admin product form — extended fields UI (web)

### What's implemented
- **`frontend/src/pages/AdminDashboardPage.tsx`** — the create and edit product
  panels have fields for aisle, shelf, bay, **Nutri-Score** (select A–E),
  allergens (comma-separated → array), dietaryFlags (comma-separated → array),
  calories, expiryDate (date input), and clearanceDiscountPercent (0–100
  number). Comma-separated strings are parsed to arrays on submit. Product rows
  show a **"CLEARANCE N%"** badge when `clearanceDiscountPercent > 0`.
- **`frontend/src/services/adminApi.ts`** — `createProductAdmin` /
  `updateProductAdmin` POST/PATCH the full payload (including extended fields)
  to `/api/products`.

### Explanation
The admin form mirrors the backend schema 1:1. Array fields are entered as
comma-separated text and split on submit (with empty/whitespace filtered) so the
UI stays simple while the API receives clean arrays. The clearance badge gives
instant visual confirmation that a product is on markdown.

### How to test
- **Manual demo:** Admin → Inventory, create a product with NutriScore C,
  allergen "Gluten", clearance 15%, and a near expiry date → the product row
  shows a "CLEARANCE 15%" badge; editing it preserves all extended fields.

---

## Task 4 — Shopping page — product detail panel & clearance badge (web)

### What's implemented
- **`frontend/src/pages/ShoppingPage.tsx`** — after a scan/manual add, it
  fetches `GET /api/products/:barcode/detail` and shows a **slide-in product
  detail card** that auto-dismisses after 4s. It renders: a color-coded
  Nutri-Score chip (A=green … E=red via `nutriScoreColor`), calories, allergen
  pills, diet pills, location (`aisle · shelf · Bay N`), and a clearance banner
  with expiry when applicable.

### Explanation
The detail panel is best-effort: a failed detail fetch is ignored so scanning
still adds the item to the cart (the cart add and the detail fetch are
decoupled). Auto-dismiss keeps the scanning flow unobstructed. Clearance is
shown to the shopper so they understand why an item is discounted.

### How to test
- **Manual demo:** Scan barcode 8901 (Amul milk). The detail card slides in
  showing Nutri-Score, allergens, location, and a clearance banner if set.

---

## Task 5 — Mobile shopping screen — product detail bottom sheet

### What's implemented
- **`mobile/src/components/ProductDetailSheet.tsx`** — a bottom-sheet `Modal`
  showing nutriScore, allergens, dietaryFlags, calories, aisle/shelf/bay, and a
  clearance banner. (Now uses the shared `NutriScoreBadge` from Task 13.)
- **`mobile/src/utils/nutriScore.ts`** — `nutriScoreColor` (A→#22c55e … E→#ef4444)
  and `nutriScoreLabel`.
- **`mobile/src/screens/ShoppingScreen.tsx`** — after a successful barcode add,
  fetches the product detail and opens `ProductDetailSheet`.

### How to test
- **Manual demo:** Scan barcode 8903 on mobile → bottom sheet slides up showing
  "Fresh Shimla Royal Apples, NutriScore B, Produce, Aisle 1 / Shelf A".

---

# Phase B — Auth Layer (Tasks 6–8)

## Task 6 — Backend auth: profile endpoint & session cancellation

### What's implemented
- **`backend/src/models/User.ts`** — `phone` and `dietaryPreferences`
  (`allergens[]`, `diet[]`) are real Mongoose schema fields (were on the TS
  interface only).
- **`backend/src/services/AuthService.ts`** + **routes** —
  `PATCH /api/v1/auth/profile` (auth) updates name/phone/dietaryPreferences.
- **`backend/src/services/SessionService.ts`** — `cancelSession(code,
  cancelledBy, actorRole)` sets status `CANCELLED`, broadcasts
  `SESSION_CANCELLED` via `sessionSyncService`, and writes an audit log.
- **`backend/src/controllers/sessionController.ts`** + **routes** —
  `DELETE /api/sessions/:code` (auth + role guard) → `sessionController.cancel`.

> This session (Task 14) relaxed the guard to `requireRole("worker","admin",
> "customer")` and threaded the real `actorRole` into the audit log.

### How to test
- **Automated:** `npx vitest run src/tests/SessionService.test.ts` (covers
  cancel on ACTIVE / COMPLETED / non-existent sessions).
- **Manual demo:** Worker `DELETE /api/sessions/:code` → status `CANCELLED`;
  any connected SSE client receives `SESSION_CANCELLED`. `PATCH /auth/profile`
  updates name/phone/dietary prefs.

---

## Task 7 — React AuthContext & route guards (web)

### What's implemented
- **`frontend/src/context/AuthContext.tsx`** — `{ user, token, isAuthenticated,
  login, logout }`, initialized from `sessionStorage` via existing
  `getStoredUser()`/`getStoredToken()`.
- **`frontend/src/components/ProtectedRoute.tsx`** — redirects to `/login` when
  unauthenticated, or `/join` when the role doesn't match.
- **`frontend/src/pages/LoginPage.tsx`** — email/password form with role-aware
  redirect (admin→`/admin`, worker→`/worker`, customer→`/join`).
- **`frontend/src/App.tsx`** — wraps the router in `AuthProvider`; adds
  `/login`; applies `ProtectedRoute` to `/worker`, `/admin`, `/inventory`,
  `/stores`, `/reports`; NavBar shows a logout button when authenticated.
  `CustomerHistoryPage` uses `GET /api/v1/orders/mine` when a JWT is present.

### How to test
- **Manual demo:** visit `/admin` unauthenticated → redirected to `/login`; log
  in as admin → `/admin`; as worker → `/worker`; logout clears the session.

---

## Task 8 — Store manager assignment UI (web)

### What's implemented
- **`frontend/src/pages/StoreManagementPage.tsx`** — "Assign Manager" / "Change
  Manager" button (admin only) opens a dropdown of workers; `handleAssignManager`
  calls `storeApi.assignManager(storeId, userId)` and updates the card to show
  the manager's name.
- **`frontend/src/services/storeApi.ts`** — `assignManager(storeId, userId)` →
  `POST /api/v1/stores/:id/assign-manager`.

### How to test
- **Manual demo:** Admin → Stores → "Assign Manager" on a store → pick a worker
  → card shows "Manager: <name>".

---

# Phase C — Service Stubs (Task 10; Task 9 pending)

## Task 10 — PDF report export

### What's implemented
- **`backend/src/services/ReportService.ts`** — `exportToPdf(storeId, start,
  end)` builds an A4 `PDFDocument` (pdfkit) with a header + period, summary KPIs,
  a daily revenue table (date/orders/revenue/tax), a category breakdown section,
  and a top-5 peak-hours summary; resolves a `Buffer` on `doc.end`.
- **`backend/src/controllers/ReportController.ts`** + **routes** —
  `GET /api/v1/reports/export/pdf` sets `Content-Type: application/pdf` and
  `Content-Disposition: attachment; filename="freshmart-report-…pdf"`.
- **`frontend/src/pages/ReportsPage.tsx`** + **`services/reportApi.ts`** — an
  "Export PDF" button alongside "Export CSV"; `exportPdf()` returns a `Blob`
  downloaded as `freshmart-report-{start}-{end}.pdf`.
- `pdfkit` (+ `@types/pdfkit`) is installed.

### How to test
- **Manual demo:** Admin → Reports → "Export PDF" → browser downloads
  `freshmart-report-…pdf` with a readable daily revenue table.

---

# Phase D — Loyalty/Bounty + Mobile Library (Tasks 11–14)

## Task 11 — Loyalty/bounty backend

### What's implemented (this session — the genuine gaps)
- **`backend/src/controllers/AuthController.ts`** — added `redeemBounty` handler.
- **`backend/src/routes/authRoutes.ts`** — `POST /redeem-bounty` with
  `authenticateToken` + `requireRole("customer")`.
- **`backend/src/tests/BountyService.test.ts`** — **new** integration test.

> Pre-existing: `User` schema `bountyPoints`/`bountyWalletBalance`;
> `CheckoutService.confirmPayment` already awards 1 point/₹10 (₹0.50/point)
> with a `BOUNTY_EARNED` audit log; `AuthService.getProfile`/`redeemBounty` and
> `GET /api/v1/auth/profile` already existed.

### Explanation
- Awarding only fires when `order.customerId` is set (authenticated customer
  joined the session) — anonymous walk-ins earn nothing.
- `confirmPayment` returns early when already `PAID`, so a second confirm never
  re-awards points or re-decrements stock (idempotent).
- Redemption is customer-only; each point removes 1 point + ₹0.50 wallet (floor 0).

### How to test
- **Automated:** `npx vitest run src/tests/BountyService.test.ts` → **4/4 pass**
  (₹500→50pts/₹25wallet; idempotent; redeem-more-throws; valid redeem + audit).
- **Manual:** confirm a ₹500 paid order as a customer → `GET /auth/profile`
  shows `bountyPoints: 50, bountyWalletBalance: 25`; `POST /redeem-bounty`
  `{ pointsToRedeem: 10 }` → `40 / 20 / 10 / 5`; over-redeem → 400.

---

## Task 12 — Loyalty/bounty UI (web + mobile)

### What's implemented (this session)
- **Web:** `authApi.ts` `getProfile()`/`redeemBounty()`; `DigitalBillModal`
  "Points Earned" section (`pointsEarned`/`walletBalance` props);
  `CustomerHistoryPage` bounty wallet card + passes points into the bill modal.
- **Mobile:** `types` `CustomerProfile`/`RedeemBountyResult` + `Profile` route;
  `authApi` `getProfile()`/`redeemBounty()`; new `ProfileScreen.tsx` (identity,
  Fresh Points + wallet, redeem control + 10/25/50 chips, logout);
  `RootNavigator` `Profile` screen; `ReceiptScreen` points-earned banner +
  header 👤 + body Profile button; `HistoryScreen` header 👤 → Profile.

### Explanation
Points-earned is derived client-side as `Math.floor(totalAmount/10)` (same as the
backend award) so the banner needs no extra round-trip; the wallet figure comes
from the fetched profile. Profile is reachable via a header 👤 icon on History
and Receipt (plus a visible body button on Receipt).

### How to test
- **Automated:** `cd frontend; npm run typecheck` ✅ • `cd mobile; npm run
  typecheck` ✅ (mobile ProfileScreen snapshot test outstanding — no runner).
- **Manual:** Web — complete a paid order → My Bills → wallet card + bill
  "Points Earned". Mobile — ₹300 purchase → "You earned 30 Fresh Points"; tap
  Profile → redeem 10 → −10 pts/₹5.

---

## Task 13 — Mobile shared component library

### What's implemented (this session)
- **New components:** `AppButton` (variant + loading→`ActivityIndicator`),
  `AppInput` (label/error/secureTextEntry), `CartItemRow` (editable stepper +
  read-only), `OrderCard` (absorbed `STATUS_COLORS`), `NutriScoreBadge`, plus
  `theme/colors.ts`.
- **Refactors (UI-only, output identical):** `ShoppingScreen`,
  `CartReviewScreen`, `HistoryScreen`, `ProductDetailSheet` now use the shared
  components.

### How to test
- **Automated:** `cd mobile; npm run typecheck` ✅ (component snapshot tests
  outstanding — no runner).
- **Manual:** Shopping / Cart Review / History / Product sheet look identical;
  `mobile/src/components/` now has 5 documented reusable components.

---

## Task 14 — Session cancel UI (web + mobile)

### What's implemented (this session)
- **Backend:** `DELETE /api/sessions/:code` guard →
  `requireRole("worker","admin","customer")`; `cancel` passes `req.user?.role`;
  `cancelSession(code, cancelledBy, actorRole)` writes the audit log with the
  real role. (Existing cancel already sets `CANCELLED` + broadcasts
  `SESSION_CANCELLED`.)
- **Web:** `sessionApi.cancelSession(code)`; `WorkerDashboardPage` "Cancel
  Session" button on ACTIVE rows (confirm → remove + toast); `App.tsx`
  `ShopRoute` leave best-effort cancels before clearing; `sessionApi.test.ts`.
- **Mobile:** `sessionApi.cancelSession(code)`; `ShoppingScreen` "Leave" header
  button (confirm → cancel + clear cart/session → reset to QRScan) **and** a
  `SESSION_CANCELLED` SSE listener that auto-navigates the customer back when
  the worker cancels.

### Explanation
- Mobile customers are authenticated, so including `customer` lets their Leave
  button actually cancel server-side. Web customers may shop without sign-in, so
  their Leave is best-effort (always clears + navigates).
- The audit log now records the real role (was hardcoded "worker").
- The ShoppingScreen long-polls the session stream and, on
  `SESSION_CANCELLED`, alerts and resets to QRScan — matching the demo.

### How to test
- **Automated:** `cd frontend; npx vitest run src/services/sessionApi.test.ts` →
  **2/2 pass** (DELETE + Bearer header + credentials; 404 throws).
- **Automated (types):** backend ✅, frontend ✅, mobile ✅.
- **Manual:** Worker dashboard → Cancel on an ACTIVE row → row disappears +
  toast; connected mobile customer is alerted and sent to QRScan; mobile
  Shopping → Leave → cancel + clear + QRScan.

---

# Verification summary

| Area | Command | Result |
|------|---------|--------|
| Backend types | `cd backend; npx tsc --noEmit` | ✅ clean |
| Backend tests | `cd backend; npm test` | ✅ (BountyService 4/4, plus existing ProductService/SupermarketDomain/SessionService/CheckoutService suites) |
| Frontend types | `cd frontend; npm run typecheck` | ✅ clean |
| Frontend tests | `cd frontend; npm test` | ✅ (sessionApi 2/2, plus existing component suites) |
| Mobile types | `cd mobile; npm run typecheck` | ✅ clean |

# Known limitations / next steps
- **Mobile tests (Tasks 12 & 13):** no test runner configured (no
  jest/jest-expo/@testing-library/react-native). Snapshot tests for
  `ProfileScreen` and the five shared components need a one-time test-stack
  setup; components are written to be testable.
- **Task 9 (Vision):** not started — by request, it comes next/last. The earlier
  `npm install @google-cloud/vision @aws-sdk/client-rekognition` was interrupted
  and may not have completed; I'll verify/redo the install when starting Task 9.
