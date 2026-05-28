import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { ArrowLeft01Icon, UserIcon, Time01Icon, Navigation02Icon, Bus01Icon, CreditCardIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { fetchTransactionById } from "../../api/transactionApi";

export default function RideDetailsScreen({ route, navigation }) {
  const { theme } = useTheme();
  const txId =
    route.params?.tx_id ||
    route.params?.transaction_id ||
    route.params?.transactionId ||
    route.params?.id ||
    route.params?.item?.tx_id ||
    route.params?.item?.transaction_id ||
    route.params?.data?.tx_id ||
    route.params?.data?.transaction_id;
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRideDetails() {
      if (!txId) {
        setLoading(false);
        return;
      }
      try {
        const data = await fetchTransactionById(txId);
        setDetails(data);
      } catch (err) {
        console.warn("Error fetching ride details:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchRideDetails();
  }, [txId]);

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown date";
    const d = new Date(dateString);
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) + 
           " at " + 
           d.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Ride Receipt</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
        ) : !details ? (
          <Text style={[styles.errorText, { color: theme.textMuted }]}> 
            {txId ? "Ride details not found or expired." : "Missing ride transaction ID."}
          </Text>
        ) : (
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <View style={styles.amountContainer}>
              <Text style={[styles.amountLabel, { color: theme.textMuted }]}>Total Fare Paid</Text>
              <Text style={[styles.amountValue, { color: theme.success }]} adjustsFontSizeToFit numberOfLines={1}>
                ₱{Number(details.fare_amount || 0).toFixed(2)}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: theme.success + '20' }]}>
                <Text style={[styles.statusText, { color: theme.success }]}>SUCCESSFUL</Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.detailRow}>
              <View style={[styles.iconWrapper, { backgroundColor: theme.primary + '15' }]}>
                <HugeiconsIcon icon={UserIcon} size={20} color={theme.primary} />
              </View>
              <View style={styles.detailTextContainer}>
                <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Driver / Operator</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {details.operator?.full_name || "Unknown Driver"}
                </Text>
                <Text style={[styles.detailSub, { color: theme.textMuted }]}>
                  ID: {details.operator_id?.split('-')[0].toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={[styles.iconWrapper, { backgroundColor: theme.info + '15' }]}>
                <HugeiconsIcon icon={Bus01Icon} size={20} color={theme.info} />
              </View>
              <View style={styles.detailTextContainer}>
                <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Vehicle Plate No.</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {details.vehicle?.plate_no || "N/A"}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={[styles.iconWrapper, { backgroundColor: theme.warning + '15' }]}>
                <HugeiconsIcon icon={Navigation02Icon} size={20} color={theme.warning} />
              </View>
              <View style={styles.detailTextContainer}>
                <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Route Name</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {details.route_name || details.vehicle?.route_name || "Unknown Route"}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={[styles.iconWrapper, { backgroundColor: theme.error + '15' }]}>
                <HugeiconsIcon icon={Time01Icon} size={20} color={theme.error} />
              </View>
              <View style={styles.detailTextContainer}>
                <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Date & Time</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {formatDate(details.scanned_at || details.created_at)}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={[styles.iconWrapper, { backgroundColor: theme.textMuted + '20' }]}>
                <HugeiconsIcon icon={CreditCardIcon} size={20} color={theme.textMuted} />
              </View>
              <View style={styles.detailTextContainer}>
                <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Transaction ID</Text>
                <Text style={[styles.detailValue, { color: theme.textMuted, fontSize: 12 }]} numberOfLines={1}>
                  {details.id}
                </Text>
              </View>
            </View>

          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)'
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  scrollContent: {
    padding: 16,
    flexGrow: 1,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  amountContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  amountLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 42,
    fontWeight: '800',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  detailSub: {
    fontSize: 12,
    marginTop: 2,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  }
});
