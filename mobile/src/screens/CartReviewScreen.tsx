import React, { useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RouteProp } from "@react-navigation/native";
import { processCheckout } from "../services/checkoutApi";
import { useCartStore } from "../store/cartStore";
import { CartItem, PaymentMethod, RootStackParamList } from "../types";

type Nav = StackNavigationProp<RootStackParamList, "CartReview">;
type Route = RouteProp<RootStackParamList, "CartReview">;

const PAYMENT_METHODS: PaymentMethod[] = ["UPI", "CASH", "CARD"];

export default function CartReviewScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { sessionCode } = route.params;
  const { cart } = useCartStore();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("UPI");
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (!cart || cart.items.length === 0) {
      Alert.alert("Empty Cart", "Add items to your cart before checking out.");
      return;
    }
    setLoading(true);
    try {
      const { order } = await processCheckout(sessionCode, paymentMethod);
      navigation.navigate("PaymentPending", { orderId: order._id, sessionCode });
    } catch (err) {
      Alert.alert("Checkout Failed", (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: CartItem }) => (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemBarcode}>#{item.barcode} · {item.unit}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.itemQty}>×{item.quantity}</Text>
        <Text style={styles.itemTotal}>₹{item.lineTotal.toFixed(2)}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>Review Your Cart</Text>

      <FlatList
        data={cart?.items ?? []}
        keyExtractor={(item) => item.productId}
        renderItem={renderItem}
        style={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Your cart is empty.</Text>}
      />

      {/* Payment method selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.methodRow}>
          {PAYMENT_METHODS.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.methodBtn, paymentMethod === m && styles.methodBtnActive]}
              onPress={() => setPaymentMethod(m)}
            >
              <Text style={[styles.methodBtnText, paymentMethod === m && styles.methodBtnTextActive]}>
                {m === "UPI" ? "💳 UPI" : m === "CASH" ? "💵 Cash" : "🏦 Card"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Totals */}
      <View style={styles.totals}>
        <View style={styles.totalsRow}><Text style={styles.totalsLabel}>Subtotal</Text><Text style={styles.totalsValue}>₹{cart?.subtotal.toFixed(2) ?? "0.00"}</Text></View>
        <View style={styles.totalsRow}><Text style={styles.totalsLabel}>GST (5%)</Text><Text style={styles.totalsValue}>₹{cart?.taxAmount.toFixed(2) ?? "0.00"}</Text></View>
        <View style={[styles.totalsRow, styles.grandRow]}>
          <Text style={styles.grandLabel}>Grand Total</Text>
          <Text style={styles.grandValue}>₹{cart?.totalAmount.toFixed(2) ?? "0.00"}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.checkoutBtn, loading && styles.btnDisabled]}
        onPress={handleCheckout}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.checkoutBtnText}>Confirm & Checkout →</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>← Back to Shopping</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 20 },
  pageTitle: { fontSize: 22, fontWeight: "800", color: "#fff", marginBottom: 16 },
  list: { flex: 1 },
  empty: { textAlign: "center", color: "#475569", marginTop: 32 },
  row: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1e293b",
  },
  rowLeft: { flex: 1 },
  rowRight: { alignItems: "flex-end", gap: 2 },
  itemName: { fontSize: 14, fontWeight: "600", color: "#e2e8f0" },
  itemBarcode: { fontSize: 11, color: "#64748b", fontFamily: "monospace", marginTop: 2 },
  itemQty: { fontSize: 13, color: "#94a3b8" },
  itemTotal: { fontSize: 14, fontWeight: "700", color: "#e2e8f0" },
  section: { marginVertical: 16 },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: "#94a3b8", marginBottom: 10 },
  methodRow: { flexDirection: "row", gap: 10 },
  methodBtn: {
    flex: 1, borderWidth: 1, borderColor: "#334155",
    borderRadius: 10, padding: 12, alignItems: "center",
    backgroundColor: "#1e293b",
  },
  methodBtnActive: { borderColor: "#047857", backgroundColor: "#064e3b" },
  methodBtnText: { color: "#94a3b8", fontWeight: "600", fontSize: 13 },
  methodBtnTextActive: { color: "#10b981" },
  totals: {
    backgroundColor: "#1e293b", borderRadius: 12,
    padding: 16, gap: 8, marginBottom: 16,
  },
  totalsRow: { flexDirection: "row", justifyContent: "space-between" },
  totalsLabel: { color: "#94a3b8", fontSize: 14 },
  totalsValue: { color: "#e2e8f0", fontSize: 14 },
  grandRow: { borderTopWidth: 1, borderTopColor: "#334155", paddingTop: 10, marginTop: 4 },
  grandLabel: { color: "#fff", fontSize: 16, fontWeight: "700" },
  grandValue: { color: "#10b981", fontSize: 20, fontWeight: "800" },
  checkoutBtn: {
    backgroundColor: "#047857", borderRadius: 12,
    padding: 16, alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  checkoutBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  backBtn: { alignItems: "center", paddingVertical: 12 },
  backBtnText: { color: "#64748b", fontSize: 13 },
});
