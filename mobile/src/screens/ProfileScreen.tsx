import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { getProfile, redeemBounty, logoutUser } from "../services/authApi";
import { useAuthStore } from "../store/authStore";
import { CustomerProfile, RootStackParamList } from "../types";

type Nav = StackNavigationProp<RootStackParamList, "Profile">;

/**
 * ProfileScreen — shows the authenticated customer's profile, their Fresh Points
 * loyalty balance, a redeem-points control, and a logout button.
 */
export default function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { clearAuth } = useAuthStore();

  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redeemInput, setRedeemInput] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await getProfile();
      setProfile(p);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleRedeem = async () => {
    const points = parseInt(redeemInput, 10);
    if (!Number.isFinite(points) || points <= 0) {
      Alert.alert("Invalid amount", "Enter a positive whole number of points to redeem.");
      return;
    }
    setRedeeming(true);
    try {
      const result = await redeemBounty(points);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              bountyPoints: result.bountyPoints,
              bountyWalletBalance: result.bountyWalletBalance,
            }
          : prev
      );
      setRedeemInput("");
      Alert.alert(
        "Redeemed ✓",
        `Redeemed ${result.redeemed} Fresh Points for ₹${result.walletDebit} wallet credit.`
      );
    } catch (err) {
      Alert.alert("Redeem failed", (err as Error).message);
    } finally {
      setRedeeming(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {
      // Best-effort — clear local auth regardless
    }
    await clearAuth();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#10b981" size="large" />
        <Text style={styles.loadingText}>Loading profile…</Text>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error ?? "Profile not found"}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadProfile}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar + identity */}
      <View style={styles.avatarRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{profile.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.email}>{profile.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{profile.role.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      {/* Loyalty wallet */}
      <View style={styles.walletCard}>
        <Text style={styles.walletTitle}>🏆 Fresh Points Wallet</Text>
        <View style={styles.walletStats}>
          <View style={styles.walletStat}>
            <Text style={styles.walletStatLabel}>Fresh Points</Text>
            <Text style={styles.walletStatVal}>{profile.bountyPoints}</Text>
          </View>
          <View style={styles.walletDivider} />
          <View style={styles.walletStat}>
            <Text style={styles.walletStatLabel}>Wallet Balance</Text>
            <Text style={styles.walletStatVal}>
              ₹{profile.bountyWalletBalance.toFixed(2)}
            </Text>
          </View>
        </View>

        <Text style={styles.redeemHint}>1 point = ₹0.50 wallet credit</Text>

        <View style={styles.redeemRow}>
          <TextInput
            style={styles.redeemInput}
            placeholder="Points to redeem"
            placeholderTextColor="#64748b"
            keyboardType="numeric"
            value={redeemInput}
            onChangeText={setRedeemInput}
          />
          <TouchableOpacity
            style={[styles.redeemBtn, redeeming && styles.btnDisabled]}
            onPress={handleRedeem}
            disabled={redeeming}
          >
            {redeeming ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.redeemBtnText}>Redeem</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick-redeem chips */}
        <View style={styles.chipRow}>
          {[10, 25, 50].map((n) => (
            <TouchableOpacity
              key={n}
              style={styles.chip}
              onPress={() => setRedeemInput(String(n))}
            >
              <Text style={styles.chipText}>Redeem {n}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  centered: {
    flex: 1,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    padding: 28,
  },
  loadingText: { color: "#94a3b8" },
  errorIcon: { fontSize: 48 },
  errorText: { color: "#f87171", textAlign: "center" },
  retryBtn: {
    backgroundColor: "#1e293b",
    borderRadius: 10,
    padding: 12,
    paddingHorizontal: 24,
  },
  retryBtnText: { color: "#e2e8f0", fontWeight: "600" },

  /* avatar / identity */
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#047857",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 26, fontWeight: "800" },
  name: { color: "#fff", fontSize: 18, fontWeight: "700" },
  email: { color: "#94a3b8", fontSize: 13, marginTop: 2 },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 6,
  },
  roleText: { color: "#38bdf8", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },

  /* wallet */
  walletCard: {
    backgroundColor: "#064e3b",
    borderWidth: 1,
    borderColor: "#10b981",
    borderRadius: 16,
    padding: 18,
    gap: 14,
  },
  walletTitle: { color: "#6ee7b7", fontSize: 15, fontWeight: "700" },
  walletStats: { flexDirection: "row", alignItems: "center" },
  walletStat: { flex: 1, gap: 2 },
  walletStatLabel: {
    color: "#6ee7b7",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.04,
    textTransform: "uppercase",
  },
  walletStatVal: { color: "#fff", fontSize: 20, fontWeight: "800" },
  walletDivider: { width: 1, height: 32, backgroundColor: "#10b981", opacity: 0.5 },

  redeemHint: { color: "#a7f3d0", fontSize: 12 },
  redeemRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  redeemInput: {
    flex: 1,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    padding: 12,
    color: "#e2e8f0",
    fontSize: 14,
  },
  redeemBtn: {
    backgroundColor: "#10b981",
    borderRadius: 10,
    padding: 12,
    paddingHorizontal: 22,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  redeemBtnText: { color: "#06281f", fontWeight: "800", fontSize: 14 },

  chipRow: { flexDirection: "row", gap: 8 },
  chip: {
    flex: 1,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  chipText: { color: "#94a3b8", fontWeight: "600", fontSize: 12 },

  logoutBtn: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#7f1d1d",
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
  },
  logoutBtnText: { color: "#fca5a5", fontWeight: "700", fontSize: 15 },
});
