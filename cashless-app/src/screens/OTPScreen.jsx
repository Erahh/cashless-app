import React, { useState, useEffect, useRef } from "react";
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
  Animated
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../api/supabase";
import { API_BASE_URL } from "../config/api";
import AuthBackground from "../components/AuthBackground";

// ✅ Helper to normalize PH phone to E.164 format
function normalizePH(phone) {
  const p = (phone || "").trim();
  if (!p) return "";
  if (p.startsWith("+")) {
    return "+" + p.slice(1).replace(/[^\d]/g, "");
  }
  if (p.startsWith("09")) return "+63" + p.slice(1);
  if (p.startsWith("9")) return "+63" + p;
  return p;
}

export default function OTPScreen({ navigation, route }) {
  const rawPhone = route?.params?.phone;
  const phone = normalizePH(rawPhone);
  const insets = useSafeAreaInsets();

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

      // Register this device for single-device login enforcement
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
      setOtp(""); // Clear OTP so they can try again fast
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
    ? phone.slice(0, -3).replace(/\d/g, "*") + phone.slice(-3)
    : "";

  return (
    <AuthBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 40 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.container}>

              <View style={styles.header}>
                <Text style={styles.title}>Enter OTP</Text>
                <Text style={styles.subtitle}>
                  We sent a 6-digit code to {maskedPhone}
                </Text>
              </View>

              {/* Animated wrapper for shaking on error */}
              <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                <TextInput
                  ref={inputRef}
                  value={otp}
                  onChangeText={(text) => {
                    setErrorMsg("");
                    setOtp(text.replace(/[^\d]/g, ""));
                  }}
                  editable={!verifying}
                  placeholder="••••••"
                  placeholderTextColor="rgba(255,255,255,0.20)"
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  style={[
                    styles.otpInput,
                    errorMsg ? styles.otpInputError : null,
                    verifying ? { opacity: 0.6 } : null
                  ]}
                />
              </Animated.View>

              {/* Error or Loading State */}
              <View style={styles.statusContainer}>
                {verifying ? (
                  <View style={styles.loadingWrapper}>
                    <ActivityIndicator color="#FFD36A" size="small" />
                    <Text style={styles.loadingText}>Verifying...</Text>
                  </View>
                ) : errorMsg ? (
                  <Text style={styles.errorText}>{errorMsg}</Text>
                ) : (
                  <Text style={styles.spacerText}> </Text>
                )}
              </View>

              {/* Resend OTP */}
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
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "900",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "rgba(255,255,255,0.70)",
    fontSize: 16,
    lineHeight: 24,
  },
  otpInput: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingVertical: 18,
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 16,
    textAlign: "center",
  },
  otpInputError: {
    borderColor: "#FF5252",
    backgroundColor: "rgba(255,82,82,0.1)",
  },
  statusContainer: {
    height: 30,
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadingText: {
    color: "#FFD36A",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  errorText: {
    color: "#FF5252",
    fontSize: 14,
    fontWeight: "600",
  },
  spacerText: {
    fontSize: 14,
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
  },
  resendText: {
    color: "rgba(255,255,255,0.60)",
    fontSize: 15,
  },
  resendLink: {
    color: "#FFD36A",
    fontSize: 15,
    fontWeight: "800",
  },
});
