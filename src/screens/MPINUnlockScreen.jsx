import React, { useContext, useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import { AppLockContext } from "../context/AppLockContext";
import { supabase } from "../api/supabase";
import { API_BASE_URL } from "../config/api";

export default function MPINUnlockScreen({ navigation }) {
  const { setLocked } = useContext(AppLockContext);

  const [mpin, setMpin] = useState("");
  const [attempts, setAttempts] = useState(0);
  const MAX = 5;

  const handleUnlock = async () => {
    try {
      if (!/^\d{6}$/.test(mpin)) {
        return Alert.alert("Invalid MPIN", "Please enter your 6-digit MPIN.");
      }

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      const token = sessionData?.session?.access_token;
      if (!token) {
        return Alert.alert("Session Error", "Please login again.");
      }

      const res = await fetch(`${API_BASE_URL}/mpin/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mpin }),
      });

      const json = await res.json();

      if (!res.ok) {
        const next = attempts + 1;
        setAttempts(next);
        setMpin("");

        if (next >= MAX) {
          return Alert.alert("Locked out", "Too many attempts. Please try again later.");
        }

        return Alert.alert("Wrong MPIN", json.error || `Attempts: ${next}/${MAX}`);
      }

      // ✅ success
      setAttempts(0);
      setMpin("");
      setLocked(false);

      navigation.reset({
        index: 0,
        routes: [{ name: "Home" }],
      });
    } catch (err) {
      Alert.alert("Error", err.message || "Unlock failed");
    }
  };

  return (
    <View style={{ padding: 20, marginTop: 80 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>App Locked</Text>
      <Text style={{ marginTop: 8 }}>Enter your 6-digit MPIN to continue.</Text>

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

      <Text style={{ marginTop: 12, textAlign: "center", color: "#666" }}>
        Attempts: {attempts}/{MAX}
      </Text>
    </View>
  );
}
