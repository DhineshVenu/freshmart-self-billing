import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Vibration,
  ScrollView,
  Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RouteProp } from "@react-navigation/native";
import { addToCart, getCart, updateCartItemQty, removeCartItem, getProductDetail } from "../services/cartApi";
import { useCartStore } from "../store/cartStore";
import { useSessionStore } from "../store/sessionStore";
import { CartItem, Product, RootStackParamList } from "../types";
import { ProductDetailSheet } from "../components/ProductDetailSheet";
import { CartItemRow } from "../components/CartItemRow";
import { cancelSession } from "../services/sessionApi";
import { API_BASE_URL } from "../services/api";
import * as SecureStore from "expo-secure-store";

// Try to import camera — falls back gracefully if unavailable
let CameraView: any = null;
let useCameraPermissions: any = null;
try {
  const cam = require("expo-camera");
  CameraView = cam.CameraView;
  useCameraPermissions = cam.useCameraPermissions;
} catch {
  // Camera module not available — manual mode only
}

type Nav = StackNavigationProp<RootStackParamList, "Shopping">;
type Route = RouteProp<RootStackParamList, "Shopping">;
type ScanStatus = "idle" | "scanning" | "success" | "error";

/** Demo products that match the seeded barcodes in the backend */
const QUICK_PRODUCTS = [
  { barcode: "8901", name: "Amul Milk 1L", price: "₹65", emoji: "🥛" },
  { barcode: "8902", name: "Britannia Bread", price: "₹45", emoji: "🍞" },
  { barcode: "8903", name: "Shimla Apples 1kg", price: "₹180", emoji: "🍎" },
  { barcode: "8904", name: "Nescafé Coffee", price: "₹320", emoji: "☕" },
  { barcode: "8905", name: "Cadbury Dark Choc", price: "₹110", emoji: "🍫" },
  { barcode: "8906", name: "Real OJ 1L", price: "₹125", emoji: "🍊" },
  { barcode: "8907", name: "Amul Butter 500g", price: "₹275", emoji: "🧈" },
  { barcode: "8908", name: "Sunflower Oil 1L", price: "₹145", emoji: "🫙" },
  { barcode: "8909", name: "Tata Salt 1kg", price: "₹28", emoji: "🧂" },
  { barcode: "8910", name: "Lay's Chips 90g", price: "₹40", emoji: "🥔" },
];

export default function ShoppingScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { sessionCode, customerName, storeName } = route.params;
  const { cart, setCart, clearCart } = useCartStore();
  const { clearSession } = useSessionStore();

  const [permission, requestPermission] = useCameraPermissions
    ? useCameraPermissions()
    : [null, () => {}];

  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [manualBarcode, setManualBarcode] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const scanCooldown = useRef(false);
  const lastScannedRef = useRef<string>("");

  useEffect(() => {
    getCart(sessionCode)
      .then(setCart)
      .catch(() => {});
  }, [sessionCode, setCart]);

  // Listen for worker-initiated SESSION_CANCELLED so the customer is navigated
  // back to the QR scanner (mirrors the PaymentPendingScreen long-poll SSE pattern).
  useEffect(() => {
    let isMounted = true;
    let cancelled = false;

    const listen = async () => {
      let token: string | null = null;
      try {
        token = await SecureStore.getItemAsync("auth_token");
      } catch {
        // ignore — stream endpoint is public
      }
      const url = `${API_BASE_URL}/sessions/${sessionCode}/stream${token ? `?token=${token}` : ""}`;

      while (isMounted && !cancelled) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);
          const response = await fetch(url, {
            headers: {
              Accept: "text/event-stream",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (!response.body) break;

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          while (isMounted) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = decoder.decode(value, { stream: true });
            const lines = text.split("\n");
            for (const line of lines) {
              if (line.startsWith("event:")) {
                const eventType = line.replace("event:", "").trim();
                if (eventType === "SESSION_CANCELLED" && isMounted) {
                  cancelled = true;
                  Alert.alert(
                    "Session Cancelled",
                    "This shopping session was cancelled by the store.",
                    [{ text: "OK" }]
                  );
                  clearCart();
                  clearSession();
                  navigation.reset({ index: 0, routes: [{ name: "QRScan" }] });
                  return;
                }
              }
            }
          }
        } catch {
          if (!isMounted) return;
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
    };

    listen();
    return () => {
      isMounted = false;
    };
  }, [sessionCode, navigation, clearCart, clearSession]);

  const handleLeaveAndCancel = () => {
    Alert.alert(
      "Leave & Cancel Session",
      "This will cancel the shopping session and return you to the QR scanner.",
      [
        { text: "Stay", style: "cancel" },
        {
          text: "Leave & Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelSession(sessionCode);
            } catch {
              // Best-effort — clear local state regardless
            }
            clearCart();
            clearSession();
            navigation.reset({ index: 0, routes: [{ name: "QRScan" }] });
          },
        },
      ]
    );
  };

  const addItem = useCallback(
    async (barcode: string, label?: string) => {
      if (!barcode.trim()) return;
      setIsLoading(true);
      setScanStatus("scanning");
      try {
        const updated = await addToCart(sessionCode, barcode.trim());
        setCart(updated);
        setScanStatus("success");
        setLastAdded(label ?? barcode);
        Vibration.vibrate(80);
        setTimeout(() => {
          setScanStatus("idle");
          setLastAdded(null);
        }, 1800);

        // Fetch extended product detail for the bottom sheet (best-effort)
        getProductDetail(barcode.trim())
          .then((p) => setDetailProduct(p))
          .catch(() => {
            /* detail fetch is best-effort; ignore failures */
          });
      } catch (err) {
        setScanStatus("error");
        Alert.alert(
          "Product Not Found",
          (err as Error).message ||
            `Barcode "${barcode}" not in catalog.\nTry a code from the quick-add panel below.`,
          [{ text: "OK", onPress: () => setScanStatus("idle") }]
        );
      } finally {
        setIsLoading(false);
      }
    },
    [sessionCode, setCart]
  );

  const handleBarCodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (scanCooldown.current || data === lastScannedRef.current) return;
      scanCooldown.current = true;
      lastScannedRef.current = data;
      addItem(data);
      setTimeout(() => {
        scanCooldown.current = false;
        lastScannedRef.current = "";
      }, 2500);
    },
    [addItem]
  );

  const handleManualAdd = () => {
    if (!manualBarcode.trim()) {
      Alert.alert("Enter Barcode", "Type a barcode number (e.g. 8901) and tap Add.");
      return;
    }
    addItem(manualBarcode.trim());
    setManualBarcode("");
  };

  const handleUpdateQty = async (productId: string, qty: number) => {
    try {
      if (qty < 1) {
        const updated = await removeCartItem(sessionCode, productId);
        setCart(updated);
      } else {
        const updated = await updateCartItemQty(sessionCode, productId, qty);
        setCart(updated);
      }
    } catch (err) {
      Alert.alert("Error", (err as Error).message);
    }
  };

  const statusColor =
    scanStatus === "success"
      ? "#10b981"
      : scanStatus === "error"
      ? "#ef4444"
      : scanStatus === "scanning"
      ? "#0284c7"
      : "#64748b";

  const statusLabel =
    scanStatus === "success"
      ? `✓ Added: ${lastAdded}`
      : scanStatus === "error"
      ? "✗ Not found — try quick-add"
      : scanStatus === "scanning"
      ? "Looking up product…"
      : "Ready · Scan or type barcode";

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <CartItemRow item={item} editable onUpdateQty={handleUpdateQty} />
  );

  return (
    <View style={styles.container}>
      {/* ── Header ───────────────────────────────── */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {storeName}
          </Text>
          <Text style={styles.headerSub}>{customerName}</Text>
        </View>
        {CameraView && (
          <TouchableOpacity
            style={[styles.cameraToggle, showCamera && styles.cameraToggleActive]}
            onPress={() => {
              if (!permission?.granted) requestPermission();
              setShowCamera((v) => !v);
            }}
          >
            <Text style={styles.cameraToggleText}>
              {showCamera ? "⌨️  Manual" : "📷  Camera"}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.leaveBtn} onPress={handleLeaveAndCancel}>
          <Text style={styles.leaveBtnText}>Leave</Text>
        </TouchableOpacity>
      </View>

      {/* ── Status Bar ───────────────────────────── */}
      <View style={[styles.statusBar, { borderColor: statusColor }]}>
        {scanStatus === "scanning" && (
          <ActivityIndicator color={statusColor} size="small" style={{ marginRight: 8 }} />
        )}
        <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
      </View>

      {/* ── Camera Viewfinder ────────────────────── */}
      {showCamera && CameraView && permission?.granted && (
        <View style={styles.cameraContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: [
                "ean13", "ean8", "upc_a", "upc_e",
                "code128", "code39", "qr",
              ],
            }}
            onBarcodeScanned={handleBarCodeScanned}
          />
          {/* Viewfinder frame */}
          <View style={styles.viewfinderOverlay}>
            <View style={styles.viewfinderFrame}>
              <View style={[styles.corner, styles.tl]} />
              <View style={[styles.corner, styles.tr]} />
              <View style={[styles.corner, styles.bl]} />
              <View style={[styles.corner, styles.br]} />
            </View>
            <Text style={styles.scanHint}>Align barcode inside the frame</Text>
          </View>
        </View>
      )}

      {/* ── Manual Barcode Entry ─────────────────── */}
      {(!showCamera || !CameraView) && (
        <View style={styles.manualRow}>
          <TextInput
            style={styles.manualInput}
            value={manualBarcode}
            onChangeText={setManualBarcode}
            placeholder="Type barcode number (e.g. 8901)"
            placeholderTextColor="#475569"
            keyboardType="numeric"
            returnKeyType="done"
            onSubmitEditing={handleManualAdd}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[styles.addBtn, isLoading && styles.addBtnDisabled]}
            onPress={handleManualAdd}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.addBtnText}>Add</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ── Quick-Add Product Grid ───────────────── */}
      <View style={styles.quickSection}>
        <Text style={styles.quickTitle}>⚡ Quick Add — Tap to Scan</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickScroll}
        >
          {QUICK_PRODUCTS.map((p) => {
            const inCart = cart?.items.find((i) => i.barcode === p.barcode);
            return (
              <TouchableOpacity
                key={p.barcode}
                style={[styles.quickCard, inCart && styles.quickCardActive]}
                onPress={() => addItem(p.barcode, p.name)}
                disabled={isLoading}
              >
                <Text style={styles.quickEmoji}>{p.emoji}</Text>
                <Text style={styles.quickName} numberOfLines={2}>
                  {p.name}
                </Text>
                <Text style={styles.quickPrice}>{p.price}</Text>
                <Text style={styles.quickBarcode}>#{p.barcode}</Text>
                {inCart && (
                  <View style={styles.inCartBadge}>
                    <Text style={styles.inCartBadgeText}>×{inCart.quantity}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Cart Items ───────────────────────────── */}
      <FlatList
        data={cart?.items ?? []}
        keyExtractor={(item) => item.productId}
        renderItem={renderCartItem}
        style={styles.cartList}
        ListHeaderComponent={
          (cart?.items?.length ?? 0) > 0 ? (
            <Text style={styles.cartHeader}>🛒 Cart ({cart!.itemCount} items)</Text>
          ) : undefined
        }
        ListEmptyComponent={
          <View style={styles.emptyCartBox}>
            <Text style={styles.emptyCartIcon}>🛒</Text>
            <Text style={styles.emptyCart}>Cart is empty</Text>
            <Text style={styles.emptyCartSub}>
              Tap a product above or type a barcode code to add items
            </Text>
          </View>
        }
      />

      {/* ── Checkout Footer ──────────────────────── */}
      {(cart?.items?.length ?? 0) > 0 && (
        <View style={styles.footer}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>₹{cart?.subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalLabel}>GST (5%)</Text>
            <Text style={styles.totalValue}>₹{cart?.taxAmount.toFixed(2)}</Text>
          </View>
          <View style={[styles.totalsRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>
              ₹{cart?.totalAmount.toFixed(2)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.checkoutBtn}
            onPress={() => navigation.navigate("CartReview", { sessionCode })}
          >
            <Text style={styles.checkoutBtnText}>Proceed to Checkout →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Product Detail Bottom Sheet ──────────── */}
      <ProductDetailSheet
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
      />
    </View>
  );
}

const GREEN = "#10b981";
const SURFACE = "#1e293b";
const BORDER = "#334155";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },

  /* header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: { fontSize: 15, fontWeight: "700", color: "#fff" },
  headerSub: { fontSize: 11, color: "#94a3b8", marginTop: 1 },
  cameraToggle: {
    backgroundColor: "#334155",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  cameraToggleActive: { backgroundColor: "#0284c7" },
  cameraToggleText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  leaveBtn: {
    backgroundColor: "#7f1d1d",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  leaveBtnText: { color: "#fca5a5", fontSize: 13, fontWeight: "700" },

  /* status */
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    borderLeftWidth: 3,
  },
  statusText: { fontSize: 13, fontWeight: "600" },

  /* camera */
  cameraContainer: { height: 220, position: "relative" },
  viewfinderOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  viewfinderFrame: {
    width: 220,
    height: 120,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 20,
    height: 20,
    borderColor: GREEN,
    borderWidth: 3,
  },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  scanHint: {
    color: "#fff",
    fontSize: 12,
    marginTop: 8,
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  /* manual input */
  manualRow: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  manualInput: {
    flex: 1,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    color: "#fff",
    fontSize: 14,
  },
  addBtn: {
    backgroundColor: "#047857",
    borderRadius: 8,
    paddingHorizontal: 18,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 60,
  },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  /* quick-add */
  quickSection: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingVertical: 10,
  },
  quickTitle: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    paddingHorizontal: 12,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  quickScroll: { paddingHorizontal: 10, gap: 8 },
  quickCard: {
    width: 90,
    backgroundColor: SURFACE,
    borderRadius: 10,
    padding: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    position: "relative",
  },
  quickCardActive: {
    borderColor: GREEN,
    backgroundColor: "#064e3b",
  },
  quickEmoji: { fontSize: 26, marginBottom: 4 },
  quickName: {
    color: "#e2e8f0",
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 2,
  },
  quickPrice: { color: GREEN, fontSize: 11, fontWeight: "700" },
  quickBarcode: { color: "#475569", fontSize: 9, marginTop: 2 },
  inCartBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: GREEN,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  inCartBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },

  /* cart list */
  cartList: { flex: 1 },
  cartHeader: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyCartBox: { alignItems: "center", paddingVertical: 36 },
  emptyCartIcon: { fontSize: 40, marginBottom: 8 },
  emptyCart: { color: "#94a3b8", fontSize: 15, fontWeight: "600" },
  emptyCartSub: {
    color: "#475569",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 32,
  },
  cartItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  cartItemInfo: { flex: 1, paddingRight: 8 },
  cartItemName: { fontSize: 13, fontWeight: "600", color: "#e2e8f0" },
  cartItemPrice: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  cartItemControls: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  qtyBtnText: { color: "#e2e8f0", fontSize: 16, fontWeight: "700" },
  qtyText: {
    color: "#e2e8f0",
    fontWeight: "700",
    minWidth: 22,
    textAlign: "center",
  },

  /* checkout footer */
  footer: {
    padding: 14,
    backgroundColor: SURFACE,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    gap: 6,
  },
  totalsRow: { flexDirection: "row", justifyContent: "space-between" },
  totalLabel: { color: "#94a3b8", fontSize: 13 },
  totalValue: { color: "#e2e8f0", fontSize: 13 },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 6,
    marginTop: 2,
  },
  grandTotalLabel: { color: "#fff", fontSize: 16, fontWeight: "700" },
  grandTotalValue: { color: GREEN, fontSize: 20, fontWeight: "800" },
  checkoutBtn: {
    backgroundColor: "#047857",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  checkoutBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
