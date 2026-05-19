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
import CEraLogo from "../../components/CEraLogo";

export default function OTPScreen({ navigation, route }) {
  const { phone, isLogin, role } = route.params || {};
  const { theme, isDarkMode } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDarkMode), [theme, isDarkMode]);

  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [timer, setTimer] = useState(60);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef(null);

  useEffect(() => {
     const t = setTimeout(() => inputRef.current?.focus(), 500);
     return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (otp.length === 6 && !verifying) {
      verifyOtp(otp);
    }
  }, [otp]);

  // Countdown Timer Effect
  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const verifyOtp = async (code) => {
    try {
      setVerifying(true);
      setErrorMsg("");
      const { data, error } = await supabase.auth.verifyOtp({
        phone, token: code, type: "sms",
      });
      if (error) throw error;

      const accessToken = data?.session?.access_token;
      if (isLogin) {
         navigation.reset({ index: 0, routes: [{ name: "AuthGate" }] });
      } else {
         navigation.reset({ index: 0, routes: [{ name: "PersonalInfo", params: { role, phone } }] });
      }
    } catch (e) {
      setErrorMsg(e.message || "Invalid OTP");
      triggerShake();
      setOtp("");
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0 || resending) return;
    try {
      setResending(true);
      setErrorMsg("");
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      setTimer(60);
      setOtp("");
      Alert.alert("Success", "A new code has been sent to your phone.");
    } catch (e) {
      setErrorMsg(e.message || "Failed to resend code");
    } finally {
      setResending(false);
    }
  };

  const renderOtpBoxes = () => {
    const boxes = [];
    for (let i = 0; i < 6; i++) {
      const filled = i < otp.length;
      const isActive = i === otp.length && otp.length < 6;
      boxes.push(
        <Animated.View key={i} style={[styles.otpBox, filled && styles.otpBoxFilled, isActive && styles.otpBoxActive, { transform: [{ translateX: shakeAnim }] }]}>
          <Text style={[styles.otpDigit, filled && styles.otpDigitFilled]}>
            {filled ? otp[i] : ""}
          </Text>
          {isActive && <View style={styles.cursor} />}
        </Animated.View>
      );
    }
    return boxes;
  };

  return (
    <AuthBackground onBack={navigation?.canGoBack() ? () => navigation.goBack() : null}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={[styles.container, { marginTop: Platform.OS === 'ios' ? 120 : 100 }]}>
            <Text style={styles.title}>Verify OTP</Text>
            <Text style={styles.subtitle}>Enter the 6-digit code sent to {phone}</Text>
            
            <TouchableOpacity activeOpacity={1} onPress={() => inputRef.current?.focus()} style={styles.otpRow}>
              {renderOtpBoxes()}
            </TouchableOpacity>

            <TextInput
              ref={inputRef}
              value={otp}
              onChangeText={(t) => setOtp(t.replace(/[^\d]/g, "").slice(0, 6))}
              keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
              inputMode="numeric"
              maxLength={6}
              autoCorrect={false}
              autoComplete="off"
              showSoftInputOnFocus
              caretHidden
              style={styles.hiddenInput}
            />

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
            {verifying && <ActivityIndicator color={theme.accent} style={{ marginTop: 20 }} />}

            <View style={styles.resendSection}>
              <Text style={styles.resendLabel}>Didn't receive the code?</Text>
              <TouchableOpacity 
                onPress={handleResend} 
                disabled={timer > 0 || resending}
                style={[styles.resendBtn, (timer > 0 || resending) && styles.resendBtnDisabled]}
              >
                 {resending ? (
                   <ActivityIndicator size="small" color={theme.accent} />
                 ) : (
                   <Text style={[styles.resendBtnText, timer > 0 && { color: theme.textSecondary }]}>
                     {timer > 0 ? `Resend in ${timer}s` : "Resend Now"}
                   </Text>
                 )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthBackground>
  );
}

const createStyles = (theme, isDarkMode) => StyleSheet.create({
  scrollContent: { flexGrow: 1 },
  container: { flex: 1, paddingHorizontal: 0 },
  title: { fontSize: 32, fontWeight: "900", color: theme.text, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: theme.textSecondary, marginBottom: 40, textAlign: 'center' },
  otpRow: { flexDirection: "row", justifyContent: "center", gap: 10, marginBottom: 24 },
  otpBox: { width: 44, height: 56, borderRadius: 12, borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.card, alignItems: "center", justifyContent: "center" },
  otpBoxFilled: { borderColor: theme.accent },
  otpBoxActive: { borderColor: theme.accent, borderWidth: 2.5 },
  otpDigit: { fontSize: 22, fontWeight: "800", color: theme.text },
  otpDigitFilled: { color: theme.text },
  cursor: { position: "absolute", bottom: 12, width: 16, height: 2, backgroundColor: theme.accent },
  hiddenInput: { position: "absolute", width: 1, height: 1, opacity: 0.01, top: 0, left: 0 },
  errorText: { color: theme.danger || "#ff4444", marginTop: 20, fontWeight: "600", textAlign: 'center' },
  resendSection: { marginTop: 40, alignItems: "center" },
  resendLabel: { fontSize: 14, color: theme.textSecondary, marginBottom: 12 },
  resendBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: theme.border },
  resendBtnDisabled: { opacity: 0.7, borderColor: "transparent" },
  resendBtnText: { fontSize: 16, fontWeight: "800", color: theme.accent }
});
