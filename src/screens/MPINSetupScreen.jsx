import React, { useState } from "react";
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
import * as Crypto from "expo-crypto";
import { setMpinOnRender } from "../api/apiHelper";
import { setMpin as setMpinLocal } from "../api/mpinLocal";

export default function MPINSetupScreen({ navigation }) {
  const [mpin, setMpin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [agree, setAgree] = useState(false);

  function weakPin(pin) {
    const bad = new Set(["000000", "111111", "123456", "654321"]);
    return bad.has(pin) || /^(\d)\1{5}$/.test(pin);
  }

  async function onConfirm() {
    if (!agree) return Alert.alert("Terms", "Please agree to the Terms and Conditions.");
    if (!/^\d{6}$/.test(mpin)) return Alert.alert("MPIN", "MPIN must be exactly 6 digits.");
    if (mpin !== confirm) return Alert.alert("MPIN", "MPIN does not match.");
    if (weakPin(mpin)) return Alert.alert("MPIN", "Choose a stronger MPIN (avoid common patterns).");

    setLoading(true);
    try {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;

      const userId = authData?.user?.id;
      if (!userId) throw new Error("Not logged in");

      // ✅ Call backend to set MPIN (backend handles all DB operations)
      await setMpinOnRender(mpin, confirm);

      // ✅ Local: enables MPINUnlock flow on app reopen
      await setMpinLocal(mpin);

      // Success - navigate to home screen
      navigation.reset({ index: 0, routes: [{ name: "Home" }] });
    } catch (e) {
      console.error("Set MPIN error:", e);
      Alert.alert("Error", e?.message || "Failed to set MPIN");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.title}>Set MPIN</Text>
        <Text style={styles.subtitle}>
          Your MPIN secures your account and is required when reopening the app. Never share your MPIN.
        </Text>

        <Text style={styles.label}>Enter a 6-digit MPIN</Text>
        <TextInput
          value={mpin}
          onChangeText={(t) => setMpin(t.replace(/[^\d]/g, ""))}
          placeholder="Enter MPIN"
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={styles.input}
          keyboardType="numeric"
          secureTextEntry
          maxLength={6}
        />

        <Text style={styles.label}>Confirm MPIN</Text>
        <TextInput
          value={confirm}
          onChangeText={(t) => setConfirm(t.replace(/[^\d]/g, ""))}
          placeholder="Confirm MPIN"
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={styles.input}
          keyboardType="numeric"
          secureTextEntry
          maxLength={6}
        />

        <TouchableOpacity
          onPress={() => setAgree(!agree)}
          style={styles.checkboxContainer}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, agree && styles.checkboxChecked]}>
            {agree && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>I agree to the Terms and Conditions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          disabled={loading}
          onPress={onConfirm}
          style={[styles.btn, loading && { opacity: 0.6 }]}
          activeOpacity={0.9}
        >
          {loading ? <ActivityIndicator color="#0B0E14" /> : <Text style={styles.btnText}>Confirm</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0E14" },
  content: { padding: 18, paddingTop: 28 },
  title: { color: "#fff", fontSize: 26, fontWeight: "900", marginBottom: 8 },
  subtitle: { color: "rgba(255,255,255,0.65)", marginBottom: 24, lineHeight: 20 },
  label: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    letterSpacing: 6,
    marginBottom: 4,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: 4,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  checkboxChecked: {
    backgroundColor: "#FFD36A",
    borderColor: "#FFD36A",
  },
  checkmark: {
    color: "#0B0E14",
    fontSize: 12,
    fontWeight: "900",
  },
  checkboxLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
  },
  btn: {
    marginTop: 20,
    backgroundColor: "#FFD36A",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  btnText: { color: "#0B0E14", fontWeight: "900", fontSize: 16 },
});
