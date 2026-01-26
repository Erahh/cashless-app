import React, { useContext, useEffect, useState } from "react";
import { View, Text, TextInput, Button, Alert, TouchableOpacity } from "react-native";
import { AppLockContext } from "../context/AppLockContext";
import { supabase } from "../api/supabase";
import * as Crypto from "expo-crypto";
import { verifyMpin } from "../api/mpinLocal";

export default function MPINUnlockScreen({ navigation }) {
  const { setLocked } = useContext(AppLockContext);

  const [mpin, setMpin] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [phone, setPhone] = useState("");
  const MAX = 5;

  useEffect(() => {
    // Optional: show last phone on screen
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
    try {
      if (!/^\d{6}$/.test(mpin)) {
        return Alert.alert("Invalid MPIN", "Please enter your 6-digit MPIN.");
      }

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        Alert.alert("Session Expired", "Please login again.");
        navigation.reset({ index: 0, routes: [{ name: "PhoneScreen" }] });
        return;
      }

      // ✅ Faster: try local verification first
      const isCorrectLocal = await verifyMpin(mpin);
      if (isCorrectLocal) {
        setAttempts(0);
        setMpin("");
        setLocked(false);
        navigation.reset({ index: 0, routes: [{ name: "Home" }] });
        return;
      }

      // fallback to Supabase check (optional, but good for sync)
      const enteredHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        mpin
      );

      const { data: pinData, error: pinErr } = await supabase
        .from("user_pins")
        .select("pin_hash")
        .eq("commuter_id", userId)
        .single();

      // If no pin found, count as failed attempt (kept your behavior)
      if (pinErr || !pinData?.pin_hash) {
        const next = attempts + 1;
        setAttempts(next);
        setMpin("");

        if (next >= MAX) {
          return Alert.alert("Locked out", "Too many attempts. Please login again.", [
            { text: "Use different number", onPress: handleSwitchNumber },
            {
              text: "OK",
              onPress: async () => {
                await supabase.auth.signOut();
                navigation.reset({ index: 0, routes: [{ name: "PhoneScreen" }] });
              },
            },
          ]);
        }

        return Alert.alert("Wrong MPIN", `MPIN not found. Attempts: ${next}/${MAX}`);
      }

      if (enteredHash !== pinData.pin_hash) {
        const next = attempts + 1;
        setAttempts(next);
        setMpin("");

        if (next >= MAX) {
          return Alert.alert("Locked out", "Too many attempts. Please login again.", [
            { text: "Use different number", onPress: handleSwitchNumber },
            {
              text: "OK",
              onPress: async () => {
                await supabase.auth.signOut();
                navigation.reset({ index: 0, routes: [{ name: "PhoneScreen" }] });
              },
            },
          ]);
        }

        return Alert.alert("Wrong MPIN", `Incorrect MPIN. Attempts: ${next}/${MAX}`);
      }

      // ✅ success
      setAttempts(0);
      setMpin("");
      setLocked(false);
      navigation.reset({ index: 0, routes: [{ name: "Home" }] });
    } catch (err) {
      Alert.alert("Error", err.message || "Unlock failed");
    }
  };

  return (
    <View style={{ padding: 20, marginTop: 80 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>App Locked</Text>

      {phone ? (
        <Text style={{ marginTop: 8, color: "#666" }}>
          Continue as: {phone}
        </Text>
      ) : (
        <Text style={{ marginTop: 8, color: "#666" }}>
          Enter your 6-digit MPIN to continue.
        </Text>
      )}

      <TextInput
        value={mpin}
        onChangeText={(t) => setMpin(t.replace(/[^\d]/g, ""))}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={6}
        placeholder="••••••"
        style={{
          borderWidth: 1,
          padding: 14,
          marginTop: 20,
          borderRadius: 10,
          fontSize: 18,
          letterSpacing: 6,
          textAlign: "center",
        }}
      />

      <View style={{ marginTop: 20 }}>
        <Button title="Unlock" onPress={handleUnlock} />
      </View>

      <TouchableOpacity onPress={handleSwitchNumber} style={{ marginTop: 14 }}>
        <Text style={{ textAlign: "center", color: "#FFD36A", fontWeight: "800" }}>
          Use different number
        </Text>
      </TouchableOpacity>

      <Text style={{ marginTop: 12, textAlign: "center", color: "#666" }}>
        Attempts: {attempts}/{MAX}
      </Text>
    </View>
  );
}
