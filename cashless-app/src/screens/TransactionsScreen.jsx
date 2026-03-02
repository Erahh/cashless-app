import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, RefreshControl, Alert, SafeAreaView, TouchableOpacity, StyleSheet } from "react-native";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ArrowLeft01Icon, RefreshIcon } from "@hugeicons/core-free-icons";
import { Card, Pill } from "../components/ui";
import { supabase } from "../api/supabase";
import { API_BASE_URL } from "../config/api";
import { useTheme } from "../context/ThemeContext";

function formatPHP(n) {
  const num = Number(n || 0);
  return `₱${num.toFixed(2)}`;
}

function titleFor(item) {
  // Use label from API if available (includes description)
  if (item.label) return item.label;
  if (item.source === "topup") return "PayMongo Top Up";
  // Fallback: identify by kind
  switch (item.kind) {
    case "topup_credit": return "PayMongo Top Up";
    case "fare_debit": return "Ride Fare Payment";
    case "load_transfer_debit": return item.description || "Send Load";
    case "load_transfer_credit": return item.description || "Received Load";
    default:
      if (String(item.kind).includes("fare")) return "Ride Fare";
      if (String(item.kind).includes("debit")) return "Debit";
      if (String(item.kind).includes("credit")) return "Credit";
      return item.kind || "Transaction";
  }
}

function badgeFor(item) {
  if (item.source === "topup") {
    const s = String(item.status || "").toUpperCase();
    if (s === "PAID") return "PAID";
    if (s === "PENDING") return "PENDING";
    return s || "TOPUP";
  }
  return "POSTED";
}

export default function TransactionsScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState([]);

  const load = async () => {
    try {
      setLoading(true);

      const { data: s } = await supabase.auth.getSession();
      const token = s?.session?.access_token;
      if (!token) throw new Error("No session. Please login again.");

      const res = await fetch(`${API_BASE_URL}/wallet/transactions?limit=60`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const text = await res.text();
      const json = text ? JSON.parse(text) : null;

      if (!res.ok) throw new Error(json?.error || `Failed (HTTP ${res.status})`);

      setItems(json?.items || []);
    } catch (e) {
      Alert.alert("Transactions", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsub = navigation?.addListener?.("focus", load);
    load();
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Fixed Header - Outside ScrollView */}
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8} style={styles.backBtn}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transactions</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={load} activeOpacity={0.9}>
          <HugeiconsIcon icon={RefreshIcon} size={18} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >

        <Card>
          <Pill text={loading ? "Loading..." : `${items.length} records`} />

          <ScrollView
            style={{ marginTop: 14 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            showsVerticalScrollIndicator={false}
          >
            {items.map((it) => {
              const isDebit =
                it.source === "ledger" &&
                (String(it.kind).includes("debit") || String(it.kind).includes("fare"));

              const amountText = (isDebit ? "-" : "+") + formatPHP(it.amount);

              return (
                <View
                  key={it.id}
                  style={styles.txRow}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={styles.txTitle}>
                      {titleFor(it)}
                    </Text>

                    <Text style={[styles.txAmount, { color: isDebit ? theme.danger : theme.success }]}>
                      {amountText}
                    </Text>
                  </View>

                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                    <Text style={styles.txDate}>
                      {new Date(it.created_at).toLocaleString()}
                    </Text>

                    <Text style={styles.txBadge}>
                      {badgeFor(it)}
                    </Text>
                  </View>

                  {it.meta ? (
                    <Text style={styles.txMeta}>
                      {it.meta}
                    </Text>
                  ) : null}
                </View>
              );
            })}

            {!loading && items.length === 0 ? (
              <Text style={styles.emptyText}>
                No transactions yet.
              </Text>
            ) : null}

            <View style={{ height: 24 }} />
          </ScrollView>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    padding: 18,
  },
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
    backgroundColor: theme.card,
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
    backgroundColor: theme.card,
    alignItems: "center",
    justifyContent: "center",
  },
  txRow: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    marginBottom: 10,
  },
  txTitle: { color: theme.text, fontWeight: "900" },
  txAmount: { fontWeight: "900" },
  txDate: { color: theme.textMuted, fontSize: 12 },
  txBadge: { color: theme.textSecondary, fontSize: 12, fontWeight: "800" },
  txMeta: { marginTop: 8, color: theme.textMuted, fontSize: 12 },
  emptyText: { color: theme.textMuted, marginTop: 10 },
});
