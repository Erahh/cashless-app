import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { adminGetUnpaidSettlements, adminMarkSettlementPaid } from "../api/adminApi";

export default function AdminPayoutScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ total: 0, items: [] });

  const load = async () => {
    try {
      setLoading(true);
      const json = await adminGetUnpaidSettlements();
      setData({ total: Number(json.total || 0), items: json.items || [] });
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

  const markPaid = async (item) => {
    Alert.alert(
      "Mark Paid?",
      `Pay ₱${Number(item.amount || 0).toFixed(2)} to operator?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark Paid",
          style: "destructive",
          onPress: async () => {
            try {
              await adminMarkSettlementPaid(item.id, "Paid end-of-day");
              Alert.alert("Done ✅", "Settlement marked as paid.");
              load();
            } catch (e) {
              Alert.alert("Failed", e.message);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Admin Payouts</Text>
          <Text style={styles.sub}>Unpaid settlements queue</Text>
        </View>

        <TouchableOpacity style={styles.btn} onPress={load}>
          <Text style={styles.btnText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Unpaid</Text>
        <Text style={styles.totalValue}>₱{data.total.toFixed(2)}</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator />
          <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 10 }}>Loading…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {data.items.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No unpaid settlements</Text>
              <Text style={styles.emptyText}>
                Do a successful operator scan first to generate settlements.
              </Text>
            </View>
          ) : (
            data.items.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>
                    ₱{Number(item.amount || 0).toFixed(2)} • {item.route_name || "N/A"}
                  </Text>

                  <Text style={styles.cardMeta}>
                    Operator: {item?.profiles?.full_name || item.operator_id}
                  </Text>

                  <Text style={styles.cardMeta}>
                    Status: {String(item.status || "").toUpperCase()}
                  </Text>
                </View>

                <TouchableOpacity style={styles.payBtn} onPress={() => markPaid(item)}>
                  <Text style={styles.payBtnText}>Mark Paid</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0E14" },
  header: {
    padding: 16,
    paddingTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { color: "#fff", fontSize: 20, fontWeight: "900" },
  sub: { color: "rgba(255,255,255,0.6)", marginTop: 4 },

  btn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  btnText: { color: "rgba(255,255,255,0.9)", fontWeight: "900" },

  totalCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  totalLabel: { color: "rgba(255,255,255,0.65)" },
  totalValue: { color: "#FFD36A", fontSize: 26, fontWeight: "900", marginTop: 6 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 10,
  },
  cardTitle: { color: "#fff", fontWeight: "900" },
  cardMeta: { color: "rgba(255,255,255,0.6)", marginTop: 4, fontSize: 12 },

  payBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#FFD36A",
  },
  payBtnText: { color: "#0B0E14", fontWeight: "900" },

  empty: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  emptyTitle: { color: "#fff", fontWeight: "900", fontSize: 16 },
  emptyText: { color: "rgba(255,255,255,0.65)", marginTop: 8, lineHeight: 18 },
});
