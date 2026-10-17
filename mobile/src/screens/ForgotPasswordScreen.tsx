/**
 * ForgotPasswordScreen
 * Step 1 → enter email → receive OTP
 * Step 2 → enter OTP + new password → reset
 *
 * Demo mode: OTP is shown on screen (returned by backend)
 * so the professor can complete the flow without email access.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { forgotPassword, resetPassword } from "../services/authApi";

type Nav = StackNavigationProp<RootStackParamList, "ForgotPassword">;

type Step = "email" | "otp";

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<Nav>();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [demoOtp, setDemoOtp] = useState(""); // shown on screen in demo
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  /* ── Step 1: request OTP ────────────────────────────────── */
  const handleRequestOtp = async () => {
    if (!email.trim()) {
      Alert.alert("Required", "Please enter your email address.");
      return;
    }
    setLoading(true);
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setDemoOtp("");
    try {
      const res = await forgotPassword(email.trim().toLowerCase());
      setDemoOtp(res.otp ?? "");
      setStep("otp");
    } catch (err) {
      Alert.alert("Couldn't send reset code", (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 2: verify OTP + set new password ──────────────── */
  const handleResetPassword = async () => {
    if (!otp.trim() || otp.trim().length !== 6) {
      Alert.alert("Invalid OTP", "Enter the 6-digit code.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Mismatch", "Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email.trim().toLowerCase(), otp.trim(), newPassword);
      Alert.alert(
        "✅ Password Reset",
        "Your password has been updated. Please log in.",
        [{ text: "Sign In", onPress: () => navigation.replace("Login") }]
      );
    } catch (err) {
      Alert.alert("Reset Failed", (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Icon + Title */}
        <View style={styles.header}>
          <Text style={styles.icon}>🔐</Text>
          <Text style={styles.title}>
            {step === "email" ? "Forgot Password" : "Reset Password"}
          </Text>
          <Text style={styles.subtitle}>
            {step === "email"
              ? "Enter your registered email and we'll send a reset code."
              : "Enter the 6-digit code and your new password."}
          </Text>
        </View>

        {/* Step indicator */}
        <View style={styles.stepRow}>
          <View style={[styles.stepDot, styles.stepDotActive]}>
            <Text style={styles.stepDotText}>1</Text>
          </View>
          <View style={[styles.stepLine, step === "otp" && styles.stepLineActive]} />
          <View style={[styles.stepDot, step === "otp" && styles.stepDotActive]}>
            <Text style={[styles.stepDotText, step !== "otp" && styles.stepDotTextInactive]}>2</Text>
          </View>
        </View>

        {step === "email" ? (
          /* ─── Step 1 ─── */
          <View style={styles.form}>
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

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleRequestOtp}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Send Reset Code</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backLink}>← Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ─── Step 2 ─── */
          <View style={styles.form}>
            {/* Demo OTP hint box */}
            {demoOtp ? (
              <View style={styles.demoBanner}>
                <Text style={styles.demoBannerTitle}>📬 Demo Mode — OTP Code</Text>
                <Text style={styles.demoOtp}>{demoOtp}</Text>
                <Text style={styles.demoBannerSub}>
                  In production this would arrive by email only.
                </Text>
              </View>
            ) : null}

            <Text style={styles.label}>Reset Code (OTP)</Text>
            <TextInput
              style={styles.input}
              placeholder="6-digit code"
              placeholderTextColor="#475569"
              keyboardType="numeric"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
              editable={!loading}
            />

            <Text style={styles.label}>New Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Min. 6 characters"
                placeholderTextColor="#475569"
                secureTextEntry={!showNew}
                value={newPassword}
                onChangeText={setNewPassword}
                editable={!loading}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowNew(v => !v)}>
                <Text style={styles.eyeIcon}>{showNew ? "🙈" : "👁️"}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Confirm New Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Repeat password"
                placeholderTextColor="#475569"
                secureTextEntry={!showConfirm}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!loading}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm(v => !v)}>
                <Text style={styles.eyeIcon}>{showConfirm ? "🙈" : "👁️"}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Reset Password</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleRequestOtp} disabled={loading}>
              <Text style={[styles.backLink, loading && styles.linkDisabled]}>
                Resend reset code
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setOtp("");
                setDemoOtp("");
                setNewPassword("");
                setConfirmPassword("");
                setStep("email");
              }}
              disabled={loading}
            >
              <Text style={[styles.backLink, loading && styles.linkDisabled]}>
                ← Change email address
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const GREEN = "#10b981";
const SURFACE = "#1e293b";
const BORDER = "#334155";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },

  header: { alignItems: "center", marginBottom: 28 },
  icon: { fontSize: 48, marginBottom: 10 },
  title: { fontSize: 24, fontWeight: "800", color: "#fff" },
  subtitle: { fontSize: 13, color: "#94a3b8", textAlign: "center", marginTop: 6, lineHeight: 20 },

  /* step indicator */
  stepRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 28 },
  stepDot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: SURFACE, borderWidth: 2, borderColor: BORDER,
    alignItems: "center", justifyContent: "center",
  },
  stepDotActive: { backgroundColor: GREEN, borderColor: GREEN },
  stepDotText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  stepDotTextInactive: { color: "#475569" },
  stepLine: { flex: 0, width: 40, height: 2, backgroundColor: BORDER, marginHorizontal: 4 },
  stepLineActive: { backgroundColor: GREEN },

  form: { gap: 14 },
  label: { fontSize: 13, color: "#94a3b8", fontWeight: "600", marginBottom: -8 },
  input: {
    backgroundColor: SURFACE,
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 10, padding: 14,
    color: "#fff", fontSize: 15,
  },

  /* password row with eye toggle */
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

  /* demo banner */
  demoBanner: {
    backgroundColor: "#064e3b",
    borderWidth: 1, borderColor: GREEN,
    borderRadius: 10, padding: 14,
    alignItems: "center",
  },
  demoBannerTitle: { color: GREEN, fontWeight: "700", fontSize: 13, marginBottom: 6 },
  demoOtp: {
    fontSize: 36, fontWeight: "900", letterSpacing: 10,
    color: "#fff", marginBottom: 6,
  },
  demoBannerSub: { color: "#6ee7b7", fontSize: 11, textAlign: "center" },

  btn: {
    backgroundColor: "#047857", borderRadius: 10,
    padding: 15, alignItems: "center", marginTop: 6,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  backLink: { textAlign: "center", color: GREEN, fontSize: 13, marginTop: 6 },
  linkDisabled: { opacity: 0.6 },
});
