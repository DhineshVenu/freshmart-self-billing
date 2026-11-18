import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Order } from "../types";
import { colors } from "../theme/colors";

export interface OrderCardProps {
  order: Order;
  onPress: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  PAID: colors.primaryAccent,
  PENDING: colors.warning,
  CANCELLED: colors.danger,
};

/**
 * Order summary card used in the purchase history list (and as a collapsed
 * receipt preview). Extracted from HistoryScreen so it can be reused.
 */
export function OrderCard({ order, onPress }: OrderCardProps) {
  const date = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = new Date(order.createdAt).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const statusColor = STATUS_COLORS[order.status] ?? colors.textMuted;

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
        <Text style={styles.orderDate}>
          {date} {time}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  orderNo: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    fontFamily: "monospace",
  },
  orderStore: { fontSize: 12, color: colors.textDim, marginTop: 2 },
  statusBadge: { fontSize: 11, fontWeight: "700", textAlign: "right" },
  orderTotal: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
    textAlign: "right",
  },
  cardBottom: { flexDirection: "row", justifyContent: "space-between" },
  orderMeta: { fontSize: 12, color: colors.textDim },
  orderDate: { fontSize: 12, color: colors.textDim },
});
