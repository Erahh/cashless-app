import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";

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
import { ArrowLeft01Icon, Cancel01Icon, Tick01Icon, Alert01Icon } from "@hugeicons/core-free-icons";
import CEraLogo from "../../components/CEraLogo";

const COUNTRY_CODES = [
  { flag: "🇵🇭", code: "+63", name: "Philippines", mask: "912 3456 789", max: 10 },
  { flag: "🇺🇸", code: "+1", name: "United States", mask: "201 555 0123", max: 10 },
  { flag: "🇬🇧", code: "+44", name: "United Kingdom", mask: "7123 4567 89", max: 10 },
  { flag: "🇸🇬", code: "+65", name: "Singapore", mask: "8123 4567", max: 8 },
  { flag: "🇦🇪", code: "+971", name: "UAE", mask: "50 123 4567", max: 9 },
  { flag: "🇯🇵", code: "+81", name: "Japan", mask: "90 1234 5678", max: 10 },
];

/**
 * Common Philippine Mobile Carrier Prefixes
 */
const PH_CARRIER_MAP = {
  // Globe & TM
  "904": "Globe", "905": "Globe", "906": "Globe", "915": "Globe", "916": "Globe", "917": "Globe", "926": "Globe", "927": "Globe", "935": "Globe", "936": "Globe", "937": "Globe", "945": "Globe", "953": "Globe", "954": "Globe", "955": "Globe", "956": "Globe", "965": "Globe", "966": "Globe", "967": "Globe", "975": "Globe", "976": "GOMO", "977": "Globe", "978": "Globe", "979": "Globe", "994": "Globe", "995": "Globe", "996": "Globe", "997": "Globe", "817": "Globe",
  // Smart & TNT & Sun
  "907": "Smart", "908": "Smart", "909": "Smart", "910": "Smart", "911": "Smart", "912": "Smart", "913": "Smart", "914": "Smart", "918": "Smart", "919": "Smart", "920": "Smart", "921": "Smart", "928": "Smart", "929": "Smart", "930": "Smart", "931": "Sun", "938": "Smart", "939": "Smart", "940": "Smart", "946": "Smart", "947": "Smart", "948": "Smart", "949": "Smart", "950": "Smart", "951": "Smart", "961": "Smart", "963": "Smart", "964": "Smart", "968": "Smart", "969": "Smart", "970": "Smart", "981": "Smart", "989": "Smart", "998": "Smart", "999": "Smart", "813": "Smart",
  "922": "Sun", "923": "Sun", "924": "Sun", "925": "Sun", "932": "Sun", "933": "Sun", "934": "Sun", "941": "Sun", "942": "Sun", "943": "Sun", "944": "Sun",
  // DITO
  "991": "DITO", "992": "DITO", "993": "DITO", "895": "DITO", "896": "DITO", "897": "DITO", "898": "DITO"
};

function getPHCarrier(num, dbCarriers = null) {
  if (!num) return null;
  let d = String(num).replace(/[^\d]/g, "");
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length < 3) return null;
  const prefix = d.slice(0, 3);

  // If DB carriers are loaded, they are the EXCLUSIVE source of truth.
  // No fallback to static list to ensure user-defined restrictions are respected.
  if (dbCarriers && Object.keys(dbCarriers).length > 0) {
    const matched = dbCarriers[prefix];
    if (matched) return matched;

    // Prefix not found in DB
    return "Unknown Provider";
  }

  // If DB hasn't loaded (null), we return null to signify "pending check"
  // This prevents the button from enabling using a local fallback.
  return null;
}



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
  const [dbCarriers, setDbCarriers] = useState(null);
  const [phoneStatus, setPhoneStatus] = useState(null); // null | 'checking' | 'exists' | 'not_found' | 'error'
  const [checkedPhone, setCheckedPhone] = useState(null); // the phone string we last checked
  const { theme, isDarkMode } = useTheme();
  const phoneInputRef = useRef(null);
  const checkTimerRef = useRef(null);
  const abortRef = useRef(null);


  useEffect(() => {
    // Fetch carriers from DB on mount
    const fetchCarriers = async () => {
      try {
        const resp = await fetch(`${API_BASE_URL}/auth/supported-carriers`);
        const json = await resp.json();
        if (json.ok && json.carriers?.length) {
          const map = {};
          json.carriers.forEach(c => { map[c.prefix] = c.carrier_name; });
          setDbCarriers(map);
          console.log(`[PhoneScreen] Loaded ${json.carriers.length} providers from database.`);
        }
      } catch (err) {
        console.warn("[PhoneScreen] Could not fetch carriers from DB, using static map.", err.message);
      }
    };
    fetchCarriers();
  }, []);

  const styles = useMemo(() => createStyles(theme, isDarkMode), [theme, isDarkMode]);

  const carrier = useMemo(() => {
    if (selectedCountry.code === "+63") {
      return getPHCarrier(rawPhone, dbCarriers);
    }
    return null;
  }, [rawPhone, selectedCountry.code, dbCarriers]);

  const isInvalidCarrier = useMemo(() => {
    const digits = rawPhone.replace(/[^\d]/g, "").replace(/^0/, "");
    if (selectedCountry.code === "+63") {
      // Immediate invalidation if first digit isn't 9 or 8
      if (digits.length > 0 && !["9", "8"].includes(digits[0])) return true;

      // After 3 digits, we MUST have a carrier identified by the DB
      if (digits.length >= 3) {
        // If carrier is null, it means DB is still loading or check hasn't run
        if (dbCarriers === null) return false; // Let it be "valid" until we know otherwise? 
        // Actually, better to block until loaded.
        return carrier === "Unknown Provider";
      }
    }
    return false;
  }, [rawPhone, selectedCountry.code, carrier, dbCarriers]);

  // ── Helper: fetch with timeout ──
  const fetchWithTimeout = useCallback(async (url, options, timeoutMs = 8000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return resp;
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') throw new Error('Request timed out. Server may be starting up, please try again.');
      throw err;
    }
  }, []);

  // ── Debounced auto-check phone as user types ──
  useEffect(() => {
    // Clear previous timer
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    // Abort any in-flight request
    if (abortRef.current) abortRef.current.abort();

    const digits = rawPhone.replace(/[^\d]/g, "").replace(/^0/, "");
    const requiredLen = selectedCountry.code === "+63" ? 10 : 8;

    // Reset status if number is incomplete
    if (digits.length < requiredLen || isInvalidCarrier) {
      setPhoneStatus(null);
      setCheckedPhone(null);
      return;
    }

    const fullPhone = `${selectedCountry.code}${digits}`;

    // If we already checked this exact number, skip
    if (checkedPhone === fullPhone && phoneStatus && phoneStatus !== 'error') return;

    // Debounce 400ms then auto-check
    checkTimerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      setPhoneStatus('checking');

      try {
        const checkResp = await fetchWithTimeout(
          `${API_BASE_URL}/auth/check-phone`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: fullPhone }),
            signal: controller.signal,
          },
          8000
        );

        if (controller.signal.aborted) return;

        const contentType = checkResp.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          setPhoneStatus('error');
          return;
        }

        const json = await checkResp.json();
        if (!checkResp.ok) {
          setPhoneStatus('error');
          return;
        }

        setCheckedPhone(fullPhone);
        setPhoneStatus(json.exists ? 'exists' : 'not_found');
        console.log(`[PhoneScreen] Pre-check: ${fullPhone} -> ${json.exists ? 'exists' : 'not_found'}`);
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.warn('[PhoneScreen] Pre-check failed:', err.message);
        setPhoneStatus('error');
      }
    }, 400);

    return () => {
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    };
  }, [rawPhone, selectedCountry.code, isInvalidCarrier]);

  // Reset phone status when switching login/signup mode
  useEffect(() => {
    setPhoneStatus(null);
    setCheckedPhone(null);
  }, [isLogin]);


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

      // Add carrier check for PH
      if (selectedCountry.code === "+63" && isInvalidCarrier) {
        return Alert.alert("Provider Warning", "This number belongs to an unsupported or invalid provider. Please use a standard Philippine mobile number.");
      }

      // ── Use cached pre-check result if available (INSTANT!) ──
      let alreadyExists;
      if (checkedPhone === fullPhone && phoneStatus === 'exists') {
        alreadyExists = true;
      } else if (checkedPhone === fullPhone && phoneStatus === 'not_found') {
        alreadyExists = false;
      } else {
        // Fallback: do the check now (only if pre-check didn't complete)
        setLoading(true);
        try {
          const checkResp = await fetchWithTimeout(
            `${API_BASE_URL}/auth/check-phone`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ phone: fullPhone }),
            },
            8000
          );
          const contentType = checkResp.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            throw new Error('Server returned non-JSON response. Please try again.');
          }
          const checkJson = await checkResp.json();
          if (!checkResp.ok) throw new Error(checkJson.error || "Failed to check phone.");
          alreadyExists = !!checkJson.exists;
          setCheckedPhone(fullPhone);
          setPhoneStatus(alreadyExists ? 'exists' : 'not_found');
        } catch (checkErr) {
          setLoading(false);
          return Alert.alert("Connection Error", checkErr.message);
        }
      }

      // ── Instant validation based on cached/fetched result ──
      if (!isLogin && alreadyExists) {
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

      // ── Now send OTP (this is the only loading the user sees) ──
      setLoading(true);
      const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
      if (error) {
        setLoading(false);
        return Alert.alert("Verification Error", error.message);
      }

      console.log(`[PhoneScreen] OTP sent successfully for: ${fullPhone}`);

      if (isLogin) {
        navigation.navigate("OTPScreen", { phone: fullPhone, isLogin: true });
      } else {
        navigation.navigate("OTPScreen", {
          phone: fullPhone,
          isLogin: false,
          role: passedRole
        });
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
            <CEraLogo size="small" />
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

            {/* Phone Input Label (Now Floating) */}
            <View style={{ position: 'relative', marginTop: 10 }}>
              <Text style={styles.floatingLabel}>Phone Number</Text>

              {/* Phone Input Row */}
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => phoneInputRef.current?.focus()}
                style={[styles.phoneRow, isInvalidCarrier && styles.phoneRowError]}
              >
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
                  ref={phoneInputRef}
                  value={formatDisplay(rawPhone)}
                  onChangeText={(text) => {
                    let d = text.replace(/[^\d]/g, "");

                    if (selectedCountry.code === "+63") {
                      // Strip leading 0 or 63
                      if (d.startsWith("0")) d = d.slice(1);
                      else if (d.startsWith("63") && d.length > 5) d = d.slice(2);
                    }

                    const digits = d.slice(0, selectedCountry.max);
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
              </TouchableOpacity>

            </View>


            {/* Carrier Info / Phone Status / Error Message */}
            <View style={styles.infoRow}>
              {isInvalidCarrier ? (
                <View style={[styles.statusBadge, styles.statusNotFoundBadge]}>
                  <View style={[styles.iconContainer, styles.iconContainerError]}>
                    <HugeiconsIcon icon={Cancel01Icon} size={14} color={isDarkMode ? '#FF6B6B' : '#B71C1C'} />
                  </View>
                  <Text style={styles.statusNotFoundText}>Unsupported or invalid provider prefix</Text>
                </View>
              ) : phoneStatus === 'checking' ? (
                <View style={[styles.statusBadge, styles.statusCheckingBadge]}>
                  <ActivityIndicator size="small" color={theme.textSecondary} style={{ marginRight: 8 }} />
                  <Text style={styles.statusCheckingText}>Verifying number...</Text>
                </View>
              ) : phoneStatus === 'exists' ? (
                <View style={[styles.statusBadge, isLogin ? styles.statusFoundBadge : styles.statusNotFoundBadge]}>
                  <View style={[styles.iconContainer, isLogin ? styles.iconContainerSuccess : styles.iconContainerError]}>
                    <HugeiconsIcon icon={isLogin ? Tick01Icon : Cancel01Icon} size={14} color={isLogin ? (isDarkMode ? '#4ECDC4' : '#007A7A') : (isDarkMode ? '#FF6B6B' : '#B71C1C')} />
                  </View>
                  <Text style={isLogin ? styles.statusFoundText : styles.statusNotFoundText}>
                    {isLogin ? 'Account found — ready to login' : 'Number already registered'}
                  </Text>
                </View>
              ) : phoneStatus === 'not_found' ? (
                <View style={[styles.statusBadge, !isLogin ? styles.statusFoundBadge : styles.statusNotFoundBadge]}>
                  <View style={[styles.iconContainer, !isLogin ? styles.iconContainerSuccess : styles.iconContainerError]}>
                    <HugeiconsIcon icon={!isLogin ? Tick01Icon : Cancel01Icon} size={14} color={!isLogin ? (isDarkMode ? '#4ECDC4' : '#007A7A') : (isDarkMode ? '#FF6B6B' : '#B71C1C')} />
                  </View>
                  <Text style={!isLogin ? styles.statusFoundText : styles.statusNotFoundText}>
                    {isLogin ? 'Number not registered' : 'Number available — ready to signup'}
                  </Text>
                </View>
              ) : phoneStatus === 'error' ? (
                <View style={[styles.statusBadge, styles.statusErrorBadge]}>
                  <View style={[styles.iconContainer, styles.iconContainerWarning]}>
                    <HugeiconsIcon icon={Alert01Icon} size={14} color="#FFB347" />
                  </View>
                  <Text style={styles.statusErrorText}>Could not verify — tap Continue to retry</Text>
                </View>
              ) : carrier && !isInvalidCarrier ? (
                <View style={[styles.statusBadge, styles.carrierBadge]}>
                  <View style={styles.carrierDot} />
                  <Text style={styles.carrierText}>Network: {carrier}</Text>
                </View>
              ) : null}
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              style={[
                styles.continueBtn,
                ((rawPhone.replace(/[^\d]/g, "").replace(/^0/, "").length < (selectedCountry.code === "+63" ? 10 : 8)) || isInvalidCarrier || loading || phoneStatus === 'checking' || (selectedCountry.code === "+63" && dbCarriers === null)
                  || (isLogin && phoneStatus === 'not_found')
                  || (!isLogin && phoneStatus === 'exists')
                ) && { opacity: 0.5 },
              ]}
              onPress={handleContinue}
              disabled={
                (rawPhone.replace(/[^\d]/g, "").replace(/^0/, "").length < (selectedCountry.code === "+63" ? 10 : 8))
                || isInvalidCarrier || loading || phoneStatus === 'checking'
                || (selectedCountry.code === "+63" && dbCarriers === null)
                || (isLogin && phoneStatus === 'not_found')
                || (!isLogin && phoneStatus === 'exists')
              }
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
    floatingLabel: {
      position: "absolute",
      left: 14,
      top: -10,
      fontSize: 12,
      fontWeight: "800",
      color: isDarkMode ? theme.accent : "#333333",
      backgroundColor: theme.background,
      zIndex: 1,
      paddingHorizontal: 6,
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
    infoRow: {
      minHeight: 40,
      marginTop: 12,
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    carrierBadge: {
      backgroundColor: isDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
      borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
    },
    carrierDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.accent,
      marginRight: 8,
    },
    carrierText: {
      color: theme.textSecondary,
      fontSize: 12,
      fontWeight: "700",
    },
    errorText: {
      color: theme.danger || "#FF4D4D",
      fontSize: 12,
      fontWeight: "700",
    },
    phoneRowError: {
      borderColor: theme.danger || "#FF4D4D",
      backgroundColor: theme.isDark ? "rgba(255, 77, 77, 0.05)" : "rgba(255, 77, 77, 0.02)",
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 14,
      alignSelf: 'flex-start',
      borderWidth: 1,
    },
    iconContainer: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    iconContainerSuccess: {
      backgroundColor: isDarkMode ? 'rgba(78, 205, 196, 0.15)' : 'rgba(0, 139, 139, 0.1)',
    },
    iconContainerError: {
      backgroundColor: isDarkMode ? 'rgba(255, 107, 107, 0.15)' : 'rgba(211, 47, 47, 0.1)',
    },
    iconContainerWarning: {
      backgroundColor: 'rgba(255, 179, 71, 0.15)',
    },
    statusCheckingBadge: {
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.01)',
      borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
    },
    statusCheckingText: {
      color: theme.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    statusFoundBadge: {
      backgroundColor: isDarkMode ? 'rgba(78, 205, 196, 0.06)' : 'rgba(0, 139, 139, 0.04)',
      borderColor: isDarkMode ? 'rgba(78, 205, 196, 0.2)' : 'rgba(0, 139, 139, 0.12)',
    },
    statusFoundText: {
      color: isDarkMode ? '#4ECDC4' : '#007A7A',
      fontSize: 13,
      fontWeight: '700',
    },
    statusNotFoundBadge: {
      backgroundColor: isDarkMode ? 'rgba(255, 107, 107, 0.06)' : 'rgba(211, 47, 47, 0.04)',
      borderColor: isDarkMode ? 'rgba(255, 107, 107, 0.2)' : 'rgba(211, 47, 47, 0.12)',
    },
    statusNotFoundText: {
      color: isDarkMode ? '#FF6B6B' : '#B71C1C',
      fontSize: 13,
      fontWeight: '700',
    },
    statusErrorBadge: {
      backgroundColor: 'rgba(255, 179, 71, 0.06)',
      borderColor: 'rgba(255, 179, 71, 0.2)',
    },
    statusErrorText: {
      color: '#FFB347',
      fontSize: 13,
      fontWeight: '700',
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
