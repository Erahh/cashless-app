import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from "react-native";

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

    navigation.navigate("UploadVerification", { passenger_type });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <Text style={styles.title}>Discount Verification</Text>
        <Text style={styles.subtitle}>
          {label
            ? `${label} fare requires admin verification.`
            : "Discount fare requires verification."}
        </Text>

        {/* Card: What you need */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>What you need</Text>
          <Text style={styles.cardText}>
            • Upload a valid ID (front and back){"\n"}
            • Make sure details are clear and readable{"\n"}
            • Admin approval activates discount automatically
          </Text>
        </View>

        {/* Card: While waiting */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>While waiting</Text>
          <Text style={styles.cardText}>
            You can continue riding using regular fare until your verification is approved.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryBtn} onPress={goUpload} activeOpacity={0.9}>
            <Text style={styles.primaryBtnText}>Upload ID Now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate("Home")}
            activeOpacity={0.9}
          >
            <Text style={styles.secondaryBtnText}>Do it Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0B0E14",
  },
  container: {
    flex: 1,
    padding: 18,
    paddingTop: 28,
  },

  title: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 10,
    color: "rgba(255,255,255,0.68)",
    lineHeight: 18,
  },

  card: {
    marginTop: 16,
    borderRadius: 18,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  cardTitle: {
    color: "#fff",
    fontWeight: "900",
    marginBottom: 8,
  },
  cardText: {
    color: "rgba(255,255,255,0.65)",
    lineHeight: 18,
  },

  actions: {
    marginTop: "auto",
    gap: 12,
    paddingBottom: 18,
  },

  primaryBtn: {
    backgroundColor: "#FFD36A",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#0B0E14",
    fontWeight: "900",
    fontSize: 15,
  },

  secondaryBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  secondaryBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
});
