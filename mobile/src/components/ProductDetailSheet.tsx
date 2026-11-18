import React from "react";
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Product } from "../types";
import { NutriScoreBadge } from "./NutriScoreBadge";

interface ProductDetailSheetProps {
  product: Product | null;
  onClose: () => void;
}

export function ProductDetailSheet({ product, onClose }: ProductDetailSheetProps) {
  return (
    <Modal
      visible={product !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Drag handle */}
          <View style={styles.handle} />

          {product && (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollBody}>
              {/* Header */}
              <View style={styles.headerRow}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.categoryTag}>{product.category}</Text>
              </View>
              {product.unit ? (
                <Text style={styles.unitText}>{product.unit}</Text>
              ) : null}

              {/* Nutri-Score */}
              {product.nutriScore && (
                <View style={styles.row}>
                  <Text style={styles.label}>Nutri-Score</Text>
                  <NutriScoreBadge score={product.nutriScore} />
                </View>
              )}

              {/* Calories */}
              {product.calories != null && (
                <View style={styles.row}>
                  <Text style={styles.label}>Calories</Text>
                  <Text style={styles.value}>{product.calories} kcal</Text>
                </View>
              )}

              {/* Allergens */}
              {product.allergens && product.allergens.length > 0 && (
                <View style={styles.row}>
                  <Text style={styles.label}>Allergens</Text>
                  <View style={styles.pillWrap}>
                    {product.allergens.map((a) => (
                      <View key={a} style={styles.allergenPill}>
                        <Text style={styles.allergenText}>{a}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Dietary flags */}
              {product.dietaryFlags && product.dietaryFlags.length > 0 && (
                <View style={styles.row}>
                  <Text style={styles.label}>Diet</Text>
                  <View style={styles.pillWrap}>
                    {product.dietaryFlags.map((d) => (
                      <View key={d} style={styles.dietPill}>
                        <Text style={styles.dietText}>{d}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Location */}
              {product.aisle && (
                <View style={styles.row}>
                  <Text style={styles.label}>Location</Text>
                  <Text style={styles.value}>
                    {product.aisle}
                    {product.shelf ? ` · ${product.shelf}` : ""}
                    {product.bay != null ? ` · Bay ${product.bay}` : ""}
                  </Text>
                </View>
              )}

              {/* Clearance banner */}
              {product.clearanceDiscountPercent && product.clearanceDiscountPercent > 0 && (
                <View style={styles.clearanceBanner}>
                  <Text style={styles.clearanceText}>
                    🏷️ CLEARANCE {product.clearanceDiscountPercent}% OFF
                  </Text>
                  {product.expiryDate && (
                    <Text style={styles.clearanceExpiry}>
                      Expires {new Date(product.expiryDate).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              )}

              {/* Close button */}
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Text style={styles.closeBtnText}>Dismiss</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.55)",
  },
  sheet: {
    backgroundColor: "#f8fafc",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "65%",
    paddingBottom: 24,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#cbd5e1",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    marginBottom: 4,
  },
  productName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    flexShrink: 1,
  },
  categoryTag: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  unitText: {
    fontSize: 13,
    color: "#94a3b8",
    marginBottom: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#94a3b8",
    minWidth: 80,
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    flexShrink: 1,
  },
  nutriBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  nutriBadgeText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
  },
  nutriLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  pillWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    flexShrink: 1,
  },
  allergenPill: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  allergenText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#b91c1c",
  },
  dietPill: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  dietText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803d",
  },
  clearanceBanner: {
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  clearanceText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#c2410c",
  },
  clearanceExpiry: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9a3412",
    marginTop: 2,
  },
  closeBtn: {
    backgroundColor: "#e2e8f0",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#475569",
  },
});
