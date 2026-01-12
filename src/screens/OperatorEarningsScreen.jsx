import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { supabase } from "../api/supabase";
import { API_BASE_URL } from "../config/api";

export default function OperatorEarningsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ total: 0, status: "unpaid", items: [] });

  const load = async () => {
    try {
      setLoading(true);

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("No session. Please login again.");

      const res = await fetch(`${API_BASE_URL}/settlements/me?status=unpaid`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load earnings");

      setData({
        total: Number(json.total ?? 0),
        status: json.status || "unpaid",
        items: json.items || [],
      });
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
    const totalText = Number(data.total || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const count = (data.items || []).length;

    return { totalText, count };
  }, [data]);

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
            <Text style={styles.smallLabel}>Operator Earnings</Text>
            <Text style={styles.title}>Unpaid Settlements</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{computed.count} trips • {String(data.status).toUpperCase()}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.icon}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Total Card */}
        <View style={styles.bigCard}>
          <Text style={styles.cardLabel}>Unpaid Total</Text>
          <Text style={styles.bigValue}>₱{computed.totalText}</Text>

          <View style={styles.cardRow}>
            <View style={styles.mini}>
              <Text style={styles.miniLabel}>Trips</Text>
              <Text style={styles.miniValue}>{computed.count}</Text>
            </View>

            <View style={styles.mini}>
              <Text style={styles.miniLabel}>Status</Text>
              <Text style={styles.miniValue}>{String(data.status).toUpperCase()}</Text>
            </View>
          </View>

          <Text style={styles.hint}>
            This is a settlement ledger. Admin can mark these as paid later.
          </Text>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Actions</Text>
        <View style={styles.actionsRow}>
          <ActionCard
            icon="🔄"
            title="Refresh"
            subtitle="Reload"
            onPress={load}
          />
          <ActionCard
            icon="🚌"
            title="Change Vehicle"
            subtitle="Operator setup"
            onPress={() => navigation.navigate("OperatorSetup")}
          />
          <ActionCard
            icon="📷"
            title="Scan"
            subtitle="Open scanner"
            onPress={() => navigation.navigate("OperatorScan")}
          />
        </View>

        {/* List */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Recent Unpaid</Text>
          <Text style={styles.dim}>{computed.count} items</Text>
        </View>

        {computed.count === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No unpaid settlements</Text>
            <Text style={styles.emptyText}>
              Scan commuter QR codes to generate settlement entries.
            </Text>
          </View>
        ) : (
          <View style={{ marginTop: 12, gap: 10 }}>
            {data.items.map((x) => (
              <View key={x.id} style={styles.rowCard}>
                <View style={styles.rowLeft}>
                  <View style={styles.rowIcon}>
                    <Text style={styles.rowIconText}>🧾</Text>
                  </View>
                  <View>
                    <Text style={styles.rowTitle}>₱{Number(x.amount || 0).toFixed(2)}</Text>
                    <Text style={styles.rowMeta}>
                      {x.route_name ? `Route ${x.route_name}` : "No route"} •{" "}
                      {new Date(x.created_at).toLocaleString()}
                    </Text>
                    <Text style={styles.rowSub}>
                      Vehicle: {String(x.vehicle_id).slice(0, 8)}… • Tx: {String(x.tx_id).slice(0, 8)}…
                    </Text>
                  </View>
                </View>

                <View style={styles.statusPill}>
                  <Text style={styles.statusText}>{String(x.status).toUpperCase()}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />

        {/* Bottom Buttons */}
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate("OperatorScan")}>
          <Text style={styles.primaryText}>Start Scanning</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.ghostBtn} onPress={() => navigation.navigate("Home")}>
          <Text style={styles.ghostText}>Back to Home</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionCard({ icon, title, subtitle, onPress }) {
  return (
    <TouchableOpacity style={styles.actionCard} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.actionIcon}>
        <Text style={styles.actionIconText}>{icon}</Text>
      </View>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionSub}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0E14" },
  content: { padding: 18, paddingTop: 60 },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  dim: { color: "rgba(255,255,255,0.6)", marginTop: 8, fontSize: 12 },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  smallLabel: { color: "rgba(255,255,255,0.65)", fontSize: 12 },
  title: { color: "#fff", fontSize: 22, fontWeight: "900", marginTop: 6 },

  badge: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  badgeText: { color: "rgba(255,255,255,0.85)", fontWeight: "900", fontSize: 12 },

  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { color: "rgba(255,255,255,0.85)", fontWeight: "900", fontSize: 16 },

  bigCard: {
    marginTop: 18,
    borderRadius: 22,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  cardLabel: { color: "rgba(255,255,255,0.65)", fontSize: 12 },
  bigValue: { color: "#FFD36A", fontSize: 34, fontWeight: "900", marginTop: 10 },

  cardRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  mini: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  miniLabel: { color: "rgba(255,255,255,0.55)", fontSize: 12 },
  miniValue: { color: "#fff", fontWeight: "900", marginTop: 6 },

  hint: { color: "rgba(255,255,255,0.55)", marginTop: 12, fontSize: 12, lineHeight: 18 },

  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "900", marginTop: 18 },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },

  actionsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  actionCard: {
    flex: 1,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  actionIconText: { fontSize: 16 },
  actionTitle: { color: "#fff", fontWeight: "900" },
  actionSub: { color: "rgba(255,255,255,0.55)", marginTop: 4, fontSize: 12 },

  emptyBox: {
    marginTop: 12,
    borderRadius: 18,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  emptyTitle: { color: "#fff", fontWeight: "900" },
  emptyText: { color: "rgba(255,255,255,0.65)", marginTop: 6, lineHeight: 18 },

  rowCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1, paddingRight: 10 },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconText: { fontSize: 16 },

  rowTitle: { color: "#fff", fontWeight: "900" },
  rowMeta: { color: "rgba(255,255,255,0.65)", marginTop: 4, fontSize: 12 },
  rowSub: { color: "rgba(255,255,255,0.45)", marginTop: 4, fontSize: 11 },

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255, 211, 106, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(255, 211, 106, 0.30)",
  },
  statusText: { color: "#FFD36A", fontWeight: "900", fontSize: 12 },

  primaryBtn: {
    marginTop: 18,
    backgroundColor: "#FFD36A",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  primaryText: { color: "#0B0E14", fontWeight: "900", fontSize: 15 },

  ghostBtn: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  ghostText: { color: "rgba(255,255,255,0.85)", fontWeight: "900", fontSize: 15 },
});
