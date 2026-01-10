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

  useEffect(() => {
    // Reset scan state when screen focuses
    const unsub = navigation?.addListener?.("focus", () => {
      setScanned(false);
      setRawValue("");
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

  // Later: connect to backend scan endpoint
  const confirmScan = async () => {
    // MVP: just show parsed content for now
    // When you’re ready, we’ll call your backend scan endpoint here.
    Alert.alert("QR Captured ✅", parsed.raw.slice(0, 200));
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
