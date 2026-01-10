import React, { useMemo, useEffect, useState } from "react";
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

// Keep mock recent transactions UI-first (later bind to /transactions)
const MOCK_RECENT = [
  { id: "1", title: "Ride Fare", meta: "Jeepney • ROUTE A", amount: -15, time: "Today 9:12 AM" },
  { id: "2", title: "Top Up", meta: "GCash", amount: 200, time: "Yesterday 6:41 PM" },
  { id: "3", title: "Ride Fare", meta: "Bus • ROUTE B", amount: -20, time: "Dec 4 • 5:10 PM" },
];

export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);

  const loadStatus = async () => {
    try {
      setLoading(true);

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("No session. Please login again.");

      const res = await fetch(`${API_BASE_URL}/me/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load status");

      setStatus(json);
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = navigation?.addListener?.("focus", loadStatus);
    loadStatus();
    return unsub;
  }, []);

  const computed = useMemo(() => {
    const balanceNum = Number(status?.account?.balance ?? 0);

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

    const balanceText = balanceNum.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const showCallout =
      passengerTypeLabel !== "Casual" && verificationStatus !== "Verified";

    return {
      balanceText,
      passengerType: passengerTypeLabel,
      verificationStatus,
      badge,
      showCallout,
      route: "ROUTE A", // UI-only
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
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.smallLabel}>Available Balance</Text>
            <Text style={styles.balance}>₱{computed.balanceText}</Text>

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

        {/* Spend / Stats Card */}
        <TouchableOpacity
          style={styles.bigCard}
          activeOpacity={0.9}
          onPress={() => navigation.navigate("Balance")}
        >
          <View style={styles.bigCardTopRow}>
            <View>
              <Text style={styles.cardLabel}>Monthly Spent</Text>
              <Text style={styles.cardValue}>₱ 634.00</Text>
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
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <ActionCard
            icon="➕"
            title="Top Up"
            subtitle="Add funds"
            onPress={() => navigation.navigate("Balance")}
          />
          <ActionCard
            icon="🧾"
            title="History"
            subtitle="Transactions"
            onPress={() => navigation.navigate("Transactions")}
          />
          <ActionCard
            icon="🛡️"
            title="Guardian"
            subtitle="Link & Alerts"
            onPress={() => navigation.navigate("GuardianLink")}
          />
        </View>

        {/* Commute Card */}
        <TouchableOpacity
          style={styles.midCard}
          activeOpacity={0.9}
          onPress={() => navigation.navigate("OperatorScan")}
        >
          <View>
            <Text style={styles.cardLabel}>Scan & Ride</Text>
            <Text style={styles.cardValue}>Operator Scan</Text>
            <Text style={styles.cardHint}>Tap to open QR scanner</Text>
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
          {MOCK_RECENT.map((tx) => (
            <View key={tx.id} style={styles.txRow}>
              <View style={styles.txLeft}>
                <View style={styles.txIcon}>
                  <Text style={styles.txIconText}>{tx.amount < 0 ? "🚌" : "💳"}</Text>
                </View>
                <View>
                  <Text style={styles.txTitle}>{tx.title}</Text>
                  <Text style={styles.txMeta}>
                    {tx.meta} • {tx.time}
                  </Text>
                </View>
              </View>

              <Text style={[styles.txAmount, tx.amount < 0 ? styles.txNeg : styles.txPos]}>
                {tx.amount < 0 ? "-" : "+"}₱{Math.abs(tx.amount).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ height: 90 }} />

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
          onPress={loadStatus}
        >
          <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "800" }}>
            Refresh
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Nav (wired) */}
      <View style={styles.bottomNav}>
        <NavItem
          label="Home"
          active
          onPress={() => navigation.navigate("Home")}
        />
        <NavItem
          label="Wallet"
          onPress={() => navigation.navigate("Balance")}
        />
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("OperatorScan")}>
          <Text style={styles.fabText}>SCAN</Text>
        </TouchableOpacity>
        <NavItem
          label="QR"
          onPress={() => navigation.navigate("OperatorScan")}
        />
        <NavItem
          label="Settings"
          onPress={() => navigation.navigate("PassengerType")} // replace later with Profile/Settings screen
        />
      </View>
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

function NavItem({ label, active, onPress }) {
  return (
    <TouchableOpacity style={styles.navItem} onPress={onPress}>
      <Text style={[styles.navText, active && styles.navTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0E14" },
  scroll: { flex: 1 },
  content: { padding: 18 },

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

  actionsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
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
  },
  txLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  txIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  txIconText: { fontSize: 16 },
  txTitle: { color: "#fff", fontWeight: "800" },
  txMeta: { color: "rgba(255,255,255,0.55)", marginTop: 4, fontSize: 12 },

  txAmount: { fontWeight: "900", fontSize: 14 },
  txNeg: { color: "#FF8A8A" },
  txPos: { color: "#7CFF9B" },

  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 78,
    paddingHorizontal: 18,
    paddingBottom: 12,
    paddingTop: 10,
    backgroundColor: "rgba(11,14,20,0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navItem: { width: 60, alignItems: "center" },
  navText: { color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: "700" },
  navTextActive: { color: "#FFD36A" },

  fab: {
    width: 76,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#FFD36A",
    alignItems: "center",
    justifyContent: "center",
  },
  fabText: { fontWeight: "900", color: "#0B0E14" },
});
