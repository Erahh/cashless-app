import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useCameraPermissions } from "expo-camera";
import QRScanView from "../components/QRScanView";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../api/supabase";
import { API_BASE_URL } from "../config/api";

const KEY = "operator_selected_vehicle";

export default function OperatorScanScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [last, setLast] = useState(null); // last scan result
  const [vehicle, setVehicle] = useState(null); // selected vehicle

  // simple debounce so the same QR doesn't fire repeatedly
  const lastValueRef = useRef(null);
  const lastTimeRef = useRef(0);

  const canScan = useMemo(() => {
    if (!permission?.granted) return false;
    if (!scanning) return false;
    if (submitting) return false;
    return true;
  }, [permission?.granted, scanning, submitting]);

  useEffect(() => {
    const unsub = navigation?.addListener?.("focus", async () => {
      // Load selected vehicle
      try {
        const saved = await AsyncStorage.getItem(KEY);
        const v = saved ? JSON.parse(saved) : null;
        setVehicle(v);

        // Redirect to OperatorSetup if no vehicle selected
        if (!v?.id) {
          navigation.navigate("OperatorSetup");
          return;
        }
      } catch (e) {
        console.error("Error loading vehicle:", e);
        navigation.navigate("OperatorSetup");
        return;
      }

      // Reset scan state
      setScanning(true);
      setLast(null);
      lastValueRef.current = null;
      lastTimeRef.current = 0;
    });
    return unsub;
  }, [navigation]);

  const submitScan = async (credential_value) => {
    try {
      setSubmitting(true);

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("No session. Please login again.");

      // Use selected vehicle from AsyncStorage
      if (!vehicle?.id) {
        throw new Error("No vehicle selected. Go to Operator Setup.");
      }

      const vehicle_id = vehicle.id;
      const route_name = vehicle.route_name || null;

      const res = await fetch(`${API_BASE_URL}/transactions/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          credential_value,
          vehicle_id,
          route_name,
          device_id: "operator-phone",
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Scan failed");
      }

      const result = json.result;

      setLast(result);

      // pause scanning so we don’t double-charge
      setScanning(false);

      // Quick feedback
      if (result?.ok && result?.status === "approved") {
        Alert.alert("Approved ✅", `Fare ₱${Number(result.fare_amount).toFixed(2)}\nNew balance ₱${Number(result.balance).toFixed(2)}`);
      } else {
        Alert.alert("Declined ❌", result?.reason || "Unknown reason");
      }
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const onBarcodeScanned = ({ data }) => {
    if (!canScan) return;

    const value = String(data || "").trim();
    if (!value) return;

    // debounce: ignore same value within 2 seconds
    const now = Date.now();
    if (lastValueRef.current === value && now - lastTimeRef.current < 2000) return;

    lastValueRef.current = value;
    lastTimeRef.current = now;

    submitScan(value);
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.dim}>Checking camera permission…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <Text style={styles.title}>Operator Scan</Text>
          <Text style={styles.subtitle}>
            Camera permission is required to scan commuter QR.
          </Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
            <Text style={styles.primaryBtnText}>Allow Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryBtnText}>Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.title}>Operator Scan</Text>
          <Text style={styles.subtitle}>
            Point camera at commuter QR to collect fare
          </Text>
        </View>

        <TouchableOpacity style={styles.smallBtn} onPress={() => navigation.navigate("Earnings")}>
          <Text style={styles.smallBtnText}>Earnings</Text>
        </TouchableOpacity>
      </View>

      <QRScanView
        style={styles.cameraWrap}
        onScanned={onBarcodeScanned}
        enabled={canScan}
        managedPermission={false} // ✅ because OperatorScanScreen already handles permission UI
      >
        {/* Overlay */}
        <View style={styles.overlay}>
          <View style={styles.scanBox} />
          <Text style={styles.overlayText}>
            {submitting ? "Processing…" : scanning ? "Scanning…" : "Paused"}
          </Text>
        </View>
      </QRScanView>

      {/* Result card */}
      <View style={styles.bottomSheet}>
        {submitting ? (
          <View style={styles.rowCenter}>
            <ActivityIndicator />
            <Text style={styles.dim}>Submitting scan…</Text>
          </View>
        ) : last ? (
          <View>
            <Text style={styles.cardTitle}>
              {last?.status === "approved" ? "Approved ✅" : "Declined ❌"}
            </Text>

            <Text style={styles.cardLine}>
              Fare: <Text style={styles.white}>₱{Number(last.fare_amount || 0).toFixed(2)}</Text>
            </Text>

            <Text style={styles.cardLine}>
              Balance: <Text style={styles.white}>₱{Number(last.balance || 0).toFixed(2)}</Text>
            </Text>

            {last?.reason ? (
              <Text style={styles.cardLine}>
                Reason: <Text style={styles.white}>{String(last.reason)}</Text>
              </Text>
            ) : null}

            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 1 }]}
                onPress={() => {
                  setLast(null);
                  setScanning(true);
                }}
              >
                <Text style={styles.primaryBtnText}>Scan Next</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryBtn, { flex: 1 }]}
                onPress={() => navigation.navigate("Transactions")}
              >
                <Text style={styles.secondaryBtnText}>History</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            <Text style={styles.cardTitle}>Ready</Text>
            <Text style={styles.dim}>
              Ask commuter to open “My QR” and scan it here.
            </Text>

            <TouchableOpacity
              style={[styles.secondaryBtn, { marginTop: 12 }]}
              onPress={() => setScanning((v) => !v)}
            >
              <Text style={styles.secondaryBtnText}>
                {scanning ? "Pause Scanning" : "Resume Scanning"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0E14" },
  content: { padding: 18 },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  rowCenter: { flexDirection: "row", gap: 10, alignItems: "center" },

  topBar: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: { color: "#fff", fontSize: 22, fontWeight: "900" },
  subtitle: { color: "rgba(255,255,255,0.6)", marginTop: 4 },

  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  smallBtnText: { color: "rgba(255,255,255,0.85)", fontWeight: "800" },

  cameraWrap: {
    flex: 1,
    marginHorizontal: 18,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  scanBox: {
    width: 240,
    height: 240,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "rgba(255, 211, 106, 0.95)",
    backgroundColor: "rgba(0,0,0,0.10)",
  },
  overlayText: { color: "rgba(255,255,255,0.8)", marginTop: 14, fontWeight: "800" },

  bottomSheet: {
    padding: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(11,14,20,0.98)",
  },

  cardTitle: { color: "#fff", fontSize: 18, fontWeight: "900" },
  cardLine: { color: "rgba(255,255,255,0.65)", marginTop: 8 },
  white: { color: "#fff", fontWeight: "900" },
  dim: { color: "rgba(255,255,255,0.65)", marginTop: 10 },

  primaryBtn: {
    backgroundColor: "#FFD36A",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryBtnText: { color: "#0B0E14", fontWeight: "900" },

  secondaryBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  secondaryBtnText: { color: "rgba(255,255,255,0.85)", fontWeight: "900" },
});
