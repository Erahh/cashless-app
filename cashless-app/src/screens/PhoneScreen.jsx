import React, { useState } from "react";
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
  Keyboard
} from "react-native";
import { supabase } from "../api/supabase";
import AuthBackground from "../components/AuthBackground";
import { GoldButton } from "../components/AuthButtons";

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

export default function PhoneScreen({ navigation }) {
  const [phone, setPhone] = useState("");

  const sendOtp = async () => {
    try {
      console.log("📱 [OTP] Starting OTP send...");
      console.log("📱 [OTP] Raw phone input:", phone);

      // Build and normalize full number
      const fullPhone = normalizePH(`+63${phone.trim()}`);
      console.log("📱 [OTP] Normalized phone:", fullPhone);

      // Validate: must be exactly 10 digits after +63
      if (!/^\+63\d{10}$/.test(fullPhone)) {
        console.log("❌ [OTP] Validation failed - invalid format");
        return Alert.alert("Invalid Number", "Please enter 10 digits (e.g., 9123456789)");
      }

      console.log("✅ [OTP] Validation passed, calling Supabase...");
      const { data, error } = await supabase.auth.signInWithOtp({ phone: fullPhone });

      if (error) {
        console.log("❌ [OTP] Supabase error:", error);
        throw error;
      }

      console.log("✅ [OTP] Supabase response:", data);
      console.log("✅ [OTP] Navigating to OTP screen...");
      navigation.navigate("OTPScreen", { phone: fullPhone });
    } catch (e) {
      console.log("❌ [OTP] Catch block error:", e);
      Alert.alert("Error", e.message || "Failed to send OTP");
    }
  };

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
              <Text style={styles.title}>Login</Text>
              <Text style={styles.subtitle}>Enter your phone number to receive OTP</Text>

              {/* Split Phone Input */}
              <View style={styles.phoneRow}>
                <View style={styles.prefixBox}>
                  <Text style={styles.prefixText}>+63</Text>
                </View>

                <View style={styles.divider} />

                <TextInput
                  value={phone}
                  onChangeText={(text) => setPhone(text.replace(/[^\d]/g, ""))}
                  placeholder="9123456789"
                  placeholderTextColor="rgba(255,255,255,0.40)"
                  keyboardType="phone-pad"
                  maxLength={10}
                  returnKeyType="done"
                  onSubmitEditing={sendOtp}
                  style={styles.phoneInput}
                />
              </View>

              <GoldButton label="Send OTP" onPress={sendOtp} />
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

  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },

  prefixBox: {
    paddingRight: 10,
  },
  prefixText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },

  divider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.20)",
    marginRight: 10,
  },

  phoneInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    paddingVertical: 2,
  },
});
