import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { savePassengerProfile } from "../api/passengerLocal";
import { Ionicons } from "@expo/vector-icons";

export default function PassengerTypeScreen({ navigation }) {
  const [type, setType] = useState("student");
  const [school, setSchool] = useState("");

  const select = (t) => setType(t);

  const handleNext = async () => {
    if (type === "student" && !school.trim()) {
      return Alert.alert("Required", "School name is required for student.");
    }

    await savePassengerProfile({
      passenger_type: type,
      school_name: type === "student" ? school.trim() : null,
    });

    // Always go to discount verification info screen (student or senior)
    navigation.navigate("DiscountInfo", { passenger_type: type });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header with Back Button */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Apply for Discount</Text>
            <Text style={styles.subtitle}>
              Select your category to apply for discounted fares. You'll need to verify your status with a valid ID.
            </Text>
          </View>

          {/* Passenger Type Cards */}
          <View style={styles.cardsSection}>
            <PassengerCard
              icon="school-outline"
              value="student"
              label="Student"
              description="Discounted fare with valid student ID"
              selected={type === "student"}
              onPress={() => select("student")}
            />

            <PassengerCard
              icon="accessibility-outline"
              value="senior"
              label="Senior Citizen"
              description="Discounted fare with valid senior ID"
              selected={type === "senior"}
              onPress={() => select("senior")}
            />
          </View>

          {/* School Name Input (only for students) */}
          {type === "student" && (
            <View style={styles.schoolSection}>
              <Text style={styles.inputLabel}>School Name *</Text>
              <TextInput
                value={school}
                onChangeText={setSchool}
                placeholder="Enter your school name"
                placeholderTextColor="rgba(255,255,255,0.4)"
                style={styles.input}
                returnKeyType="done"
              />
              <Text style={styles.inputHint}>
                We need this to verify your student status
              </Text>
            </View>
          )}

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color="#7CFF9B" />
            <Text style={styles.infoText}>
              {type === "student"
                ? "After entering your school name, you'll upload your student ID for verification to unlock discounted fares."
                : "You'll need to upload your senior citizen ID for verification to unlock discounted fares."
              }
            </Text>
          </View>

          {/* Next Button */}
          <TouchableOpacity
            style={[
              styles.nextBtn,
              (type === "student" && !school.trim()) && styles.nextBtnDisabled
            ]}
            onPress={handleNext}
            disabled={type === "student" && !school.trim()}
            activeOpacity={0.9}
          >
            <Text style={styles.nextBtnText}>Next</Text>
            <Ionicons name="arrow-forward" size={20} color="#0B0E14" />
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PassengerCard({ icon, value, label, description, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        selected && styles.cardSelected
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.cardLeft}>
        <View style={[
          styles.iconCircle,
          selected && styles.iconCircleSelected
        ]}>
          <Ionicons
            name={icon}
            size={24}
            color={selected ? "#0B0E14" : "#7CFF9B"}
          />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardLabel}>{label}</Text>
          <Text style={styles.cardDescription}>{description}</Text>
        </View>
      </View>

      {selected && (
        <View style={styles.checkmark}>
          <Ionicons name="checkmark-circle" size={24} color="#7CFF9B" />
        </View>
      )}
    </TouchableOpacity>
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
  content: {
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

  // Title Section
  titleSection: {
    marginBottom: 32,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 36,
  },
  subtitle: {
    marginTop: 12,
    color: "rgba(255,255,255,0.65)",
    fontSize: 14,
    lineHeight: 20,
  },

  // Cards Section
  cardsSection: {
    marginBottom: 24,
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  cardSelected: {
    borderColor: "#7CFF9B",
    backgroundColor: "rgba(124,255,155,0.10)",
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(124,255,155,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleSelected: {
    backgroundColor: "#7CFF9B",
  },
  cardContent: {
    flex: 1,
  },
  cardLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  cardDescription: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
  },
  checkmark: {
    marginLeft: 10,
  },

  // School Section
  schoolSection: {
    marginBottom: 24,
  },
  inputLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 2,
    borderColor: "rgba(124,255,155,0.3)",
    borderRadius: 14,
    padding: 16,
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  inputHint: {
    marginTop: 8,
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
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

  // Next Button
  nextBtn: {
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
  nextBtnDisabled: {
    backgroundColor: "rgba(255,255,255,0.15)",
    shadowOpacity: 0,
  },
  nextBtnText: {
    color: "#0B0E14",
    fontSize: 16,
    fontWeight: "900",
  },
});
