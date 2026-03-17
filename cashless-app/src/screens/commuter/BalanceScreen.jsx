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
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ArrowLeft01Icon, RefreshIcon, AnalyticsUpIcon, ArrowRight01Icon, WalletAdd01Icon, FlashIcon, QrCodeIcon } from "@hugeicons/core-free-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { fetchWallet } from "../../api/walletApi";
import QuickActions from "../../components/QuickActions";
import TxIcon from "../../components/TxIcon";
import { useTheme } from "../../context/ThemeContext";
import { useAppStore } from "../../store/appStore";

export default function BalanceScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState(null);
  const hideBalance = useAppStore((state) => state.hideBalance);

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
          <HugeiconsIcon icon={ArrowLeft01Icon} size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wallet</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={load} activeOpacity={0.9}>
          <HugeiconsIcon icon={RefreshIcon} size={18} color={theme.text} />
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
                  <Text style={styles.balanceAmount}>₱{hideBalance ? "••••" : balanceText}</Text>
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
                    <HugeiconsIcon icon={AnalyticsUpIcon} size={12} color="#FFD36A" />
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
                <HugeiconsIcon icon={ArrowRight01Icon} size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* ═══════════════════════════════════════════════════════════════
                TRANSACTION LIST
            ═══════════════════════════════════════════════════════════════ */}
            <View style={styles.transactionList}>
              {(wallet?.ledger || []).slice(0, 5).map((x) => {
                const isCredit = x.kind === "topup_credit" || x.kind === "load_transfer_credit";
                const txDate = new Date(x.created_at);
                const dateStr = txDate.toLocaleDateString(undefined, {
                  month: 'short', day: 'numeric'
                });

                // Transaction identity based on kind
                let txType = "Transfer";
                let txName = "Transaction";

                switch (x.kind) {
                  case "topup_credit":
                    txType = "Receive";
                    txName = "PayMongo Top Up";
                    break;
                  case "fare_debit":
                    txType = "Payment";
                    txName = "Ride Fare";
                    break;
                  case "load_transfer_debit":
                    txType = "Sent";
                    txName = x.description || "Send Load";
                    break;
                  case "load_transfer_credit":
                    txType = "Received";
                    txName = x.description || "Received Load";
                    break;
                  default:
                    txType = isCredit ? "Receive" : "Transfer";
                    txName = x.description || x.kind || "Transaction";
                }

                return (
                  <View key={x.id} style={styles.txCard}>
                    <View style={styles.txLeft}>
                      <View style={{ marginRight: 12 }}>
                        <TxIcon title={txName} type={x.kind} source="ledger" />
                      </View>
                      <View style={styles.txInfo}>
                        <Text style={styles.txType}>
                          {txType}
                        </Text>
                        <Text style={styles.txName}>
                          {txName}
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
                  icon: WalletAdd01Icon,
                  title: "Top Up",
                  onPress: () => navigation.navigate("TopUp")
                },
                {
                  key: "send_load",
                  icon: FlashIcon,
                  title: "Send Load",
                  onPress: () => Alert.alert("Send Load", "Coming soon!")
                },
                {
                  key: "my_qr",
                  icon: QrCodeIcon,
                  title: "My QR",
                  onPress: () => navigation.navigate("MyQR")
                },
              ]}
            />

            <View style={{ height: 140 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView >
  );
}

const createStyles = (theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  content: { padding: 20, paddingTop: 16, paddingBottom: 160 },

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

  center: { marginTop: 60, alignItems: "center" },
  dim: { marginTop: 16, color: theme.textSecondary, fontSize: 14 },

  walletCard: {
    borderRadius: 28,
    padding: 20,
    marginBottom: 24,
    backgroundColor: theme.cardAlt,
    borderWidth: 1.5,
    borderColor: theme.warningBg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },

  balanceSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  balanceLabel: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    fontWeight: "400",
    letterSpacing: 0.3,
    flex: 1,
  },
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

  cardDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 18,
  },

  spendingSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  spendingLeft: {
    flex: 1,
  },
  spendingLabel: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  spendingAmount: {
    color: theme.text,
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
    color: theme.warning,
    fontSize: 12,
    fontWeight: "700",
  },
  percentageLabel: {
    color: theme.textMuted,
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
    backgroundColor: theme.accentWarm,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: "700",
  },
  seeAllBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.card,
    alignItems: "center",
    justifyContent: "center",
  },

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
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
  },
  txLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  txInfo: {
    flex: 1,
  },
  txType: {
    color: theme.textMuted,
    fontSize: 11,
    marginBottom: 2,
  },
  txName: {
    color: theme.text,
    fontSize: 14,
    fontWeight: "600",
  },
  txAmount: {
    fontSize: 15,
    fontWeight: "700",
  },
  txAmountPos: {
    color: theme.success,
  },
  txAmountNeg: {
    color: theme.danger,
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
    color: theme.textMuted,
    fontSize: 14,
  },
});
