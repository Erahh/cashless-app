import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../api/supabase";
import { API_BASE_URL } from "../../config/api";
import AuthBackground from "../../components/AuthBackground";
import { useTheme } from "../../context/ThemeContext";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";

// ✅ Helper to normalize PH phone to E.164 format
function normalizePH(phone) {
  const p = (phone || "").trim();
  if (!p) return "";
  if (p.startsWith("+")) return "+" + p.slice(1).replace(/[^\d]/g, "");
  if (p.startsWith("09")) return "+63" + p.slice(1);
  if (p.startsWith("9")) return "+63" + p;
  return p;
}

export default function OTPScreen({ navigation, route }) {
  const rawPhone = route?.params?.phone;
  const phone = normalizePH(rawPhone);
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef(null);

  // Auto-submit when 6 digits are entered
  useEffect(() => {
    if (otp.length === 6 && !verifying) {
      verifyOtp(otp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const verifyOtp = async (codeToVerify) => {
    try {
      if (!phone) return Alert.alert("Error", "Missing phone number.");

      setVerifying(true);
      setErrorMsg("");
      Keyboard.dismiss();

      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: codeToVerify,
        type: "sms",
      });
      if (error) throw error;

      // Register device
      (async () => {
        try {
          const { data: session } = await supabase.auth.getSession();
          const accessToken = session?.session?.access_token;
          if (accessToken) {
            const res = await fetch(`${API_BASE_URL}/me/register-device`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
            });
            const json = await res.json();
            if (json.ok && json.device_token) {
              await AsyncStorage.setItem("device_token", json.device_token);
            }
          }
        } catch (deviceErr) {
          console.warn("Device registration failed:", deviceErr.message);
        }
      })();

      navigation.reset({ index: 0, routes: [{ name: "AuthGate" }] });
    } catch (e) {
      setErrorMsg("Invalid OTP. Please try again.");
      setOtp("");
      triggerShake();
      inputRef.current?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    try {
      if (!phone) return Alert.alert("Error", "Missing phone number.");
      setResending(true);
      setErrorMsg("");
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      Alert.alert("Success", "OTP resent successfully!");
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  const maskedPhone = phone
    ? phone.slice(0, -3).replace(/\d/g, "•") + phone.slice(-3)
    : "";

  // Render OTP boxes
  const renderOtpBoxes = () => {
    const boxes = [];
    for (let i = 0; i < 6; i++) {
      const filled = i < otp.length;
      // isActive = current cursor position (only when not all 6 filled)
      const isActive = i === otp.length && otp.length < 6;
      boxes.push(
        <Animated.View
          key={i}
          style={[
            styles.otpBox,
            filled && styles.otpBoxFilled,
            isActive && styles.otpBoxActive,
            errorMsg && styles.otpBoxError,
            { transform: [{ translateX: shakeAnim }] },
          ]}
        >
          <Text style={[styles.otpDigit, filled && styles.otpDigitFilled]}>
            {filled ? "•" : ""}
          </Text>
          {isActive && !verifying && <View style={styles.cursor} />}
        </Animated.View>
      );
    }
    return boxes;
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
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color={theme.text} />
            </TouchableOpacity>
            <Text style={styles.logo}>ERA</Text>
          </View>

          {/* Main Content */}
          <View style={styles.container}>
            <Text style={styles.title}>Verify OTP</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to{"\n"}
              <Text style={styles.phoneHighlight}>{maskedPhone}</Text>
            </Text>

            {/* OTP Boxes */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => inputRef.current?.focus()}
              style={styles.otpRow}
            >
              {renderOtpBoxes()}
            </TouchableOpacity>

            {/* Hidden input — zero-sized to stay offscreen but focusable */}
            <TextInput
              ref={inputRef}
              value={otp}
              onChangeText={(text) => {
                setErrorMsg("");
                setOtp(text.replace(/[^\d]/g, "").slice(0, 6));
              }}
              editable={!verifying}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              caretHidden
              style={styles.hiddenInput}
            />

            {/* Status */}
            <View style={styles.statusContainer}>
              {verifying ? (
                <View style={styles.loadingWrapper}>
                  <ActivityIndicator color={theme.accent} size="small" />
                  <Text style={[styles.loadingText, { color: theme.accent }]}>Verifying...</Text>
                </View>
              ) : errorMsg ? (
                <Text style={styles.errorText}>{errorMsg}</Text>
              ) : null}
            </View>

            {/* Manual Verify button (shown when 6 digits are entered but not yet verifying) */}
            {otp.length === 6 && !verifying && (
              <TouchableOpacity
                style={styles.verifyBtn}
                onPress={() => verifyOtp(otp)}
                activeOpacity={0.9}
              >
                <Text style={styles.verifyBtnText}>Verify OTP</Text>
              </TouchableOpacity>
            )}

            {/* Resend */}
            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive the code? </Text>
              <TouchableOpacity onPress={resend} disabled={resending || verifying} activeOpacity={0.8}>
                <Text style={[styles.resendLink, (resending || verifying) && { opacity: 0.5 }]}>
                  {resending ? "Sending..." : "Resend OTP"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthBackground>
  );
}

const createStyles = (theme) =>
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
      lineHeight: 24,
      marginBottom: 36,
    },
    phoneHighlight: {
      color: theme.text,
      fontWeight: "700",
    },
    // OTP Boxes
    otpRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 6,
    },
    otpBox: {
      flex: 1,
      maxWidth: 54,
      height: 58,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.card,
      alignItems: "center",
      justifyContent: "center",
    },
    otpBoxFilled: {
      borderColor: theme.accent,
      backgroundColor: theme.isDark
        ? "rgba(247, 227, 83, 0.06)"
        : "rgba(247, 227, 83, 0.1)",
    },
    otpBoxActive: {
      borderColor: theme.accent,
      borderWidth: 2,
    },
    otpBoxError: {
      borderColor: theme.danger,
      backgroundColor: theme.dangerBg,
    },
    otpDigit: {
      color: theme.textMuted,
      fontSize: 24,
      fontWeight: "800",
    },
    otpDigitFilled: {
      color: theme.text,
    },
    cursor: {
      position: "absolute",
      bottom: 12,
      width: 20,
      height: 2,
      backgroundColor: theme.accent,
      borderRadius: 1,
    },
    hiddenInput: {
      width: 0,
      height: 0,
      opacity: 0,
      position: "absolute",
    },
    statusContainer: {
      height: 36,
      marginTop: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingWrapper: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    loadingText: {
      fontSize: 14,
      fontWeight: "600",
    },
    errorText: {
      color: theme.danger,
      fontSize: 14,
      fontWeight: "600",
    },
    resendContainer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: 24,
    },
    resendText: {
      color: theme.textSecondary,
      fontSize: 14,
    },
    resendLink: {
      color: theme.text,
      fontSize: 14,
      fontWeight: "800",
    },
    verifyBtn: {
      height: 52,
      borderRadius: 16,
      backgroundColor: theme.isDark ? theme.accent : theme.primary,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
      marginBottom: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 4,
    },
    verifyBtnText: {
      color: theme.isDark ? "#0B0E14" : "#FFFFFF",
      fontWeight: "900",
      fontSize: 16,
    },
  });
