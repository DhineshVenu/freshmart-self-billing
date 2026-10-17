import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { useAuthStore } from "../store/authStore";
import { registerUser } from "../services/authApi";
import { registerPushToken } from "../services/pushApi";
import { RootStackParamList } from "../types";

type Nav = StackNavigationProp<RootStackParamList, "Register">;

export default function RegisterScreen() {
  const navigation = useNavigation<Nav>();
  const { setAuth } = useAuthStore();
  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showPwd, setShowPwd]     = useState(false);
  const [showCfm, setShowCfm]     = useState(false);
  const [loading, setLoading]     = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Validation", "All fields are required.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Validation", "Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Validation", "Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const { user, token } = await registerUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      await setAuth(user, token);
      await registerPushToken();
      navigation.replace("QRScan");
    } catch (err) {
      Alert.alert("Registration Failed", (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logoIcon}>🛒</Text>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Fresh Mart Self-Billing</Text>
        </View>

        <View style={styles.form}>
          {/* Full Name */}
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your full name"
            placeholderTextColor="#475569"
            autoCapitalize="words"
            value={name}
            onChangeText={setName}
            editable={!loading}
          />

          {/* Email */}
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#475569"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            editable={!loading}
          />

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Min. 6 characters"
              placeholderTextColor="#475569"
              secureTextEntry={!showPwd}
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPwd(v => !v)}
              accessibilityLabel={showPwd ? "Hide password" : "Show password"}
            >
              <Text style={styles.eyeIcon}>{showPwd ? "🙈" : "👁️"}</Text>
            </TouchableOpacity>
          </View>

          {/* Confirm Password */}
          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Repeat password"
              placeholderTextColor="#475569"
              secureTextEntry={!showCfm}
              value={confirm}
              onChangeText={setConfirm}
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowCfm(v => !v)}
              accessibilityLabel={showCfm ? "Hide password" : "Show password"}
            >
              <Text style={styles.eyeIcon}>{showCfm ? "🙈" : "👁️"}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Create Account</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.linkText}>
              Already have an account?{" "}
              <Text style={styles.link}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const SURFACE = "#1e293b";
const BORDER  = "#334155";
const GREEN   = "#10b981";

const styles = StyleSheet.create({
  wrapper:      { flex: 1, backgroundColor: "#0f172a" },
  container:    { padding: 24, justifyContent: "center", minHeight: "100%" as any },
  header:       { alignItems: "center", marginBottom: 36 },
  logoIcon:     { fontSize: 48, marginBottom: 12 },
  title:        { fontSize: 24, fontWeight: "800", color: "#ffffff" },
  subtitle:     { fontSize: 14, color: "#94a3b8", marginTop: 4 },
  form:         { gap: 14 },
  label:        { fontSize: 13, color: "#94a3b8", fontWeight: "600", marginBottom: -8 },
  input: {
    backgroundColor: SURFACE,
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 10, padding: 14,
    color: "#ffffff", fontSize: 15,
  },
  passwordRow: {
    flexDirection: "row",
    backgroundColor: SURFACE,
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 10, overflow: "hidden",
  },
  passwordInput: { flex: 1, padding: 14, color: "#fff", fontSize: 15 },
  eyeBtn:        { paddingHorizontal: 14, justifyContent: "center", alignItems: "center" },
  eyeIcon:       { fontSize: 18 },
  btn:           { backgroundColor: "#047857", borderRadius: 10, padding: 15, alignItems: "center", marginTop: 8 },
  btnDisabled:   { opacity: 0.6 },
  btnText:       { color: "#ffffff", fontWeight: "700", fontSize: 16 },
  linkText:      { textAlign: "center", color: "#64748b", fontSize: 13, marginTop: 8 },
  link:          { color: GREEN, fontWeight: "600" },
});
