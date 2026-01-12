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

export default function AdminSettlementsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const load = async () => {
    try {
      setLoading(true);

      const { data: sessionData, error } = await supabase.auth.getSession();
      if (error) throw error;

      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("No session token");

      const res = await fetch(`${API_BASE_URL}/admin/settlements/unpaid`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load settlements");

      setData(json);
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const markPaid = async (id) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("No session token");

      const res = await fetch(`${API_BASE_URL}/admin/settlements/${id}/mark-paid`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notes: "Paid via admin app (MVP)" }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Mark paid failed");

      Alert.alert("✅ Paid", "Settlement marked as PAID.");
      load();
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  useEffect(() => {
    const unsub = navigation?.addListener?.("focus", load);
    load();
    return unsub;
  }, []);

  const computed = useMemo(() => {
    const items = Array.isArray(data?.items) ? data.items : [];
    const total = Number(data?.total ?? 0);

    return { items, total };
  }, [data]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.dim}>Loading unpaid settlements...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Admin Payouts</Text>
            <Text style={styles.subtitle}>Unpaid settlements queue</Text>
          </View>

          <TouchableOpacity style={styles.smallBtn} onPress={load}>
            <Text style={styles.smallBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bigCard}>
          <Text style={styles.cardLabel}>Total Unpaid</Text>
          <Text style={styles.bigValue}>₱{computed.total.toFixed(2)}</Text>
          <Text style={styles.cardHint}>
            Tap a settlement to mark it as PAID.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Unpaid Items</Text>

        <View style={{ marginTop: 12, gap: 10 }}>
          {computed.items.map((it) => (
            <TouchableOpacity
              key={it.id}
              style={styles.row}
              activeOpacity={0.9}
              onPress={() =>
                Alert.alert(
                  "Mark as paid?",
                  `Operator: ${it?.profiles?.full_name || it.operator_id}\nAmount: ₱${Number(
                    it.amount || 0
                  ).toFixed(2)}\nRoute: ${it.route_name || "-"}`,
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Mark Paid", onPress: () => markPaid(it.id) },
                  ]
                )
              }
            >
              <View style={styles.rowLeft}>
                <View style={styles.iconBox}>
                  <Text style={styles.iconText}>💸</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>
                    ₱{Number(it.amount || 0).toFixed(2)} • {it.route_name || "Route"}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {it?.profiles?.full_name || "Operator"} • {String(it.tx_id || "").slice(0, 8)}…
                  </Text>
                </View>
              </View>

              <View style={styles.pill}>
                <Text style={styles.pillText}>UNPAID</Text>
              </View>
            </TouchableOpacity>
          ))}

          {computed.items.length === 0 ? (
            <Text style={styles.dim}>No unpaid settlements 🎉</Text>
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
  bigValue: { color: "#FFD36A", fontSize: 34, fontWeight: "900", marginTop: 8 },
  cardHint: { color: "rgba(255,255,255,0.55)", marginTop: 10, fontSize: 12, lineHeight: 18 },

  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "900", marginTop: 18 },

  row: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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

  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,211,106,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,211,106,0.35)",
  },
  pillText: { color: "#fff", fontWeight: "900", fontSize: 12 },
});
