import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, ScrollView,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RouteProp } from "@react-navigation/native";
import { getSessionByCode, joinSession } from "../services/sessionApi";
import { useSessionStore } from "../store/sessionStore";
import { useAuthStore } from "../store/authStore";
import { RootStackParamList, ShoppingSession } from "../types";

type Nav = StackNavigationProp<RootStackParamList, "JoinSession">;
type Route = RouteProp<RootStackParamList, "JoinSession">;

export default function JoinSessionScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { code } = route.params;
  const { setSession } = useSessionStore();
  const { user } = useAuthStore();

  const [session, setLocalSession] = useState<ShoppingSession | null>(null);
  const [customerName, setCustomerName] = useState(user?.name ?? "");
  const [customerEmail, setCustomerEmail] = useState(user?.email ?? "");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const s = await getSessionByCode(code);
        setLocalSession(s);
      } catch (err) {
        Alert.alert("Session Not Found", (err as Error).message, [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [code, navigation]);

  const handleJoin = async () => {
    if (!customerName.trim()) {
      Alert.alert("Validation", "Please enter your name.");
      return;
    }
    setJoining(true);
    try {
      const joined = await joinSession(code, customerName.trim(), customerEmail.trim());
      await setSession(joined);
      navigation.navigate("Shopping", {
        sessionCode: joined.id,
        customerName: joined.joinedCustomerName ?? customerName,
        storeName: joined.storeName,
      });
    } catch (err) {
      Alert.alert("Could not join session", (err as Error).message);
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#10b981" size="large" />
        <Text style={styles.loadingText}>Loading session…</Text>
      </View>
    );
  }

  if (!session) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Store card */}
      <View style={styles.storeCard}>
        <Text style={styles.storeIcon}>🏪</Text>
        <Text style={styles.storeName}>{session.storeName}</Text>
        <Text style={styles.sessionId}>Session #{session.id.slice(0, 8)}…</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{session.status}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Your Details</Text>

      <Text style={styles.label}>Full Name *</Text>
      <TextInput
        style={styles.input}
        value={customerName}
        onChangeText={setCustomerName}
        placeholder="Enter your name"
        placeholderTextColor="#475569"
        autoCapitalize="words"
      />

      <Text style={styles.label}>Email Address</Text>
      <TextInput
        style={styles.input}
        value={customerEmail}
        onChangeText={setCustomerEmail}
        placeholder="your@email.com (optional)"
        placeholderTextColor="#475569"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Text style={styles.emailHint}>Your digital receipt will be sent here after payment.</Text>

      <TouchableOpacity
        style={[styles.joinBtn, joining && styles.btnDisabled]}
        onPress={handleJoin}
        disabled={joining}
      >
        {joining
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.joinBtnText}>Start Shopping →</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={styles.backBtnText}>← Scan Different QR Code</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  content: { padding: 24, gap: 14 },
  centered: { flex: 1, backgroundColor: "#0f172a", alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: "#94a3b8", fontSize: 14 },
  storeCard: {
    backgroundColor: "#1e293b", borderRadius: 14,
    padding: 20, alignItems: "center", gap: 6, marginBottom: 8,
    borderWidth: 1, borderColor: "#334155",
  },
  storeIcon: { fontSize: 36, marginBottom: 4 },
  storeName: { fontSize: 20, fontWeight: "700", color: "#fff" },
  sessionId: { fontSize: 12, color: "#64748b", fontFamily: "monospace" },
  statusBadge: {
    backgroundColor: "#064e3b", borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4, marginTop: 4,
  },
  statusText: { color: "#10b981", fontWeight: "700", fontSize: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#fff", marginTop: 8 },
  label: { fontSize: 13, color: "#94a3b8", fontWeight: "600" },
  input: {
    backgroundColor: "#1e293b", borderWidth: 1, borderColor: "#334155",
    borderRadius: 10, padding: 14, color: "#fff", fontSize: 15,
  },
  emailHint: { fontSize: 12, color: "#475569", marginTop: -8 },
  joinBtn: {
    backgroundColor: "#047857", borderRadius: 12,
    padding: 16, alignItems: "center", marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  joinBtnText: { color: "#fff", fontWeight: "700", fontSize: 17 },
  backBtn: { alignItems: "center", paddingVertical: 12 },
  backBtnText: { color: "#64748b", fontSize: 13 },
});
