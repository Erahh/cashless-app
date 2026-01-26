import React, { useMemo, useEffect, useState } from "react";
import { fetchNotifications } from "../api/notificationsApi";
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
import QuickActions from "../components/QuickActions";
import BottomNav from "../components/BottomNav";




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
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [netMsg, setNetMsg] = useState("");
  const [recent, setRecent] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadStatus = async ({ silent = false, canRetry = true } = {}) => {
    try {
      // Only show full-screen loader if it's a fresh load (no status) or not silent
      if (!status || !silent) setLoading(true);
      if (!silent) setNetMsg("");

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("No session. Please login again.");

      const res = await fetchWithTimeout(`${API_BASE_URL}/me/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // ✅ SAFE PARSE (handles empty body)
      const text = await res.text();
      let json = null;

      if (text) {
        try {
          json = JSON.parse(text);
        } catch (e) {
          throw new Error(`Server returned non-JSON (HTTP ${res.status})`);
        }
      }

      if (!res.ok) {
        throw new Error(json?.error || `Request failed (HTTP ${res.status})`);
      }

      setStatus(json);          // ✅ only on success
      setNetMsg("");            // ✅ clear banner

      // ✅ Load recent transactions (top 5)
      try {
        const txRes = await fetchWithTimeout(`${API_BASE_URL}/wallet/transactions?limit=5`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const txText = await txRes.text();
        let txJson = null;
        if (txText) txJson = JSON.parse(txText);

        if (txRes.ok) {
          setRecent(txJson?.items || []);
          setLastUpdated(new Date().toISOString());
        }
      } catch {
        // ignore recent errors (dashboard can still load)
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
    else verificationStatus = "Unverified"; // unverified or rejected

    // Badge mapping
    let badge = { text: "CASUAL • Regular Fare", tone: "neutral" };

    if (passengerTypeLabel === "Casual") {
      badge = { text: "CASUAL • Regular Fare", tone: "neutral" };
    } else if (verificationStatus === "Verified") {
      badge = { text: `${passengerTypeLabel.toUpperCase()} • VERIFIED`, tone: "good" };
    } else if (verificationStatus === "Pending") {
      badge = { text: `${passengerTypeLabel.toUpperCase()} • PENDING`, tone: "warn" };
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
          <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 10 }}>
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
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.smallLabel}>Available Balance</Text>
            <Text style={styles.balance}>₱{computed.balanceText}</Text>
            {lastUpdated ? (
              <Text style={{ marginTop: 6, color: "rgba(255,255,255,0.45)", fontSize: 12 }}>
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
            onPress={() => navigation.navigate("Notifications")}
          >
            <Text style={styles.notifIcon}>🔔</Text>
            <View style={styles.notifDot}>
              <Text style={styles.notifDotText}>!</Text>
            </View>
          </TouchableOpacity>
        </View>

        {netMsg ? (
          <View
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 14,
              backgroundColor: "rgba(255, 211, 106, 0.10)",
              borderWidth: 1,
              borderColor: "rgba(255, 211, 106, 0.25)",
            }}
          >
            <Text style={{ color: "#FFD36A", fontWeight: "900" }}>Connection</Text>
            <Text style={{ marginTop: 6, color: "rgba(255,255,255,0.75)", lineHeight: 18 }}>
              {netMsg}
            </Text>
          </View>
        ) : null}

        {/* Spend / Stats Card */}
        <TouchableOpacity
          style={styles.bigCard}
          activeOpacity={0.9}
          onPress={() => navigation.navigate("Balance")}
        >
          <View style={styles.bigCardTopRow}>
            <View>
              <Text style={styles.cardLabel}>Wallet Status</Text>
              <Text style={styles.cardValue}>₱{computed.balanceText}</Text>
            </View>

            <View style={styles.pill}>
              <Text style={styles.pillText}>↑ 3.2%</Text>
            </View>
          </View>

          <View style={styles.waveBox}>
            <View style={styles.waveLine} />
          </View>

          <Text style={styles.cardHint}>Tap to view wallet & transactions</Text>
        </TouchableOpacity>

        {/* Quick Actions */}
        <QuickActions
          items={[
            { key: "commuter_scan", icon: "📷", title: "Scan", sub: "Pay fare", onPress: () => navigation.navigate("CommuterScan"), show: computed.isCommuter },
            { key: "topup", icon: "💳", title: "Top Up", sub: "GCash", onPress: () => navigation.navigate("SendLoad"), show: computed.isCommuter },
            { key: "my_qr", icon: "📲", title: "My QR", sub: "Show Code", onPress: () => navigation.navigate("MyQR"), show: computed.isCommuter },

            { key: "op_qr", icon: "📲", title: "My QR", sub: "Receive Pay", onPress: () => navigation.navigate("OperatorMyQR"), show: computed.isOperator },
            { key: "earn", icon: "💰", title: "Earnings", sub: "Payout summary", onPress: () => navigation.navigate("Earnings"), show: computed.isOperator },
            { key: "hist", icon: "🧾", title: "History", sub: "Transactions", onPress: () => navigation.navigate("Transactions"), show: computed.isOperator }, // Also Operator History

            { key: "ver", icon: "✅", title: "Verifications", sub: "Approve users", onPress: () => navigation.navigate("AdminVerification"), show: computed.isAdmin },
            { key: "create_op", icon: "🚌", title: "New Op", sub: "Create Operator", onPress: () => navigation.navigate("AdminCreateOperator"), show: computed.isAdmin },
            { key: "set", icon: "💸", title: "Settlements", sub: "Mark paid", onPress: () => navigation.navigate("AdminSettlements"), show: computed.isAdmin },

            // Commuter history fallback if not one of above (or just always show history at bottom list, but user requested specific QuickActions)
            { key: "commuter_hist", icon: "🧾", title: "History", sub: "Transactions", onPress: () => navigation.navigate("Transactions"), show: false },
          ].filter(a => a.show)}
        />

        {/* Role-aware Mid Card */}
        <TouchableOpacity
          style={styles.midCard}
          activeOpacity={0.9}
          onPress={() => {
            if (computed.isOperator) return navigation.navigate("OperatorMyQR");
            if (computed.isAdmin) return navigation.navigate("AdminSettlements");
            return navigation.navigate("CommuterScan");
          }}
        >
          <View>
            <Text style={styles.cardLabel}>
              {computed.isOperator ? "Operator" : computed.isAdmin ? "Admin" : "Commuter"}
            </Text>
            <Text style={styles.cardValue}>
              {computed.isOperator
                ? "Show Payment QR"
                : computed.isAdmin
                  ? "Payout Queue"
                  : "Scan Operator QR"}
            </Text>
            <Text style={styles.cardHint}>
              {computed.isOperator
                ? "Tap to show QR for commuters"
                : computed.isAdmin
                  ? "Tap to manage settlements"
                  : "Tap to pay fare"}
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        {/* Verification Callout (only if not verified) */}
        {computed.showCallout ? (
          <View style={styles.callout}>
            <Text style={styles.calloutTitle}>Discount not active yet</Text>
            <Text style={styles.calloutText}>
              Upload your ID and wait for admin approval to activate student/senior fare.
            </Text>
            <TouchableOpacity
              style={styles.calloutBtn}
              onPress={() => navigation.navigate("PassengerType")}
            >
              <Text style={styles.calloutBtnText}>Apply for Verification</Text>
            </TouchableOpacity>
          </View>
        ) : null}

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

            return (
              <View key={tx.id} style={styles.txRow}>
                <View style={styles.txLeft}>
                  <View style={styles.txIcon}>
                    <Text style={styles.txIconText}>{tx.source === "topup" ? "💳" : "🚌"}</Text>
                  </View>
                  <View>
                    <Text style={styles.txTitle}>{title}</Text>
                    <Text style={styles.txMeta}>
                      {meta} • {new Date(tx.created_at).toLocaleString()}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.txAmount, isDebit ? styles.txNeg : styles.txPos]}>
                  {sign}₱{Math.abs(amount).toFixed(2)}
                </Text>
              </View>
            );
          })}

          {!loading && recent.length === 0 ? (
            <Text style={{ color: "rgba(255,255,255,0.55)", marginTop: 10 }}>
              No transactions yet.
            </Text>
          ) : null}
        </View>

        {/* Refresh button (optional) */}
        <TouchableOpacity
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.12)",
            alignItems: "center",
          }}
          onPress={async () => {
            await loadStatus({ silent: false });
          }}
        >
          <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "800" }}>
            Refresh
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomNav navigation={navigation} active="Home" />
    </SafeAreaView>
  );
}

function ActionCard({ icon, title, subtitle, onPress }) {
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



const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0E14" },
  scroll: { flex: 1 },
  content: { padding: 18, paddingBottom: 160 },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 6,
  },
  smallLabel: { color: "rgba(255,255,255,0.65)", fontSize: 12 },
  balance: { color: "#fff", fontSize: 32, fontWeight: "800", marginTop: 6 },

  badge: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: { color: "#0B0E14", fontWeight: "800", fontSize: 12 },
  badge_neutral: { backgroundColor: "rgba(255,255,255,0.8)" },
  badge_good: { backgroundColor: "#7CFF9B" },
  badge_warn: { backgroundColor: "#FFD36A" },
  badge_bad: { backgroundColor: "#FF7A7A" },

  notifBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  notifIcon: { fontSize: 18 },
  notifDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FF5E5E",
    alignItems: "center",
    justifyContent: "center",
  },
  notifDotText: { color: "#fff", fontSize: 10, fontWeight: "800" },

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

  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "800", marginTop: 18 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  link: { color: "rgba(255,255,255,0.75)", textDecorationLine: "underline" },

  actionsRow: { flexDirection: "row", marginTop: 12 },
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

  midCard: {
    marginTop: 14,
    borderRadius: 18,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  arrow: { color: "rgba(255,255,255,0.7)", fontSize: 26, marginLeft: 10 },

  callout: {
    marginTop: 14,
    borderRadius: 18,
    padding: 16,
    backgroundColor: "rgba(255, 211, 106, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 211, 106, 0.28)",
  },
  calloutTitle: { color: "#FFD36A", fontSize: 14, fontWeight: "900" },
  calloutText: { color: "rgba(255,255,255,0.75)", marginTop: 8, lineHeight: 18 },
  calloutBtn: {
    marginTop: 12,
    backgroundColor: "#FFD36A",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  calloutBtnText: { color: "#0B0E14", fontWeight: "900" },

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
  txLeft: { flexDirection: "row", alignItems: "center" },
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
  txMeta: { color: "rgba(255,255,255,0.55)", marginTop: 4, fontSize: 12 },

  txAmount: { fontWeight: "900", fontSize: 14 },
  txNeg: { color: "#FF8A8A" },
  txPos: { color: "#7CFF9B" },
});
