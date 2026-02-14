import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { supabase } from "../api/supabase";
import { API_BASE_URL } from "../config/api";
import QuickActions from "../components/QuickActions";
import BottomNav from "../components/BottomNav";

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
      {/* Header */}
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My QR</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={load} activeOpacity={0.9}>
          <Ionicons name="refresh" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* QR Code Card - Centered and Minimal */}
        <View style={styles.qrCard}>
          <Text style={styles.title}>My Payment QR</Text>

          <View style={styles.qrBox}>
            {computed.value ? (
              <QRCode value={computed.value} size={240} />
            ) : (
              <Text style={styles.dim}>No QR found</Text>
            )}
          </View>

          <Text style={styles.instruction}>
            Show this QR to the operator to pay your fare
          </Text>

          {/* Scan Card Button */}
          <TouchableOpacity
            style={styles.scanCardBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("CommuterScan")}
          >
            <Ionicons name="scan-outline" size={18} color="rgba(255,255,255,0.8)" />
            <Text style={styles.scanCardText}>Scan Card</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <QuickActions
          items={[
            {
              key: "topup",
              icon: "💳",
              title: "Top Up",
              sub: "GCash",
              onPress: () => navigation.navigate("SendLoad")
            },
            {
              key: "send_load",
              icon: "💸",
              title: "Send Load",
              sub: "Transfer",
              onPress: () => Alert.alert("Send Load", "Coming soon!")
            },
            {
              key: "register_rfid",
              icon: "📡",
              title: "Register RFID",
              sub: "NFC Card",
              onPress: () => navigation.navigate("RegisterRFID")
            },
          ]}
        />

        <View style={{ height: 140 }} />
      </ScrollView>

      <BottomNav navigation={navigation} active="MyQR" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0E14" },
  content: {
    padding: 20,
    paddingTop: 20,
    alignItems: "center",
  },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  dim: { color: "rgba(255,255,255,0.65)", marginTop: 10 },

  // Header
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  qrCard: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 28,
    padding: 32,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    marginBottom: 24,
  },

  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 24,
  },

  qrBox: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  instruction: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },

  scanCardBtn: {
    marginTop: 20,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  scanCardText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 15,
    fontWeight: "700",
  },
});
