/**
 * Fresh Mart — Comprehensive Automated Verification Suite (Tasks 1–14)
 * 
 * Executes full end-to-end simulations of all manual test workflows defined in
 * docs/MANUAL_TESTING_AND_IMPLEMENTATION_GUIDE.md against the live running API:
 * 
 * - Task 1: Extended product details & validation guards
 * - Task 2: Near-expiry clearance price calculation in Cart & Checkout
 * - Task 3: Admin product CRUD with extended metadata
 * - Task 6: Profile update (phone & dietary preferences)
 * - Task 7: Route protection & authentication RBAC
 * - Task 8: Store manager assignment
 * - Task 10: PDF sales report export
 * - Task 11: Fresh Points loyalty rewards & redemption
 * - Task 14: Session cancellation & state transition
 */

const BASE_URL = process.env.API_URL || "http://localhost:5000";

let adminToken = "";
let workerToken = "";
let customerToken = "";
let customerId = "";

const results: Array<{ task: string; name: string; passed: boolean; details: string }> = [];

function recordResult(task: string, name: string, passed: boolean, details: string) {
  results.push({ task, name, passed, details });
  const icon = passed ? "  ✓" : "  ✗";
  console.log(`${icon} [${task}] ${name}: ${details}`);
}

async function runVerification() {
  console.log("==================================================================");
  console.log("  Fresh Mart — Complete Tasks 1–14 Verification Harness");
  console.log(`  Target API: ${BASE_URL}`);
  console.log("==================================================================\n");

  // ─── AUTHENTICATION & LOGIN (Task 7) ──────────────────────────────────────────
  console.log("--- Authenticating Test Personas (Task 7) ---");
  try {
    const adminRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@freshmart.com", password: "Admin@1234" }),
    });
    const adminData = (await adminRes.json()) as any;
    if (adminRes.ok && adminData.data?.token) {
      adminToken = adminData.data.token;
      recordResult("Task 7", "Admin Authentication", true, `Logged in as ${adminData.data.user.name}`);
    } else {
      recordResult("Task 7", "Admin Authentication", false, adminData.message || "Login failed");
    }

    const workerRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "worker@freshmart.com", password: "Worker@1234" }),
    });
    const workerData = await workerRes.json();
    if (workerRes.ok && workerData.data?.token) {
      workerToken = workerData.data.token;
      recordResult("Task 7", "Worker Authentication", true, `Logged in as ${workerData.data.user.name}`);
    } else {
      recordResult("Task 7", "Worker Authentication", false, workerData.message || "Login failed");
    }

    // Register or login a test customer
    const testCustomerEmail = `test.shopper.${Date.now()}@example.com`;
    const regRes = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test Shopper", email: testCustomerEmail, password: "Shopper@1234" }),
    });
    const regData = await regRes.json();
    if (regRes.ok && regData.data?.token) {
      customerToken = regData.data.token;
      customerId = regData.data.user.userId || regData.data.user._id;
      recordResult("Task 7", "Customer Registration & JWT", true, `Registered ${testCustomerEmail}`);
    } else {
      recordResult("Task 7", "Customer Registration & JWT", false, regData.message || "Registration failed");
    }

    // Route guard check (Unauthenticated access to protected route)
    const unauthRes = await fetch(`${BASE_URL}/api/v1/reports/daily?startDate=2026-10-01&endDate=2026-11-01`);
    if (unauthRes.status === 401) {
      recordResult("Task 7", "Route Guard Enforcement", true, "Unauthenticated access properly rejected with 401");
    } else {
      recordResult("Task 7", "Route Guard Enforcement", false, `Expected 401, got ${unauthRes.status}`);
    }
  } catch (err: any) {
    recordResult("Task 7", "Authentication Setup", false, err.message);
  }

  // ─── TASK 1: EXTENDED PRODUCT DETAILS & VALIDATIONS ───────────────────────────
  console.log("\n--- Verifying Extended Product Fields (Task 1) ---");
  try {
    const detailRes = await fetch(`${BASE_URL}/api/products/barcode/8901/detail`);
    const detailData = await detailRes.json();
    if (detailRes.ok && detailData.data?.product) {
      const p = detailData.data.product;
      const hasWayfinding = p.aisle && p.shelf && p.bay !== undefined;
      const hasNutrition = p.nutriScore && p.calories !== undefined;
      const valid = hasWayfinding && hasNutrition;
      recordResult(
        "Task 1",
        "Public Barcode Detail Endpoint",
        valid,
        `Barcode 8901: NutriScore=${p.nutriScore}, Calories=${p.calories}kcal, Location=${p.aisle} / ${p.shelf}`
      );
    } else {
      recordResult("Task 1", "Public Barcode Detail Endpoint", false, "Failed to retrieve product 8901");
    }

    // Validation boundary check: Clearance > 100%
    const badProdRes = await fetch(`${BASE_URL}/api/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        barcode: "9999",
        name: "Invalid Clearance Item",
        category: "Snacks",
        price: 100,
        stockQty: 10,
        clearanceDiscountPercent: 125,
      }),
    });
    if (badProdRes.status === 400) {
      recordResult("Task 1", "Clearance Validation Guard (>100%)", true, "Rejected clearance > 100% with HTTP 400");
    } else {
      recordResult("Task 1", "Clearance Validation Guard (>100%)", false, `Expected 400, got ${badProdRes.status}`);
    }
  } catch (err: any) {
    recordResult("Task 1", "Product Detail Check", false, err.message);
  }

  // ─── TASK 2: CLEARANCE PRICING IN CART & CHECKOUT ─────────────────────────────
  console.log("\n--- Verifying Near-Expiry Clearance Pricing (Task 2) ---");
  try {
    // 8911 is Epigamia Greek Yogurt (Base ₹90, Clearance 25% off -> Effective ₹67.50)
    // 1. Create a session
    const sessRes = await fetch(`${BASE_URL}/api/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${workerToken}`,
      },
      body: JSON.stringify({ storeName: "Fresh Mart Main Branch" }),
    });
    const sessData = await sessRes.json();
    const sessionCode = sessData.data?.session?.id || sessData.data?.session?.sessionCode;

    if (!sessionCode) {
      throw new Error(`Failed to create session: ${JSON.stringify(sessData)}`);
    }

    // Customer joins session
    await fetch(`${BASE_URL}/api/sessions/${sessionCode}/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ customerName: "Test Shopper" }),
    });

    // Add barcode 8911 (Clearance product)
    const cartRes = await fetch(`${BASE_URL}/api/carts/${sessionCode}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barcode: "8911", quantity: 2 }),
    });
    const cartData = await cartRes.json();
    const item = cartData.data?.cart?.items?.find((i: any) => i.barcode === "8911");

    // Expected: ₹90 - 25% = ₹67.50 unit price, lineTotal = ₹135.00
    if (item && Math.abs(item.price - 67.50) < 0.01) {
      recordResult(
        "Task 2",
        "Clearance Calculation in Cart",
        true,
        `Base ₹90.00 with 25% off -> Unit price ₹${item.price.toFixed(2)}, Line Total ₹${item.lineTotal.toFixed(2)}`
      );
    } else {
      recordResult("Task 2", "Clearance Calculation in Cart", false, `Unexpected price: ₹${item?.price}`);
    }

    // Checkout and verify snapshot
    const checkoutRes = await fetch(`${BASE_URL}/api/v1/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionCode, paymentMethod: "UPI" }),
    });
    const checkoutData = await checkoutRes.json();
    const orderItem = checkoutData.data?.order?.items?.find((i: any) => i.barcode === "8911");

    if (orderItem && orderItem.clearanceApplied === true) {
      recordResult(
        "Task 2",
        "Clearance Snapshot in Order Bill",
        true,
        `Order ${checkoutData.data.order.orderNo} recorded clearanceApplied=true at ₹${orderItem.price.toFixed(2)}`
      );
    } else {
      recordResult("Task 2", "Clearance Snapshot in Order Bill", false, "clearanceApplied flag missing or false");
    }
  } catch (err: any) {
    recordResult("Task 2", "Clearance Pricing Test", false, err.message);
  }

  // ─── TASK 3: ADMIN PRODUCT CREATION WITH EXTENDED FIELDS ──────────────────────
  console.log("\n--- Verifying Admin Product Form Metadata (Task 3) ---");
  try {
    const newBarcode = `89${Math.floor(100 + Math.random() * 899)}`;
    const createRes = await fetch(`${BASE_URL}/api/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        barcode: newBarcode,
        name: "Artisan Chia Seed Crackers",
        category: "Snacks",
        unit: "150 g",
        price: 135.0,
        stockQty: 25,
        nutriScore: "A",
        allergens: ["Sesame"],
        dietaryFlags: ["Vegetarian", "Vegan", "Gluten-Free"],
        calories: 180,
        aisle: "Aisle 5 - Snacks",
        shelf: "Shelf C",
        bay: 2,
        clearanceDiscountPercent: 15,
      }),
    });
    const createdData = await createRes.json();
    if (createRes.ok && createdData.data?.product) {
      const p = createdData.data.product;
      recordResult(
        "Task 3",
        "Admin Create Product with Extended Fields",
        true,
        `Created '${p.name}' with NutriScore=${p.nutriScore}, Clearance=${p.clearanceDiscountPercent}%, Aisle=${p.aisle}`
      );
    } else {
      recordResult("Task 3", "Admin Create Product with Extended Fields", false, createdData.message || "Failed to create product");
    }
  } catch (err: any) {
    recordResult("Task 3", "Admin Product Test", false, err.message);
  }

  // ─── TASK 6: AUTH PROFILE & PREFERENCES ───────────────────────────────────────
  console.log("\n--- Verifying User Profile & Dietary Preferences (Task 6) ---");
  try {
    const updateRes = await fetch(`${BASE_URL}/api/v1/auth/profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        phone: "9876543210",
        dietaryPreferences: {
          allergens: ["Milk", "Gluten"],
          diet: ["Vegetarian", "Vegan"],
        },
      }),
    });
    const updateData = await updateRes.json();
    const profile = updateData.data?.profile;
    if (updateRes.ok && profile) {
      const matchesPhone = profile.phone === "9876543210";
      const matchesAllergens = profile.dietaryPreferences?.allergens?.includes("Gluten");
      recordResult(
        "Task 6",
        "Update User Profile & Preferences",
        matchesPhone && matchesAllergens,
        `Phone: ${profile.phone}, Allergens: [${profile.dietaryPreferences.allergens.join(", ")}], Diet: [${profile.dietaryPreferences.diet.join(", ")}]`
      );
    } else {
      recordResult("Task 6", "Update User Profile & Preferences", false, updateData.message || "Profile update failed");
    }
  } catch (err: any) {
    recordResult("Task 6", "Profile Test", false, err.message);
  }

  // ─── TASK 8: STORE MANAGER ASSIGNMENT ─────────────────────────────────────────
  console.log("\n--- Verifying Store Manager Assignment (Task 8) ---");
  try {
    const storesRes = await fetch(`${BASE_URL}/api/v1/stores`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const storesData = await storesRes.json();
    const storeList = Array.isArray(storesData.data) ? storesData.data : storesData.data?.stores;
    const targetStore = storeList?.[0];

    // Find a worker user ID
    const workersRes = await fetch(`${BASE_URL}/api/v1/workers`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const workersData = await workersRes.json();
    const workerUser = workersData.data?.workers?.[0];

    if (targetStore && workerUser) {
      const assignRes = await fetch(`${BASE_URL}/api/v1/stores/${targetStore._id}/assign-manager`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ managerId: workerUser._id }),
      });
      recordResult(
        "Task 8",
        "Store Manager Assignment",
        assignRes.ok,
        `Assigned '${workerUser.name}' as Manager of '${targetStore.name}'`
      );
    } else {
      recordResult("Task 8", "Store Manager Assignment", false, `Store or worker not found (store=${!!targetStore}, worker=${!!workerUser})`);
    }
  } catch (err: any) {
    recordResult("Task 8", "Store Manager Assignment Test", false, err.message);
  }

  // ─── TASK 10: PDF SALES REPORT EXPORT ─────────────────────────────────────────
  console.log("\n--- Verifying PDF Report Generation (Task 10) ---");
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const pastStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const pdfRes = await fetch(
      `${BASE_URL}/api/v1/reports/export/pdf?startDate=${pastStr}&endDate=${todayStr}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    const contentType = pdfRes.headers.get("content-type");
    const buffer = await pdfRes.arrayBuffer();
    const headerString = String.fromCharCode(...new Uint8Array(buffer.slice(0, 5)));
    const isPdf = headerString === "%PDF-";

    recordResult(
      "Task 10",
      "PDF Daily Report Binary Generation",
      pdfRes.ok && isPdf,
      `Generated PDF Report (${buffer.byteLength} bytes, Content-Type: ${contentType}, Magic Header: ${headerString})`
    );
  } catch (err: any) {
    recordResult("Task 10", "PDF Report Test", false, err.message);
  }

  // ─── TASK 11 & 12: FRESH POINTS LOYALTY ACCRUAL & REDEMPTION ──────────────────
  console.log("\n--- Verifying Fresh Points Loyalty Engine (Task 11 & 12) ---");
  try {
    // Create and checkout an order for ₹500+ with customer ID
    const sessRes = await fetch(`${BASE_URL}/api/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${workerToken}`,
      },
      body: JSON.stringify({ storeName: "Fresh Mart Main Branch" }),
    });
    const sessData = await sessRes.json();
    const sessionCode = sessData.data?.session?.id || sessData.data?.session?.sessionCode;

    // Customer joins
    await fetch(`${BASE_URL}/api/sessions/${sessionCode}/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ customerName: "Loyalty Shopper" }),
    });

    // Add 2x Nescafé Pure Coffee (8904 at ₹320 each = ₹640)
    await fetch(`${BASE_URL}/api/carts/${sessionCode}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barcode: "8904", quantity: 2 }),
    });

    // Checkout
    const coRes = await fetch(`${BASE_URL}/api/v1/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionCode, paymentMethod: "CARD" }),
    });
    const coData = await coRes.json();
    const orderId = coData.data?.order?._id;
    const orderTotal = coData.data?.order?.totalAmount;

    // Confirm Payment as Worker POS
    const payRes = await fetch(`${BASE_URL}/api/v1/payments/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${workerToken}`,
      },
      body: JSON.stringify({ orderId }),
    });
    await payRes.json();

    // Check customer profile for awarded Fresh Points
    const profRes = await fetch(`${BASE_URL}/api/v1/auth/profile`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const profData = await profRes.json();
    const points = profData.data?.profile?.bountyPoints || 0;
    const wallet = profData.data?.profile?.bountyWalletBalance || 0;

    const expectedPoints = Math.floor(orderTotal / 10);
    const expectedWallet = Number((expectedPoints * 0.5).toFixed(2));

    if (points >= expectedPoints) {
      recordResult(
        "Task 11",
        "Loyalty Points Accrual on Payment",
        true,
        `Order of ₹${orderTotal.toFixed(2)} earned ${points} Fresh Points (Wallet: ₹${wallet.toFixed(2)})`
      );
    } else {
      recordResult("Task 11", "Loyalty Points Accrual on Payment", false, `Expected ${expectedPoints} pts, got ${points}`);
    }

    // Test Point Redemption: Redeem 20 points
    const redeemRes = await fetch(`${BASE_URL}/api/v1/auth/redeem-bounty`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ pointsToRedeem: 20 }),
    });
    const redeemData = await redeemRes.json();
    if (redeemRes.ok) {
      recordResult(
        "Task 11",
        "Loyalty Points Redemption",
        true,
        `Redeemed 20 Fresh Points: New Points=${redeemData.data.bountyPoints}, New Wallet=₹${redeemData.data.bountyWalletBalance}`
      );
    } else {
      recordResult("Task 11", "Loyalty Points Redemption", false, redeemData.message || "Redemption failed");
    }

    // Negative Test: Over-redemption
    const overRedeemRes = await fetch(`${BASE_URL}/api/v1/auth/redeem-bounty`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ pointsToRedeem: 5000 }),
    });
    if (overRedeemRes.status === 400) {
      recordResult("Task 11", "Over-Redemption Guard", true, "Rejected over-redemption with HTTP 400 Insufficient Points");
    } else {
      recordResult("Task 11", "Over-Redemption Guard", false, `Expected 400, got ${overRedeemRes.status}`);
    }
  } catch (err: any) {
    recordResult("Task 11", "Loyalty Points Engine Test", false, err.message);
  }

  // ─── TASK 14: SESSION CANCELLATION & REAL-TIME STATE ──────────────────────────
  console.log("\n--- Verifying Session Cancellation & State Transition (Task 14) ---");
  try {
    // 1. Create a session
    const sessRes = await fetch(`${BASE_URL}/api/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${workerToken}`,
      },
      body: JSON.stringify({ storeName: "Fresh Mart Main Branch" }),
    });
    const sessData = await sessRes.json();
    const sessionCode = sessData.data?.session?.id || sessData.data?.session?.sessionCode;

    // 2. Cancel the session as Worker
    const cancelRes = await fetch(`${BASE_URL}/api/sessions/${sessionCode}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${workerToken}` },
    });
    const cancelData = await cancelRes.json();

    if (cancelRes.ok && cancelData.data?.session?.status === "CANCELLED") {
      recordResult(
        "Task 14",
        "Session Cancellation API",
        true,
        `Session ${sessionCode.slice(0, 8)} transitioned to CANCELLED`
      );
    } else {
      recordResult("Task 14", "Session Cancellation API", false, cancelData.message || "Failed to cancel session");
    }

    // 3. Negative check: Cancel already-cancelled session
    const repeatCancelRes = await fetch(`${BASE_URL}/api/sessions/${sessionCode}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${workerToken}` },
    });
    const repeatData = await repeatCancelRes.json();
    if (repeatCancelRes.status >= 400 && repeatData.message?.includes("cancelled")) {
      recordResult("Task 14", "Duplicate Cancel Guard", true, `Rejected duplicate cancellation: "${repeatData.message}"`);
    } else {
      recordResult("Task 14", "Duplicate Cancel Guard", false, `Expected error, got status ${repeatCancelRes.status}`);
    }
  } catch (err: any) {
    recordResult("Task 14", "Session Cancellation Test", false, err.message);
  }

  // ─── SUMMARY REPORT ───────────────────────────────────────────────────────────
  console.log("\n==================================================================");
  console.log("  Verification Summary");
  console.log("==================================================================");
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;

  console.log(`Total Checks Run : ${total}`);
  console.log(`Passed Checks    : ${passed}`);
  console.log(`Failed Checks    : ${failed}`);
  console.log(`Success Rate     : ${((passed / total) * 100).toFixed(1)}%`);
  console.log("==================================================================");

  if (failed === 0) {
    console.log("🎉 ALL NEWLY IMPLEMENTED TASKS VERIFIED AND PASSING CLEANLY!\n");
  } else {
    console.log("⚠️ Some checks failed. Review output above.\n");
  }
}

runVerification().catch(console.error);
