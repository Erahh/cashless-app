import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl } from "react-native";

import { useTheme } from "../../context/ThemeContext";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Camera01Icon, QrCodeIcon, RefreshIcon, AnalyticsUpIcon, CheckmarkCircle02Icon, Time01Icon, Notification01Icon, ArrowLeft01Icon } from "@hugeicons/core-free-icons";
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

let CACHED_OP_TX = null;

export default function OperatorTransactionsScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [loading, setLoading] = useState(!CACHED_OP_TX);
  const [refreshing, setRefreshing] = useState(false);
  const [netMsg, setNetMsg] = useState("");
  const [data, setData] = useState(CACHED_OP_TX);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = async ({ silent = false, canRetry = true } = {}) => {
    try {
      if (!silent || !CACHED_OP_TX) setLoading(true);
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
      CACHED_OP_TX = json;
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
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={20} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.title}>All Activity</Text>
          <Text style={styles.subtitle}>Recent Earnings & Payouts</Text>
        </View>
        <TouchableOpacity style={styles.notifBtn} onPress={() => load({ silent: false })}>
          <HugeiconsIcon icon={RefreshIcon} size={20} color={theme.text} />
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

        <View style={styles.transactionList}>
          {computed.settlements.map((x) => {
            const amount = Number(x.amount || 0);
            const status = String(x.status || "unpaid").toLowerCase();
            const date = x.paid_at || x.created_at;
            const d = date ? new Date(date) : null;
            
            const dateStr = d ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—";
            const timeStr = d ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "";
            const isPaid = status === "paid";

            return (
              <View key={x.id} style={styles.txCard}>
                <View style={[styles.txAccentRail, isPaid ? styles.txAccentRailPaid : styles.txAccentRailPending]} />
                <View style={[styles.txBackdropOrb, isPaid ? styles.txBackdropOrbPaid : styles.txBackdropOrbPending]} />
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
                  <View style={[styles.txStatusPill, isPaid ? styles.txStatusPillPaid : styles.txStatusPillPending]}>
                    <View style={[styles.txStatusDot, isPaid ? styles.txStatusDotPaid : styles.txStatusDotPending]} />
                    <Text style={[styles.txStatusText, isPaid ? styles.txStatusTextPaid : styles.txStatusTextPending]}>
                      {isPaid ? "Settled" : "Pending Settlement"}
                    </Text>
                  </View>
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
    gap: 12,
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
  backBtn: {
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

  walletCard: {
    backgroundColor: theme.accent,
    borderRadius: 28,
    padding: 24,
    marginTop: 10,
    overflow: "hidden",
    shadowColor: theme.accent,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  balanceSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  balanceInnerCard: {
    backgroundColor: "#0B0E14",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  balanceLabel: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  balanceAmount: { color: "#FFF", fontSize: 28, fontWeight: "900", marginTop: 4 },

  cardDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.1)",
    marginVertical: 20,
  },
  spendingSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  spendingLeft: {},
  spendingLabel: { color: "rgba(0,0,0,0.6)", fontSize: 13, fontWeight: "700" },
  spendingAmount: { color: "#000", fontSize: 24, fontWeight: "900", marginTop: 4, letterSpacing: -0.5 },

  spendingRight: { alignItems: "flex-end", width: 100 },
  percentageRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#0B0E14", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, marginBottom: 8 },
  percentageText: { color: "#FFD36A", fontSize: 11, fontWeight: "800", marginLeft: 4 },
  percentageLabel: { color: "rgba(255,255,255,0.6)", fontSize: 10, marginLeft: 4, fontWeight: "600" },
  
  waveContainer: { width: "100%", height: 24, justifyContent: "flex-end", overflow: "hidden" },
  waveLine: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", flex: 1 },
  waveSegment: { width: 6, backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 4 },

  statsRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 22,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
  },
  statLabel: { color: theme.textSecondary, fontSize: 13, fontWeight: "700" },
  statValue: { color: theme.text, fontSize: 20, fontWeight: "900", marginTop: 6 },

  actionsRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  actionCard: {
    flex: 1,
    padding: 16,
    borderRadius: 22,
    backgroundColor: theme.cardAlt,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "flex-start"
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  actionTitle: { color: theme.text, fontWeight: "800", fontSize: 15 },
  actionSub: { color: theme.textSecondary, marginTop: 4, fontSize: 12 },

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
    borderColor: theme.isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: theme.isDark ? 0.35 : 0.12,
    shadowRadius: 14,
    elevation: 6,
  },
  txAccentRail: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  txAccentRailPaid: { backgroundColor: theme.success },
  txAccentRailPending: { backgroundColor: theme.warning },
  txBackdropOrb: {
    position: "absolute",
    right: -28,
    top: -30,
    width: 96,
    height: 96,
    borderRadius: 48,
    opacity: 0.14,
  },
  txBackdropOrbPaid: { backgroundColor: theme.success },
  txBackdropOrbPending: { backgroundColor: theme.warning },
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
    fontSize: 16,
    fontWeight: "900",
    color: theme.text,
    letterSpacing: 0.2,
  },
  txName: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 3,
    fontWeight: "500",
  },
  txTimeText: {
    fontSize: 10,
    color: theme.textMuted,
    marginTop: 6,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  txRight: { alignItems: "flex-end" },
  txAmountStr: {
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  txPos: { color: theme.success },
  txWarn: { color: theme.warning },
  txStatusPill: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  txStatusPillPaid: {
    backgroundColor: theme.successBg,
    borderColor: theme.success,
  },
  txStatusPillPending: {
    backgroundColor: theme.warningBg,
    borderColor: theme.warning,
  },
  txStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  txStatusDotPaid: { backgroundColor: theme.success },
  txStatusDotPending: { backgroundColor: theme.warning },
  txStatusText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  txStatusTextPaid: { color: theme.success },
  txStatusTextPending: { color: theme.warning },
});
