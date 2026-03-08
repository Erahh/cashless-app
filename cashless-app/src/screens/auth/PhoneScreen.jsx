import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { supabase } from "../../api/supabase";
import { API_BASE_URL } from "../../config/api";
import AuthBackground from "../../components/AuthBackground";
import { useTheme } from "../../context/ThemeContext";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ArrowLeft01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";

const COUNTRY_CODES = [
  { flag: "🇵🇭", code: "+63", name: "Philippines", mask: "912 3456 789", max: 10 },
  { flag: "🇺🇸", code: "+1", name: "United States", mask: "201 555 0123", max: 10 },
  { flag: "🇬🇧", code: "+44", name: "United Kingdom", mask: "7123 4567 89", max: 10 },
  { flag: "🇸🇬", code: "+65", name: "Singapore", mask: "8123 4567", max: 8 },
  { flag: "🇦🇪", code: "+971", name: "UAE", mask: "50 123 4567", max: 9 },
  { flag: "🇯🇵", code: "+81", name: "Japan", mask: "90 1234 5678", max: 10 },
];

// ✅ Normalize raw 10-digit input (e.g. 9123456789) to E.164 (+639123456789)
// User always types without country code in our UI, so we just prepend +63
function buildE164(rawDigits) {
  // Strip any non-digit
  let d = (rawDigits || "").replace(/[^\d]/g, "");
  // If user typed a leading 0 (e.g. 09...), strip it
  if (d.startsWith("0")) d = d.slice(1);
  return `+63${d}`;
}

export default function PhoneScreen({ navigation, route }) {
  const { role: passedRole, mode: passedMode } = route.params || {};
  const [isLogin, setIsLogin] = useState(passedMode === "login" || !passedRole);
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [showPicker, setShowPicker] = useState(false);
  const [rawPhone, setRawPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const { theme, isDarkMode } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDarkMode), [theme, isDarkMode]);

  // Format for display while typing
  const formatDisplay = (digits) => {
    const d = digits.slice(0, selectedCountry.max);
    if (selectedCountry.code === "+63" || selectedCountry.code === "+1") {
      if (d.length <= 3) return d;
      if (d.length <= 7) return `${d.slice(0, 3)} ${d.slice(3)}`;
      return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}`;
    }
    if (selectedCountry.code === "+65") {
      if (d.length <= 4) return d;
      return `${d.slice(0, 4)} ${d.slice(4)}`;
    }
    // Generic
    let res = "";
    for (let i = 0; i < d.length; i++) {
      if (i > 0 && i % 4 === 0) res += " ";
      res += d[i];
    }
    return res.trim();
  };

  const handleContinue = async () => {
    if (loading) return;
    try {
      // Strip any leading 0 in case user typed 09... (only for PH)
      let digits = rawPhone.replace(/[^\d]/g, "");
      if (selectedCountry.code === "+63" && digits.startsWith("0")) {
        digits = digits.slice(1);
      }

      const fullPhone = `${selectedCountry.code}${digits}`;

      // Validation
      if (selectedCountry.code === "+63" && digits.length !== 10) {
        return Alert.alert("Invalid Number", "Please enter a valid 10-digit PH number (e.g. 9123456789)");
      } else if (digits.length < 8) {
        return Alert.alert("Invalid Number", "Please enter a valid phone number.");
      }

      setLoading(true);

      // 1. Check if user already exists in profiles (via backend to bypass RLS)
      const checkUrl = `${API_BASE_URL}/auth/check-phone`;
      console.log(`[PhoneScreen] Checking registration at: ${checkUrl}`);

      let checkJson = {};
      try {
        const checkResp = await fetch(checkUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: fullPhone }),
        });

        const contentType = checkResp.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const body = await checkResp.text();
          console.error("[PhoneScreen] Unexpected non-JSON response:", body.slice(0, 100));
          throw new Error(`Server returned non-JSON response (HTTP ${checkResp.status}). Please ensure backend is pushed to Render.`);
        }

        checkJson = await checkResp.json();
        if (!checkResp.ok) throw new Error(checkJson.error || "Failed to check phone registration.");
      } catch (checkErr) {
        setLoading(false);
        console.error("[PhoneScreen] Check-phone error:", checkErr);
        return Alert.alert("Connection Error", checkErr.message);
      }

      const alreadyExists = !!checkJson.exists;

      if (!isLogin && alreadyExists) {
        // Trying to sign up with existing number
        setLoading(false);
        return Alert.alert(
          "Number Already Used",
          "This phone number is already registered. Please log in instead.",
          [
            { text: "Log In", onPress: () => setIsLogin(true) },
            { text: "Cancel", style: "cancel" }
          ]
        );
      }

      if (isLogin && !alreadyExists) {
        // Trying to login with non-existent number
        setLoading(false);
        return Alert.alert(
          "Account Not Found",
          "This number is not registered yet. Please create an account first.",
          [
            { text: "Sign Up", onPress: () => navigation.navigate("RoleSelection") },
            { text: "Cancel", style: "cancel" }
          ]
        );
      }

      if (isLogin) {
        // Send OTP
        const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
        if (error) throw error;
        navigation.navigate("OTPScreen", { phone: fullPhone, isLogin: true });
      } else {
        // Signup flow — proceed to details gathering
        if (passedRole === "operator") {
          navigation.navigate("OperatorCode", { role: passedRole, phone: fullPhone });
        } else {
          navigation.navigate("PersonalInfo", { role: passedRole, phone: fullPhone });
        }
      }
    } catch (e) {
      Alert.alert("Error", e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header with Back */}
          <View style={styles.headerRow}>
            {navigation.canGoBack() ? (
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color={theme.text} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 44, height: 44 }} />
            )}
            <Text style={styles.logo}>ERA</Text>
          </View>

          {/* Main Content */}
          <View style={styles.container}>
            <Text style={styles.title}>
              {isLogin ? "Welcome Back!" : "Create an Account"}
            </Text>
            <Text style={styles.subtitle}>
              {isLogin
                ? "Access your account through your phone number"
                : "Sign up instantly using your phone number"}
            </Text>

            {/* Phone Input Label */}
            <Text style={styles.inputLabel}>Enter Your Phone Number</Text>

            {/* Phone Input Row */}
            <View style={styles.phoneRow}>
              {/* Country Prefix */}
              <TouchableOpacity
                style={styles.prefixBox}
                activeOpacity={0.7}
                onPress={() => Keyboard.dismiss() || setShowPicker(true)}
              >
                <Text style={styles.flag}>{selectedCountry.flag}</Text>
                <Text style={styles.prefixText}>{selectedCountry.code}</Text>
                <Text style={styles.chevron}>▾</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* Phone Number Input */}
              <TextInput
                value={formatDisplay(rawPhone)}
                onChangeText={(text) => {
                  // Only store raw digits with max limit based on country
                  const digits = text.replace(/[^\d]/g, "").slice(0, selectedCountry.max);
                  setRawPhone(digits);
                }}
                placeholder={selectedCountry.mask}
                placeholderTextColor={theme.textMuted}
                keyboardType="phone-pad"
                maxLength={13} // 10 digits + 2 spaces
                returnKeyType="done"
                onSubmitEditing={handleContinue}
                style={styles.phoneInput}
              />
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              style={[
                styles.continueBtn,
                (rawPhone.replace(/[^\d]/g, "").replace(/^0/, "").length < (selectedCountry.code === "+63" ? 10 : 8) || loading) && { opacity: 0.5 },
              ]}
              onPress={handleContinue}
              disabled={rawPhone.replace(/[^\d]/g, "").replace(/^0/, "").length < (selectedCountry.code === "+63" ? 10 : 8) || loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color={theme.isDark ? "#0B0E14" : "#FFFFFF"} />
              ) : (
                <Text style={[styles.continueBtnText, { color: theme.isDark ? "#0B0E14" : "#FFFFFF" }]}>Continue</Text>
              )}
            </TouchableOpacity>

            {/* Sign-up link */}
            <View style={styles.signupRow}>
              <Text style={styles.signupText}>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  if (isLogin) {
                    navigation.navigate("RoleSelection");
                  } else {
                    setIsLogin(true);
                  }
                }}
              >
                <Text style={styles.signupLink}>
                  {isLogin ? "Signup" : "Login"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Country Picker Modal */}
      <Modal visible={showPicker} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <HugeiconsIcon icon={Cancel01Icon} size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={COUNTRY_CODES}
              keyExtractor={(item) => item.code}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryItem,
                    selectedCountry.code === item.code && styles.countryItemActive
                  ]}
                  onPress={() => {
                    setSelectedCountry(item);
                    setShowPicker(false);
                    setRawPhone(""); // clear input on switch
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <Text style={styles.countryName}>{item.name}</Text>
                  <Text style={styles.countryCode}>{item.code}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

    </AuthBackground>
  );
}

const createStyles = (theme, isDarkMode) =>
  StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 8,
      marginBottom: 20,
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
    logo: {
      color: theme.text,
      fontSize: 22,
      fontWeight: "900",
      letterSpacing: 2,
    },
    container: {
      flex: 1,
      paddingTop: 20,
    },
    title: {
      color: theme.text,
      fontSize: 32,
      fontWeight: "900",
      marginBottom: 10,
      letterSpacing: -0.5,
    },
    subtitle: {
      color: theme.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 40,
    },
    inputLabel: {
      color: theme.textSecondary,
      fontSize: 13,
      fontWeight: "600",
      marginBottom: 10,
      letterSpacing: 0.3,
    },
    phoneRow: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.card,
      paddingHorizontal: 16,
      height: 58,
    },
    prefixBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingRight: 12,
    },
    flag: {
      fontSize: 18,
    },
    prefixText: {
      color: theme.text,
      fontSize: 15,
      fontWeight: "700",
    },
    chevron: {
      color: theme.textMuted,
      fontSize: 10,
      marginLeft: 2,
    },
    divider: {
      width: 1,
      height: 28,
      backgroundColor: theme.border,
      marginRight: 14,
    },
    phoneInput: {
      flex: 1,
      color: theme.text,
      fontSize: 16,
      fontWeight: "600",
      paddingVertical: 0,
    },
    continueBtn: {
      marginTop: 24,
      height: 56,
      borderRadius: 16,
      backgroundColor: theme.isDark ? theme.accent : theme.primary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 4,
    },
    continueBtnText: {
      fontWeight: "900",
      fontSize: 16,
      letterSpacing: 0.3,
    },
    signupRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: 24,
    },
    signupText: {
      color: theme.textSecondary,
      fontSize: 14,
    },
    signupLink: {
      color: theme.text,
      fontSize: 14,
      fontWeight: "800",
    },
    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: theme.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 16,
      maxHeight: "60%",
      borderWidth: 1,
      borderColor: theme.border,
      borderBottomWidth: 0,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 24,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalTitle: {
      color: theme.text,
      fontSize: 18,
      fontWeight: "800",
    },
    listContent: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 40,
    },
    countryItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: 14,
      marginBottom: 6,
    },
    countryItemActive: {
      backgroundColor: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"
    },
    countryFlag: {
      fontSize: 24,
      marginRight: 14,
    },
    countryName: {
      flex: 1,
      color: theme.text,
      fontSize: 16,
      fontWeight: "600",
    },
    countryCode: {
      color: theme.textSecondary,
      fontSize: 14,
      fontWeight: "700",
    },
  });
