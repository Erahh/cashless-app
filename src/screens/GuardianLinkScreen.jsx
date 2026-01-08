import React, { useState } from "react";
import { Text, TextInput, Alert, View } from "react-native";
import { Screen, Card, PrimaryButton, GhostButton, Pill } from "../components/ui";

export default function GuardianLinkScreen({ navigation }) {
  const [guardianPhone, setGuardianPhone] = useState("");

  const submit = () => {
    if (!guardianPhone.trim()) return Alert.alert("Required", "Enter guardian phone.");
    // TODO: connect to guardian_link_requests
    Alert.alert("Request Sent ✅", "Guardian link request created (connect API next).");
    navigation.goBack();
  };

  return (
    <Screen title="Guardian Link" subtitle="Link a guardian to receive ride alerts.">
      <Card>
        <Pill text="Guardian" />
        <Text style={{ marginTop: 10, color: "rgba(244,238,230,0.8)" }}>Guardian Phone</Text>
        <TextInput
          value={guardianPhone}
          onChangeText={setGuardianPhone}
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
      </Card>

      <View style={{ marginTop: "auto", gap: 10, paddingBottom: 18 }}>
        <PrimaryButton label="Send Request" onPress={submit} />
        <GhostButton label="Back" onPress={() => navigation.goBack()} />
      </View>
    </Screen>
  );
}
