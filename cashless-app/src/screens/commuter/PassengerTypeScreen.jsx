import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View,
  Text,
  Alert,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Dimensions } from "react-native";

import { savePassengerProfile } from "../../api/passengerLocal";
import { HugeiconsIcon } from "@hugeicons/react-native";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  InformationCircleIcon,
  CheckmarkCircle01Icon,
  GraduateMaleIcon,
  WheelchairIcon,
  ArrowDown01Icon,
  Cancel01Icon,
  Building04Icon
} from "@hugeicons/core-free-icons";
import { useTheme } from "../../context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";

const { height } = Dimensions.get("window");

const VALENCIA_SCHOOLS = {
  high_school: [
    "Valencia National High School",
    "Mountain View College Academy",
    "San Agustin Institute of Technology (HS)",
    "First Fruits Christian Academy",
    "Lilingayon National High School",
    "Lurugan National High School",
    "Mailag National High School",
    "Tongantongan National High School"
  ],
  college: [
    "San Agustin Institute of Technology",
    "Mountain View College",
    "STI College Valencia",
    "Philippine College Foundation",
    "Bukidnon State University - Valencia",
    "Central Mindanao University (Nearby)"
  ]
};

export default function PassengerTypeScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();
  const styles = getStyles(theme);
  const [type, setType] = useState("student");
  const [educationLevel, setEducationLevel] = useState("high_school");
  const [school, setSchool] = useState("");
  const [schoolModalVisible, setSchoolModalVisible] = useState(false);

  const selectType = (t) => setType(t);

  const handleEducationLevelChange = (level) => {
    setEducationLevel(level);
    setSchool(""); // Reset school selection on level change
  };

  const handleNext = async () => {
    if (type === "student" && !school) {
      return Alert.alert("Required", "Please select your school from the list.");
    }

    await savePassengerProfile({
      passenger_type: type,
      school_name: type === "student" ? school : null,
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
              <HugeiconsIcon icon={ArrowLeft01Icon} size={24} color={theme.text} />
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
              onPress={() => selectType("student")}
              theme={theme}
              isDarkMode={isDarkMode}
              styles={styles}
            />

            <PassengerCard
              icon="accessibility-outline"
              value="senior"
              label="Senior Citizen"
              description="Discounted fare with valid senior ID"
              selected={type === "senior"}
              onPress={() => selectType("senior")}
              theme={theme}
              isDarkMode={isDarkMode}
              styles={styles}
            />
          </View>

          {/* School Attributes Segment (only for students) */}
          {type === "student" && (
            <View style={styles.schoolSection}>

              <Text style={styles.inputLabel}>Education Level</Text>

              {/* Custom Segmented Control */}
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={[styles.segmentBtn, educationLevel === "high_school" && styles.segmentBtnActive]}
                  onPress={() => handleEducationLevelChange("high_school")}
                >
                  <Text style={[styles.segmentBtnText, educationLevel === "high_school" && styles.segmentBtnTextActive]}>
                    High School
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.9}
                  style={[styles.segmentBtn, educationLevel === "college" && styles.segmentBtnActive]}
                  onPress={() => handleEducationLevelChange("college")}
                >
                  <Text style={[styles.segmentBtnText, educationLevel === "college" && styles.segmentBtnTextActive]}>
                    College
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, { marginTop: 24 }]}>School (Valencia City) *</Text>

              {/* Custom Dropdown Trigger */}
              <TouchableOpacity
                style={[styles.customDropdown, school && styles.customDropdownActive]}
                activeOpacity={0.8}
                onPress={() => setSchoolModalVisible(true)}
              >
                <View style={styles.customDropdownLeft}>
                  <HugeiconsIcon
                    icon={Building04Icon}
                    size={22}
                    color={school ? theme.success : theme.textMuted}
                  />
                  <Text style={[styles.customDropdownText, !school && { color: theme.textMuted }]}>
                    {school || "Tap to select your school..."}
                  </Text>
                </View>
                <HugeiconsIcon icon={ArrowDown01Icon} size={20} color={theme.textMuted} />
              </TouchableOpacity>

              <Text style={[styles.inputHint, { marginTop: 12 }]}>
                We need this to verify your student status. Currently focusing on Valencia City area bounds.
              </Text>
            </View>
          )}

          {/* Info Card */}
          <View style={styles.infoCard}>
            <HugeiconsIcon icon={InformationCircleIcon} size={20} color={theme.success} />
            <Text style={styles.infoText}>
              {type === "student"
                ? "After selecting your school, you'll upload your student ID for verification to unlock discounted fares."
                : "You'll need to upload your senior citizen ID for verification to unlock discounted fares."
              }
            </Text>
          </View>

          {/* Next Button */}
          <TouchableOpacity
            style={[
              styles.nextBtnWrapper,
              (type === "student" && !school) && styles.nextBtnDisabledWrapper
            ]}
            onPress={handleNext}
            disabled={type === "student" && !school}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={
                (type === "student" && !school)
                  ? [theme.card, theme.card]
                  : (isDarkMode ? ["#7CFF9B", "#4CAF50"] : ["#4CAF50", "#2E7D32"])
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.nextBtn,
                (type === "student" && !school) && styles.nextBtnDisabled
              ]}
            >
              <Text style={[styles.nextBtnText, (type === "student" && !school) && { color: theme.textMuted }]}>
                Continue
              </Text>
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={20}
                color={(type === "student" && !school) ? theme.textMuted : (isDarkMode ? "#0B0E14" : "#FFFFFF")}
              />
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* School Selection Bottom Sheet Modal */}
      <Modal
        visible={schoolModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSchoolModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSchoolModalVisible(false)}
        >
          <View
            style={styles.modalContent}
            onStartShouldSetResponder={() => true} // Prevent closing when tapping inside
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select School</Text>
              <TouchableOpacity onPress={() => setSchoolModalVisible(false)} style={styles.closeBtn}>
                <HugeiconsIcon icon={Cancel01Icon} size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {VALENCIA_SCHOOLS[educationLevel].map((s, index) => {
                const isSelected = school === s;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.schoolOption, isSelected && styles.schoolOptionSelected]}
                    onPress={() => {
                      setSchool(s);
                      setSchoolModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.schoolOptionText, isSelected && styles.schoolOptionTextSelected]}>
                      {s}
                    </Text>
                    {isSelected && (
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} size={22} color={theme.success} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

function PassengerCard({ value, label, description, selected, onPress, theme, isDarkMode, styles }) {
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
          <HugeiconsIcon
            icon={value === "student" ? GraduateMaleIcon : WheelchairIcon}
            size={24}
            color={selected ? (isDarkMode ? "#0B0E14" : "#FFFFFF") : theme.success}
          />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardLabel}>{label}</Text>
          <Text style={styles.cardDescription}>{description}</Text>
        </View>
      </View>

      {selected && (
        <View style={styles.checkmark}>
          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={24} color={theme.success} />
        </View>
      )}
    </TouchableOpacity>
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
  content: {
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

  // Title Section
  titleSection: {
    marginBottom: 32,
  },
  title: {
    color: theme.text,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 36,
  },
  subtitle: {
    marginTop: 12,
    color: theme.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },

  // Cards Section
  cardsSection: {
    marginBottom: 32,
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: theme.border,
    backgroundColor: theme.card,
    shadowColor: theme.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardSelected: {
    borderColor: theme.success,
    backgroundColor: theme.successBg,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: theme.successBg,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleSelected: {
    backgroundColor: theme.success,
  },
  cardContent: {
    flex: 1,
  },
  cardLabel: {
    color: theme.text,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 4,
  },
  cardDescription: {
    color: theme.textSecondary,
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
    color: theme.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
    marginLeft: 4,
  },

  // Segmented Control
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 6,
    borderWidth: 1,
    borderColor: theme.border,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: theme.successBg,
    shadowColor: theme.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentBtnText: {
    color: theme.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
  segmentBtnTextActive: {
    color: theme.success,
    fontWeight: '800',
  },

  // Custom Dropdown
  customDropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.card,
    borderWidth: 2,
    borderColor: theme.border,
    borderRadius: 16,
    overflow: "hidden",
    height: 64,
    paddingHorizontal: 20,
  },
  customDropdownActive: {
    borderColor: theme.success,
    backgroundColor: theme.successBg,
  },
  customDropdownLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  customDropdownText: {
    color: theme.text,
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },

  inputHint: {
    color: theme.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 4,
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
    marginBottom: 32,
    gap: 12,
  },
  infoText: {
    flex: 1,
    color: theme.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },

  // Next Button
  nextBtnWrapper: {
    borderRadius: 16,
    shadowColor: theme.success,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  nextBtnDisabledWrapper: {
    shadowOpacity: 0,
    elevation: 0,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
  },
  nextBtnDisabled: {
    backgroundColor: theme.border,
  },
  nextBtnText: {
    color: theme.isDark ? "#0B0E14" : "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },

  // Bottom Sheet Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: theme.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: height * 0.7,
    paddingHorizontal: 24,
    paddingTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 20,
    borderTopWidth: 1,
    borderColor: theme.border,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    marginBottom: 16,
  },
  modalTitle: {
    color: theme.text,
    fontSize: 20,
    fontWeight: "800",
  },
  closeBtn: {
    padding: 8,
    marginRight: -8,
  },
  schoolOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  schoolOptionSelected: {
    borderBottomColor: theme.success,
  },
  schoolOptionText: {
    color: theme.textSecondary,
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    paddingRight: 16,
  },
  schoolOptionTextSelected: {
    color: theme.success,
    fontWeight: "800",
  },
});
