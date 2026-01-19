import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, RefreshControl, Alert } from "react-native";
import { Screen, Card, Pill } from "../components/ui";
import { supabase } from "../api/supabase";
import { API_BASE_URL } from "../config/api";

function formatPHP(n) {
  const num = Number(n || 0);
  return `₱${num.toFixed(2)}`;
}

function titleFor(item) {
  if (item.source === "topup") return "Top Up";
  // ledger kinds
  if (String(item.kind).includes("fare")) return "Ride Fare";
  if (String(item.kind).includes("debit")) return "Debit";
  if (String(item.kind).includes("credit")) return "Credit";
  return item.kind || "Transaction";
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
    <Screen title="Transactions" subtitle="Your wallet activity history.">
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
                style={{
                  padding: 14,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                  backgroundColor: "rgba(0,0,0,0.18)",
                  marginBottom: 10,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: "#F4EEE6", fontWeight: "900" }}>
                    {titleFor(it)}
                  </Text>

                  <Text style={{ color: isDebit ? "#FF8A8A" : "#7CFF9B", fontWeight: "900" }}>
                    {amountText}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                  <Text style={{ color: "rgba(244,238,230,0.55)", fontSize: 12 }}>
                    {new Date(it.created_at).toLocaleString()}
                  </Text>

                  <Text style={{ color: "rgba(244,238,230,0.75)", fontSize: 12, fontWeight: "800" }}>
                    {badgeFor(it)}
                  </Text>
                </View>

                {it.meta ? (
                  <Text style={{ marginTop: 8, color: "rgba(244,238,230,0.5)", fontSize: 12 }}>
                    {it.meta}
                  </Text>
                ) : null}
              </View>
            );
          })}

          {!loading && items.length === 0 ? (
            <Text style={{ color: "rgba(244,238,230,0.65)", marginTop: 10 }}>
              No transactions yet.
            </Text>
          ) : null}

          <View style={{ height: 24 }} />
        </ScrollView>
      </Card>
    </Screen>
  );
}
