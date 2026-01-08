import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import { sendOtp } from "../api/authApi";
import { normalizePHPhone } from "../utils/phone";

export default function PhoneScreen({ navigation }) {
  const [phone, setPhone] = useState("");

  const handleSendOtp = async () => {
    try {
      const normalized = normalizePHPhone(phone);

      if (!normalized.startsWith("+63")) {
        return Alert.alert(
          "Invalid number",
          "Use +639XXXXXXXXX or 09XXXXXXXXX."
        );
      }

      await sendOtp(normalized);

      // Navigate to OTP screen and pass phone
      navigation.navigate("OTPScreen", { phone: normalized });
    } catch (err) {
      Alert.alert("OTP Error", err.message);
    }
  };

  return (
    <View style={{ padding: 20, marginTop: 70 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Welcome</Text>
      <Text style={{ marginTop: 8 }}>
        Enter your mobile number to receive an OTP.
      </Text>

      <Text style={{ marginTop: 20 }}>Mobile Number</Text>
      <TextInput
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="09XXXXXXXXX or +639XXXXXXXXX"
        style={{
          borderWidth: 1,
          padding: 12,
          marginTop: 8,
          borderRadius: 8,
        }}
      />

      <View style={{ marginTop: 18 }}>
        <Button title="Send OTP" onPress={handleSendOtp} />
      </View>
    </View>
  );
}
