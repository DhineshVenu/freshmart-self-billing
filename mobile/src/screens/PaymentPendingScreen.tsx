import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RouteProp } from "@react-navigation/native";
import { API_BASE_URL } from "../services/api";
import * as SecureStore from "expo-secure-store";
import { useCartStore } from "../store/cartStore";
import { useSessionStore } from "../store/sessionStore";
import { RootStackParamList } from "../types";

type Nav = StackNavigationProp<RootStackParamList, "PaymentPending">;
type Route = RouteProp<RootStackParamList, "PaymentPending">;

type SSEEvent = "CHECKOUT_PENDING" | "PAYMENT_CONFIRMED" | "heartbeat";

export default function PaymentPendingScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { orderId, sessionCode } = route.params;
  const { clearCart } = useCartStore();
  const { clearSession } = useSessionStore();

  const [status, setStatus] = useState<"waiting" | "confirmed" | "error">("waiting");
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let isMounted = true;
    let isConfirmed = false;
    let redirectTimeout: ReturnType<typeof setTimeout> | undefined;

    const connectSSE = async () => {
      try {
        const token = await SecureStore.getItemAsync("auth_token");
        const url = `${API_BASE_URL}/sessions/${sessionCode}/stream${token ? `?token=${token}` : ""}`;

        // React Native doesn't have native EventSource — use a polyfill-compatible fetch approach
        // We simulate SSE via a long-polling fetch loop
        const listenLoop = async () => {
          while (isMounted && !isConfirmed) {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 30000);

              const response = await fetch(url, {
                headers: {
                  Accept: "text/event-stream",
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                signal: controller.signal,
              });

              clearTimeout(timeoutId);

              if (!response.body) break;

              const reader = response.body.getReader();
              const decoder = new TextDecoder();

              while (isMounted) {
                const { done, value } = await reader.read();
                if (done) break;

                const text = decoder.decode(value, { stream: true });
                const lines = text.split("\n");

                for (const line of lines) {
                  if (line.startsWith("event:")) {
                    const eventType = line.replace("event:", "").trim() as SSEEvent;
                    if (eventType === "PAYMENT_CONFIRMED" && isMounted) {
                      isConfirmed = true;
                      setStatus("confirmed");
                      await clearCart();
                      await clearSession();
                      redirectTimeout = setTimeout(() => {
                        if (isMounted) {
                          navigation.replace("Receipt", { orderId });
                        }
                      }, 1500);
                      return;
                    }
                  }
                }
              }
            } catch {
              // Connection dropped — wait 3 s before retry
              await new Promise((r) => setTimeout(r, 3000));
            }
          }
        };

        listenLoop();
      } catch (err) {
        console.warn("SSE connect error:", err);
        if (isMounted) setStatus("error");
      }
    };

    connectSSE();

    return () => {
      isMounted = false;
      if (redirectTimeout) clearTimeout(redirectTimeout);
      eventSourceRef.current?.close();
    };
  }, [sessionCode, orderId, navigation, clearCart, clearSession]);

  if (status === "confirmed") {
    return (
      <View style={styles.container}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>Payment Confirmed!</Text>
        <Text style={styles.successSub}>Redirecting to your receipt…</Text>
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={styles.container}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Connection Lost</Text>
        <Text style={styles.errorSub}>
          Could not connect to the store terminal. Ask the cashier to confirm payment.
        </Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => navigation.navigate("Receipt", { orderId })}
        >
          <Text style={styles.btnText}>View Receipt Anyway →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Animated waiting indicator */}
      <View style={styles.pulseRing}>
        <ActivityIndicator color="#10b981" size="large" />
      </View>
      <Text style={styles.waitingTitle}>Waiting for Payment</Text>
      <Text style={styles.waitingHint}>
        Please proceed to the cashier and show this screen.
        Your bill will be confirmed in real-time.
      </Text>

      {/* Order summary card */}
      <View style={styles.orderCard}>
        <Text style={styles.orderCardLabel}>Order Reference</Text>
        <Text style={styles.orderCardValue}>{orderId.slice(-8).toUpperCase()}</Text>
        <Text style={styles.orderCardSub}>Show to cashier at counter</Text>
      </View>

      <View style={styles.stepsContainer}>
        {[
          { step: "1", label: "Cart reviewed", done: true },
          { step: "2", label: "Waiting for cashier confirmation", done: false, active: true },
          { step: "3", label: "Payment confirmed & receipt issued", done: false },
        ].map(({ step, label, done, active }) => (
          <View key={step} style={styles.stepRow}>
            <View style={[styles.stepDot, done && styles.stepDone, active && styles.stepActive]}>
              <Text style={styles.stepDotText}>{done ? "✓" : step}</Text>
            </View>
            <Text style={[styles.stepLabel, done && styles.stepLabelDone, active && styles.stepLabelActive]}>
              {label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 20,
  },
  pulseRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  waitingTitle: { fontSize: 22, fontWeight: "800", color: "#fff" },
  waitingHint: { textAlign: "center", color: "#94a3b8", fontSize: 14, lineHeight: 22 },
  orderCard: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    width: "100%",
    gap: 4,
  },
  orderCardLabel: { fontSize: 12, color: "#64748b", letterSpacing: 1 },
  orderCardValue: { fontSize: 28, fontWeight: "800", color: "#10b981", fontFamily: "monospace" },
  orderCardSub: { fontSize: 12, color: "#475569", marginTop: 4 },
  stepsContainer: { width: "100%", gap: 14 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1e293b",
    borderWidth: 2,
    borderColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDone: { backgroundColor: "#064e3b", borderColor: "#10b981" },
  stepActive: { backgroundColor: "#0c2340", borderColor: "#0284c7" },
  stepDotText: { color: "#e2e8f0", fontWeight: "700", fontSize: 12 },
  stepLabel: { color: "#475569", fontSize: 14 },
  stepLabelDone: { color: "#10b981" },
  stepLabelActive: { color: "#0284c7", fontWeight: "600" },
  successIcon: { fontSize: 64 },
  successTitle: { fontSize: 24, fontWeight: "800", color: "#10b981" },
  successSub: { color: "#94a3b8", fontSize: 14 },
  errorIcon: { fontSize: 56 },
  errorTitle: { fontSize: 22, fontWeight: "700", color: "#f59e0b" },
  errorSub: { textAlign: "center", color: "#94a3b8", fontSize: 14, lineHeight: 22 },
  btn: {
    backgroundColor: "#047857",
    borderRadius: 10,
    padding: 14,
    paddingHorizontal: 24,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
