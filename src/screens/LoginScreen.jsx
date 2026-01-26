import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../api/supabase";

function normalizePHPhone(input) {
  const raw = (input || "").trim().replace(/\s+/g, "");

  if (!raw) return "";

  // already E.164
  if (raw.startsWith("+")) return raw;

  // remove non-digits
  const digits = raw.replace(/[^\d]/g, "");

  // 09xxxxxxxxx -> +63 9xxxxxxxxx
  if (digits.startsWith("09") && digits.length === 11) {
    return "+63" + digits.slice(1);
  }

  // 9xxxxxxxxx -> +63 9xxxxxxxxx
  if (digits.startsWith("9") && digits.length === 10) {
    return "+63" + digits;
  }

  // 63xxxxxxxxxxx -> +63xxxxxxxxxxx
  if (digits.startsWith("63")) {
    return "+" + digits;
  }

  // fallback
  return raw;
}

export default function LoginScreen({ navigation }) {
  const [phoneInput, setPhoneInput] = useState("");
  const [loading, setLoading] = useState(false);

  const phone = useMemo(() => normalizePHPhone(phoneInput), [phoneInput]);

  const sendOtp = async () => {
    try {
      if (!phone) return Alert.alert("Error", "Enter your phone number.");
      // basic PH check (optional)
      if (!/^\+639\d{9}$/.test(phone)) {
        return Alert.alert("Invalid number", "Use 09XXXXXXXXX or +639XXXXXXXXX.");
      }

      setLoading(true);

      const { error } = await supabase.auth.signInWithOtp({
        phone,
        // optional: if you use deep links for magic link flows
        // options: { shouldCreateUser: true }
      });

      if (error) throw error;

      // Go to your OTPScreen UI (better UX than inline step)
      navigation.navigate("OTPScreen", { phone });
    } catch (e) {
      console.error("Send OTP error:", e);
      Alert.alert("Error", e?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.card}>
        <Text style={styles.title}>Login</Text>
        <Text style={styles.subtitle}>Enter your phone number to receive an OTP.</Text>

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          value={phoneInput}
          onChangeText={setPhoneInput}
          placeholder="09XXXXXXXXX or +639XXXXXXXXX"
          placeholderTextColor="rgba(255,255,255,0.35)"
          keyboardType="phone-pad"
          style={styles.input}
        />

        <Text style={styles.preview}>Will send to: {phone || "-"}</Text>

        <TouchableOpacity
          disabled={loading}
          onPress={sendOtp}
          style={[styles.btn, loading && { opacity: 0.6 }]}
          activeOpacity={0.9}
        >
          {loading ? <ActivityIndicator color="#0B0E14" /> : <Text style={styles.btnText}>Send OTP</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0E14", justifyContent: "center" },
  card: { padding: 20 },
  title: { color: "#fff", fontSize: 28, fontWeight: "900", marginBottom: 6 },
  subtitle: { color: "rgba(255,255,255,0.7)", marginBottom: 18 },
  label: { color: "rgba(255,255,255,0.85)", fontWeight: "800", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    color: "#fff",
    fontSize: 16,
  },
  preview: { color: "rgba(255,255,255,0.55)", marginTop: 10 },
  btn: {
    marginTop: 18,
    backgroundColor: "#FFD36A",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  btnText: { color: "#0B0E14", fontWeight: "900", fontSize: 16 },
});
