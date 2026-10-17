import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, ActivityIndicator, Vibration,
} from "react-native";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RouteProp } from "@react-navigation/native";
import { addToCart, getCart, updateCartItemQty, removeCartItem } from "../services/cartApi";
import { decodeBarcodeFromUri } from "../services/visionApi";
import { useCartStore } from "../store/cartStore";
import { CartItem, RootStackParamList } from "../types";

type Nav = StackNavigationProp<RootStackParamList, "Shopping">;
type Route = RouteProp<RootStackParamList, "Shopping">;

type ScanStatus = "idle" | "scanning" | "enhancing" | "success" | "error";

export default function ShoppingScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { sessionCode, customerName, storeName } = route.params;
  const { cart, setCart } = useCartStore();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [manualBarcode, setManualBarcode] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const lastScannedRef = useRef<string>("");
  const scanCooldown = useRef(false);

  // Load cart on mount
  useEffect(() => {
    getCart(sessionCode)
      .then(setCart)
      .catch(() => {}); // Empty cart is fine
  }, [sessionCode, setCart]);

  const addItem = useCallback(async (barcode: string) => {
    if (!barcode.trim()) return;
    setIsLoading(true);
    try {
      const updated = await addToCart(sessionCode, barcode.trim());
      setCart(updated);
      setScanStatus("success");
      Vibration.vibrate(100);
      setTimeout(() => setScanStatus("idle"), 1500);
    } catch (err) {
      setScanStatus("error");
      Alert.alert("Product Not Found", (err as Error).message);
      setTimeout(() => setScanStatus("idle"), 2000);
    } finally {
      setIsLoading(false);
    }
  }, [sessionCode, setCart]);

  const handleBarCodeScanned = useCallback(({ data }: BarcodeScanningResult) => {
    if (scanCooldown.current || data === lastScannedRef.current) return;
    scanCooldown.current = true;
    lastScannedRef.current = data;
    setScanStatus("scanning");
    addItem(data);
    setTimeout(() => {
      scanCooldown.current = false;
      lastScannedRef.current = "";
    }, 2500);
  }, [addItem]);

  const handleManualAdd = () => {
    if (!manualBarcode.trim()) return;
    addItem(manualBarcode.trim());
    setManualBarcode("");
  };

  const handleUpdateQty = async (productId: string, qty: number) => {
    if (qty < 1) {
      handleRemove(productId);
      return;
    }
    try {
      const updated = await updateCartItemQty(sessionCode, productId, qty);
      setCart(updated);
    } catch (err) {
      Alert.alert("Error", (err as Error).message);
    }
  };

  const handleRemove = async (productId: string) => {
    try {
      const updated = await removeCartItem(sessionCode, productId);
      setCart(updated);
    } catch (err) {
      Alert.alert("Error", (err as Error).message);
    }
  };

  const statusColors: Record<ScanStatus, string> = {
    idle: "#64748b",
    scanning: "#0284c7",
    enhancing: "#f59e0b",
    success: "#10b981",
    error: "#ef4444",
  };

  const statusLabels: Record<ScanStatus, string> = {
    idle: "Ready to scan",
    scanning: "Scanning…",
    enhancing: "Enhancing scan…",
    success: "✓ Item added!",
    error: "Could not read barcode",
  };

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName}>{item.name}</Text>
        <Text style={styles.cartItemPrice}>₹{item.price.toFixed(2)} × {item.quantity} = ₹{item.lineTotal.toFixed(2)}</Text>
      </View>
      <View style={styles.cartItemControls}>
        <TouchableOpacity style={styles.qtyBtn} onPress={() => handleUpdateQty(item.productId, item.quantity - 1)}>
          <Text style={styles.qtyBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.qtyText}>{item.quantity}</Text>
        <TouchableOpacity style={styles.qtyBtn} onPress={() => handleUpdateQty(item.productId, item.quantity + 1)}>
          <Text style={styles.qtyBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Session Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{storeName}</Text>
          <Text style={styles.headerSub}>{customerName}</Text>
        </View>
        <TouchableOpacity
          style={styles.cameraToggle}
          onPress={() => {
            if (!permission?.granted) requestPermission();
            setShowCamera((v) => !v);
          }}
        >
          <Text>{showCamera ? "⌨️ Manual" : "📷 Camera"}</Text>
        </TouchableOpacity>
      </View>

      {/* Camera Viewfinder */}
      {showCamera && permission?.granted && (
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "qr"],
            }}
            onBarcodeScanned={handleBarCodeScanned}
          />
          <View style={[styles.scanStatus, { borderColor: statusColors[scanStatus] }]}>
            <Text style={[styles.scanStatusText, { color: statusColors[scanStatus] }]}>
              {scanStatus === "scanning" || scanStatus === "enhancing"
                ? <ActivityIndicator color={statusColors[scanStatus]} size="small" />
                : null}
              {statusLabels[scanStatus]}
            </Text>
          </View>
        </View>
      )}

      {/* Manual barcode input */}
      <View style={styles.manualRow}>
        <TextInput
          style={styles.manualInput}
          value={manualBarcode}
          onChangeText={setManualBarcode}
          placeholder="Enter barcode manually…"
          placeholderTextColor="#475569"
          keyboardType="numeric"
          returnKeyType="done"
          onSubmitEditing={handleManualAdd}
        />
        <TouchableOpacity style={styles.addBtn} onPress={handleManualAdd} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.addBtnText}>Add</Text>}
        </TouchableOpacity>
      </View>

      {/* Cart Items */}
      <FlatList
        data={cart?.items ?? []}
        keyExtractor={(item) => item.productId}
        renderItem={renderCartItem}
        style={styles.cartList}
        ListEmptyComponent={
          <Text style={styles.emptyCart}>Cart is empty — scan an item to begin</Text>
        }
      />

      {/* Totals + Checkout */}
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
            <Text style={styles.grandTotalValue}>₹{cart?.totalAmount.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={styles.checkoutBtn}
            onPress={() => navigation.navigate("CartReview", { sessionCode })}
          >
            <Text style={styles.checkoutBtnText}>Proceed to Checkout →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 16, backgroundColor: "#1e293b",
    borderBottomWidth: 1, borderBottomColor: "#334155",
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#fff" },
  headerSub: { fontSize: 12, color: "#94a3b8" },
  cameraToggle: {
    backgroundColor: "#334155", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  cameraContainer: { height: 200, position: "relative" },
  camera: { flex: 1 },
  scanStatus: {
    position: "absolute", bottom: 8, alignSelf: "center",
    backgroundColor: "rgba(15,23,42,0.85)",
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  scanStatusText: { fontSize: 13, fontWeight: "600" },
  manualRow: {
    flexDirection: "row", padding: 12, gap: 10,
    borderBottomWidth: 1, borderBottomColor: "#1e293b",
  },
  manualInput: {
    flex: 1, backgroundColor: "#1e293b",
    borderWidth: 1, borderColor: "#334155", borderRadius: 8,
    padding: 10, color: "#fff", fontSize: 14,
  },
  addBtn: {
    backgroundColor: "#047857", borderRadius: 8,
    paddingHorizontal: 16, justifyContent: "center",
  },
  addBtnText: { color: "#fff", fontWeight: "700" },
  cartList: { flex: 1 },
  emptyCart: { textAlign: "center", color: "#475569", marginTop: 40, fontSize: 14 },
  cartItem: {
    flexDirection: "row", alignItems: "center",
    padding: 14, borderBottomWidth: 1, borderBottomColor: "#1e293b",
  },
  cartItemInfo: { flex: 1 },
  cartItemName: { fontSize: 14, fontWeight: "600", color: "#e2e8f0" },
  cartItemPrice: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  cartItemControls: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#334155", alignItems: "center", justifyContent: "center",
  },
  qtyBtnText: { color: "#e2e8f0", fontSize: 16, fontWeight: "700" },
  qtyText: { color: "#e2e8f0", fontWeight: "700", minWidth: 20, textAlign: "center" },
  footer: {
    padding: 16, backgroundColor: "#1e293b",
    borderTopWidth: 1, borderTopColor: "#334155", gap: 8,
  },
  totalsRow: { flexDirection: "row", justifyContent: "space-between" },
  totalLabel: { color: "#94a3b8", fontSize: 14 },
  totalValue: { color: "#e2e8f0", fontSize: 14 },
  grandTotalRow: {
    borderTopWidth: 1, borderTopColor: "#334155",
    paddingTop: 8, marginTop: 4,
  },
  grandTotalLabel: { color: "#fff", fontSize: 17, fontWeight: "700" },
  grandTotalValue: { color: "#10b981", fontSize: 20, fontWeight: "800" },
  checkoutBtn: {
    backgroundColor: "#047857", borderRadius: 12,
    padding: 15, alignItems: "center", marginTop: 4,
  },
  checkoutBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
