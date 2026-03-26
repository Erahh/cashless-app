import React, { useMemo, useEffect, useState, useRef } from "react";
import { fetchNotifications } from "../../api/notificationsApi";
import { useTheme } from "../../context/ThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  StatusBar } from "react-native";

import { supabase } from "../../api/supabase";
import { API_BASE_URL } from "../../config/api";
import QuickActions from "../../components/QuickActions";
import MiniMapCard from "../../components/MiniMapCard";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Notification01Icon, ScanIcon, WalletAdd01Icon, FlashIcon, SmartphoneWifiIcon, QrCodeIcon, Coins01Icon, InvoiceIcon, CheckmarkCircle01Icon, Bus01Icon, MoneySend01Icon } from "@hugeicons/core-free-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import TxIcon from "../../components/TxIcon";
import { useAppStore } from "../../store/appStore";

// ✅ Helper for timeout logic (increased to 35s for Render cold starts)
async function fetchWithTimeout(url, options = {}, ms = 35000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

export default function HomeScreen({ navigation, route }) {
  const { theme, isDarkMode } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [netMsg, setNetMsg] = useState("");
  const [recent, setRecent] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [notifCount, setNotifCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const { hideBalance, toggleHideBalance } = useAppStore();
  const lastSeenNotif = useRef(null);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadStatus({ silent: true, canRetry: false });
    setRefreshing(false);
  }, []);

  const loadStatus = async ({ silent = false, canRetry = true } = {}) => {
    try {
      // Only show full-screen loader if it's a fresh load (no status) or not silent
      if (!status || !silent) setLoading(true);
      if (!silent) setNetMsg("");

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("No session. Please login again.");

      // 🚀 Parallelize dashboard data fetching for a snappier experience
      const [statusRes, txRes, notifs] = await Promise.all([
        fetchWithTimeout(`${API_BASE_URL}/me/status`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetchWithTimeout(`${API_BASE_URL}/wallet/transactions?limit=5`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null), // Graceful fallback for transactions
        fetchNotifications(50).catch(() => []) // Graceful fallback for notifications
      ]);

      // 1) Handle me/status result
      const text = await statusRes.text();
      let json = null;
      if (text) {
        try {
          json = JSON.parse(text);
        } catch (e) {
          throw new Error(`Server returned non-JSON (HTTP ${statusRes.status})`);
        }
      }

      if (!statusRes.ok) {
        throw new Error(json?.error || `Request failed (HTTP ${statusRes.status})`);
      }

      setStatus(json);
      setNetMsg("");

      // 2) Handle wallet transactions result
      if (txRes && txRes.ok) {
        try {
          const txText = await txRes.text();
          if (txText) {
            const txJson = JSON.parse(txText);
            setRecent(txJson?.items || []);
            setLastUpdated(new Date().toISOString());
          }
        } catch (e) {
          console.warn("Failed to parse transactions:", e.message);
        }
      }

      // 3) Handle notification count
      if (notifs) {
        const cutoff = lastSeenNotif.current;
        const fresh = cutoff
          ? notifs.filter((n) => new Date(n.created_at) > new Date(cutoff))
          : notifs;
        setNotifCount(fresh.length);
      }
    } catch (e) {
      const isTimeout = e?.name === "AbortError";
      const msg = isTimeout
        ? "Server waking up (Render sleep). Retrying..."
        : e.message;

      setNetMsg(msg);

      // ✅ one retry after short delay (only on timeout)
      if (isTimeout && canRetry) {
        try {
          await new Promise((r) => setTimeout(r, 1500));
          return await loadStatus({ silent: true, canRetry: false });
        } catch {
          // keep the netMsg already shown
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = navigation?.addListener?.("focus", () => loadStatus({ silent: true }));
    loadStatus({ silent: true });
    return unsub;
  }, []);

  useEffect(() => {
    if (route?.params?.refresh) {
      loadStatus({ silent: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.params?.refresh]);


  const computed = useMemo(() => {
    // If status is null, we show placeholders instead of 0
    const hasData = !!status;
    const balanceNum = hasData ? Number(status.account?.balance ?? 0) : null;

    const passengerTypeRaw = String(status?.account?.passenger_type || "casual"); // casual/student/senior
    const passengerTypeLabel =
      passengerTypeRaw.charAt(0).toUpperCase() + passengerTypeRaw.slice(1);

    // ✅ NEW: use commuter_accounts.verification_status (unverified/pending/verified/rejected)
    const ver = String(status?.account?.verification_status || "unverified").toLowerCase();

    let verificationStatus = "Unverified";
    if (ver === "verified") verificationStatus = "Verified";
    else if (ver === "pending") verificationStatus = "Pending";
    else if (ver === "rejected") verificationStatus = "Rejected";
    else verificationStatus = "Unverified";

    // Badge mapping
    let badge = { text: "CASUAL • Regular Fare", tone: "neutral" };

    if (passengerTypeLabel === "Casual") {
      badge = { text: "CASUAL • Regular Fare", tone: "neutral" };
    } else if (verificationStatus === "Verified") {
      badge = { text: `${passengerTypeLabel.toUpperCase()} • VERIFIED`, tone: "good" };
    } else if (verificationStatus === "Pending") {
      badge = { text: `${passengerTypeLabel.toUpperCase()} • PENDING`, tone: "warn" };
    } else if (verificationStatus === "Rejected") {
      badge = { text: `${passengerTypeLabel.toUpperCase()} • REJECTED`, tone: "bad" };
    } else {
      badge = { text: `${passengerTypeLabel.toUpperCase()} • UNVERIFIED`, tone: "bad" };
    }

    const balanceText = balanceNum !== null
      ? balanceNum.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
      : "--.--";

    const showCallout =
      passengerTypeLabel !== "Casual" && verificationStatus !== "Verified";

    // Check for rejection remarks
    const rejectionNote = verificationStatus === "Rejected" ? status.verification?.remarks : null;

    const isOperator = !!status?.roles?.is_operator;
    const isAdmin = !!status?.roles?.is_admin;
    const isCommuter = !isOperator && !isAdmin;

    return {
      balanceText,
      passengerType: passengerTypeLabel,
      verificationStatus,
      badge,
      showCallout,
      route: "ROUTE A", // UI-only
      isOperator,
      isAdmin,
      isCommuter,
    };
  }, [status]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator />
          <Text style={{ color: theme.textSecondary, marginTop: 10 }}>
            Loading dashboard...
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.textSecondary}
            colors={[theme.warning]} // warning is the yellow accent color
          />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.smallLabel, { color: theme.text, opacity: 0.7, fontWeight: "600" }]}>Available Balance</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={styles.balance}>₱{hideBalance ? "••••" : computed.balanceText}</Text>
              <TouchableOpacity onPress={toggleHideBalance} activeOpacity={0.7} style={{ padding: 4 }}>
                <MaterialCommunityIcons
                  name={hideBalance ? "eye-off-outline" : "eye-outline"}
                  size={24}
                  color={theme.textMuted}
                />
              </TouchableOpacity>
            </View>
            {lastUpdated ? (
              <Text style={{ marginTop: 6, color: theme.textMuted, fontSize: 12 }}>
                Last updated: {new Date(lastUpdated).toLocaleTimeString()}
              </Text>
            ) : null}

            <View style={[styles.badge, styles[`badge_${computed.badge.tone}`]]}>
              <Text style={styles.badgeText}>{computed.badge.text}</Text>
            </View>
          </View>

          {/* ✅ Notifications */}
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => {
              lastSeenNotif.current = new Date().toISOString();
              setNotifCount(0);
              navigation.navigate("Notifications");
            }}
          >
            <View style={styles.notifBack}>
              <HugeiconsIcon icon={Notification01Icon} size={22} color={theme.text} />
              {notifCount > 0 && <View style={styles.notifDot} />}
            </View>
          </TouchableOpacity>
        </View>

        {netMsg ? (
          <View
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 14,
              backgroundColor: theme.warningBg,
              borderWidth: 1,
              borderColor: theme.warningBg,
            }}
          >
            <Text style={{ color: theme.warning, fontWeight: "900" }}>Connection</Text>
            <Text style={{ marginTop: 6, color: theme.textSecondary, lineHeight: 18 }}>
              {netMsg}
            </Text>
          </View>
        ) : null}

        {/* ═══════ UNIFIED WALLET CARD ═══════ */}
        <TouchableOpacity
          style={styles.walletCard}
          activeOpacity={0.9}
          onPress={() => navigation.navigate("Balance")}
        >
          {/* Balance Section */}
          <View style={styles.walletBalanceSection}>
            <View style={styles.walletBalanceInner}>
              <Text style={styles.walletBalanceLabel}>{"Available\nBalance"}</Text>
              <Text style={styles.walletBalanceAmount}>₱{hideBalance ? "••••" : computed.balanceText}</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.walletDivider} />

          {/* Spending Section */}
          <View style={styles.walletSpendingSection}>
            <View style={styles.walletSpendingLeft}>
              <Text style={styles.walletSpendingLabel}>SPENDING</Text>
              <Text style={styles.walletSpendingHint}>Tap to view details →</Text>
            </View>
            <View style={styles.walletSpendingRight}>
              <View style={styles.walletPercentRow}>
                <Text style={styles.walletPercentText}>↑ 3.2%</Text>
                <Text style={styles.walletPercentLabel}>last week</Text>
              </View>
              {/* Mini Wave Graph (bar chart) */}
              <View style={styles.walletWaveRow}>
                <View style={[styles.walletWaveBar, { height: 6 }]} />
                <View style={[styles.walletWaveBar, { height: 12 }]} />
                <View style={[styles.walletWaveBar, { height: 8 }]} />
                <View style={[styles.walletWaveBar, { height: 16 }]} />
                <View style={[styles.walletWaveBar, { height: 10 }]} />
                <View style={[styles.walletWaveBar, { height: 18 }]} />
                <View style={[styles.walletWaveBar, { height: 14 }]} />
                <View style={[styles.walletWaveBar, { height: 10 }]} />
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Quick Actions */}
        <QuickActions
          items={[
            { key: "commuter_scan", icon: ScanIcon, title: "Scan", onPress: () => navigation.navigate("CommuterScan"), show: computed.isCommuter },
            { key: "topup", icon: WalletAdd01Icon, title: "Top Up", onPress: () => navigation.navigate("TopUp"), show: computed.isCommuter },
            { key: "sendload", icon: FlashIcon, title: "Send Load", onPress: () => navigation.navigate("SendLoad"), show: computed.isCommuter },
            { key: "tap_pay", icon: SmartphoneWifiIcon, title: "Tap to Pay", onPress: () => navigation.navigate("NFCTapPay"), show: computed.isCommuter },

            { key: "op_qr", icon: QrCodeIcon, title: "My QR", onPress: () => navigation.navigate("OperatorApp", { screen: "OperatorMyQR" }), show: computed.isOperator },
            { key: "earn", icon: Coins01Icon, title: "Earnings", onPress: () => navigation.navigate("OperatorApp", { screen: "OperatorEarnings" }), show: computed.isOperator },
            { key: "hist", icon: InvoiceIcon, title: "History", onPress: () => navigation.navigate("Transactions"), show: computed.isOperator },

            { key: "ver", icon: CheckmarkCircle01Icon, title: "Verifications", onPress: () => navigation.navigate("AdminApp", { screen: "AdminVerification" }), show: computed.isAdmin },
            { key: "create_op", icon: Bus01Icon, title: "New Op", onPress: () => navigation.navigate("AdminApp", { screen: "AdminCreateOperator" }), show: computed.isAdmin },
            { key: "set", icon: MoneySend01Icon, title: "Settlements", onPress: () => navigation.navigate("AdminApp", { screen: "AdminSettlements" }), show: computed.isAdmin },

            { key: "commuter_hist", icon: InvoiceIcon, title: "History", onPress: () => navigation.navigate("Transactions"), show: false },
          ].filter(a => a.show)}
        />

        {/* Role-aware Mid Cards */}
        {computed.isCommuter ? (
          <View style={styles.midCardsRow}>
            {/* Live Mini-Map Component */}
            <MiniMapCard onPress={() => navigation.navigate("FriendsMap")} />
          </View>
        ) : (
          <TouchableOpacity
            style={styles.midCard}
            activeOpacity={0.9}
            onPress={() => {
              if (computed.isOperator) return navigation.navigate("OperatorApp", { screen: "OperatorMyQR" });
              if (computed.isAdmin) return navigation.navigate("AdminApp", { screen: "AdminSettlements" });
            }}
          >
            <View>
              <Text style={styles.cardLabel}>
                {computed.isOperator ? "Operator" : "Admin"}
              </Text>
              <Text style={styles.cardValue}>
                {computed.isOperator ? "Show Payment QR" : "Payout Queue"}
              </Text>
              <Text style={styles.cardHint}>
                {computed.isOperator
                  ? "Tap to show QR for commuters"
                  : "Tap to manage settlements"}
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        )}



        {/* Verification Callout (only if not verified) */}
        {
          computed.showCallout ? (
            <View style={[styles.callout, computed.verificationStatus === "Rejected" && { backgroundColor: theme.dangerBg, borderColor: theme.danger }]}>
              <Text style={[styles.calloutTitle, computed.verificationStatus === "Rejected" && { color: theme.danger }]}>
                {computed.verificationStatus === "Rejected" ? "Verification Rejected" : "Discount not active yet"}
              </Text>
              <Text style={styles.calloutText}>
                {computed.verificationStatus === "Rejected"
                  ? (status.verification?.remarks ? `Reason: ${status.verification.remarks}` : "Admin rejected your application. Please re-check your documents and try again.")
                  : "Upload your ID and wait for admin approval to activate student/senior fare."}
              </Text>
              <TouchableOpacity
                style={[styles.calloutBtn, computed.verificationStatus === "Rejected" && { backgroundColor: theme.danger }]}
                onPress={() => navigation.navigate("PassengerType")}
              >
                <Text style={styles.calloutBtnText}>
                  {computed.verificationStatus === "Rejected" ? "Try Again" : "Apply for Verification"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null
        }

        {/* Recent Transactions */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Transactions")}>
            <Text style={styles.link}>See all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.list}>
          {recent.map((tx) => {
            const isDebit =
              tx.source === "ledger" &&
              (String(tx.kind || "").includes("fare") || String(tx.kind || "").includes("debit"));

            const amount = Number(tx.amount || 0);
            const sign = isDebit ? "-" : "+";

            const title =
              tx.source === "topup"
                ? "Top Up"
                : String(tx.kind || "").includes("fare")
                  ? "Ride Fare"
                  : "Wallet";

            const meta =
              tx.source === "topup"
                ? `GCash • ${String(tx.status || "").toUpperCase()}`
                : tx.meta || String(tx.kind || "ledger");

            // Format date nicely
            const txDate = new Date(tx.created_at);
            const dateStr = txDate.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });
            const timeStr = txDate.toLocaleTimeString(undefined, {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            });

            return (
              <View key={tx.id} style={styles.txRow}>
                <View style={styles.txLeft}>
                  <View style={{ marginRight: 12 }}>
                    <TxIcon title={title} type={tx.kind} source={tx.source} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txTitle}>{title}</Text>
                    <Text style={styles.txMeta}>{meta}</Text>
                    <Text style={styles.txTime}>{dateStr} • {timeStr}</Text>
                  </View>
                </View>

                <Text style={[styles.txAmount, isDebit ? styles.txNeg : styles.txPos]}>
                  {sign}₱{Math.abs(amount).toFixed(2)}
                </Text>
              </View>
            );
          })}

          {!loading && recent.length === 0 ? (
            <Text style={{ color: theme.textMuted, marginTop: 10 }}>
              No transactions yet.
            </Text>
          ) : null}
        </View>
      </ScrollView >
    </SafeAreaView >
  );
}

function ActionCard({ icon, title, subtitle, onPress }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
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



const createStyles = (theme) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.background,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0
  },
  scroll: { flex: 1 },
  content: { padding: 18, paddingBottom: 160 },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 6,
  },
  smallLabel: { color: theme.textSecondary, fontSize: 12 },
  balance: { color: theme.text, fontSize: 32, fontWeight: "800", marginTop: 6 },

  badge: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: { color: theme.isDark ? "#0B0E14" : "#ffffff", fontWeight: "800", fontSize: 12 },
  badge_neutral: { backgroundColor: theme.isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.15)" },
  badge_good: { backgroundColor: theme.success },
  badge_warn: { backgroundColor: theme.warning },
  badge_bad: { backgroundColor: theme.danger },

  notifBtn: {
    padding: 8,
    marginTop: 4,
  },
  notifBack: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  notifDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF5E5E",
    borderWidth: 1.5,
    borderColor: theme.background,
  },

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
    width: 8,
    borderRadius: 2,
    backgroundColor: theme.accentWarm,
  },

  sectionTitle: { color: theme.text, fontSize: 16, fontWeight: "800", marginTop: 18 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  link: { color: theme.textSecondary, textDecorationLine: "underline" },

  actionsRow: { flexDirection: "row", marginTop: 12 },
  actionCard: {
    flex: 1,
    padding: 14,
    borderRadius: 18,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  actionIconText: { fontSize: 16 },
  actionTitle: { color: theme.text, fontWeight: "800" },
  actionSub: { color: theme.textMuted, marginTop: 4, fontSize: 12 },

  midCard: {
    marginTop: 14,
    borderRadius: 18,
    padding: 16,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.isDark ? 0.2 : 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  arrow: { color: theme.textSecondary, fontSize: 26, marginLeft: 10 },
  cardLabel: { color: theme.textMuted, fontSize: 12, fontWeight: "600", marginBottom: 4 },
  cardValue: { color: theme.text, fontSize: 16, fontWeight: "800", marginBottom: 4 },
  cardHint: { color: theme.textMuted, fontSize: 12 },

  // Two-card layout for commuters
  midCardsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },
  midCardHalf: {
    flex: 1,
    borderRadius: 18,
    padding: 18,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.isDark ? 0.2 : 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  midCardIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  midCardIconText: {
    fontSize: 28,
  },
  midCardTitle: {
    color: theme.text,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 4,
  },
  midCardHint: {
    color: theme.textMuted,
    fontSize: 12,
    textAlign: "center",
  },

  callout: {
    marginTop: 14,
    borderRadius: 18,
    padding: 16,
    backgroundColor: theme.warningBg,
    borderWidth: 1,
    borderColor: "rgba(255, 152, 0, 0.28)",
  },
  calloutTitle: { color: theme.warning, fontSize: 14, fontWeight: "900" },
  calloutText: { color: theme.textSecondary, marginTop: 8, lineHeight: 18 },
  calloutBtn: {
    marginTop: 12,
    backgroundColor: theme.warning,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  calloutBtnText: { color: theme.isDark ? "#0B0E14" : "#ffffff", fontWeight: "900" },

  list: { marginTop: 12 },
  txRow: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: theme.isDark ? 0.15 : 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  txLeft: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 12 },
  txTitle: { color: theme.text, fontWeight: "800" },
  txMeta: { color: theme.textSecondary, marginTop: 3, fontSize: 12, fontWeight: "600" },
  txTime: { color: theme.textMuted, marginTop: 2, fontSize: 11 },

  txAmount: { fontWeight: "900", fontSize: 16 },
  txNeg: { color: theme.danger },
  txPos: { color: theme.success },
});
