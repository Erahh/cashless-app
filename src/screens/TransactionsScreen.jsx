import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { fetchTransactions } from "../api/transactionApi";

export default function TransactionsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchTransactions(50);
      setItems(data);
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
    const approved = items.filter((x) => x.status === "approved");
    const totalSpent = approved.reduce((sum, x) => sum + Number(x.fare_amount || 0), 0);

    return {
      totalSpentText: totalSpent.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    };
  }, [items]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={styles.back}>‹ Back</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.refreshBtn} onPress={load} activeOpacity={0.9}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Transactions</Text>
        <Text style={styles.sub}>Your ride history and payment logs</Text>

        {/* Summary card */}
        <View style={styles.bigCard}>
          <Text style={styles.cardLabel}>Total Spent (Approved)</Text>
          <Text style={styles.cardValue}>₱ {computed.totalSpentText}</Text>
          <Text style={styles.cardHint}>Only approved ride fares are included.</Text>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Recent</Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.dim}>Loading transactions...</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No transactions yet</Text>
            <Text style={styles.dim}>
              Once you scan/tap to ride, your history will appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((tx) => {
              const isApproved = tx.status === "approved";
              const amount = Number(tx.fare_amount || 0);

              const route = tx.route_name || "ROUTE";
              const when = tx.scanned_at ? new Date(tx.scanned_at).toLocaleString() : "-";

              const badge =
                isApproved ? "APPROVED" : tx.status?.toUpperCase() || "UNKNOWN";

              return (
                <View key={tx.id} style={styles.txRow}>
                  <View style={styles.txLeft}>
                    <View style={styles.txIcon}>
                      <Text style={styles.txIconText}>🚌</Text>
                    </View>
                    <View style={{ flexShrink: 1 }}>
                      <Text style={styles.txTitle}>
                        Ride Fare • {route}
                      </Text>
                      <Text style={styles.txMeta}>
                        {when}
                        {tx.offline ? " • Offline" : ""}
                      </Text>
                      {!isApproved && tx.decline_reason ? (
                        <Text style={styles.txMetaBad}>
                          Reason: {tx.decline_reason}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={{ alignItems: "flex-end", gap: 6 }}>
                    <View
                      style={[
                        styles.smallPill,
                        isApproved ? styles.pillGood : styles.pillBad,
                      ]}
                    >
                      <Text style={styles.smallPillText}>{badge}</Text>
                    </View>

                    <Text style={[styles.txAmount, isApproved ? styles.txNeg : styles.txMuted]}>
                      -₱{amount.toFixed(2)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0E14" },
  content: { padding: 18, paddingTop: 18 },

  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  back: { color: "rgba(255,255,255,0.75)", fontWeight: "800" },

  refreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  refreshText: { color: "#fff", fontWeight: "800" },

  title: { color: "#fff", fontSize: 26, fontWeight: "900", marginTop: 14 },
  sub: { marginTop: 8, color: "rgba(255,255,255,0.65)" },

  bigCard: {
    marginTop: 16,
    borderRadius: 22,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  cardLabel: { color: "rgba(255,255,255,0.65)", fontSize: 12 },
  cardValue: { color: "#fff", fontSize: 22, fontWeight: "900", marginTop: 6 },
  cardHint: { color: "rgba(255,255,255,0.55)", marginTop: 10, fontSize: 12 },

  sectionRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 18 },
  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "900" },

  center: { marginTop: 20, alignItems: "center" },
  dim: { marginTop: 10, color: "rgba(255,255,255,0.6)" },

  empty: {
    marginTop: 14,
    padding: 18,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  emptyTitle: { color: "#fff", fontWeight: "900", fontSize: 16 },

  list: { marginTop: 12, gap: 10 },
  txRow: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  txLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },

  txIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  txIconText: { fontSize: 16 },

  txTitle: { color: "#fff", fontWeight: "900" },
  txMeta: { color: "rgba(255,255,255,0.55)", marginTop: 4, fontSize: 12 },
  txMetaBad: { color: "rgba(255, 138, 138, 0.9)", marginTop: 4, fontSize: 12 },

  txAmount: { fontWeight: "900", fontSize: 14 },
  txNeg: { color: "#FF8A8A" },
  txMuted: { color: "rgba(255,255,255,0.55)" },

  smallPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  pillGood: { backgroundColor: "#7CFF9B" },
  pillBad: { backgroundColor: "rgba(255, 122, 122, 0.25)", borderWidth: 1, borderColor: "rgba(255, 122, 122, 0.35)" },
  smallPillText: { fontWeight: "900", color: "#0B0E14", fontSize: 12 },
});
