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

// ✅ Helper: Render cold start safe timeout
async function fetchWithTimeout(url, options = {}, ms = 35000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

export default function OperatorEarningsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [netMsg, setNetMsg] = useState("");
  const [data, setData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = async ({ silent = false, canRetry = true } = {}) => {
    try {
      if (!silent) setLoading(true);
      if (!silent) setNetMsg("");

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("No session. Please login again.");

      // ✅ This is the ONLY endpoint assumption.
      // If your backend uses a different route, just change it here.
      const res = await fetchWithTimeout(`${API_BASE_URL}/operator/earnings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const text = await res.text();
      let json = null;

      if (text) {
        try {
          json = JSON.parse(text);
        } catch {
          throw new Error(`Server returned non-JSON (HTTP ${res.status})`);
        }
      }

      if (!res.ok) {
        throw new Error(json?.error || `Request failed (HTTP ${res.status})`);
      }

      setData(json);
      setLastUpdated(new Date().toISOString());
      setNetMsg("");
    } catch (e) {
      const isTimeout = e?.name === "AbortError";
      const msg = isTimeout ? "Server waking up (Render sleep). Retrying..." : e.message;
      setNetMsg(msg);

      if (isTimeout && canRetry) {
        try {
          await new Promise((r) => setTimeout(r, 1500));
          return await load({ silent: true, canRetry: false });
        } catch {
          // keep netMsg
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = navigation?.addListener?.("focus", () => load({ silent: true }));
    load({ silent: false });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const computed = useMemo(() => {
    // Expected (recommended) backend response shape:
    // {
    //   ok: true,
    //   summary: { today_total, week_total, unpaid_total, paid_total },
    //   settlements: [{ id, amount, status, created_at, route_name, vehicle_id, paid_at }]
    // }
    const s = data?.summary || {};
    const settlements = Array.isArray(data?.settlements) ? data.settlements : [];

    const today = Number(s.today_total ?? 0);
    const week = Number(s.week_total ?? 0);
    const unpaid = Number(s.unpaid_total ?? 0);
    const paid = Number(s.paid_total ?? 0);

    const money = (n) =>
      Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Small badge tone based on unpaid
    const badge =
      unpaid > 0
        ? { text: "UNPAID • Pending Payout", tone: "warn" }
        : { text: "ALL PAID • Up to date", tone: "good" };

    return {
      todayText: money(today),
      weekText: money(week),
      unpaidText: money(unpaid),
      paidText: money(paid),
      badge,
      settlements,
    };
  }, [data]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 10 }}>
            Loading operator earnings...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.smallLabel}>Operator Earnings</Text>
            <Text style={styles.balance}>₱{computed.todayText}</Text>
            <Text style={styles.subtitle}>Today’s collected fares</Text>

            {lastUpdated ? (
              <Text style={styles.updatedAt}>
                Last updated: {new Date(lastUpdated).toLocaleTimeString()}
              </Text>
            ) : null}

            <View style={[styles.badge, styles[`badge_${computed.badge.tone}`]]}>
              <Text style={styles.badgeText}>{computed.badge.text}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.smallBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.smallBtnText}>Back</Text>
          </TouchableOpacity>
        </View>

        {netMsg ? (
          <View style={styles.netBox}>
            <Text style={styles.netTitle}>Connection</Text>
            <Text style={styles.netText}>{netMsg}</Text>
          </View>
        ) : null}

        {/* Big Card */}
        <View style={styles.bigCard}>
          <View style={styles.bigCardTopRow}>
            <View>
              <Text style={styles.cardLabel}>Unpaid (Payout Queue)</Text>
              <Text style={styles.cardValue}>₱{computed.unpaidText}</Text>
            </View>

            <View style={styles.pill}>
              <Text style={styles.pillText}>Operator</Text>
            </View>
          </View>

          <View style={styles.waveBox}>
            <View style={styles.waveLine} />
          </View>

          <Text style={styles.cardHint}>
            Admin marks settlements as paid. This shows how much is waiting for payout.
          </Text>
        </View>

        {/* Stats cards (same vibe as commuter wallet card) */}
        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statCard} activeOpacity={0.9}>
            <Text style={styles.statLabel}>This Week</Text>
            <Text style={styles.statValue}>₱{computed.weekText}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} activeOpacity={0.9}>
            <Text style={styles.statLabel}>Paid Total</Text>
            <Text style={styles.statValue}>₱{computed.paidText}</Text>
          </TouchableOpacity>
        </View>

        {/* Quick actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionCard}
            activeOpacity={0.9}
            onPress={() => navigation.navigate("OperatorApp", { screen: "OperatorScan" })}
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>📷</Text>
            </View>
            <Text style={styles.actionTitle}>Scan</Text>
            <Text style={styles.actionSub}>Collect fare</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            activeOpacity={0.9}
            onPress={() => navigation.navigate("OperatorApp", { screen: "OperatorMyQR" })}
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>📲</Text>
            </View>
            <Text style={styles.actionTitle}>My QR</Text>
            <Text style={styles.actionSub}>Receive pay</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            activeOpacity={0.9}
            onPress={() => load({ silent: false })}
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>🔄</Text>
            </View>
            <Text style={styles.actionTitle}>Refresh</Text>
            <Text style={styles.actionSub}>Update list</Text>
          </TouchableOpacity>
        </View>

        {/* Recent settlements */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Recent Settlements</Text>
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                "Info",
                "This list shows operator settlements created when commuters pay fares. Admin marks them as paid."
              )
            }
          >
            <Text style={styles.link}>What’s this?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.list}>
          {computed.settlements.slice(0, 20).map((x) => {
            const amount = Number(x.amount || 0);
            const status = String(x.status || "unpaid").toLowerCase();

            const date = x.paid_at || x.created_at;
            const d = date ? new Date(date) : null;

            const dateStr = d
              ? d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
              : "—";

            const timeStr = d
              ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true })
              : "";

            const statusText = status === "paid" ? "PAID" : "UNPAID";

            return (
              <View key={x.id} style={styles.txRow}>
                <View style={styles.txLeft}>
                  <View style={styles.txIcon}>
                    <Text style={styles.txIconText}>{status === "paid" ? "✅" : "⏳"}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.txTitle}>
                      Settlement • {statusText}
                    </Text>

                    <Text style={styles.txMeta}>
                      {x.route_name ? `Route: ${x.route_name}` : "Route: —"}{" "}
                      {x.vehicle_id ? `• Vehicle: ${String(x.vehicle_id).slice(0, 6)}…` : ""}
                    </Text>

                    <Text style={styles.txTime}>
                      {dateStr} {timeStr ? `• ${timeStr}` : ""}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.txAmount, status === "paid" ? styles.txPos : styles.txWarn]}>
                  ₱{amount.toFixed(2)}
                </Text>
              </View>
            );
          })}

          {computed.settlements.length === 0 ? (
            <Text style={{ color: "rgba(255,255,255,0.55)", marginTop: 10 }}>
              No settlements yet. Scan commuter QR to collect fare.
            </Text>
          ) : null}
        </View>

        {/* Back to scan */}
        <TouchableOpacity
          style={{ marginTop: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", alignItems: "center" }}
          onPress={() => navigation.navigate("OperatorApp", { screen: "OperatorScan" })}
        >
          <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "800" }}>
            Back to Scan
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0E14" },
  scroll: { flex: 1 },
  content: { padding: 18, paddingBottom: 80 },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 6,
  },
  smallLabel: { color: "rgba(255,255,255,0.65)", fontSize: 12 },
  balance: { color: "#fff", fontSize: 32, fontWeight: "800", marginTop: 6 },
  subtitle: { color: "rgba(255,255,255,0.70)", marginTop: 6 },

  updatedAt: { marginTop: 6, color: "rgba(255,255,255,0.45)", fontSize: 12 },

  badge: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: { color: "#0B0E14", fontWeight: "800", fontSize: 12 },
  badge_good: { backgroundColor: "#7CFF9B" },
  badge_warn: { backgroundColor: "#FFD36A" },
  badge_bad: { backgroundColor: "#FF7A7A" },
  badge_neutral: { backgroundColor: "rgba(255,255,255,0.8)" },

  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  smallBtnText: { color: "rgba(255,255,255,0.85)", fontWeight: "800" },

  netBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255, 211, 106, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(255, 211, 106, 0.25)",
  },
  netTitle: { color: "#FFD36A", fontWeight: "900" },
  netText: { marginTop: 6, color: "rgba(255,255,255,0.75)", lineHeight: 18 },

  bigCard: {
    marginTop: 18,
    borderRadius: 22,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  bigCardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardLabel: { color: "rgba(255,255,255,0.65)", fontSize: 12 },
  cardValue: { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 6 },

  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255, 211, 106, 0.95)",
  },
  pillText: { fontWeight: "900", color: "#0B0E14" },

  waveBox: {
    height: 56,
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.22)",
    overflow: "hidden",
    justifyContent: "center",
  },
  waveLine: { height: 3, width: "100%", backgroundColor: "rgba(255, 150, 80, 0.9)" },

  cardHint: { color: "rgba(255,255,255,0.55)", marginTop: 10, fontSize: 12 },

  statsRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  statLabel: { color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: "800" },
  statValue: { color: "#fff", fontSize: 18, fontWeight: "900", marginTop: 8 },

  actionsRow: { flexDirection: "row", gap: 12, marginTop: 14 },
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
  actionTitle: { color: "#fff", fontWeight: "800" },
  actionSub: { color: "rgba(255,255,255,0.55)", marginTop: 4, fontSize: 12 },

  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "800", marginTop: 18 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  link: { color: "rgba(255,255,255,0.75)", textDecorationLine: "underline" },

  list: { marginTop: 12 },

  txRow: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  txLeft: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 12 },

  txIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  txIconText: { fontSize: 16 },

  txTitle: { color: "#fff", fontWeight: "800" },
  txMeta: { color: "rgba(255,255,255,0.65)", marginTop: 3, fontSize: 12, fontWeight: "600" },
  txTime: { color: "rgba(255,255,255,0.45)", marginTop: 2, fontSize: 11 },

  txAmount: { fontWeight: "900", fontSize: 16 },
  txPos: { color: "#7CFF9B" },
  txWarn: { color: "#FFD36A" },
});
