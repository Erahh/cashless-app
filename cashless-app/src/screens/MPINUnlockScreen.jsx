import React, { useContext, useEffect, useState } from "react";
import {
  View, Text, TextInput, Alert, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { AppLockContext } from "../context/AppLockContext";
import { supabase } from "../api/supabase";
import * as Crypto from "expo-crypto";
import { verifyMpin } from "../api/mpinLocal";

export default function MPINUnlockScreen({ navigation }) {
  const { setLocked } = useContext(AppLockContext);

  const [mpin, setMpin] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const MAX = 5;

  useEffect(() => {
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const userId = u?.user?.id;
        if (!userId) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("phone")
          .eq("id", userId)
          .maybeSingle();

        if (profile?.phone) setPhone(profile.phone);
      } catch {
        // ignore
      }
    })();
  }, []);

  const handleSwitchNumber = async () => {
    try {
      await supabase.auth.signOut();
      setLocked(false);
      navigation.reset({ index: 0, routes: [{ name: "PhoneScreen" }] });
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to switch account");
    }
  };

  const handleUnlock = async () => {
    if (!/^\d{6}$/.test(mpin)) {
      return Alert.alert("Invalid MPIN", "Please enter your 6-digit MPIN.");
    }

    setLoading(true);
    try {
      // ✅ Fast local check first
      const isCorrectLocal = await verifyMpin(mpin);
      if (isCorrectLocal) {
        setAttempts(0);
        setMpin("");
        setLocked(false);
        return;
      }

      // Fallback: check Supabase
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        Alert.alert("Session Expired", "Please login again.");
        navigation.reset({ index: 0, routes: [{ name: "PhoneScreen" }] });
        return;
      }

      const enteredHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        mpin
      );

      const { data: pinData, error: pinErr } = await supabase
        .from("user_pins")
        .select("pin_hash")
        .eq("commuter_id", userId)
        .single();

      const recordFail = () => {
        const next = attempts + 1;
        setAttempts(next);
        setMpin("");
        if (next >= MAX) {
          Alert.alert("Locked out", "Too many attempts. Please login again.", [
            { text: "Use different number", onPress: handleSwitchNumber },
            {
              text: "OK",
              onPress: async () => {
                await supabase.auth.signOut();
                navigation.reset({ index: 0, routes: [{ name: "PhoneScreen" }] });
              },
            },
          ]);
        } else {
          Alert.alert("Wrong MPIN", `Incorrect MPIN. Attempts: ${next}/${MAX}`);
        }
      };

      if (pinErr || !pinData?.pin_hash) {
        recordFail();
        return;
      }

      if (enteredHash !== pinData.pin_hash) {
        recordFail();
        return;
      }

      // ✅ Success
      setAttempts(0);
      setMpin("");
      setLocked(false);
    } catch (err) {
      Alert.alert("Error", err.message || "Unlock failed");
    } finally {
      setLoading(false);
    }
  };

  // Render each MPIN dot
  const dots = [0, 1, 2, 3, 4, 5].map((i) => (
    <View
      key={i}
      style={[
        styles.dot,
        i < mpin.length ? styles.dotFilled : styles.dotEmpty,
      ]}
    />
  ));

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          {/* Icon / Lock graphic */}
          <View style={styles.lockIcon}>
            <Text style={styles.lockEmoji}>🔒</Text>
          </View>

          <Text style={styles.title}>App Locked</Text>
          <Text style={styles.subtitle}>
            {phone ? `Continue as: ${phone}` : "Enter your 6-digit MPIN to continue."}
          </Text>

          {/* MPIN Dots */}
          <View style={styles.dotsRow}>{dots}</View>

          {/* Hidden text input */}
          <TextInput
            value={mpin}
            onChangeText={(t) => setMpin(t.replace(/[^\d]/g, "").slice(0, 6))}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            autoFocus
            style={styles.hiddenInput}
          />

          {/* Unlock button */}
          <TouchableOpacity
            style={[styles.unlockBtn, loading && styles.unlockBtnDisabled]}
            onPress={handleUnlock}
            activeOpacity={0.85}
            disabled={loading || mpin.length < 6}
          >
            {loading ? (
              <ActivityIndicator color="#0B0E14" />
            ) : (
              <Text style={styles.unlockText}>Unlock</Text>
            )}
          </TouchableOpacity>

          {/* Switch number */}
          <TouchableOpacity onPress={handleSwitchNumber} style={styles.switchBtn}>
            <Text style={styles.switchText}>Use different number</Text>
          </TouchableOpacity>

          {/* Attempts counter */}
          {attempts > 0 && (
            <Text style={styles.attemptsText}>
              Failed attempts: {attempts}/{MAX}
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0B0E14",
  },
  kav: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  lockIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "rgba(255, 211, 106, 0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 211, 106, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  lockEmoji: {
    fontSize: 36,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
    marginBottom: 8,
  },
  subtitle: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 36,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 8,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  dotFilled: {
    backgroundColor: "#FFD36A",
  },
  dotEmpty: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
  },
  hiddenInput: {
    position: "absolute",
    top: -9999,
    opacity: 0,
  },
  unlockBtn: {
    marginTop: 36,
    width: "100%",
    backgroundColor: "#FFD36A",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  unlockBtnDisabled: {
    opacity: 0.5,
  },
  unlockText: {
    color: "#0B0E14",
    fontWeight: "900",
    fontSize: 16,
  },
  switchBtn: {
    marginTop: 20,
    paddingVertical: 10,
  },
  switchText: {
    color: "#FFD36A",
    fontWeight: "800",
    fontSize: 14,
    textAlign: "center",
  },
  attemptsText: {
    marginTop: 12,
    color: "#FF7A7A",
    fontSize: 13,
    fontWeight: "700",
  },
});
