import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { nutriScoreColor, nutriScoreLabel } from "../utils/nutriScore";

export interface NutriScoreBadgeProps {
  score?: string;
  /** Size of the colored badge square. */
  size?: "sm" | "md";
}

/**
 * Nutri-Score badge — the colored grade square plus its human-readable label.
 * Extracted from ProductDetailSheet so it can be reused on product cards/listings.
 * Returns null when no score is provided.
 */
export function NutriScoreBadge({ score, size = "md" }: NutriScoreBadgeProps) {
  if (!score) return null;

  return (
    <>
      <View
        style={[
          styles.badge,
          { backgroundColor: nutriScoreColor(score) },
          size === "sm" && styles.badgeSm,
        ]}
      >
        <Text style={[styles.badgeText, size === "sm" && styles.badgeTextSm]}>{score}</Text>
      </View>
      <Text style={styles.label}>{nutriScoreLabel(score)}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeSm: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "800",
  },
  badgeTextSm: {
    fontSize: 13,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
});
