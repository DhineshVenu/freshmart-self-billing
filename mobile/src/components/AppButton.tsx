import React from "react";
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, type ViewStyle } from "react-native";
import { colors } from "../theme/colors";

export type AppButtonVariant = "primary" | "secondary" | "danger";

export interface AppButtonProps {
  title: string;
  onPress?: () => void;
  /** Visual style. Defaults to "primary". */
  variant?: AppButtonVariant;
  /** When true, shows a spinner and disables interaction. */
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

/**
 * Themed button used across the app. Supports three variants and a loading
 * state (renders an ActivityIndicator while loading={true}).
 */
export function AppButton({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
}: AppButtonProps) {
  const backgroundColor =
    variant === "primary"
      ? colors.primary
      : variant === "secondary"
        ? colors.secondary
        : colors.danger;

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        variant === "secondary" && styles.secondaryBorder,
        { backgroundColor },
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" ? colors.textMuted : "#ffffff"} />
      ) : (
        <Text
          style={[
            styles.text,
            variant === "secondary" && styles.secondaryText,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBorder: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryText: {
    color: colors.text,
  },
  disabled: {
    opacity: 0.6,
  },
});
