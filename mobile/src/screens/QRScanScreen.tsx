import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, Platform,
} from "react-native";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";

type Nav = StackNavigationProp<RootStackParamList, "QRScan">;

export default function QRScanScreen() {
  const navigation = useNavigation<Nav>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web" && !permission?.granted) {
      requestPermission();
    }
  }, []);

  const handleBarCodeScanned = ({ data }: BarcodeScanningResult) => {
    if (scanned) return;
    setScanned(true);

    // Extract session code from URL (freshmart://join/:code or http://...join/:code)
    const match = data.match(/\/join\/([a-f0-9-]{36})/i);
    const code = match ? match[1] : data;

    navigation.navigate("JoinSession", { code });
  };

  const handleManualSubmit = () => {
    const code = manualCode.trim();
    if (!code) { Alert.alert("Validation", "Please enter a session code."); return; }
    navigation.navigate("JoinSession", { code });
  };

  if (!permission?.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionIcon}>📷</Text>
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          Fresh Mart needs camera access to scan the store's QR code.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={() => requestPermission()}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowManual(true)}>
          <Text style={styles.linkText}>Enter code manually</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!showManual ? (
        <>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          />

          {/* Overlay */}
          <View style={[styles.overlay, StyleSheet.absoluteFill]}>
            <Text style={styles.overlayTitle}>Scan Store QR Code</Text>
            <View style={styles.scanFrame} />
            <Text style={styles.overlayHint}>Align the QR code within the frame</Text>
            <TouchableOpacity style={styles.manualBtn} onPress={() => setShowManual(true)}>
              <Text style={styles.manualBtnText}>Enter Code Manually</Text>
            </TouchableOpacity>
          </View>

          {scanned && (
            <TouchableOpacity style={styles.retryBtn} onPress={() => setScanned(false)}>
              <Text style={styles.retryText}>Tap to Scan Again</Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <View style={styles.manualContainer}>
          <Text style={styles.manualTitle}>Enter Session Code</Text>
          <TextInput
            style={styles.input}
            placeholder="Paste or type the session code"
            placeholderTextColor="#475569"
            value={manualCode}
            onChangeText={setManualCode}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.btn} onPress={handleManualSubmit}>
            <Text style={styles.btnText}>Join Session →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowManual(false)}>
            <Text style={styles.linkText}>← Back to Camera</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  permissionContainer: {
    flex: 1, backgroundColor: "#0f172a",
    alignItems: "center", justifyContent: "center",
    padding: 32, gap: 16,
  },
  permissionIcon: { fontSize: 56 },
  permissionTitle: { fontSize: 20, fontWeight: "700", color: "#fff" },
  permissionText: { textAlign: "center", color: "#94a3b8", fontSize: 14 },
  overlay: {
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)", gap: 20,
  },
  overlayTitle: { fontSize: 20, fontWeight: "700", color: "#fff" },
  scanFrame: {
    width: 240, height: 240,
    borderWidth: 3, borderColor: "#10b981",
    borderRadius: 16,
  },
  overlayHint: { color: "#94a3b8", fontSize: 13 },
  manualBtn: {
    backgroundColor: "#1e293b", borderRadius: 10,
    paddingHorizontal: 24, paddingVertical: 12,
    borderWidth: 1, borderColor: "#334155",
  },
  manualBtnText: { color: "#e2e8f0", fontWeight: "600" },
  retryBtn: {
    position: "absolute", bottom: 60, alignSelf: "center",
    backgroundColor: "#047857", borderRadius: 10,
    paddingHorizontal: 32, paddingVertical: 14,
  },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  manualContainer: {
    flex: 1, backgroundColor: "#0f172a",
    padding: 28, justifyContent: "center", gap: 16,
  },
  manualTitle: { fontSize: 22, fontWeight: "700", color: "#fff" },
  input: {
    backgroundColor: "#1e293b", borderWidth: 1, borderColor: "#334155",
    borderRadius: 10, padding: 14, color: "#fff", fontSize: 15,
  },
  btn: {
    backgroundColor: "#047857", borderRadius: 10,
    padding: 15, alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  linkText: { textAlign: "center", color: "#10b981", fontSize: 13, fontWeight: "600" },
});
