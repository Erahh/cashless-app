import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { sendScanToBackend } from "../api/scanApi";

const KEY = "operator_selected_vehicle";

// UI helper: parse QR payload (support JSON or plain text)
function parsePayload(raw) {
  const text = String(raw || "").trim();
  if (!text) return { raw: "", type: "empty" };

  // Try JSON
  try {
    const obj = JSON.parse(text);
    return { raw: text, type: "json", data: obj };
  } catch (e) {}

  // Try simple key/value pattern like "cred=ABC123;vehicle=UUID"
  const parts = text.split(/[;,&]/).map((s) => s.trim());
  const map = {};
  parts.forEach((p) => {
    const [k, v] = p.split("=");
    if (k && v) map[k.trim()] = v.trim();
  });

  if (Object.keys(map).length > 0) return { raw: text, type: "kv", data: map };

  // fallback plain
  return { raw: text, type: "text" };
}

export default function OperatorScanScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();

  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [rawValue, setRawValue] = useState("");
  const [vehicle, setVehicle] = useState(null);

  useEffect(() => {
    // Load vehicle and reset scan state when screen focuses
    const unsub = navigation?.addListener?.("focus", async () => {
      const saved = await AsyncStorage.getItem(KEY);
      const v = saved ? JSON.parse(saved) : null;
      setVehicle(v);

      setScanned(false);
      setRawValue("");

      if (!v?.id) navigation.navigate("OperatorSetup");
    });
    return unsub;
  }, [navigation]);

  const parsed = useMemo(() => parsePayload(rawValue), [rawValue]);

  const onBarcodeScanned = ({ data }) => {
    if (scanned) return;
    setScanned(true);
    setRawValue(String(data || ""));
  };

  const canScan = !!permission?.granted && !scanned;

  const askPermission = async () => {
    const res = await requestPermission();
    if (!res?.granted) {
      Alert.alert(
        "Camera permission needed",
        "Allow camera access to scan QR codes."
      );
    }
  };

  const reset = () => {
    setScanned(false);
    setRawValue("");
  };

  const confirmScan = async () => {
    try {
      // QR payload can be:
      // JSON: {"credential_value":"QR123","vehicle_id":"...","route_name":"ROUTE A"}
      // or plain text: "QR123" (we'll require vehicle_id from a default for MVP)
      let credential_value = null;
      let vehicle_id = null;
      let route_name = null;

      if (parsed.type === "json") {
        credential_value = parsed.data?.credential_value || parsed.data?.value || null;
        vehicle_id = parsed.data?.vehicle_id || null;
        route_name = parsed.data?.route_name || null;
      } else if (parsed.type === "kv") {
        credential_value = parsed.data?.credential_value || parsed.data?.cred || parsed.data?.value || null;
        vehicle_id = parsed.data?.vehicle_id || parsed.data?.vehicle || null;
        route_name = parsed.data?.route_name || parsed.data?.route || null;
      } else {
        credential_value = parsed.raw;
      }

      if (!vehicle?.id) throw new Error("No vehicle selected. Go to Operator Setup.");
      vehicle_id = vehicle.id;
      if (!route_name) route_name = vehicle.route_name || null;

      if (!credential_value) throw new Error("QR payload missing credential_value");

      const payload = {
        credential_value,
        vehicle_id,
        route_name,
        device_id: `expo-${Date.now()}`,
        scanned_at: new Date().toISOString(),
      };

      const result = await sendScanToBackend(payload);

      // Result is your rpc jsonb (approved/declined)
      if (result?.status === "approved") {
        Alert.alert(
          "Approved ✅",
          `Fare: ₱${Number(result.fare_amount).toFixed(2)}\nBalance: ₱${Number(result.balance).toFixed(2)}`
        );
        reset();
        return;
      }

      Alert.alert(
        "Declined ❌",
        `Reason: ${result?.reason || "unknown"}\nBalance: ₱${Number(result?.balance ?? 0).toFixed(2)}`
      );
    } catch (e) {
      Alert.alert("Scan Error", e.message);
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.dim}>Loading camera...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <Text style={styles.title}>QR Scanner</Text>
          <Text style={styles.sub}>
            We need camera permission to scan QR codes.
          </Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={askPermission} activeOpacity={0.9}>
            <Text style={styles.primaryText}>Allow Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.9}
          >
            <Text style={styles.ghostText}>Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={{ flex: 1 }}>
        {/* Camera */}
        <CameraView
          style={styles.camera}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={canScan ? onBarcodeScanned : undefined}
        />

        {/* Overlay */}
        <View style={styles.overlay}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.9}>
              <Text style={styles.back}>‹ Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.torchBtn}
              onPress={() => setTorch((v) => !v)}
              activeOpacity={0.9}
            >
              <Text style={styles.torchText}>{torch ? "Torch ON" : "Torch OFF"}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.frameWrap}>
            <View style={styles.frame} />
            <Text style={styles.hint}>
              Align the QR code inside the frame
            </Text>
          </View>

          {/* Bottom sheet */}
          <View style={styles.sheet}>
            {!scanned ? (
              <>
                <Text style={styles.sheetTitle}>Ready to Scan</Text>
                <Text style={styles.sheetSub}>
                  This will be used for ride payment (QR/NFC). For now, we capture the QR payload.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.sheetTitle}>Scanned ✅</Text>

                <View style={styles.payloadBox}>
                  <Text style={styles.payloadText} numberOfLines={4}>
                    {parsed.raw || "-"}
                  </Text>
                  <Text style={styles.payloadMeta}>
                    Format: {parsed.type.toUpperCase()}
                  </Text>
                </View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.primaryBtn, { flex: 1 }]}
                    onPress={confirmScan}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.primaryText}>Confirm</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.ghostBtn, { flex: 1 }]}
                    onPress={reset}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.ghostText}>Scan Again</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0E14" },
  content: { padding: 18, paddingTop: 60 },
  title: { color: "#fff", fontSize: 26, fontWeight: "900" },
  sub: { marginTop: 10, color: "rgba(255,255,255,0.65)", lineHeight: 18 },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  dim: { marginTop: 10, color: "rgba(255,255,255,0.6)" },

  camera: { flex: 1 },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },

  topBar: {
    paddingTop: 14,
    paddingHorizontal: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  back: { color: "rgba(255,255,255,0.85)", fontWeight: "900", fontSize: 14 },

  torchBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(11,14,20,0.60)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  torchText: { color: "#FFD36A", fontWeight: "900", fontSize: 12 },

  frameWrap: { alignItems: "center", marginTop: 30 },
  frame: {
    width: 260,
    height: 260,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "rgba(255, 211, 106, 0.95)",
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  hint: { marginTop: 12, color: "rgba(255,255,255,0.8)", fontWeight: "800" },

  sheet: {
    padding: 16,
    margin: 14,
    borderRadius: 22,
    backgroundColor: "rgba(11,14,20,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  sheetTitle: { color: "#fff", fontWeight: "900", fontSize: 16 },
  sheetSub: { marginTop: 8, color: "rgba(255,255,255,0.65)", lineHeight: 18 },

  payloadBox: {
    marginTop: 12,
    borderRadius: 16,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  payloadText: { color: "#fff", fontWeight: "800" },
  payloadMeta: { marginTop: 8, color: "rgba(255,255,255,0.55)", fontSize: 12 },

  actionsRow: { flexDirection: "row", gap: 10, marginTop: 12 },

  primaryBtn: {
    marginTop: 14,
    backgroundColor: "#FFD36A",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  primaryText: { color: "#0B0E14", fontWeight: "900", fontSize: 15 },

  ghostBtn: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  ghostText: { color: "rgba(255,255,255,0.85)", fontWeight: "900", fontSize: 15 },
});
