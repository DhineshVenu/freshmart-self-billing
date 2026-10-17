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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

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
          {[
            { label: "Full Name", value: name, setter: setName, props: { autoCapitalize: "words" as const } },
            { label: "Email Address", value: email, setter: setEmail, props: { keyboardType: "email-address" as const, autoCapitalize: "none" as const } },
            { label: "Password", value: password, setter: setPassword, props: { secureTextEntry: true } },
            { label: "Confirm Password", value: confirm, setter: setConfirm, props: { secureTextEntry: true } },
          ].map(({ label, value, setter, props }) => (
            <View key={label}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                style={styles.input}
                placeholder={label}
                placeholderTextColor="#475569"
                value={value}
                onChangeText={setter}
                {...props}
              />
            </View>
          ))}

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
            <Text style={styles.linkText}>Already have an account? <Text style={styles.link}>Sign In</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#0f172a" },
  container: { padding: 24, justifyContent: "center", minHeight: "100%" },
  header: { alignItems: "center", marginBottom: 36 },
  logoIcon: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: "800", color: "#ffffff" },
  subtitle: { fontSize: 14, color: "#94a3b8", marginTop: 4 },
  form: { gap: 14 },
  label: { fontSize: 13, color: "#94a3b8", fontWeight: "600", marginBottom: 4 },
  input: {
    backgroundColor: "#1e293b",
    borderWidth: 1, borderColor: "#334155",
    borderRadius: 10, padding: 14,
    color: "#ffffff", fontSize: 15,
  },
  btn: {
    backgroundColor: "#047857", borderRadius: 10,
    padding: 15, alignItems: "center", marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#ffffff", fontWeight: "700", fontSize: 16 },
  linkText: { textAlign: "center", color: "#64748b", fontSize: 13, marginTop: 8 },
  link: { color: "#10b981", fontWeight: "600" },
});
