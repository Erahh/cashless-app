import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl
} from "react-native";

import { useTheme } from "../../context/ThemeContext";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Camera01Icon, QrCodeIcon, RefreshIcon, AnalyticsUpIcon, CheckmarkCircle02Icon, Time01Icon, Notification01Icon } from "@hugeicons/core-free-icons";
import TxIcon from "../../components/TxIcon";

import { supabase } from "../../api/supabase";
import { API_BASE_URL } from "../../config/api";

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

let CACHED_EARNINGS = null;

export default function OperatorEarningsScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [loading, setLoading] = useState(!CACHED_EARNINGS);
  const [refreshing, setRefreshing] = useState(false);
  const [netMsg, setNetMsg] = useState("");
  const [data, setData] = useState(CACHED_EARNINGS);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = async ({ silent = false, canRetry = true } = {}) => {
    try {
      if (!silent || !CACHED_EARNINGS) setLoading(true);
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
      CACHED_EARNINGS = json;
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
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    load({ silent: true });
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
          <ActivityIndicator color={theme.success} size="large" />
          <Text style={{ color: theme.textSecondary, marginTop: 10 }}>
            Loading operator earnings...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header Row outside ScrollView for fixed position */}
      <View style={styles.headerFixed}>
        <View style={styles.headerTitles}>
          <Text style={styles.title}>Analytics</Text>
          <Text style={styles.subtitle}>Performance Dashboard</Text>
        </View>
        <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate("Notifications")}>
          <HugeiconsIcon icon={Notification01Icon} size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
      >
        {netMsg ? (
          <View style={styles.netBox}>
            <Text style={styles.netTitle}>Connection</Text>
            <Text style={styles.netText}>{netMsg}</Text>
          </View>
        ) : null}

        {/* ═══════ EXACT WALLET CARD MATCH (Analytics Theme) ═══════ */}
        <View style={styles.walletCard}>
          {/* Balance Section */}
          <View style={styles.walletBalanceSection}>
            <View style={styles.walletBalanceInner}>
              <Text style={styles.walletBalanceLabel}>{"Collected\nToday"}</Text>
              <Text style={styles.walletBalanceAmount}>₱{computed.todayText}</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.walletDivider} />

          {/* Spending Section (Mapped to Queue & Trend) */}
          <View style={styles.walletSpendingSection}>
            <View style={styles.walletSpendingLeft}>
              <Text style={styles.walletSpendingLabel}>UNPAID QUEUE</Text>
              <Text style={styles.walletSpendingHint}>₱{computed.unpaidText} pending →</Text>
            </View>
            <View style={styles.walletSpendingRight}>
              <View style={styles.walletPercentRow}>
                <Text style={[styles.walletPercentText, { color: theme.success }]}>↑ +14.2%</Text>
                <Text style={styles.walletPercentLabel}>this week</Text>
              </View>
              {/* Mini Trend Graph - Green for Motivation */}
              <View style={styles.walletWaveRow}>
                <View style={[styles.walletWaveBar, { height: 10, backgroundColor: theme.success }]} />
                <View style={[styles.walletWaveBar, { height: 14, backgroundColor: theme.success }]} />
                <View style={[styles.walletWaveBar, { height: 8, backgroundColor: theme.success }]} />
                <View style={[styles.walletWaveBar, { height: 18, backgroundColor: theme.success }]} />
                <View style={[styles.walletWaveBar, { height: 12, backgroundColor: theme.success }]} />
                <View style={[styles.walletWaveBar, { height: 22, backgroundColor: theme.success }]} />
              </View>
            </View>
          </View>
        </View>

        {/* ═══════ 2x2 STATS GRID (screenshot version) ═══════ */}
        <View style={styles.statsGridCard}>
          <View style={styles.statsGrid}>
            <View style={styles.statsGridItem}>
              <Text style={styles.statsGridLabel}>COLLECTED TODAY</Text>
              <Text style={styles.statsGridValue}>₱{computed.todayText}</Text>
            </View>
            <View style={[styles.statsGridItem, styles.statsGridRight]}>
              <Text style={styles.statsGridLabel}>THIS WEEK</Text>
              <Text style={styles.statsGridValue}>₱{computed.weekText}</Text>
            </View>
            <View style={[styles.statsGridItem, styles.statsGridTop]}>
              <Text style={styles.statsGridLabel}>PAID OUT</Text>
              <Text style={[styles.statsGridValue, { color: theme.success }]}>₱{computed.paidText}</Text>
            </View>
            <View style={[styles.statsGridItem, styles.statsGridTop, styles.statsGridRight]}>
              <Text style={styles.statsGridLabel}>QUEUED</Text>
              <Text style={[styles.statsGridValue, { color: theme.warning }]}>₱{computed.unpaidText}</Text>
            </View>
          </View>
        </View>


        {/* Section Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={() => navigation.navigate("OperatorTransactions")}>
            <Text style={styles.headerLink}>See all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.transactionList}>
          {computed.settlements.slice(0, 20).map((x) => {
            const amount = Number(x.amount || 0);
            const status = String(x.status || "unpaid").toLowerCase();
            const date = x.paid_at || x.created_at;
            const d = date ? new Date(date) : null;

            const dateStr = d ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—";
            const timeStr = d ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "";
            const isPaid = status === "paid";

            return (
              <View key={x.id} style={styles.txCard}>
                <View style={styles.txLeft}>
                  <View style={{ marginRight: 12 }}>
                    <TxIcon title={isPaid ? "Paid" : "Collection"} type={isPaid ? "topup_credit" : "fare_debit"} source="ledger" />
                  </View>

                  <View style={styles.txInfo}>
                    <Text style={styles.txType}>
                      {isPaid ? "Payout" : "Collected Fare"}
                    </Text>
                    <Text style={styles.txName} numberOfLines={1}>
                      {x.route_name ? `Route: ${x.route_name}` : "General Route"}
                    </Text>
                    <Text style={styles.txTimeText}>
                      {dateStr} • {timeStr}
                    </Text>
                  </View>
                </View>

                <View style={styles.txRight}>
                  <Text style={[styles.txAmountStr, isPaid ? styles.txPos : styles.txWarn]}>
                    +₱{amount.toFixed(2)}
                  </Text>
                  {!isPaid && <Text style={styles.txSubHint}>Queued</Text>}
                </View>
              </View>
            );
          })}

          {computed.settlements.length === 0 ? (
            <View style={{ paddingVertical: 24, alignItems: "center" }}>
              <Text style={{ color: theme.textSecondary, marginTop: 10 }}>
                No settlements yet.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ height: 160 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  scroll: { flex: 1 },
  content: { padding: 18, paddingTop: 6, paddingBottom: 160 },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  headerFixed: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  headerTitles: { flex: 1 },
  title: { fontSize: 24, fontWeight: "900", color: theme.text },
  subtitle: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
  notifBtn: {
    width: 44,
    height: 44,
    backgroundColor: theme.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },

  netBox: {
    marginTop: 8,
    marginBottom: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: theme.warningBg,
    borderWidth: 1,
    borderColor: theme.warning,
  },
  netTitle: { color: theme.warning, fontWeight: "900", fontSize: 12 },
  netText: { marginTop: 4, color: theme.textSecondary, lineHeight: 18, fontSize: 12 },

  // ═══════ UNIFIED WALLET CARD ═══════
  walletCard: {
    marginTop: 18,
    borderRadius: 28,
    padding: 20,
    backgroundColor: theme.cardAlt,
    borderWidth: 1.5,
    borderColor: theme.warningBg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  walletBalanceSection: {
    marginBottom: 18,
  },
  walletBalanceInner: {
    backgroundColor: "rgba(0,0,0,0.7)", // Always dark for high contrast
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  walletBalanceLabel: {
    color: "rgba(255, 255, 255, 0.7)", // Constant light color on dark background
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  walletBalanceAmount: {
    color: "#FFFFFF", // Constant white on dark background
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -1,
  },
  walletDivider: {
    height: 1,
    backgroundColor: theme.isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
    marginBottom: 18,
  },
  walletSpendingSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  walletSpendingLeft: {
    flex: 1,
  },
  walletSpendingLabel: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  walletSpendingHint: {
    color: theme.textMuted,
    fontSize: 12,
  },
  walletSpendingRight: {
    alignItems: "flex-end",
  },
  walletPercentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  walletPercentText: {
    color: theme.warning,
    fontSize: 13,
    fontWeight: "800",
  },
  walletPercentLabel: {
    color: theme.textMuted,
    fontSize: 10,
  },
  walletWaveRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
  },
  walletWaveBar: {
    width: 10,
    borderRadius: 3,
    backgroundColor: theme.accentWarm || theme.warning,
  },

  // ═══════ 2x2 STATS GRID (screenshot style) ═══════
  statsGridCard: {
    marginTop: 16,
    borderRadius: 28,
    backgroundColor: theme.cardAlt,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  statsGridItem: {
    width: "50%",
    padding: 20,
  },
  statsGridRight: {
    borderLeftWidth: 1,
    borderLeftColor: theme.border,
  },
  statsGridTop: {
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  statsGridLabel: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  statsGridValue: {
    color: theme.text,
    fontSize: 22,
    fontWeight: "900",
  },

  // ═══════ ACTION BUTTONS (screenshot style) ═══════
  actionsBox: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    marginBottom: 10,
  },
  actionBtnYellow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFD36A",
    paddingVertical: 18,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnWhite: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    paddingVertical: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionBtnTextBlack: {
    color: "#000",
    fontWeight: "900",
    fontSize: 16,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 32,
    marginBottom: 16,
  },
  sectionHeaderTitle: { color: theme.text, fontSize: 18, fontWeight: "900" },
  headerLink: { color: theme.textSecondary, fontSize: 13, fontWeight: "700" },

  transactionList: { gap: 12 },

  txCard: {
    padding: 16,
    borderRadius: 24,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  txLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  txInfo: {
    flex: 1,
    paddingRight: 8,
  },
  txType: {
    fontSize: 15,
    fontWeight: "900",
    color: theme.text,
  },
  txName: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 2,
    fontWeight: "500",
  },
  txTimeText: {
    fontSize: 11,
    color: theme.textMuted,
    marginTop: 4,
    fontWeight: "700",
  },
  txRight: { alignItems: "flex-end" },
  txAmountStr: {
    fontSize: 16,
    fontWeight: "900",
  },
  txPos: { color: theme.success },
  txWarn: { color: theme.warning },
  txSubHint: { color: theme.warning, fontSize: 10, marginTop: 2, fontWeight: "700", textTransform: "uppercase" },
});
