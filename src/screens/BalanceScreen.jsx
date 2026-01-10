import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { fetchWallet, demoTopUp } from "../api/walletApi";
import BottomNav from "../components/BottomNav";

const PRESETS = [50, 100, 200, 500];

export default function BalanceScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [amountText, setAmountText] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const json = await fetchWallet();
      setWallet(json);
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

  const balanceText = useMemo(() => {
    const b = Number(wallet?.balance ?? 0);
    return b.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, [wallet]);

  const doTopUp = async (amt) => {
    try {
      const amount = Number(amt);
      if (!Number.isFinite(amount) || amount <= 0) {
        return Alert.alert("Invalid amount", "Enter a valid top up amount.");
      }

      setBusy(true);
      await demoTopUp(amount);
      setAmountText("");
      await load();
      Alert.alert("Top up successful ✅", `Added ₱${amount.toFixed(2)}`);
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={styles.back}>‹ Back</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.refreshBtn} onPress={load} activeOpacity={0.9}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Wallet</Text>
        <Text style={styles.sub}>Demo top-up now • GCash integration later</Text>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.dim}>Loading wallet...</Text>
          </View>
        ) : (
          <>
            {/* Balance Card */}
            <View style={styles.bigCard}>
              <Text style={styles.cardLabel}>Available Balance</Text>
              <Text style={styles.balance}>₱{balanceText}</Text>

              <View style={styles.badge}>
                <Text style={styles.badgeText}>DEMO TOP-UP ENABLED</Text>
              </View>

              <Text style={styles.cardHint}>
                This is a thesis/MVP feature. Later we will replace this with PayMongo/GCash.
              </Text>
            </View>

            {/* Presets */}
            <Text style={styles.sectionTitle}>Quick Top Up</Text>
            <View style={styles.presetRow}>
              {PRESETS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.presetBtn, busy && { opacity: 0.6 }]}
                  onPress={() => doTopUp(p)}
                  activeOpacity={0.9}
                  disabled={busy}
                >
                  <Text style={styles.presetText}>₱{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Amount */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Custom Amount</Text>
              <TextInput
                value={amountText}
                onChangeText={setAmountText}
                placeholder="Enter amount (e.g. 150)"
                placeholderTextColor="rgba(255,255,255,0.35)"
                keyboardType="numeric"
                style={styles.input}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, busy && { opacity: 0.6 }]}
                onPress={() => doTopUp(amountText)}
                activeOpacity={0.9}
                disabled={busy}
              >
                <Text style={styles.primaryText}>{busy ? "Processing..." : "Add Funds"}</Text>
              </TouchableOpacity>
            </View>

            {/* Ledger */}
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Wallet Activity</Text>
            </View>

            <View style={styles.list}>
              {(wallet?.ledger || []).map((x) => (
                <View key={x.id} style={styles.txRow}>
                  <View style={styles.txLeft}>
                    <View style={styles.txIcon}>
                      <Text style={styles.txIconText}>{x.kind === "topup_credit" ? "💳" : "🧾"}</Text>
                    </View>
                    <View>
                      <Text style={styles.txTitle}>
                        {x.kind === "topup_credit" ? "Top Up" : x.kind}
                      </Text>
                      <Text style={styles.txMeta}>
                        {new Date(x.created_at).toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.txAmount, x.kind === "topup_credit" ? styles.txPos : styles.txMuted]}>
                    +₱{Number(x.amount || 0).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>

            <View style={{ height: 90 }} />
          </>
        )}
      </ScrollView>

      <BottomNav navigation={navigation} active="Wallet" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0E14" },
  content: { padding: 18, paddingTop: 18 },

  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  back: { color: "rgba(255,255,255,0.75)", fontWeight: "800" },

  refreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  refreshText: { color: "#fff", fontWeight: "800" },

  title: { color: "#fff", fontSize: 26, fontWeight: "900", marginTop: 14 },
  sub: { marginTop: 8, color: "rgba(255,255,255,0.65)" },

  center: { marginTop: 20, alignItems: "center" },
  dim: { marginTop: 10, color: "rgba(255,255,255,0.6)" },

  bigCard: {
    marginTop: 16,
    borderRadius: 22,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  cardLabel: { color: "rgba(255,255,255,0.65)", fontSize: 12 },
  balance: { color: "#fff", fontSize: 32, fontWeight: "900", marginTop: 6 },

  badge: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255, 211, 106, 0.95)",
  },
  badgeText: { color: "#0B0E14", fontWeight: "900", fontSize: 12 },

  cardHint: { color: "rgba(255,255,255,0.55)", marginTop: 10, fontSize: 12 },

  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "900", marginTop: 18 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },

  presetRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  presetBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
  },
  presetText: { color: "#fff", fontWeight: "900" },

  card: {
    marginTop: 12,
    borderRadius: 18,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  cardTitle: { color: "#fff", fontWeight: "900", marginBottom: 10 },

  input: {
    borderRadius: 14,
    padding: 12,
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  primaryBtn: {
    marginTop: 12,
    backgroundColor: "#FFD36A",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  primaryText: { color: "#0B0E14", fontWeight: "900", fontSize: 15 },

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
  txTitle: { color: "#fff", fontWeight: "900" },
  txMeta: { color: "rgba(255,255,255,0.55)", marginTop: 4, fontSize: 12 },

  txAmount: { fontWeight: "900", fontSize: 14 },
  txPos: { color: "#7CFF9B" },
  txMuted: { color: "rgba(255,255,255,0.55)" },
});
