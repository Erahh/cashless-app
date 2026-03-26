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
import { ArrowLeft01Icon, Cancel01Icon, Tick01Icon, Alert01Icon, Search01Icon, UserIcon, Bus01Icon } from "@hugeicons/core-free-icons";
import CEraLogo from "../../components/CEraLogo";

const COUNTRY_CODES = [
  { flag: "🇵🇭", code: "+63", name: "Philippines", mask: "912 3456 789", max: 10 },
  { flag: "🇺🇸", code: "+1", name: "United States", mask: "201 555 0123", max: 10 },
  { flag: "🇬🇧", code: "+44", name: "United Kingdom", mask: "7123 4567 89", max: 10 },
  { flag: "🇸🇬", code: "+65", name: "Singapore", mask: "8123 4567", max: 8 },
  { flag: "🇦🇪", code: "+971", name: "UAE", mask: "50 123 4567", max: 9 },
  { flag: "🇯🇵", code: "+81", name: "Japan", mask: "90 1234 5678", max: 10 },
];

function buildE164(rawDigits) {
  let d = (rawDigits || "").replace(/[^\d]/g, "");
  if (d.startsWith("0")) d = d.slice(1);
  return `+63${d}`;
}

export default function PhoneScreen({ navigation, route }) {
  const { role: passedRole, mode: passedMode } = route.params || {};
  const [isLogin, setIsLogin] = useState(passedMode === "login");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [showPicker, setShowPicker] = useState(false);
  const [rawPhone, setRawPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [dbCarriers, setDbCarriers] = useState(null);
  const [phoneStatus, setPhoneStatus] = useState(null); // { exists: bool, is_operator: bool, is_admin: bool, loading: bool }
  const { theme, isDarkMode } = useTheme();
  const phoneInputRef = useRef(null);

  // Debounced Phone Check
  useEffect(() => {
    const clean = rawPhone.replace(/[^\d]/g, "");
    if (clean.length === 10) {
      const timer = setTimeout(() => {
        checkPhoneStatus(clean);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setPhoneStatus(null);
    }
  }, [rawPhone]);

  const checkPhoneStatus = async (num) => {
    setPhoneStatus({ loading: true });
    try {
      const full = buildE164(num);
      const resp = await fetch(`${API_BASE_URL}/auth/check-phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: full })
      });
      const json = await resp.json();
      if (json.ok) {
        setPhoneStatus({
          exists: json.exists,
          is_operator: json.is_operator,
          is_admin: json.is_admin,
          loading: false
        });
      } else {
        setPhoneStatus(null);
      }
    } catch (e) {
      console.warn("Check phone error", e.message);
      setPhoneStatus(null);
    }
  };

  useEffect(() => {
    const fetchCarriers = async () => {
      try {
        const resp = await fetch(`${API_BASE_URL}/auth/supported-carriers`);
        const json = await resp.json();
        if (json.ok && json.carriers?.length) {
          const map = {};
          json.carriers.forEach(c => { map[c.prefix] = c.carrier_name; });
          setDbCarriers(map);
        }
      } catch (err) {
        console.warn("Could not fetch carriers", err.message);
      }
    };
    fetchCarriers();
  }, []);

  const styles = useMemo(() => createStyles(theme, isDarkMode), [theme, isDarkMode]);

  const handleNext = async () => {
    try {
      const clean = rawPhone.replace(/[^\d]/g, "");
      if (clean.length < 10) return Alert.alert("Invalid Phone", "Please enter a valid 10-digit number.");

      const fullPhone = buildE164(clean);

      // 1. Ensure we have the phone status
      let currentStatus = phoneStatus;
      if (!currentStatus || currentStatus.loading) {
        setLoading(true);
        const resp = await fetch(`${API_BASE_URL}/auth/check-phone`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: fullPhone })
        });
        const json = await resp.json();
        if (json.ok) currentStatus = json;
        setLoading(false);
      }

      // 2. Validate currentStatus exists
      if (currentStatus) {
         console.log("[DEBUG] Role check:", { passedRole, consumes: currentStatus });

         // A. REGISTRATION MODE CHECK: Block if already exists
         if (!isLogin && currentStatus.exists) {
            setLoading(false);
            Alert.alert(
              "Account Exists",
              "This phone number is already registered. Would you like to log in instead?",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Log In", onPress: () => setIsLogin(true) }
              ]
            );
            return;
         }

         // B. LOGIN MODE CHECK: Block if doesn't exist
         if (isLogin && !currentStatus.exists) {
            setLoading(false);
            Alert.alert(
              "Number Not Found",
              "This phone number is not registered. Would you like to create a new account?",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Register", onPress: () => setIsLogin(false) }
              ]
            );
            return;
         }

         // C. ROLE RESTRICTION CHECK (Login Only)
         if (isLogin) {
           const isAdmin = !!currentStatus.is_admin;
           const isOperator = !!currentStatus.is_operator;
           const targetRole = passedRole || "commuter"; // Default if missing

           console.log(`[DEBUG] Login role validation: Target=${targetRole}, isOp=${isOperator}, isAdmin=${isAdmin}`);

           if (targetRole === "operator") {
             if (!isOperator && !isAdmin) {
                setLoading(false);
                Alert.alert("Access Restricted", "This account is not registered as an Operator. Please use the Commuter login.");
                return;
             }
           } else {
             // Commuter portal (or default)
             if (isOperator && !isAdmin) {
                setLoading(false);
                Alert.alert("Operator Account", "This account is registered as an Operator. Please use the Operator login portal.");
                return;
             }
           }
         }
      }

      setLoading(true);

      const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
      if (error) {
        setLoading(false);
        return Alert.alert("Verification Error", error.message);
      }

      navigation.navigate("OTPScreen", {
        phone: fullPhone,
        isLogin,
        role: passedRole
      });
    } catch (e) {
      Alert.alert("Error", e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground onBack={navigation?.canGoBack() ? () => navigation.goBack() : null}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={[styles.container, { marginTop: Platform.OS === 'ios' ? 120 : 100 }]}>
            <Text style={styles.title}>
              {isLogin ? "Welcome Back!" : "Create Account"}
            </Text>
            <Text style={styles.subtitle}>
              Enter your phone number to continue
            </Text>

            <View style={styles.inputSection}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.phoneInputRow}>
                <TouchableOpacity style={styles.countryTrigger} onPress={() => setShowPicker(true)}>
                  <Text style={styles.flagText}>{selectedCountry.flag}</Text>
                  <Text style={styles.codeText}>{selectedCountry.code}</Text>
                </TouchableOpacity>
                <TextInput
                  ref={phoneInputRef}
                  style={styles.input}
                  placeholder="912 345 6789"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="phone-pad"
                  value={rawPhone}
                  onChangeText={setRawPhone}
                   maxLength={10}
                />
                <View style={styles.indicatorWrap}>
                  {phoneStatus?.loading ? (
                    <ActivityIndicator size="small" color={theme.accent} />
                  ) : phoneStatus?.exists ? (
                    <HugeiconsIcon icon={Tick01Icon} size={20} color={theme.success} />
                  ) : rawPhone.length >= 10 ? (
                    <HugeiconsIcon icon={Alert01Icon} size={20} color={theme.textMuted} />
                  ) : null}
                </View>
              </View>
              {phoneStatus && !phoneStatus.loading && (
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, marginLeft: 4 }}>
                   <HugeiconsIcon 
                      icon={phoneStatus.is_operator || phoneStatus.is_admin ? Bus01Icon : UserIcon} 
                      size={16} 
                      color={(passedRole === "operator" && !phoneStatus.is_operator && !phoneStatus.is_admin && isLogin) || 
                             (passedRole === "commuter" && phoneStatus.is_operator && isLogin) 
                             ? "#ff4444" 
                             : phoneStatus.exists ? theme.success : theme.textSecondary } 
                   />
                  <Text style={[
                    styles.statusText, 
                    { 
                      marginTop: 0,
                      marginLeft: 6,
                      color: (passedRole === "operator" && !phoneStatus.is_operator && !phoneStatus.is_admin && isLogin) || 
                             (passedRole === "commuter" && phoneStatus.is_operator && isLogin) 
                             ? "#ff4444" 
                             : phoneStatus.exists ? theme.success : theme.textSecondary 
                    }
                  ]}>
                    {phoneStatus.exists 
                      ? (phoneStatus.is_operator || phoneStatus.is_admin ? "Operator Account" : "Commuter Account") 
                      + (isLogin && ((passedRole === "operator" && !phoneStatus.is_operator && !phoneStatus.is_admin) || (passedRole === "commuter" && phoneStatus.is_operator)) ? " (Restricted)" : "")
                      : "Unregistered Number"}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.nextBtn, (loading || rawPhone.length < 10) && styles.btnDisabled]}
              onPress={handleNext}
              disabled={loading || rawPhone.length < 10}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.nextBtnText}>Continue</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showPicker} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <HugeiconsIcon icon={Cancel01Icon} size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={COUNTRY_CODES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.countryItem}
                  onPress={() => { setSelectedCountry(item); setShowPicker(false); }}
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

const createStyles = (theme, isDarkMode) => StyleSheet.create({
  scrollContent: { flexGrow: 1 },
  container: { flex: 1, paddingHorizontal: 0 },
  title: { fontSize: 32, fontWeight: "900", color: theme.text, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: theme.textSecondary, marginBottom: 32, textAlign: 'center' },
  inputSection: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: "700", color: theme.textSecondary, marginBottom: 8, marginLeft: 4 },
  phoneInputRow: {
    flexDirection: "row",
    height: 60,
    backgroundColor: theme.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: "hidden"
  },
  countryTrigger: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderRightWidth: 1,
    borderRightColor: theme.border,
    backgroundColor: isDarkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)"
  },
  flagText: { fontSize: 20, marginRight: 8 },
  codeText: { fontSize: 16, fontWeight: "700", color: theme.text },
  input: { flex: 1, paddingHorizontal: 16, fontSize: 18, fontWeight: "600", color: theme.text },
  nextBtn: {
    height: 60,
    backgroundColor: isDarkMode ? theme.accent : "#0f172a",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  btnDisabled: { opacity: 0.5 },
  nextBtnText: { color: isDarkMode ? "#000" : "#fff", fontSize: 18, fontWeight: "800" },
  indicatorWrap: {
    justifyContent: "center",
    paddingRight: 16,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 8,
    marginLeft: 4,
  },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: "70%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: theme.text },
  countryItem: { flexDirection: "row", alignItems: "center", paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.border },
  countryFlag: { fontSize: 24, marginRight: 16 },
  countryName: { flex: 1, fontSize: 16, color: theme.text, fontWeight: "600" },
  countryCode: { fontSize: 16, color: theme.textSecondary, fontWeight: "700" }
});
