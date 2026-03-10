import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Animated,
  Platform,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { HugeiconsIcon } from "@hugeicons/react-native";
import {
  ArrowLeft01Icon,
  CheckmarkCircle02Icon,
  UserIcon,
  Location01Icon,
  FingerprintIcon,
  Calendar03Icon,
  Mail01Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import AuthBackground from "../../components/AuthBackground";

export default function ReviewInfoScreen({ route, navigation }) {
  const p = route.params?.profile;
  const { theme, isDarkMode } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDarkMode), [theme, isDarkMode]);

  // Decorative initial for the "ID Card"
  const userInitial = p?.first_name ? p.first_name.charAt(0).toUpperCase() : "U";

  return (
    <AuthBackground>
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
        <Text style={styles.headerTitle}>SECURE REVIEW</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Futuristic Profile Card */}
        <View style={styles.idCard}>
          <View style={styles.idCardGlow} />
          <View style={styles.idCardHeader}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{userInitial}</Text>
            </View>
            <View style={styles.idMainInfo}>
              <Text style={styles.uName}>{p?.full_name}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{p?.role?.toUpperCase() || "USER"}</Text>
              </View>
            </View>
          </View>
          <View style={styles.idCardFooter}>
            <View style={styles.idMeta}>
              <Text style={styles.idMetaLabel}>SYSTEM ID</Text>
              <Text style={styles.idMetaValue}>ERA-{Math.floor(1000 + Math.random() * 9000)}</Text>
            </View>
            <View style={[styles.idMeta, { alignItems: "flex-end" }]}>
              <Text style={styles.idMetaLabel}>STATUS</Text>
              <Text style={[styles.idMetaValue, { color: theme.success }]}>VERIFIED</Text>
            </View>
          </View>
        </View>

        <View style={styles.statusBadge}>
          <HugeiconsIcon icon={CheckmarkCircle02Icon || UserIcon} size={18} color={theme.success} />
          <Text style={styles.statusText}>
            Identity data synchronized. Please confirm to finalize.
          </Text>
        </View>

        {/* Info Sections */}
        <Text style={styles.sectionLabel}>CORE DATA</Text>
        <View style={styles.glassPanel}>
          <InfoRow icon={Calendar03Icon} label="Birthdate" value={p?.birthdate} theme={theme} />
          <View style={styles.divider} />
          <InfoRow icon={Mail01Icon} label="Email" value={p?.email || "Not Provided"} theme={theme} />
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>GEOGRAPHIC DATA</Text>
        <View style={styles.glassPanel}>
          <InfoRow icon={Location01Icon} label="Province" value={p?.province} theme={theme} />
          <View style={styles.divider} />
          <InfoRow icon={Location01Icon} label="City" value={p?.city} theme={theme} />
          <View style={styles.divider} />
          <InfoRow icon={Location01Icon} label="Barangay" value={p?.barangay} theme={theme} />
          <View style={styles.divider} />
          <InfoRow icon={InformationCircleIcon} label="Address" value={p?.address_line} theme={theme} />
        </View>

        {/* Action button */}
        <TouchableOpacity
          onPress={() => navigation.navigate("MPINSetup", { registrationData: p })}
          style={styles.confirmBtn}
          activeOpacity={0.9}
        >
          <View style={styles.btnContent}>
            <HugeiconsIcon icon={FingerprintIcon || UserIcon} size={22} color={isDarkMode ? "#0B0E14" : "#FFFFFF"} />
            <Text style={styles.btnText}>INITIALIZE MPIN SETUP</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Proceeding will finalize your decentralized identity profile.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </AuthBackground>
  );
}

function InfoRow({ icon, label, value, theme }) {
  // Defensive check for missing imported icons
  const safeIcon = icon || UserIcon;
  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.labelWrap}>
        <HugeiconsIcon icon={safeIcon} size={16} color={theme.textMuted} />
        <Text style={[rowStyles.key, { color: theme.textSecondary }]}>{label.toUpperCase()}</Text>
      </View>
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
  },
  labelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  key: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1
  },
  value: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
    textAlign: "right"
  },
});

const createStyles = (theme, isDarkMode) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 12,
      paddingBottom: 20,
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
      fontSize: 14,
      fontWeight: "900",
      letterSpacing: 4,
    },
    content: {
      paddingBottom: 20,
    },
    // Futuristic ID Card
    idCard: {
      backgroundColor: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
      borderRadius: 24,
      padding: 24,
      borderWidth: 1,
      borderColor: isDarkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
      marginBottom: 24,
      position: "relative",
      overflow: "hidden",
    },
    idCardGlow: {
      position: "absolute",
      top: -50,
      right: -50,
      width: 150,
      height: 150,
      borderRadius: 75,
      backgroundColor: theme.accent,
      opacity: 0.05,
    },
    idCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 20,
      marginBottom: 24,
    },
    avatarCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.accent,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
      borderColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
    },
    avatarText: {
      fontSize: 28,
      fontWeight: "900",
      color: "#0B0E14",
    },
    idMainInfo: {
      flex: 1,
    },
    uName: {
      fontSize: 22,
      fontWeight: "900",
      color: theme.text,
      letterSpacing: -0.5,
      marginBottom: 4,
    },
    roleBadge: {
      alignSelf: "flex-start",
      backgroundColor: "rgba(247, 227, 83, 0.15)",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "rgba(247, 227, 83, 0.3)",
    },
    roleText: {
      color: theme.accent,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1,
    },
    idCardFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
    },
    idMeta: {
      gap: 2,
    },
    idMetaLabel: {
      fontSize: 9,
      fontWeight: "800",
      color: theme.textMuted,
      letterSpacing: 1,
    },
    idMetaValue: {
      fontSize: 12,
      fontWeight: "900",
      color: theme.text,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    // Status Badge
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 16,
      borderRadius: 18,
      backgroundColor: isDarkMode ? "rgba(124,255,155,0.04)" : "rgba(76,175,80,0.04)",
      borderWidth: 1,
      borderColor: isDarkMode ? "rgba(124,255,155,0.1)" : "rgba(76,175,80,0.1)",
      marginBottom: 32,
    },
    statusText: {
      color: theme.success,
      fontSize: 13,
      fontWeight: "600",
      flex: 1,
    },
    sectionLabel: {
      color: theme.textSecondary,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 2,
      marginBottom: 12,
      marginLeft: 4,
    },
    glassPanel: {
      backgroundColor: isDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: "hidden",
    },
    divider: {
      height: 1,
      backgroundColor: theme.border,
      marginHorizontal: 16,
    },
    confirmBtn: {
      height: 64,
      borderRadius: 20,
      backgroundColor: theme.accent,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 40,
      shadowColor: theme.accent,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.2,
      shadowRadius: 20,
      elevation: 8,
    },
    btnContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    btnText: {
      color: "#0B0E14",
      fontWeight: "900",
      fontSize: 15,
      letterSpacing: 1,
    },
    footerNote: {
      textAlign: "center",
      marginTop: 20,
      color: theme.textMuted,
      fontSize: 12,
      fontWeight: "600",
      paddingHorizontal: 40,
      lineHeight: 18,
    },
  });
