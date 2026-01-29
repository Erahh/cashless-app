import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fetchWallet } from "../api/walletApi";
import BottomNav from "../components/BottomNav";
import QuickActions from "../components/QuickActions";

export default function BalanceScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState(null);

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

  // Calculate spending from ledger (debits)
  const spendingData = useMemo(() => {
    const ledger = wallet?.ledger || [];
    const debits = ledger.filter(x => x.kind !== "topup_credit");
    const totalSpent = debits.reduce((sum, x) => sum + Number(x.amount || 0), 0);
    return {
      amount: totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      percentage: "3.2", // Demo value
    };
  }, [wallet]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Fixed Header - Outside ScrollView */}
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wallet</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={load} activeOpacity={0.9}>
          <Ionicons name="refresh" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#FFD36A" size="large" />
            <Text style={styles.dim}>Loading wallet...</Text>
          </View>
        ) : (

          <>
            {/* ═══════════════════════════════════════════════════════════════
                UNIFIED WALLET CARD - Balance + Spending
            ═══════════════════════════════════════════════════════════════ */}
            <View style={styles.walletCard}>
              {/* Balance Section - Both inside black pill, horizontal */}
              <View style={styles.balanceSection}>
                <View style={styles.balanceInnerCard}>
                  <Text style={styles.balanceLabel}>Available Balance</Text>
                  <Text style={styles.balanceAmount}>₱{balanceText}</Text>
                </View>
              </View>

              {/* Divider */}
              <View style={styles.cardDivider} />

              {/* Spending Section */}
              <View style={styles.spendingSection}>
                <View style={styles.spendingLeft}>
                  <Text style={styles.spendingLabel}>Spending</Text>
                  <Text style={styles.spendingAmount}>₱{spendingData.amount}</Text>
                </View>
                <View style={styles.spendingRight}>
                  <View style={styles.percentageRow}>
                    <Ionicons name="trending-up" size={12} color="#FFD36A" />
                    <Text style={styles.percentageText}>{spendingData.percentage}%</Text>
                    <Text style={styles.percentageLabel}>last week</Text>
                  </View>
                  {/* Mini Wave Graph */}
                  <View style={styles.waveContainer}>
                    <View style={styles.waveLine}>
                      <View style={[styles.waveSegment, { height: 6 }]} />
                      <View style={[styles.waveSegment, { height: 12 }]} />
                      <View style={[styles.waveSegment, { height: 8 }]} />
                      <View style={[styles.waveSegment, { height: 16 }]} />
                      <View style={[styles.waveSegment, { height: 10 }]} />
                      <View style={[styles.waveSegment, { height: 18 }]} />
                      <View style={[styles.waveSegment, { height: 14 }]} />
                      <View style={[styles.waveSegment, { height: 10 }]} />
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* ═══════════════════════════════════════════════════════════════
                RECENT TRANSACTIONS HEADER
            ═══════════════════════════════════════════════════════════════ */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              <TouchableOpacity
                style={styles.seeAllBtn}
                onPress={() => navigation.navigate("Transactions")}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>

            {/* ═══════════════════════════════════════════════════════════════
                TRANSACTION LIST
            ═══════════════════════════════════════════════════════════════ */}
            <View style={styles.transactionList}>
              {(wallet?.ledger || []).slice(0, 5).map((x) => {
                const isCredit = x.kind === "topup_credit";
                const txDate = new Date(x.created_at);
                const dateStr = txDate.toLocaleDateString(undefined, {
                  month: 'short', day: 'numeric'
                });

                return (
                  <View key={x.id} style={styles.txCard}>
                    <View style={styles.txLeft}>
                      <View style={[styles.txIconCircle, isCredit && styles.txIconCircleCredit]}>
                        <Text style={styles.txIconEmoji}>
                          {isCredit ? "💳" : "🚌"}
                        </Text>
                      </View>
                      <View style={styles.txInfo}>
                        <Text style={styles.txType}>
                          {isCredit ? "Receive" : "Transfer"}
                        </Text>
                        <Text style={styles.txName}>
                          {isCredit ? "GCash Top Up" : "Fare Payment"}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.txAmount, isCredit ? styles.txAmountPos : styles.txAmountNeg]}>
                      {isCredit ? "+" : "-"}₱{Number(x.amount || 0).toFixed(2)}
                    </Text>
                  </View>
                );
              })}

              {(wallet?.ledger || []).length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>📭</Text>
                  <Text style={styles.emptyText}>No transactions yet</Text>
                </View>
              )}
            </View>

            {/* ═══════════════════════════════════════════════════════════════
                QUICK ACTIONS
            ═══════════════════════════════════════════════════════════════ */}
            <QuickActions
              items={[
                {
                  key: "topup",
                  icon: "💳",
                  title: "Top Up",
                  sub: "GCash",
                  onPress: () => navigation.navigate("SendLoad")
                },
                {
                  key: "send_load",
                  icon: "💸",
                  title: "Send Load",
                  sub: "Transfer",
                  onPress: () => Alert.alert("Send Load", "Coming soon!")
                },
                {
                  key: "my_qr",
                  icon: "📲",
                  title: "My QR",
                  sub: "Show Code",
                  onPress: () => navigation.navigate("MyQR")
                },
              ]}
            />

            <View style={{ height: 140 }} />
          </>
        )}
      </ScrollView>

      <BottomNav navigation={navigation} active="Wallet" />
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#1A1D24" },
  content: { padding: 20, paddingTop: 16 },

  // Header (fixed outside ScrollView)
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
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  center: { marginTop: 60, alignItems: "center" },
  dim: { marginTop: 16, color: "rgba(255,255,255,0.5)", fontSize: 14 },

  // ═══════════════════════════════════════════════════════════════
  // UNIFIED WALLET CARD
  // ═══════════════════════════════════════════════════════════════
  walletCard: {
    borderRadius: 28,
    padding: 20,
    marginBottom: 24,
    // Darker brown gradient effect
    backgroundColor: "#2D2519",
    borderWidth: 1.5,
    borderColor: "rgba(255,211,106,0.2)",
    // Enhanced shadow for depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },

  // Balance Section (Top) - Horizontal layout
  balanceSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  balanceLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
    fontWeight: "400",
    letterSpacing: 0.3,
    flex: 1,
  },
  // Nested dark card for balance amount only
  balanceInnerCard: {
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  balanceAmount: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -1.5,
    marginLeft: 12,
  },

  // Divider
  cardDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 18,
  },

  // Spending Section (Bottom)
  spendingSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  spendingLeft: {
    flex: 1,
  },
  spendingLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  spendingAmount: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  spendingRight: {
    alignItems: "flex-end",
  },
  percentageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 8,
  },
  percentageText: {
    color: "#FFD36A",
    fontSize: 12,
    fontWeight: "700",
  },
  percentageLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
  },
  waveContainer: {
    width: 90,
    height: 20,
    justifyContent: "flex-end",
  },
  waveLine: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
  },
  waveSegment: {
    width: 8,
    borderRadius: 2,
    backgroundColor: "#FF9650",
  },

  // ═══════════════════════════════════════════════════════════════
  // SECTION HEADER
  // ═══════════════════════════════════════════════════════════════
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  seeAllBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ═══════════════════════════════════════════════════════════════
  // TRANSACTION LIST
  // ═══════════════════════════════════════════════════════════════
  transactionList: {
    gap: 10,
    marginBottom: 24,
  },
  txCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  txLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  txIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  txIconCircleCredit: {
    backgroundColor: "rgba(255, 211, 106, 0.15)",
    borderColor: "rgba(255, 211, 106, 0.3)",
  },
  txIconEmoji: {
    fontSize: 18,
  },
  txInfo: {
    flex: 1,
  },
  txType: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    marginBottom: 2,
  },
  txName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  txAmount: {
    fontSize: 15,
    fontWeight: "700",
  },
  txAmountPos: {
    color: "#7CFF9B",
  },
  txAmountNeg: {
    color: "#FF8A8A",
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: 30,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 14,
  },
});
