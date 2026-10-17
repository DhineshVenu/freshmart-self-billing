import React, { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useAuthStore } from "../store/authStore";
import { restoreCartFromStorage } from "../store/cartStore";
import { useSessionStore } from "../store/sessionStore";

export default function SplashScreen() {
  const { restoreAuth } = useAuthStore();
  const { restoreSession } = useSessionStore();

  useEffect(() => {
    const init = async () => {
      await Promise.all([restoreAuth(), restoreCartFromStorage(), restoreSession()]);
      // Navigation handled by RootNavigator based on isAuthenticated state
    };
    init();
  }, [restoreAuth, restoreSession]);

  return (
    <View style={styles.container}>
      <View style={styles.logoBox}>
        <Text style={styles.logoIcon}>🛒</Text>
      </View>
      <Text style={styles.title}>FRESH MART</Text>
      <Text style={styles.subtitle}>Self-Billing System</Text>
      <ActivityIndicator style={styles.spinner} color="#10b981" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "#047857",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  logoIcon: { fontSize: 40 },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 3,
  },
  subtitle: { fontSize: 14, color: "#94a3b8", letterSpacing: 1 },
  spinner: { marginTop: 32 },
});
