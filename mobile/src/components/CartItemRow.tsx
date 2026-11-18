import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { CartItem } from "../types";
import { colors } from "../theme/colors";

export interface CartItemRowProps {
  item: CartItem;
  /**
   * When true, renders the editable quantity-stepper row (used by the
   * active shopping cart). When false, renders a read-only summary row
   * (used by the cart review screen).
   */
  editable?: boolean;
  /** Required when editable. Called with the new quantity on +/− taps. */
  onUpdateQty?: (productId: string, quantity: number) => void;
}

/**
 * Reusable cart item row. Replaces the duplicated inline row rendering that
 * previously lived in ShoppingScreen (editable stepper) and CartReviewScreen
 * (read-only summary). The output is visually identical to the originals.
 */
export function CartItemRow({ item, editable = false, onUpdateQty }: CartItemRowProps) {
  if (editable) {
    return (
      <View style={editableStyles.cartItem}>
        <View style={editableStyles.cartItemInfo}>
          <Text style={editableStyles.cartItemName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={editableStyles.cartItemPrice}>
            ₹{item.price.toFixed(2)} × {item.quantity} ={" "}
            <Text style={{ color: colors.primaryAccent, fontWeight: "700" }}>
              ₹{item.lineTotal.toFixed(2)}
            </Text>
          </Text>
        </View>
        <View style={editableStyles.cartItemControls}>
          <TouchableOpacity
            style={editableStyles.qtyBtn}
            onPress={() => onUpdateQty?.(item.productId, item.quantity - 1)}
          >
            <Text style={editableStyles.qtyBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={editableStyles.qtyText}>{item.quantity}</Text>
          <TouchableOpacity
            style={editableStyles.qtyBtn}
            onPress={() => onUpdateQty?.(item.productId, item.quantity + 1)}
          >
            <Text style={editableStyles.qtyBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={readonlyStyles.row}>
      <View style={readonlyStyles.rowLeft}>
        <Text style={readonlyStyles.itemName}>{item.name}</Text>
        <Text style={readonlyStyles.itemBarcode}>
          #{item.barcode} · {item.unit}
        </Text>
      </View>
      <View style={readonlyStyles.rowRight}>
        <Text style={readonlyStyles.itemQty}>×{item.quantity}</Text>
        <Text style={readonlyStyles.itemTotal}>₹{item.lineTotal.toFixed(2)}</Text>
      </View>
    </View>
  );
}

const editableStyles = StyleSheet.create({
  cartItem: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
    alignItems: "center",
  },
  cartItemInfo: { flex: 1, paddingRight: 8 },
  cartItemName: { fontSize: 13, fontWeight: "600", color: colors.text },
  cartItemPrice: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  cartItemControls: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  qtyBtnText: { color: colors.text, fontSize: 16, fontWeight: "700" },
  qtyText: {
    color: colors.text,
    fontWeight: "700",
    minWidth: 22,
    textAlign: "center",
  },
});

const readonlyStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  rowLeft: { flex: 1 },
  rowRight: { alignItems: "flex-end", gap: 2 },
  itemName: { fontSize: 14, fontWeight: "600", color: colors.text },
  itemBarcode: {
    fontSize: 11,
    color: colors.textDim,
    fontFamily: "monospace",
    marginTop: 2,
  },
  itemQty: { fontSize: 13, color: colors.textMuted },
  itemTotal: { fontSize: 14, fontWeight: "700", color: colors.text },
});
