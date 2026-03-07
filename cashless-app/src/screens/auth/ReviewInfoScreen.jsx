import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  StatusBar,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { HugeiconsIcon } from "@hugeicons/react-native";
import {
  ArrowLeft01Icon,
  CheckmarkCircle01Icon,
  UserIcon,
  Shield01Icon,
} from "@hugeicons/core-free-icons";

export default function ReviewInfoScreen({ route, navigation }) {
  const p = route.params?.profile;
  const { theme, isDarkMode } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDarkMode), [theme, isDarkMode]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Info</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Badge */}
        <View style={styles.statusBadge}>
          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={18} color={theme.success} />
          <Text style={styles.statusText}>
            Almost done! Confirm your details below.
          </Text>
        </View>

        {/* Personal Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <HugeiconsIcon icon={UserIcon} size={18} color={theme.textSecondary} />
            <Text style={styles.sectionTitle}>Personal</Text>
          </View>
          <View style={styles.card}>
            <Row label="Full Name" value={p?.full_name} theme={theme} />
            <View style={styles.divider} />
            <Row label="Birthdate" value={p?.birthdate} theme={theme} />
            <View style={styles.divider} />
            <Row label="Email" value={p?.email || "—"} theme={theme} />
          </View>
        </View>

        {/* Address Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <HugeiconsIcon icon={Shield01Icon} size={18} color={theme.textSecondary} />
            <Text style={styles.sectionTitle}>Address</Text>
          </View>
          <View style={styles.card}>
            <Row label="Province" value={p?.province} theme={theme} />
            <View style={styles.divider} />
            <Row label="City" value={p?.city} theme={theme} />
            <View style={styles.divider} />
            <Row label="Barangay" value={p?.barangay} theme={theme} />
            <View style={styles.divider} />
            <Row label="ZIP" value={p?.zip_code || "—"} theme={theme} />
            <View style={styles.divider} />
            <Row label="Address" value={p?.address_line} theme={theme} />
          </View>
        </View>

        {/* Confirm Button */}
        <TouchableOpacity
          onPress={() => navigation.navigate("MPINSetup")}
          style={styles.btn}
          activeOpacity={0.9}
        >
          <Text style={styles.btnText}>Confirm & Set MPIN</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          Tap the back arrow to edit your details.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, theme }) {
  return (
    <View style={rowStyles.row}>
      <Text style={[rowStyles.key, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[rowStyles.value, { color: theme.text }]}>{value || "—"}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
  },
  key: { fontSize: 13, fontWeight: "600" },
  value: { fontSize: 15, fontWeight: "700", flex: 1, textAlign: "right" },
});

const createStyles = (theme, isDarkMode) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
    },
    backBtn: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      color: theme.text,
      fontSize: 18,
      fontWeight: "900",
    },
    content: {
      padding: 20,
      paddingBottom: 40,
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 14,
      borderRadius: 14,
      backgroundColor: isDarkMode
        ? "rgba(124,255,155,0.06)"
        : "rgba(76,175,80,0.06)",
      borderWidth: 1,
      borderColor: isDarkMode
        ? "rgba(124,255,155,0.15)"
        : "rgba(76,175,80,0.15)",
      marginBottom: 24,
    },
    statusText: {
      color: theme.success,
      fontSize: 13,
      fontWeight: "600",
      flex: 1,
    },
    section: {
      marginBottom: 20,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 10,
    },
    sectionTitle: {
      color: theme.textSecondary,
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: "hidden",
    },
    divider: {
      height: 1,
      backgroundColor: theme.border,
    },
    btn: {
      height: 56,
      borderRadius: 16,
      backgroundColor: isDarkMode ? theme.accent : theme.primary,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 4,
    },
    btnText: {
      color: isDarkMode ? "#0B0E14" : "#FFFFFF",
      fontWeight: "900",
      fontSize: 16,
    },
    hint: {
      textAlign: "center",
      marginTop: 16,
      color: theme.textMuted,
      fontSize: 13,
    },
  });
