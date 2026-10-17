import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RouteProp } from "@react-navigation/native";
import { getOrderById } from "../services/checkoutApi";
import { Order, RootStackParamList } from "../types";

type Nav = StackNavigationProp<RootStackParamList, "Receipt">;
type Route = RouteProp<RootStackParamList, "Receipt">;

export default function ReceiptScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { orderId } = route.params;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOrderById(orderId)
      .then(setOrder)
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [orderId]);

  const handleShare = async () => {
    if (!order) return;
    try {
      await Share.share({
        message: `Fresh Mart Receipt\nOrder: ${order.orderNo}\nTotal: ₹${order.totalAmount.toFixed(2)}\nDate: ${new Date(order.createdAt).toLocaleDateString("en-IN")}`,
        title: `Fresh Mart Receipt - ${order.orderNo}`,
      });
    } catch {
      // Share cancelled
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#10b981" size="large" />
        <Text style={styles.loadingText}>Loading receipt…</Text>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error ?? "Order not found"}</Text>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate("History")}>
          <Text style={styles.btnText}>View History</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const paidDate = order.paidAt
    ? new Date(order.paidAt).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.checkmark}>✅</Text>
        <Text style={styles.headerTitle}>Payment Successful</Text>
        <Text style={styles.headerStore}>{order.storeName}</Text>
        <View style={styles.paidBadge}>
          <Text style={styles.paidBadgeText}>PAID via {order.paymentMethod ?? "UPI"}</Text>
        </View>
      </View>

      {/* Order meta */}
      <View style={styles.metaCard}>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Invoice No.</Text>
          <Text style={styles.metaValueBold}>{order.orderNo}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Customer</Text>
          <Text style={styles.metaValue}>{order.customerName}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Date & Time</Text>
          <Text style={styles.metaValue}>{paidDate}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Status</Text>
          <Text style={[styles.metaValue, { color: "#10b981", fontWeight: "700" }]}>
            {order.status}
          </Text>
        </View>
      </View>

      {/* Items */}
      <Text style={styles.sectionTitle}>Items Purchased</Text>
      <View style={styles.itemsCard}>
        {order.items.map((item, idx) => (
          <View
            key={item.productId}
            style={[styles.itemRow, idx > 0 && styles.itemRowBorder]}
          >
            <View style={styles.itemLeft}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemMeta}>
                #{item.barcode} · {item.unit} · ₹{item.price.toFixed(2)} ea
              </Text>
            </View>
            <View style={styles.itemRight}>
              <Text style={styles.itemQty}>×{item.quantity}</Text>
              <Text style={styles.itemTotal}>₹{item.lineTotal.toFixed(2)}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Tax breakdown */}
      <View style={styles.totalsCard}>
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>Subtotal</Text>
          <Text style={styles.totalsValue}>₹{order.subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>GST (5%)</Text>
          <Text style={styles.totalsValue}>₹{order.taxAmount.toFixed(2)}</Text>
        </View>
        <View style={[styles.totalsRow, styles.grandRow]}>
          <Text style={styles.grandLabel}>Grand Total</Text>
          <Text style={styles.grandValue}>₹{order.totalAmount.toFixed(2)}</Text>
        </View>
      </View>

      {/* Actions */}
      <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
        <Text style={styles.shareBtnText}>📤 Share Receipt</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.historyBtn} onPress={() => navigation.navigate("History")}>
        <Text style={styles.historyBtnText}>View All Receipts</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.navigate("QRScan")}>
        <Text style={styles.homeBtnText}>Start New Shopping Session</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>
        🌱 Thank you for choosing Fresh Mart Self-Checkout!{"\n"}
        This is your official GST tax invoice.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  centered: {
    flex: 1, backgroundColor: "#0f172a",
    alignItems: "center", justifyContent: "center", gap: 14, padding: 28,
  },
  loadingText: { color: "#94a3b8" },
  errorIcon: { fontSize: 48 },
  errorText: { color: "#f87171", textAlign: "center" },
  btn: { backgroundColor: "#047857", borderRadius: 10, padding: 14, paddingHorizontal: 28 },
  btnText: { color: "#fff", fontWeight: "700" },
  header: {
    backgroundColor: "#064e3b",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#10b981",
  },
  checkmark: { fontSize: 48 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#10b981" },
  headerStore: { fontSize: 14, color: "#6ee7b7" },
  paidBadge: {
    backgroundColor: "#10b981",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginTop: 4,
  },
  paidBadgeText: { color: "#fff", fontWeight: "700", fontSize: 12, letterSpacing: 0.5 },
  metaCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  metaLabel: { color: "#64748b", fontSize: 13 },
  metaValue: { color: "#e2e8f0", fontSize: 13 },
  metaValueBold: { color: "#e2e8f0", fontWeight: "700", fontSize: 14, fontFamily: "monospace" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#94a3b8" },
  itemsCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    overflow: "hidden",
  },
  itemRow: { flexDirection: "row", padding: 14 },
  itemRowBorder: { borderTopWidth: 1, borderTopColor: "#334155" },
  itemLeft: { flex: 1 },
  itemRight: { alignItems: "flex-end", gap: 2 },
  itemName: { fontSize: 14, fontWeight: "600", color: "#e2e8f0" },
  itemMeta: { fontSize: 11, color: "#64748b", fontFamily: "monospace", marginTop: 2 },
  itemQty: { fontSize: 12, color: "#94a3b8" },
  itemTotal: { fontSize: 14, fontWeight: "700", color: "#e2e8f0" },
  totalsCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  totalsRow: { flexDirection: "row", justifyContent: "space-between" },
  totalsLabel: { color: "#94a3b8", fontSize: 14 },
  totalsValue: { color: "#e2e8f0", fontSize: 14 },
  grandRow: { borderTopWidth: 1, borderTopColor: "#334155", paddingTop: 10, marginTop: 4 },
  grandLabel: { color: "#fff", fontWeight: "700", fontSize: 16 },
  grandValue: { color: "#10b981", fontWeight: "800", fontSize: 22 },
  shareBtn: {
    backgroundColor: "#1e3a5f",
    borderWidth: 1,
    borderColor: "#0284c7",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  shareBtnText: { color: "#38bdf8", fontWeight: "700", fontSize: 15 },
  historyBtn: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  historyBtnText: { color: "#94a3b8", fontWeight: "600" },
  homeBtn: {
    backgroundColor: "#047857",
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
  },
  homeBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  footer: {
    textAlign: "center",
    color: "#334155",
    fontSize: 12,
    lineHeight: 20,
    marginTop: 8,
  },
});
