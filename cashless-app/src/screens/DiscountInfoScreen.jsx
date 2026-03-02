import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
} from "react-native";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ArrowLeft01Icon, ArrowRight01Icon, CheckmarkCircle01Icon, Shield01Icon, Clock01Icon, NoteIcon } from "@hugeicons/core-free-icons";

export default function DiscountInfoScreen({ navigation, route }) {
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
            <HugeiconsIcon icon={ArrowLeft01Icon} size={24} color="#fff" />
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
            <HugeiconsIcon icon={NoteIcon} size={22} color="#7CFF9B" />
            <Text style={styles.cardTitle}>What you need</Text>
          </View>
          <View style={styles.listItem}>
            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={18} color="#7CFF9B" />
            <Text style={styles.cardText}>Upload a valid ID (front and back)</Text>
          </View>
          <View style={styles.listItem}>
            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={18} color="#7CFF9B" />
            <Text style={styles.cardText}>Make sure details are clear and readable</Text>
          </View>
          <View style={styles.listItem}>
            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={18} color="#7CFF9B" />
            <Text style={styles.cardText}>Admin approval activates discount automatically</Text>
          </View>
        </View>

        {/* Card: While waiting */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <HugeiconsIcon icon={Clock01Icon} size={22} color="#FFD36A" />
            <Text style={styles.cardTitle}>While waiting</Text>
          </View>
          <Text style={styles.cardText}>
            You can continue riding using regular fare until your verification is approved.
          </Text>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <HugeiconsIcon icon={Shield01Icon} size={20} color="#7CFF9B" />
          <Text style={styles.infoText}>
            Your documents are encrypted and stored securely. Only admins can review them.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryBtn} onPress={goUpload} activeOpacity={0.9}>
            <Text style={styles.primaryBtnText}>Upload ID Now</Text>
            <HugeiconsIcon icon={ArrowRight01Icon} size={20} color="#0B0E14" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate("Home")}
            activeOpacity={0.9}
          >
            <Text style={styles.secondaryBtnText}>Do it Later</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0B0E14",
  },
  scroll: {
    flex: 1,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
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
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 10,
  },
  subtitle: {
    marginBottom: 24,
    color: "rgba(255,255,255,0.68)",
    fontSize: 14,
    lineHeight: 20,
  },

  card: {
    marginBottom: 16,
    borderRadius: 18,
    padding: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  cardTitle: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },
  cardText: {
    color: "rgba(255,255,255,0.75)",
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
    backgroundColor: "rgba(124,255,155,0.08)",
    borderWidth: 1,
    borderColor: "rgba(124,255,155,0.2)",
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    lineHeight: 18,
  },

  actions: {
    marginTop: 24,
    gap: 12,
  },

  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#7CFF9B",
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: "#7CFF9B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryBtnText: {
    color: "#0B0E14",
    fontWeight: "900",
    fontSize: 16,
  },

  secondaryBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  secondaryBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
});
