import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { useAuthStore } from "../store/authStore";
import { loginUser } from "../services/authApi";
import { registerPushToken } from "../services/pushApi";
import { RootStackParamList } from "../types";

type Nav = StackNavigationProp<RootStackParamList, "Login">;

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { setAuth } = useAuthStore();
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPwd, setShowPwd]     = useState(false);
  const [loading, setLoading]     = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Validation", "Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const { user, token } = await loginUser({ email: email.trim().toLowerCase(), password });
      await setAuth(user, token);
      await registerPushToken();
      navigation.replace("QRScan");
    } catch (err) {
      Alert.alert("Login Failed", (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.logoIcon}>🛒</Text>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Fresh Mart Self-Billing</Text>
      </View>

      <View style={styles.form}>
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

        {/* Password with show/hide toggle */}
        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Your password"
            placeholderTextColor="#475569"
            secureTextEntry={!showPwd}
            value={password}
            onChangeText={setPassword}
            editable={!loading}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPwd(v => !v)}
            accessibilityLabel={showPwd ? "Hide password" : "Show password"}
          >
            <Text style={styles.eyeIcon}>{showPwd ? "🙈" : "👁️"}</Text>
          </TouchableOpacity>
        </View>

        {/* Forgot Password link */}
        <TouchableOpacity
          style={styles.forgotWrap}
          onPress={() => navigation.navigate("ForgotPassword")}
        >
          <Text style={styles.forgotLink}>Forgot password?</Text>
        </TouchableOpacity>

        {/* Sign In button */}
        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Sign In</Text>}
        </TouchableOpacity>

        {/* Register link */}
        <TouchableOpacity onPress={() => navigation.navigate("Register")}>
          <Text style={styles.linkText}>
            Don't have an account?{" "}
            <Text style={styles.link}>Register</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const SURFACE = "#1e293b";
const BORDER  = "#334155";
const GREEN   = "#10b981";

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: "#0f172a", justifyContent: "center", padding: 24 },
  header:      { alignItems: "center", marginBottom: 40 },
  logoIcon:    { fontSize: 48, marginBottom: 12 },
  title:       { fontSize: 26, fontWeight: "800", color: "#ffffff" },
  subtitle:    { fontSize: 14, color: "#94a3b8", marginTop: 4 },
  form:        { gap: 14 },
  label:       { fontSize: 13, color: "#94a3b8", fontWeight: "600", marginBottom: -8 },

  input: {
    backgroundColor: SURFACE,
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 10, padding: 14,
    color: "#ffffff", fontSize: 15,
  },

  /* password with eye button */
  passwordRow: {
    flexDirection: "row",
    backgroundColor: SURFACE,
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 10, overflow: "hidden",
  },
  passwordInput: {
    flex: 1, padding: 14, color: "#fff", fontSize: 15,
  },
  eyeBtn: {
    paddingHorizontal: 14, justifyContent: "center", alignItems: "center",
  },
  eyeIcon: { fontSize: 18 },

  forgotWrap:  { alignItems: "flex-end", marginTop: -6 },
  forgotLink:  { color: GREEN, fontSize: 13, fontWeight: "600" },

  btn:         { backgroundColor: "#047857", borderRadius: 10, padding: 15, alignItems: "center", marginTop: 4 },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: "#ffffff", fontWeight: "700", fontSize: 16 },
  linkText:    { textAlign: "center", color: "#64748b", fontSize: 13, marginTop: 4 },
  link:        { color: GREEN, fontWeight: "600" },
});
