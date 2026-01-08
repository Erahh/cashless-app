import React, { useState } from "react";
import { View, Text, TextInput, Alert } from "react-native";
import { Screen, Card, PrimaryButton, GhostButton, Pill } from "../components/ui";

export default function SendLoadScreen({ navigation }) {
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");

  const submit = () => {
    if (!phone.trim()) return Alert.alert("Required", "Enter recipient phone.");
    const val = Number(amount);
    if (!val || val <= 0) return Alert.alert("Invalid", "Enter a valid amount.");

    // TODO: call API later (wallet transfer)
    Alert.alert("Queued ✅", "Send Load request created (connect API next).");
    navigation.goBack();
  };

  return (
    <Screen title="Send Load" subtitle="Send wallet load to another commuter.">
      <Card>
        <Pill text="Transfer" />
        <Text style={{ marginTop: 10, color: "rgba(244,238,230,0.8)" }}>Recipient Phone</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="e.g. +63 9xx xxx xxxx"
          placeholderTextColor="rgba(244,238,230,0.35)"
          style={{
            marginTop: 10,
            borderRadius: 14,
            padding: 14,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.10)",
            backgroundColor: "rgba(0,0,0,0.18)",
            color: "#F4EEE6",
            fontWeight: "700",
          }}
        />

        <Text style={{ marginTop: 14, color: "rgba(244,238,230,0.8)" }}>Amount (PHP)</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="e.g. 100"
          placeholderTextColor="rgba(244,238,230,0.35)"
          style={{
            marginTop: 10,
            borderRadius: 14,
            padding: 14,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.10)",
            backgroundColor: "rgba(0,0,0,0.18)",
            color: "#F4EEE6",
            fontWeight: "800",
            fontSize: 18,
          }}
        />
      </Card>

      <View style={{ marginTop: "auto", gap: 10, paddingBottom: 18 }}>
        <PrimaryButton label="Continue" onPress={submit} />
        <GhostButton label="Cancel" onPress={() => navigation.goBack()} />
      </View>
    </Screen>
  );
}
