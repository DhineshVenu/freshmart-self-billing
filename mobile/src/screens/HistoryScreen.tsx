import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { getMyOrders } from "../services/checkoutApi";
import { Order, RootStackParamList } from "../types";

type Nav = StackNavigationProp<RootStackParamList, "History">;

const STATUS_COLORS: Record<string, string> = {
  PAID: "#10b981",
  PENDING: "#f59e0b",
  CANCELLED: "#ef4444",
};

function OrderCard({ order, onPress }: { order: Order; onPress: () => void }) {
  const date = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = new Date(order.createdAt).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const statusColor = STATUS_COLORS[order.status] ?? "#94a3b8";

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardTop}>
        <View>
          <Text style={styles.orderNo}>{order.orderNo}</Text>
          <Text style={styles.orderStore}>{order.storeName}</Text>
        </View>
        <View>
          <Text style={[styles.statusBadge, { color: statusColor }]}>{order.status}</Text>
          <Text style={styles.orderTotal}>₹{order.totalAmount.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.cardBottom}>
        <Text style={styles.orderMeta}>
          {order.items.length} item{order.items.length !== 1 ? "s" : ""} ·{" "}
          {order.paymentMethod ?? "UPI"}
        </Text>
        <Text style={styles.orderDate}>{date} {time}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const navigation = useNavigation<Nav>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getMyOrders();
      setOrders(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#10b981" size="large" />
        <Text style={styles.loadingText}>Loading your receipts…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary header */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          {orders.length} order{orders.length !== 1 ? "s" : ""}
        </Text>
        <Text style={styles.summaryTotal}>
          Total: ₹{orders
            .filter((o) => o.status === "PAID")
            .reduce((sum, o) => sum + o.totalAmount, 0)
            .toFixed(2)}
        </Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={() => navigation.navigate("Receipt", { orderId: item._id })}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor="#10b981"
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🧾</Text>
            <Text style={styles.emptyTitle}>No Orders Yet</Text>
            <Text style={styles.emptyHint}>
              Complete your first shopping session to see your receipts here.
            </Text>
            <TouchableOpacity
              style={styles.shopBtn}
              onPress={() => navigation.navigate("QRScan")}
            >
              <Text style={styles.shopBtnText}>Start Shopping →</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  centered: {
    flex: 1, backgroundColor: "#0f172a",
    alignItems: "center", justifyContent: "center", gap: 14, padding: 28,
  },
  loadingText: { color: "#94a3b8" },
  errorIcon: { fontSize: 48 },
  errorText: { color: "#f87171", textAlign: "center" },
  retryBtn: { backgroundColor: "#1e293b", borderRadius: 10, padding: 12, paddingHorizontal: 24 },
  retryBtnText: { color: "#e2e8f0", fontWeight: "600" },
  summaryBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#1e293b",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  summaryText: { color: "#94a3b8", fontSize: 13 },
  summaryTotal: { color: "#10b981", fontWeight: "700", fontSize: 14 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
    gap: 10,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  orderNo: { fontSize: 15, fontWeight: "700", color: "#e2e8f0", fontFamily: "monospace" },
  orderStore: { fontSize: 12, color: "#64748b", marginTop: 2 },
  statusBadge: { fontSize: 11, fontWeight: "700", textAlign: "right" },
  orderTotal: { fontSize: 18, fontWeight: "800", color: "#fff", textAlign: "right" },
  cardBottom: { flexDirection: "row", justifyContent: "space-between" },
  orderMeta: { fontSize: 12, color: "#475569" },
  orderDate: { fontSize: 12, color: "#475569" },
  empty: { alignItems: "center", paddingTop: 80, gap: 12, padding: 28 },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#fff" },
  emptyHint: { textAlign: "center", color: "#94a3b8", fontSize: 14, lineHeight: 22 },
  shopBtn: { backgroundColor: "#047857", borderRadius: 10, padding: 14, paddingHorizontal: 28, marginTop: 8 },
  shopBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
