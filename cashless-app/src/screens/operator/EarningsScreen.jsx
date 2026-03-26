import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl } from "react-native";

import { supabase } from "../../api/supabase";
import { API_BASE_URL } from "../../config/api";
import { useTheme } from "../../context/ThemeContext";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { RefreshIcon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function EarningsScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payload, setPayload] = useState(null);

  const load = async () => {
    try {
      setLoading(true);

      const { data: sessionData, error } = await supabase.auth.getSession();
      if (error) throw error;

      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("No session. Please login again.");

      const res = await fetch(`${API_BASE_URL}/operator/earnings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load earnings");

      setPayload(json);
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsub = navigation?.addListener?.("focus", load);
    load();
    return unsub;
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const computed = useMemo(() => {
    const unpaid = Number(payload?.totals?.unpaid ?? 0);
    const paid = Number(payload?.totals?.paid ?? 0);
    const total = unpaid + paid;

    const fmt = (n) =>
      n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const items = Array.isArray(payload?.items) ? payload.items : [];

    return {
      unpaid,
      paid,
      total,
      unpaidText: fmt(unpaid),
      paidText: fmt(paid),
      totalText: fmt(total),
      items,
    };
  }, [payload]);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={theme.success} size="large" />
          <Text style={styles.loadingText}>Loading earnings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.success} />}
      >
        {/* Header - No back button */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Earnings</Text>
            <Text style={styles.subtitle}>Operator settlements</Text>
          </View>

          <TouchableOpacity style={styles.refreshBtn} onPress={load} activeOpacity={0.8}>
            <HugeiconsIcon icon={RefreshIcon} size={20} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Total Earnings Card */}
        <View style={styles.bigCard}>
          <Text style={styles.cardLabel}>Total Earnings</Text>
          <Text style={styles.bigValue}>₱{computed.totalText}</Text>

          <View style={styles.splitRow}>
            <View style={[styles.miniBox, styles.miniBoxUnpaid]}>
              <MaterialCommunityIcons name="clock-outline" size={20} color={theme.warning} />
              <Text style={styles.miniLabel}>Unpaid</Text>
              <Text style={[styles.miniValue, { color: theme.warning }]}>
                ₱{computed.unpaidText}
              </Text>
              <Text style={styles.miniHint}>Waiting admin payout</Text>
            </View>

            <View style={[styles.miniBox, styles.miniBoxPaid]}>
              <MaterialCommunityIcons name="check-circle-outline" size={20} color={theme.success} />
              <Text style={styles.miniLabel}>Paid</Text>
              <Text style={[styles.miniValue, { color: theme.success }]}>
                ₱{computed.paidText}
              </Text>
              <Text style={styles.miniHint}>Already released</Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() =>
              Alert.alert(
                "Request Payout (MVP)",
                "This is UI-only for now. Admin will mark payouts as paid."
              )
            }
            style={styles.payoutBtnWrapper}
          >
            <LinearGradient
              colors={isDarkMode ? ["#FFD36A", "#E6A800"] : ["#E6A800", "#CC9600"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.payoutBtn}
            >
              <MaterialCommunityIcons name="cash-fast" size={20} color={isDarkMode ? "#0B0E14" : "#FFFFFF"} />
              <Text style={styles.payoutBtnText}>Request Payout</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.tipCard}>
            <MaterialCommunityIcons name="lightbulb-on-outline" size={16} color={theme.textMuted} />
            <Text style={styles.tipText}>
              Your earnings increase when you scan commuter QR / NFC as an operator.
            </Text>
          </View>
        </View>

        {/* Recent Settlements */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Recent Settlements</Text>
          <TouchableOpacity onPress={load}>
            <Text style={styles.link}>Reload</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settlementsList}>
          {computed.items.map((it) => {
            const amt = Number(it.amount || 0);
            const when = it.created_at ? new Date(it.created_at).toLocaleString() : "";
            const status = String(it.status || "unpaid").toLowerCase();
            const isPaid = status === "paid";

            return (
              <View key={it.id} style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={[styles.iconBox, isPaid ? styles.iconBoxPaid : styles.iconBoxUnpaid]}>
                    <MaterialCommunityIcons
                      name={isPaid ? "check-decagram-outline" : "clock-outline"}
                      size={18}
                      color={isPaid ? theme.success : theme.warning}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>
                      ₱{amt.toFixed(2)} • {it.route_name || "Route"}
                    </Text>
                    <Text style={styles.rowMeta}>
                      {when} • TX {String(it.tx_id || "").slice(0, 8)}…
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.statusPill,
                    isPaid ? styles.pillPaid : styles.pillUnpaid,
                  ]}
                >
                  <Text style={[styles.statusText, { color: isPaid ? theme.success : theme.warning }]}>
                    {status}
                  </Text>
                </View>
              </View>
            );
          })}

          {computed.items.length === 0 && (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="cash-remove" size={48} color={theme.textMuted} />
              <Text style={styles.emptyText}>No settlements yet</Text>
              <Text style={styles.emptyHint}>Do a scan to generate earnings.</Text>
            </View>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  content: { padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: theme.textMuted, marginTop: 12, fontSize: 14, fontWeight: "600" },

  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 24,
  },
  title: { color: theme.text, fontSize: 28, fontWeight: "900" },
  subtitle: { color: theme.textSecondary, marginTop: 4, fontSize: 14 },

  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },

  // Big Card
  bigCard: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: theme.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardLabel: { color: theme.textSecondary, fontSize: 13, fontWeight: "600" },
  bigValue: { color: theme.text, fontSize: 36, fontWeight: "900", marginTop: 8 },

  splitRow: { flexDirection: "row", gap: 12, marginTop: 20 },
  miniBox: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 6,
  },
  miniBoxUnpaid: {},
  miniBoxPaid: {},
  miniLabel: { color: theme.textSecondary, fontSize: 12, fontWeight: "700" },
  miniValue: { fontSize: 20, fontWeight: "900" },
  miniHint: { color: theme.textMuted, fontSize: 11 },

  // Payout Button
  payoutBtnWrapper: {
    marginTop: 20,
    borderRadius: 16,
    shadowColor: "#FFD36A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  payoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  payoutBtnText: {
    color: theme.isDark ? "#0B0E14" : "#FFFFFF",
    fontWeight: "900",
    fontSize: 15,
  },

  // Tip
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 16,
    gap: 10,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  tipText: {
    flex: 1,
    color: theme.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },

  // Section
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 32,
    marginBottom: 16,
  },
  sectionTitle: { color: theme.text, fontSize: 18, fontWeight: "900" },
  link: { color: theme.textSecondary, fontSize: 13, fontWeight: "700" },

  // Settlements List
  settlementsList: { gap: 10 },

  row: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },

  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  iconBoxPaid: {
    backgroundColor: theme.successBg,
    borderColor: theme.success,
  },
  iconBoxUnpaid: {
    backgroundColor: theme.warningBg,
    borderColor: theme.warning,
  },

  rowTitle: { color: theme.text, fontWeight: "800", fontSize: 14 },
  rowMeta: { color: theme.textMuted, marginTop: 4, fontSize: 12 },

  statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  pillPaid: {
    backgroundColor: theme.successBg,
    borderColor: theme.success,
  },
  pillUnpaid: {
    backgroundColor: theme.warningBg,
    borderColor: theme.warning,
  },
  statusText: { fontWeight: "900", fontSize: 11, textTransform: "uppercase" },

  // Empty
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 8,
  },
  emptyText: { color: theme.textSecondary, fontSize: 16, fontWeight: "700" },
  emptyHint: { color: theme.textMuted, fontSize: 13 },
});
