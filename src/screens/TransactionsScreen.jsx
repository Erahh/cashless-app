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

export default function TransactionsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [raw, setRaw] = useState([]);
  const [filter, setFilter] = useState("all"); // all | approved | declined

  const load = async () => {
    try {
      setLoading(true);

      const { data: sessionData, error } = await supabase.auth.getSession();
      if (error) throw error;

      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("No session. Please login again.");

      const res = await fetch(`${API_BASE_URL}/transactions/history?limit=60`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load transactions");

      setRaw(json.items || []);
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
    const items = Array.isArray(raw) ? raw : [];

    const filtered =
      filter === "all"
        ? items
        : items.filter((t) => String(t.status || "").toLowerCase() === filter);

    const totalSpent = filtered.reduce((sum, t) => {
      const amt = Number(t.fare_amount || 0);
      return String(t.status || "").toLowerCase() === "approved" ? sum + amt : sum;
    }, 0);

    const fmtMoney = (n) =>
      n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return {
      filtered,
      totalSpent,
      totalSpentText: fmtMoney(totalSpent),
    };
  }, [raw, filter]);

  const Pill = ({ value, label }) => {
    const active = filter === value;
    return (
      <TouchableOpacity
        onPress={() => setFilter(value)}
        style={[styles.pill, active && styles.pillActive]}
      >
        <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.dim}>Loading transactions...</Text>
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
            <Text style={styles.title}>Transactions</Text>
            <Text style={styles.subtitle}>Your ride history</Text>
          </View>

          <TouchableOpacity style={styles.smallBtn} onPress={load}>
            <Text style={styles.smallBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Summary card */}
        <View style={styles.bigCard}>
          <Text style={styles.cardLabel}>Total Spent (filtered)</Text>
          <Text style={styles.bigValue}>₱{computed.totalSpentText}</Text>

          <View style={styles.pillsRow}>
            <Pill value="all" label="All" />
            <Pill value="approved" label="Approved" />
            <Pill value="declined" label="Declined" />
          </View>

          <Text style={styles.cardHint}>
            Tip: Declined scans don’t deduct your wallet.
          </Text>
        </View>

        {/* List */}
        <Text style={styles.sectionTitle}>Recent</Text>

        <View style={{ marginTop: 12, gap: 10 }}>
          {computed.filtered.map((t) => {
            const status = String(t.status || "").toLowerCase();
            const amt = Number(t.fare_amount || 0);

            const when = t.scanned_at
              ? new Date(t.scanned_at).toLocaleString()
              : t.created_at
              ? new Date(t.created_at).toLocaleString()
              : "";

            const title = status === "approved" ? "Ride Fare" : "Declined";
            const route = t.route_name || "Route";
            const meta =
              status === "declined"
                ? `Reason: ${t.decline_reason || "unknown"}`
                : `Passenger: ${t.passenger_type || "casual"} • ${t.verification_status || "unverified"}`;

            return (
              <TouchableOpacity
                key={t.id}
                style={styles.row}
                activeOpacity={0.9}
                onPress={() =>
                  Alert.alert(
                    "Transaction Details",
                    `Status: ${status}\nAmount: ₱${amt.toFixed(2)}\nRoute: ${route}\nTime: ${when}\n\n${meta}`
                  )
                }
              >
                <View style={styles.rowLeft}>
                  <View style={styles.iconBox}>
                    <Text style={styles.iconText}>{status === "approved" ? "🚌" : "⛔"}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>
                      {title} • {route}
                    </Text>
                    <Text style={styles.rowMeta}>{when}</Text>
                    <Text style={styles.rowMeta2}>{meta}</Text>
                  </View>
                </View>

                <Text style={[styles.amount, status === "approved" ? styles.neg : styles.dimAmount]}>
                  {status === "approved" ? "-" : ""}₱{amt.toFixed(2)}
                </Text>
              </TouchableOpacity>
            );
          })}

          {computed.filtered.length === 0 ? (
            <Text style={styles.dim}>No transactions found.</Text>
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

  pillsRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  pillActive: { backgroundColor: "#FFD36A", borderColor: "rgba(255,211,106,0.7)" },
  pillText: { color: "rgba(255,255,255,0.8)", fontWeight: "900", fontSize: 12 },
  pillTextActive: { color: "#0B0E14" },

  cardHint: { color: "rgba(255,255,255,0.55)", marginTop: 12, fontSize: 12, lineHeight: 18 },

  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "900", marginTop: 18 },

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
  rowLeft: { flexDirection: "row", alignItems: "flex-start", gap: 12, flex: 1 },

  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  iconText: { fontSize: 16 },

  rowTitle: { color: "#fff", fontWeight: "900" },
  rowMeta: { color: "rgba(255,255,255,0.55)", marginTop: 4, fontSize: 12 },
  rowMeta2: { color: "rgba(255,255,255,0.45)", marginTop: 4, fontSize: 11 },

  amount: { fontWeight: "900", fontSize: 14 },
  neg: { color: "#FF8A8A" },
  dimAmount: { color: "rgba(255,255,255,0.45)" },
});
