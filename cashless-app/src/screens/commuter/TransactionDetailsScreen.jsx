import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";

import { HugeiconsIcon } from "@hugeicons/react-native";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useTheme } from "../../context/ThemeContext";

function formatPHP(n) {
  const num = Number(n || 0);
  return `₱${num.toFixed(2)}`;
}

export default function TransactionDetailsScreen({ route, navigation }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  // Get item from params
  const { item } = route.params || {};

  if (!item) {
    return (
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <HugeiconsIcon icon={ArrowLeft01Icon} size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: theme.text }}>Transaction not found.</Text>
        </View>
      </View>
    );
  }

  const isDebit =
    item.source === "ledger" &&
    (String(item.kind).includes("debit") || String(item.kind).includes("fare"));

  const amountText = (isDebit ? "-" : "+") + formatPHP(item.amount);

  const dateDate = new Date(item.created_at);
  const timeString = dateDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateString = dateDate.toLocaleDateString();

  // Generate an e-wallet style Reference Number based on DB ID
  let refNumber = "ERA-UNKNOWN";
  if (item.id) {
    const rawId = String(item.id).replace(/^(led_|top_)/, "");
    refNumber = `ERA-${rawId.substring(0, 12).toUpperCase()}`;
  }

  const statusColor = item.status === "PENDING" ? "#F59E0B" :
    item.status === "FAILED" ? "#EF4444" : "#10B981";

  const copyRef = async () => {
    await Clipboard.setStringAsync(refNumber);
    // You could arguably add a toast here, but simple copy is fine
  };

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        automaticallyAdjustsScrollIndicatorInsets={false}
      >
        {/* Main Amount Card */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Amount</Text>
          <Text style={[styles.amountValue, { color: isDebit ? theme.danger : theme.success }]}>{amountText}</Text>
          {!!(item.status || item.source === "topup") && (
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {String(item.status || "COMPLETED").toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Details List */}
        <View style={styles.detailsBox}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Transaction Type</Text>
            <Text style={styles.detailValue}>{item.label || item.kind || "Load Transfer"}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Reference No.</Text>
            <TouchableOpacity style={styles.refContainer} activeOpacity={0.6} onPress={copyRef}>
              <Text style={[styles.detailValue, styles.refValue]}>{refNumber}</Text>
              <MaterialCommunityIcons name="content-copy" size={16} color={theme.accent || "#3B82F6"} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date & Time</Text>
            <Text style={styles.detailValue}>{dateString} {timeString}</Text>
          </View>

          {!!item.meta && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Note / Reason</Text>
              <Text style={styles.detailValue}>{item.meta}</Text>
            </View>
          )}

          {!!(item.description && item.description !== item.label) && (
            <View style={[styles.detailRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <Text style={styles.detailLabel}>Description</Text>
              <Text style={styles.detailValue}>{item.description}</Text>
            </View>
          )}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <MaterialCommunityIcons name="information-outline" size={24} color={theme.accent || "#0284C7"} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Need Help?</Text>
            <Text style={styles.infoText}>
              {"If you encounter delays or issues with this transaction, please provide the "}
              <Text style={{ fontWeight: "700", color: theme.text }}>Reference Number</Text>
              {" to our support team. Refunds and transfers may take up to 24 hours to process."}
            </Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.isDark ? "#121212" : "#F9FAFB", // Soft off-white in light mode
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.isDark ? "#1E1E1E" : "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  headerTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: "700",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },

  /* Amount Card - Clean White & Shadow */
  amountCard: {
    backgroundColor: theme.isDark ? "#1E1E1E" : "#FFFFFF",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: theme.isDark ? "#000" : "#8A94A6", // soft shadow
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: theme.isDark ? 0.3 : 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  amountLabel: {
    color: theme.textSecondary,
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  amountValue: {
    fontSize: 40,
    fontWeight: "800",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  statusBadge: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  /* Details Box - Clean White & Shadow */
  detailsBox: {
    backgroundColor: theme.isDark ? "#1E1E1E" : "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: theme.isDark ? "#000" : "#8A94A6",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: theme.isDark ? 0.25 : 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.isDark ? "#333" : "#F3F4F6",
  },
  detailLabel: {
    color: theme.textSecondary,
    fontSize: 14,
    flex: 1,
  },
  detailValue: {
    color: theme.text,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
  },
  refContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  refValue: {
    color: theme.accent || "#3B82F6",
    fontFamily: "monospace",
    fontWeight: "700",
  },

  /* Info Box */
  infoBox: {
    backgroundColor: theme.isDark ? "rgba(59, 130, 246, 0.1)" : "#EBF5FF",
    borderWidth: 1,
    borderColor: theme.isDark ? "rgba(59, 130, 246, 0.3)" : "#BFDBFE",
    borderRadius: 16,
    padding: 20,
    marginTop: 5,
    flexDirection: "row",
    gap: 12,
  },
  infoTitle: {
    color: theme.isDark ? "#60A5FA" : "#0369A1",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
  },
  infoText: {
    color: theme.isDark ? "#D1D5DB" : "#475569",
    fontSize: 13,
    lineHeight: 20,
  },
});
