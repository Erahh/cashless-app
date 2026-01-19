import React, { useState } from "react";
import { View, Text, TextInput, Alert, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform, TouchableWithoutFeedback, Keyboard } from "react-native";
import { Screen, Card, PrimaryButton, GhostButton, Pill } from "../components/ui";
import { supabase } from "../api/supabase";
import { API_BASE_URL } from "../config/api";

export default function SendLoadScreen({ navigation }) {
  const [amount, setAmount] = useState("");

  const startTopup = async () => {
    try {
      const amt = Number(amount);
      if (!amt || amt < 20) return Alert.alert("Top Up", "Minimum is ₱20");

      const { data: s } = await supabase.auth.getSession();
      const token = s?.session?.access_token;
      if (!token) return Alert.alert("Session", "Please login again.");

      const res = await fetch(`${API_BASE_URL}/wallet/topup/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: amt }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create checkout");

      navigation.navigate("TopUpCheckout", { ref: json.ref, url: json.checkout_url });
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <Screen title="Top Up" subtitle="Add funds to your wallet using GCash.">
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Card>
              <Pill text="GCash / PayMongo" />

              <Text style={{ marginTop: 20, color: "rgba(244,238,230,0.8)" }}>Amount (PHP)</Text>
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
              <Text style={{ marginTop: 10, fontSize: 12, color: "rgba(244,238,230,0.5)" }}>
                Minimum amount is ₱20.00
              </Text>
            </Card>

            <View style={{ marginTop: "auto", gap: 10, paddingBottom: 18, paddingTop: 20 }}>
              <PrimaryButton label="Continue to GCash" onPress={startTopup} />
              <GhostButton label="Cancel" onPress={() => navigation.goBack()} />
            </View>
          </ScrollView>
        </Screen>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
