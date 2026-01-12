import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert, TouchableOpacity } from "react-native";
import { verifyOtp, sendOtp } from "../api/authApi";
import { hasMpin } from "../api/mpinLocal";
import { supabase } from "../api/supabase";

export default function OTPScreen({ navigation, route }) {
  const phone = route?.params?.phone; // passed from PhoneScreen
  const [otp, setOtp] = useState("");

  const handleVerify = async () => {
    try {
      if (!phone) return Alert.alert("Error", "Missing phone number.");

      if (!/^\d{6}$/.test(otp)) {
        return Alert.alert("Invalid OTP", "OTP must be 6 digits.");
      }

      // 1️⃣ Verify OTP with Supabase
      await verifyOtp(phone, otp);

      // 2️⃣ GET ACCESS TOKEN (THIS IS WHAT YOU NEED FOR RENDER TESTING)
      const { data } = await supabase.auth.getSession();
      const accessToken = data?.session?.access_token;

      if (accessToken) {
        console.log("========================================");
        console.log("🔑 ACCESS TOKEN FOR RENDER API:");
        console.log("========================================");
        console.log(accessToken);
        console.log("========================================");
        console.log("✅ Copy this token from your Metro terminal");
        console.log("✅ Use it in Authorization header: Bearer <token>");
        console.log("========================================");
        
        // Also show in alert for easy access
        Alert.alert(
          "✅ OTP Verified!",
          `Access token logged to console.\n\nCheck your Metro terminal to copy the token for Render API testing.`,
          [{ text: "OK" }]
        );
      } else {
        console.warn("⚠️ No access token found in session");
        Alert.alert("Warning", "No access token found. Check your Supabase configuration.");
      }

      // 3️⃣ Continue your normal UI flow
      const mpinSet = await hasMpin();

      if (!mpinSet) {
        navigation.replace("BasicInfo");
      } else {
        navigation.replace("Home");
      }
    } catch (err) {
      Alert.alert("Verify Error", err.message);
    }
  };

  const handleResend = async () => {
    try {
      if (!phone) return Alert.alert("Error", "Missing phone number.");
      await sendOtp(phone);
      Alert.alert("OTP Sent", "We sent a new OTP to your phone.");
    } catch (err) {
      Alert.alert("Resend Error", err.message);
    }
  };

  return (
    <View style={{ padding: 20, marginTop: 70 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>Enter OTP</Text>
      <Text style={{ marginTop: 8 }}>
        We sent a code to: {phone}
      </Text>

      <Text style={{ marginTop: 20 }}>OTP Code</Text>
      <TextInput
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="Enter 6-digit code"
        style={{
          borderWidth: 1,
          padding: 12,
          marginTop: 8,
          borderRadius: 8,
        }}
      />

      <View style={{ marginTop: 18 }}>
        <Button title="Verify OTP" onPress={handleVerify} />
      </View>

      <View style={{ marginTop: 12 }}>
        <TouchableOpacity onPress={handleResend}>
          <Text style={{ color: "#007AFF", textAlign: "center" }}>
            Resend OTP
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
