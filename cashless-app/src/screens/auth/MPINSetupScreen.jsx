import React, { useState, useContext, useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../api/supabase";
import { API_BASE_URL } from "../../config/api";
import * as Crypto from "expo-crypto";
import { setMpinOnRender } from "../../api/apiHelper";
import { setMpin as setMpinLocal } from "../../api/mpinLocal";
import { AppLockContext } from "../../context/AppLockContext";
import { useTheme } from "../../context/ThemeContext";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { LockIcon, ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import AuthBackground from "../../components/AuthBackground";
import logger from '../../utils/logger';

const REGISTRATION_DRAFT_KEY = "registration_draft_v1";

export default function MPINSetupScreen({ navigation, route }) {
  const { setLocked } = useContext(AppLockContext);
  const { theme, isDarkMode } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDarkMode), [theme, isDarkMode]);

  const [mpin, setMpin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [agree, setAgree] = useState(false);
  const [showMpin, setShowMpin] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  function weakPin(pin) {
    const bad = new Set(["000000", "111111", "123456", "654321"]);
    return bad.has(pin) || /^(\d)\1{5}$/.test(pin);
  }

  // Pin strength indicator
  const pinStrength = useMemo(() => {
    if (mpin.length === 0) return null;
    if (mpin.length < 6) return { label: "Too short", color: theme.textMuted };
    if (weakPin(mpin)) return { label: "Weak — choose a stronger PIN", color: theme.danger };
    return { label: "Strong PIN ✓", color: theme.success };
  }, [mpin, theme]);

  const registrationData = route.params?.registrationData;

  async function onConfirm() {
    if (!agree) return Alert.alert("Terms", "Please agree to the Terms and Conditions.");
    if (!/^\d{6}$/.test(mpin)) return Alert.alert("MPIN", "MPIN must be exactly 6 digits.");
    if (mpin !== confirm) return Alert.alert("MPIN", "MPIN does not match.");
    if (weakPin(mpin)) return Alert.alert("MPIN", "Choose a stronger MPIN (avoid common patterns).");

    // Signup flow: Finalize Registration
    if (registrationData) {
      setLoading(true);
      try {
        const { data: authData, error: authErr } = await supabase.auth.getSession();
        if (authErr) throw authErr;
        const accessToken = authData?.session?.access_token;
        if (!accessToken) throw new Error("No session established.");

        // Call backend to finalize registration
        const finalData = { ...registrationData, mpin };
        const resp = await fetch(`${API_BASE_URL}/auth/finalize-registration`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(finalData),
        });

        const json = await resp.json();
        if (!resp.ok) throw new Error(json.error || "Failed to finalize registration");

        // Register device token for push notifications
        try {
          const deviceRes = await fetch(`${API_BASE_URL}/me/register-device`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          });
          const deviceJson = await deviceRes.json();
          if (deviceJson.ok && deviceJson.device_token) {
            await AsyncStorage.setItem("device_token", deviceJson.device_token);
          }
        } catch (deviceErr) {
          console.warn("Device registration failed:", deviceErr.message);
        }

        // Complete the process
        await setMpinOnRender(mpin, confirm);
        await setMpinLocal(mpin);
        await AsyncStorage.removeItem(REGISTRATION_DRAFT_KEY).catch(() => {});
        setLocked(false);
        navigation.reset({ index: 0, routes: [{ name: "AuthGate" }] });
      } catch (err) {
        logger.error("Signup finalize error:", err);
        Alert.alert("Registration Error", err.message || "Failed to complete signup.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Default flow (e.g. from profile or other)
    setLoading(true);
    try {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;

      const userId = authData?.user?.id;
      if (!userId) throw new Error("Not logged in");

      await setMpinOnRender(mpin, confirm);
      await setMpinLocal(mpin);
      setLocked(false);
      navigation.reset({ index: 0, routes: [{ name: "RoleGate" }] });
    } catch (e) {
      logger.error("Set MPIN error:", e);
      Alert.alert("Error", e?.message || "Failed to set MPIN");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthBackground onBack={() => navigation.goBack()} showLogo={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Lock Icon */}
          <View style={styles.iconWrapper}>
            <View style={styles.iconCircle}>
              <HugeiconsIcon icon={LockIcon} size={32} color={isDarkMode ? theme.accent : theme.primary} />
            </View>
          </View>

          <Text style={styles.title}>Set Your MPIN</Text>
          <Text style={styles.subtitle}>
            Create a 6-digit security PIN. This is required every time you open the app.
          </Text>

          {/* MPIN Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Enter 6-digit MPIN</Text>
              <View style={styles.inputRow}>
                <TextInput
                  value={mpin}
                  onChangeText={(t) => setMpin(t.replace(/[^\d]/g, ""))}
                  placeholder="• • • • • •"
                  placeholderTextColor={theme.textMuted}
                  style={styles.input}
                  keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
                  inputMode="numeric"
                  secureTextEntry={!showMpin}
                  autoCorrect={false}
                  autoComplete="off"
                  maxLength={6}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowMpin(!showMpin)}
                  activeOpacity={0.7}
                >
                  <HugeiconsIcon
                    icon={showMpin ? ViewOffIcon : ViewIcon}
                    size={20}
                    color={theme.textMuted}
                  />
                </TouchableOpacity>
              </View>
            {pinStrength && (
              <Text style={[styles.strengthText, { color: pinStrength.color }]}>
                {pinStrength.label}
              </Text>
            )}
          </View>

          {/* Confirm MPIN */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm MPIN</Text>
            <View style={styles.inputRow}>
              <TextInput
                value={confirm}
                onChangeText={(t) => setConfirm(t.replace(/[^\d]/g, ""))}
                placeholder="• • • • • •"
                placeholderTextColor={theme.textMuted}
                style={styles.input}
                keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
                inputMode="numeric"
                secureTextEntry={!showConfirm}
                autoCorrect={false}
                autoComplete="off"
                maxLength={6}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowConfirm(!showConfirm)}
                activeOpacity={0.7}
              >
                <HugeiconsIcon
                  icon={showConfirm ? ViewOffIcon : ViewIcon}
                  size={20}
                  color={theme.textMuted}
                />
              </TouchableOpacity>
            </View>
            {confirm.length === 6 && mpin.length === 6 && confirm !== mpin && (
              <Text style={[styles.strengthText, { color: theme.danger }]}>
                PINs do not match
              </Text>
            )}
          </View>

          {/* Terms and Conditions */}
          <TouchableOpacity
            onPress={() => setAgree(!agree)}
            style={styles.checkboxRow}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, agree && styles.checkboxChecked]}>
              {agree && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              I agree to the <Text style={styles.termsLink}>Terms and Conditions</Text>
            </Text>
          </TouchableOpacity>

          {/* Confirm Button */}
          <TouchableOpacity
            disabled={loading || !agree || mpin.length < 6 || confirm.length < 6}
            onPress={onConfirm}
            style={[
              styles.btn,
              (loading || !agree || mpin.length < 6 || confirm.length < 6) && { opacity: 0.5 },
            ]}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color={isDarkMode ? "#0B0E14" : "#FFFFFF"} />
            ) : (
              <Text style={styles.btnText}>Confirm & Continue</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthBackground>
  );
}

const createStyles = (theme, isDarkMode) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    scrollContent: {
      paddingHorizontal: 24,
      paddingBottom: 28,
      paddingTop: 72,
    },
    iconWrapper: {
      alignItems: "center",
      marginBottom: 16,
    },
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: isDarkMode
        ? "rgba(247, 227, 83, 0.08)"
        : "rgba(26, 26, 26, 0.05)",
      borderWidth: 1.5,
      borderColor: isDarkMode
        ? "rgba(247, 227, 83, 0.2)"
        : "rgba(26, 26, 26, 0.1)",
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      color: theme.text,
      fontSize: 28,
      fontWeight: "900",
      marginBottom: 8,
      textAlign: "center",
      letterSpacing: -0.5,
    },
    subtitle: {
      color: theme.textSecondary,
      fontSize: 14,
      lineHeight: 21,
      textAlign: "center",
      marginBottom: 28,
      paddingHorizontal: 12,
    },
    inputGroup: {
      marginBottom: 20,
    },
    inputLabel: {
      color: theme.textSecondary,
      fontSize: 13,
      fontWeight: "700",
      marginBottom: 8,
      letterSpacing: 0.3,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: 16,
      backgroundColor: theme.card,
      paddingHorizontal: 16,
      height: 56,
    },
    input: {
      flex: 1,
      color: theme.text,
      fontSize: 22,
      fontWeight: "700",
      letterSpacing: 8,
      textAlign: "center",
      paddingVertical: 0,
    },
    eyeBtn: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    strengthText: {
      fontSize: 12,
      fontWeight: "600",
      marginTop: 6,
      marginLeft: 4,
    },
    checkboxRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 8,
      marginBottom: 24,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderWidth: 2,
      borderColor: theme.border,
      borderRadius: 6,
      marginRight: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
    },
    checkboxChecked: {
      backgroundColor: theme.accent,
      borderColor: theme.accent,
    },
    checkmark: {
      color: "#0B0E14",
      fontSize: 13,
      fontWeight: "900",
    },
    checkboxLabel: {
      color: theme.textSecondary,
      fontSize: 14,
      flex: 1,
    },
    termsLink: {
      color: theme.text,
      fontWeight: "700",
    },
    btn: {
      height: 56,
      borderRadius: 16,
      backgroundColor: isDarkMode ? theme.accent : theme.primary,
      alignItems: "center",
      justifyContent: "center",
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
  });
