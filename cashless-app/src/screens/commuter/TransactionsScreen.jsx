import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, RefreshControl, Alert, SafeAreaView, TouchableOpacity, StyleSheet } from "react-native";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ArrowLeft01Icon, RefreshIcon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Card, Pill } from "../../components/ui";
import TxIcon from "../../components/TxIcon";
import { supabase } from "../../api/supabase";
import { API_BASE_URL } from "../../config/api";
import { useTheme } from "../../context/ThemeContext";

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
}

export default function TransactionsScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState([]);
  const [isFullList, setIsFullList] = useState(false);

  const load = async (limit = 10) => {
    try {
      setLoading(true);

      const { data: s } = await supabase.auth.getSession();
      const token = s?.session?.access_token;
      if (!token) throw new Error("No session. Please login again.");

      const res = await fetch(`${API_BASE_URL}/wallet/transactions?limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const text = await res.text();
      const json = text ? JSON.parse(text) : null;

      if (!res.ok) throw new Error(json?.error || `Failed (HTTP ${res.status})`);

      setItems(json?.items || []);
      setIsFullList(limit > 10);
    } catch (e) {
      Alert.alert("Transactions", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsub = navigation?.addListener?.("focus", () => load(10));
    load(10);
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    load(10);
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
              const tString = titleFor(it);

              const dateDate = new Date(it.created_at);
              const timeString = dateDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const dateString = dateDate.toLocaleDateString();

              return (
                <TouchableOpacity
                  key={it.id}
                  style={styles.txRow}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate("TransactionDetails", { item: it })}
                >
                  <View style={styles.itemRow}>
                    <TxIcon title={tString} type={it.kind} source={it.source} />

                    <View style={styles.itemContent}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <Text style={styles.txTitle} numberOfLines={1}>{tString}</Text>
                        <Text style={[styles.txAmount, { color: isDebit ? theme.danger : theme.success }]}>{amountText}</Text>
                      </View>

                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 6 }}>
                        <View>
                          <Text style={styles.txDate}>{dateString} • {timeString}</Text>
                          {it.meta ? (
                            <Text style={styles.txMeta}>{it.meta}</Text>
                          ) : null}
                        </View>
                        <Text style={styles.txBadge}>{badgeFor(it)}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            {!loading && items.length === 0 ? (
              <Text style={styles.emptyText}>
                No transactions yet.
              </Text>
            ) : null}

            {!isFullList && items.length === 10 && (
              <TouchableOpacity style={styles.seeAllBtn} onPress={() => load(60)}>
                <Text style={styles.seeAllText}>See All Transactions</Text>
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} color={theme.text} />
              </TouchableOpacity>
            )}

            <View style={{ height: 120 }} />
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
    paddingBottom: 160,
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  itemContent: { flex: 1 },
  txTitle: { color: theme.text, fontSize: 16, fontWeight: "700", flex: 1, paddingRight: 8 },
  txAmount: { fontSize: 16, fontWeight: "900" },
  txDate: { color: theme.textMuted, fontSize: 12 },
  txBadge: { color: theme.textSecondary, fontSize: 11, fontWeight: "800", opacity: 0.8 },
  txMeta: { marginTop: 2, color: theme.textSecondary, fontSize: 12, fontStyle: "italic" },
  emptyText: { color: theme.textMuted, marginTop: 10 },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginTop: 15,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    gap: 8,
  },
  seeAllText: { color: theme.text, fontSize: 14, fontWeight: "700" },
});
