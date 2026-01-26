import React, { useState } from "react";
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
  Keyboard
} from "react-native";
import { supabase } from "../api/supabase";
import AuthBackground from "../components/AuthBackground";
import { GoldButton, TextLink } from "../components/AuthButtons";

// ✅ Helper to normalize PH phone to E.164 format
function normalizePH(phone) {
  const p = (phone || "").trim();
  if (!p) return "";
  if (p.startsWith("+")) {
    // Clean spaces/dashes from numbers starting with +
    const cleaned = "+" + p.slice(1).replace(/[^\d]/g, "");
    return cleaned;
  }
  if (p.startsWith("09")) return "+63" + p.slice(1); // 09xx -> +639xx
  if (p.startsWith("9")) return "+63" + p; // 9xx -> +639xx
  return p;
}

export default function OTPScreen({ navigation, route }) {
  const rawPhone = route?.params?.phone;
  const phone = normalizePH(rawPhone); // ✅ Normalize to E.164
  const [otp, setOtp] = useState("");
  const [resending, setResending] = useState(false);

  const verify = async () => {
    try {
      if (!phone) return Alert.alert("Error", "Missing phone number.");
      if (!/^\d{6}$/.test(otp)) return Alert.alert("Error", "Please enter 6-digit OTP.");

      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: "sms",
      });
      if (error) throw error;

      // Route to AuthGate (it will decide Commuter/Operator/Admin)
      navigation.reset({ index: 0, routes: [{ name: "AuthGate" }] });
    } catch (e) {
      Alert.alert("Error", e.message || "OTP verification failed");
    }
  };

  // ✅ Resend OTP function
  const resend = async () => {
    try {
      if (!phone) return Alert.alert("Error", "Missing phone number.");

      setResending(true);
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;

      Alert.alert("Success", "OTP resent successfully!");
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  // Mask phone number for display (show last 3 digits)
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
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.container}>
              <Text style={styles.title}>Enter OTP</Text>
              <Text style={styles.subtitle}>
                OTP sent to {maskedPhone}
              </Text>

              {/* OTP Input */}
              <TextInput
                value={otp}
                onChangeText={(text) => setOtp(text.replace(/[^\d]/g, ""))}
                placeholder="••••••"
                placeholderTextColor="rgba(255,255,255,0.30)"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={verify}
                style={styles.otpInput}
              />

              <GoldButton label="Verify" onPress={verify} />

              {/* ✅ Resend OTP Button */}
              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>Didn't receive the code? </Text>
                <TouchableOpacity onPress={resend} disabled={resending} activeOpacity={0.8}>
                  <Text style={[styles.resendLink, resending && { opacity: 0.5 }]}>
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
    justifyContent: "center",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  title: { color: "#fff", fontSize: 28, fontWeight: "900", marginBottom: 8 },
  subtitle: { color: "rgba(255,255,255,0.70)", fontSize: 15, marginBottom: 32 },

  otpInput: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 18,
    paddingVertical: 16,
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 12,
    textAlign: "center",
    marginBottom: 8,
  },

  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    paddingBottom: 20,
  },
  resendText: {
    color: "rgba(255,255,255,0.60)",
    fontSize: 14,
  },
  resendLink: {
    color: "#FFD36A",
    fontSize: 14,
    fontWeight: "900",
  },
});
