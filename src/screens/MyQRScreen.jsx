import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { supabase } from "../api/supabase";
import { API_BASE_URL } from "../config/api";

export default function MyQRScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [credential, setCredential] = useState(null);

  const load = async () => {
    try {
      setLoading(true);

      const { data: sessionData, error } = await supabase.auth.getSession();
      if (error) throw error;

      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("No session. Please login again.");

      const res = await fetch(`${API_BASE_URL}/me/qr`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load QR");

      setCredential(json.credential || null);
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = navigation?.addListener?.("focus", load);
    load();
    return unsub;
  }, []);

  const computed = useMemo(() => {
    const value = credential?.value ? String(credential.value) : "";
    return {
      value,
      issuedAt: credential?.issued_at ? new Date(credential.issued_at).toLocaleString() : "",
    };
  }, [credential]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.dim}>Loading your QR...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>My QR</Text>
            <Text style={styles.subtitle}>Show this to the operator to pay</Text>
          </View>

          <TouchableOpacity style={styles.smallBtn} onPress={load}>
            <Text style={styles.smallBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Payment Code</Text>

          <View style={styles.qrBox}>
            {computed.value ? (
              <QRCode value={computed.value} size={220} />
            ) : (
              <Text style={styles.dim}>No QR found</Text>
            )}
          </View>

          <Text style={styles.meta}>
            Issued: {computed.issuedAt || "—"}
          </Text>

          <View style={styles.tokenBox}>
            <Text style={styles.tokenLabel}>Token</Text>
            <Text style={styles.tokenValue} numberOfLines={2}>
              {computed.value}
            </Text>
          </View>

          <Text style={styles.hint}>
            ✅ The operator scans this QR to deduct fare from your wallet.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => Alert.alert("Tip", "Open Operator Scan screen on the operator phone.")}
        >
          <Text style={styles.primaryBtnText}>How it works</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0E14" },
  content: { padding: 18, flex: 1 },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  dim: { color: "rgba(255,255,255,0.65)", marginTop: 10 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: "#fff", fontSize: 24, fontWeight: "900" },
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

  card: {
    marginTop: 16,
    borderRadius: 22,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  cardLabel: { color: "rgba(255,255,255,0.65)", fontSize: 12 },

  qrBox: {
    marginTop: 14,
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },

  meta: { color: "rgba(255,255,255,0.55)", marginTop: 12, fontSize: 12 },

  tokenBox: {
    marginTop: 12,
    borderRadius: 16,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  tokenLabel: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "800" },
  tokenValue: { color: "#fff", marginTop: 6, fontWeight: "800" },

  hint: { color: "rgba(255,255,255,0.6)", marginTop: 12, fontSize: 12, lineHeight: 18 },

  primaryBtn: {
    marginTop: 14,
    backgroundColor: "#FFD36A",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryBtnText: { color: "#0B0E14", fontWeight: "900" },
});
