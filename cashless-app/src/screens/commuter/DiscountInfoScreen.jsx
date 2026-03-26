import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView } from "react-native";

import { HugeiconsIcon } from "@hugeicons/react-native";
import { ArrowLeft01Icon, ArrowRight01Icon, CheckmarkCircle01Icon, Shield01Icon, Clock01Icon, NoteIcon } from "@hugeicons/core-free-icons";
import { useTheme } from "../../context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";

export default function DiscountInfoScreen({ navigation, route }) {
  const { theme, isDarkMode } = useTheme();
  const styles = getStyles(theme);
  const passenger_type = route?.params?.passenger_type; // "student" | "senior"

  const label =
    passenger_type === "student"
      ? "Student"
      : passenger_type === "senior"
        ? "Senior Citizen"
        : null;

  const goUpload = () => {
    if (!passenger_type || !["student", "senior"].includes(passenger_type)) {
      return Alert.alert("Missing passenger type", "Please select Student or Senior first.");
    }

    navigation.navigate("UploadFrontID", { passenger_type });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Header */}
        <Text style={styles.title}>Discount Verification</Text>
        <Text style={styles.subtitle}>
          {label
            ? `${label} fare requires admin verification.`
            : "Discount fare requires verification."}
        </Text>

        {/* Card: What you need */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <HugeiconsIcon icon={NoteIcon} size={22} color={theme.success} />
            <Text style={styles.cardTitle}>What you need</Text>
          </View>
          <View style={styles.listItem}>
            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={18} color={theme.success} />
            <Text style={styles.cardText}>Upload a valid ID (front and back)</Text>
          </View>
          <View style={styles.listItem}>
            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={18} color={theme.success} />
            <Text style={styles.cardText}>Make sure details are clear and readable</Text>
          </View>
          <View style={styles.listItem}>
            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={18} color={theme.success} />
            <Text style={styles.cardText}>Admin approval activates discount automatically</Text>
          </View>
        </View>

        {/* Card: While waiting */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <HugeiconsIcon icon={Clock01Icon} size={22} color={theme.warning} />
            <Text style={styles.cardTitle}>While waiting</Text>
          </View>
          <Text style={styles.cardText}>
            You can continue riding using regular fare until your verification is approved.
          </Text>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <HugeiconsIcon icon={Shield01Icon} size={20} color={theme.success} />
          <Text style={styles.infoText}>
            Your documents are encrypted and stored securely. Only admins can review them.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity onPress={goUpload} activeOpacity={0.9} style={styles.touchableWrapper}>
            <LinearGradient
              colors={
                isDarkMode
                  ? ["#7CFF9B", "#4CAF50"]
                  : ["#4CAF50", "#2E7D32"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>Upload ID Now</Text>
              <HugeiconsIcon icon={ArrowRight01Icon} size={20} color={isDarkMode ? "#0B0E14" : "#FFFFFF"} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scroll: {
    flex: 1,
  },
  container: {
    padding: 20,
    paddingBottom: 170,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    color: theme.text,
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 10,
  },
  subtitle: {
    marginBottom: 24,
    color: theme.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },

  card: {
    marginBottom: 16,
    borderRadius: 18,
    padding: 18,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: theme.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  cardTitle: {
    color: theme.text,
    fontWeight: "900",
    fontSize: 16,
  },
  cardText: {
    color: theme.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },

  // Info Card
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    borderRadius: 16,
    backgroundColor: theme.successBg,
    borderWidth: 1,
    borderColor: theme.success,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    color: theme.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },

  actions: {
    marginTop: 24,
    gap: 12,
  },
  touchableWrapper: {
    borderRadius: 16,
    shadowColor: theme.success,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
  },
  primaryBtnText: {
    color: theme.isDark ? "#0B0E14" : "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
  },
});
