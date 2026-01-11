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
import QRCode from "react-native-qrcode-svg";
import * as Clipboard from "expo-clipboard";
import { getMyQrCredential } from "../api/credentialsApi";
import { API_BASE_URL } from "../config/api";

export default function MyQRScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [credentialValue, setCredentialValue] = useState("");

  // MVP: OperatorScan currently uses DEFAULT_VEHICLE_ID if QR doesn't include vehicle_id.
  // We still include a strong JSON payload so you're ready for production.
  const payload = useMemo(() => {
    return JSON.stringify({
      credential_value: credentialValue,
      // later we can embed vehicle_id when operator provides it
      // vehicle_id: "...",
      // route_name: "ROUTE A"
      v: 1,
      issuer: "cashless-commuting",
    });
  }, [credentialValue]);

  const load = async () => {
    try {
      setLoading(true);
      const token = await getMyQrCredential();
      setCredentialValue(token);
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

  const copyToken = async () => {
    try {
      await Clipboard.setStringAsync(credentialValue || "");
      Alert.alert("Copied ✅", "Your QR token is copied to clipboard.");
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.9}>
            <Text style={styles.back}>‹ Back</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.refreshBtn} onPress={load} activeOpacity={0.9}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>My QR</Text>
        <Text style={styles.sub}>
          Show this QR to the operator scanner to pay your ride.
        </Text>

        <View style={styles.card}>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator />
              <Text style={styles.dim}>Generating your QR...</Text>
            </View>
          ) : (
            <>
              <View style={styles.qrBox}>
                {credentialValue ? (
                  <QRCode value={payload} size={220} />
                ) : (
                  <Text style={{ color: "#fff" }}>No token</Text>
                )}
              </View>

              <View style={styles.tokenRow}>
                <Text style={styles.tokenLabel}>Token</Text>
                <Text style={styles.tokenValue} numberOfLines={1}>
                  {credentialValue}
                </Text>
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={copyToken} activeOpacity={0.9}>
                <Text style={styles.primaryText}>Copy Token</Text>
              </TouchableOpacity>

              <View style={styles.note}>
                <Text style={styles.noteTitle}>Developer Note</Text>
                <Text style={styles.noteText}>
                  This QR encodes JSON with your credential_value. Your OperatorScan already supports JSON.
                  Next step is to include vehicle_id in QR or fetch it from operator session.
                </Text>
              </View>
            </>
          )}
        </View>

        <TouchableOpacity
          style={styles.ghostBtn}
          onPress={() => navigation.navigate("OperatorScan")}
          activeOpacity={0.9}
        >
          <Text style={styles.ghostText}>Test Scan Now</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0E14" },
  content: { padding: 18, paddingTop: 18 },

  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  back: { color: "rgba(255,255,255,0.85)", fontWeight: "900" },

  refreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  refreshText: { color: "#fff", fontWeight: "900" },

  title: { color: "#fff", fontSize: 26, fontWeight: "900", marginTop: 14 },
  sub: { marginTop: 8, color: "rgba(255,255,255,0.65)" },

  card: {
    marginTop: 16,
    borderRadius: 22,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  center: { alignItems: "center", paddingVertical: 30 },
  dim: { marginTop: 10, color: "rgba(255,255,255,0.6)" },

  qrBox: {
    alignSelf: "center",
    padding: 18,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
  },

  tokenRow: { marginTop: 14 },
  tokenLabel: { color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: "800" },
  tokenValue: { color: "#fff", fontSize: 14, fontWeight: "900", marginTop: 6 },

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

  note: {
    marginTop: 14,
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(255, 211, 106, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 211, 106, 0.28)",
  },
  noteTitle: { color: "#FFD36A", fontWeight: "900" },
  noteText: { color: "rgba(255,255,255,0.75)", marginTop: 8, lineHeight: 18 },
});
