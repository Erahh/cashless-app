import React, { useEffect, useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView } from "react-native";

import { HugeiconsIcon } from "@hugeicons/react-native";
import { ArrowLeft01Icon, RefreshIcon, ScanIcon, WalletAdd01Icon, FlashIcon, Wifi01Icon } from "@hugeicons/core-free-icons";
import QRCode from "react-native-qrcode-svg";
import { supabase } from "../../api/supabase";
import { API_BASE_URL } from "../../config/api";
import QuickActions from "../../components/QuickActions";
import { useTheme } from "../../context/ThemeContext";

export default function MyQRScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme, isDarkMode } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDarkMode), [theme, isDarkMode]);

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
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <View style={styles.center}>
          <ActivityIndicator color={theme.textSecondary} />
          <Text style={styles.dim}>Loading your QR...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8} style={styles.backBtn}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My QR</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={load} activeOpacity={0.9}>
          <HugeiconsIcon icon={RefreshIcon} size={18} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        automaticallyAdjustsScrollIndicatorInsets={false}
      >
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
            <HugeiconsIcon icon={ScanIcon} size={18} color={theme.textSecondary} />
            <Text style={styles.scanCardText}>Scan Card</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions container without alignment to fix hitboxes */}
        <View style={styles.quickActionsContainer}>
          <QuickActions
            items={[
              {
                key: "topup",
                icon: WalletAdd01Icon,
                title: "Top Up",
                onPress: () => navigation.navigate("TopUp")
              },
              {
                key: "send_load",
                icon: FlashIcon,
                title: "Send Load",
                onPress: () => navigation.navigate("SendLoad")
              },
              {
                key: "register_rfid",
                icon: Wifi01Icon,
                title: "Register RFID",
                onPress: () => navigation.navigate("RegisterRFID")
              },
            ]}
          />
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (theme, isDarkMode) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  content: {
    padding: 20,
    paddingTop: 20,
    paddingBottom: 160,
    // explicitly NOT alignItems: "center" here to fix horizontal scrollview touch intercept issue
  },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  dim: { color: theme.textMuted, marginTop: 10 },

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
    backgroundColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: "700",
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },

  qrCard: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center", // localized alignment
    borderRadius: 28,
    padding: 32,
    backgroundColor: isDarkMode ? "rgba(255,255,255,0.08)" : theme.card,
    borderWidth: 1,
    borderColor: isDarkMode ? "rgba(255,255,255,0.12)" : theme.border,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDarkMode ? 0 : 0.05,
    shadowRadius: 10,
    elevation: isDarkMode ? 0 : 2,
  },

  title: {
    color: theme.text,
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
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },

  instruction: {
    color: theme.textMuted,
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
    backgroundColor: isDarkMode ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.05)",
    borderWidth: 1,
    borderColor: isDarkMode ? "rgba(255,255,255,0.15)" : theme.border,
  },
  scanCardText: {
    color: theme.text,
    fontSize: 15,
    fontWeight: "700",
  },

  quickActionsContainer: {
    width: "100%",
  }
});
