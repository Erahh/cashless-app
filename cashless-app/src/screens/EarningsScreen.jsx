import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { supabase } from "../api/supabase";
import { API_BASE_URL } from "../config/api";

export default function EarningsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(null);

  const load = async () => {
    try {
      setLoading(true);

      const { data: sessionData, error } = await supabase.auth.getSession();
      if (error) throw error;

      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("No session. Please login again.");

      // ✅ matches settlements router: GET /operator/earnings
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
    }
  };

  useEffect(() => {
    const unsub = navigation?.addListener?.("focus", load);
    load();
    return unsub;
  }, []);

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

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.dim}>Loading earnings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Earnings</Text>
            <Text style={styles.subtitle}>Operator settlements</Text>
          </View>

          <TouchableOpacity style={styles.smallBtn} onPress={load}>
            <Text style={styles.smallBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Totals */}
        <View style={styles.bigCard}>
          <Text style={styles.cardLabel}>Total Earnings</Text>
          <Text style={styles.bigValue}>₱{computed.totalText}</Text>

          <View style={styles.splitRow}>
            <View style={styles.miniBox}>
              <Text style={styles.miniLabel}>Unpaid</Text>
              <Text style={[styles.miniValue, { color: "#FFD36A" }]}>
                ₱{computed.unpaidText}
              </Text>
              <Text style={styles.miniHint}>Waiting admin payout</Text>
            </View>

            <View style={styles.miniBox}>
              <Text style={styles.miniLabel}>Paid</Text>
              <Text style={[styles.miniValue, { color: "#7CFF9B" }]}>
                ₱{computed.paidText}
              </Text>
              <Text style={styles.miniHint}>Already released</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() =>
              Alert.alert(
                "Request Payout (MVP)",
                "This is UI-only for now. Admin will mark payouts as paid."
              )
            }
          >
            <Text style={styles.primaryBtnText}>Request Payout</Text>
          </TouchableOpacity>

          <Text style={styles.cardHint}>
            Tip: Your earnings increase when you scan commuter QR / NFC as an operator.
          </Text>
        </View>

        {/* Recent Settlements */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Recent Settlements</Text>
          <TouchableOpacity onPress={load}>
            <Text style={styles.link}>Reload</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 12, gap: 10 }}>
          {computed.items.map((it) => {
            const amt = Number(it.amount || 0);
            const when = it.created_at ? new Date(it.created_at).toLocaleString() : "";
            const status = String(it.status || "unpaid").toLowerCase();

            return (
              <View key={it.id} style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={styles.iconBox}>
                    <Text style={styles.iconText}>{status === "paid" ? "✅" : "🕒"}</Text>
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
                    status === "paid" ? styles.pillPaid : styles.pillUnpaid,
                  ]}
                >
                  <Text style={styles.statusText}>{status}</Text>
                </View>
              </View>
            );
          })}

          {computed.items.length === 0 ? (
            <Text style={styles.dim}>No settlements yet. Do a scan to generate earnings.</Text>
          ) : null}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0E14" },
  content: { padding: 18 },

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

  bigCard: {
    marginTop: 16,
    borderRadius: 22,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  cardLabel: { color: "rgba(255,255,255,0.65)", fontSize: 12 },
  bigValue: { color: "#fff", fontSize: 34, fontWeight: "900", marginTop: 8 },

  splitRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  miniBox: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  miniLabel: { color: "rgba(255,255,255,0.6)", fontSize: 12 },
  miniValue: { marginTop: 6, fontSize: 18, fontWeight: "900" },
  miniHint: { marginTop: 6, color: "rgba(255,255,255,0.5)", fontSize: 11 },

  primaryBtn: {
    marginTop: 14,
    backgroundColor: "#FFD36A",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryBtnText: { color: "#0B0E14", fontWeight: "900" },

  cardHint: { color: "rgba(255,255,255,0.55)", marginTop: 12, fontSize: 12, lineHeight: 18 },

  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 18 },
  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "900" },
  link: { color: "rgba(255,255,255,0.75)", textDecorationLine: "underline" },

  row: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },

  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 16 },

  rowTitle: { color: "#fff", fontWeight: "900" },
  rowMeta: { color: "rgba(255,255,255,0.55)", marginTop: 4, fontSize: 12 },

  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  pillPaid: {
    backgroundColor: "rgba(124,255,155,0.18)",
    borderWidth: 1,
    borderColor: "rgba(124,255,155,0.35)",
  },
  pillUnpaid: {
    backgroundColor: "rgba(255,211,106,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,211,106,0.35)",
  },
  statusText: { color: "#fff", fontWeight: "900", fontSize: 12, textTransform: "uppercase" },
});
