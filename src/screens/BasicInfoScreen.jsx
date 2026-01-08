import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert, ActivityIndicator } from "react-native";
import { submitBasicInfo } from "../api/apiHelper";

export default function BasicInfoScreen({ navigation }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    try {
      if (!fullName.trim()) {
        return Alert.alert("Required", "Full name is required.");
      }

      setLoading(true);

      // Use the helper function which handles auth token automatically
      await submitBasicInfo(fullName.trim(), email.trim() || "");

      // Proceed to MPIN setup (backend now has basic info)
      navigation.navigate("MPINSetup");
    } catch (err) {
      Alert.alert("Error", err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20, marginTop: 60 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>Basic Information</Text>
      <Text style={{ marginTop: 8 }}>Fill in your details to continue.</Text>

      <Text style={{ marginTop: 20 }}>Full Name</Text>
      <TextInput
        value={fullName}
        onChangeText={setFullName}
        style={{ borderWidth: 1, padding: 12, marginTop: 8, borderRadius: 8 }}
      />

      <Text style={{ marginTop: 20 }}>Email (Optional)</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={{ borderWidth: 1, padding: 12, marginTop: 8, borderRadius: 8 }}
      />

      <View style={{ marginTop: 20 }}>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <Button title="Next" onPress={handleNext} />
        )}
      </View>
    </View>
  );
}
