import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert, TouchableOpacity } from "react-native";
import { verifyOtp, sendOtp } from "../api/authApi";
import { supabase } from "../api/supabase";

export default function OTPScreen({ navigation, route }) {
  const phone = route?.params?.phone; // passed from PhoneScreen
  const [otp, setOtp] = useState("");

  const handleVerify = async () => {
    try {
      if (!phone) return Alert.alert("Error", "Missing phone number.");
      if (!/^\d{6}$/.test(otp)) return Alert.alert("Invalid OTP", "OTP must be 6 digits.");

      // 1) Verify OTP
      console.log("🔐 Verifying OTP for phone:", phone);
      await verifyOtp(phone, otp);
      console.log("✅ OTP verification successful");

      // 2) Session + token (keep your Render testing logs)
      const { data: sessionRes } = await supabase.auth.getSession();
      const accessToken = sessionRes?.session?.access_token;

      if (accessToken) {
        console.log("========================================");
        console.log("🔑 ACCESS TOKEN FOR RENDER API:");
        console.log("========================================");
        console.log(accessToken);
        console.log("========================================");
        Alert.alert(
          "✅ OTP Verified!",
          `Access token logged to console.\n\nCheck your Metro terminal to copy the token for Render API testing.`,
          [{ text: "OK" }]
        );
      } else {
        console.warn("⚠️ No access token found in session");
      }

      // 3) Get user
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      const userId = userRes?.user?.id;

      if (userErr || !userId) {
        // fail-safe: go back to Phone login
        navigation.reset({ index: 0, routes: [{ name: "PhoneScreen" }] });
        return;
      }

      // 3.5) Ensure profiles row exists with phone (IMPORTANT - prevents null phone error)
      await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            phone: phone, // 🔴 THIS IS THE FIX - ensures phone is never null
          },
          { onConflict: "id" }
        );

      // 4) Ensure commuter_accounts row exists (IMPORTANT)
      // If you already create it elsewhere, this upsert is still safe.
      await supabase
        .from("commuter_accounts")
        .upsert(
          { 
            commuter_id: userId, 
            account_active: false, 
            pin_set: false,
            fare_type: "casual" // Default fare type to prevent trigger error
          },
          { onConflict: "commuter_id" }
        );

      // 5) Fetch account status
      const { data: account } = await supabase
        .from("commuter_accounts")
        .select("account_active, pin_set")
        .eq("commuter_id", userId)
        .single();

      // 6) Check profile COMPLETENESS (not just exists)
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, birthdate, province, city, barangay, address_line")
        .eq("id", userId)
        .maybeSingle();

      const profileComplete =
        !!profile?.first_name &&
        !!profile?.last_name &&
        !!profile?.birthdate &&
        !!profile?.province &&
        !!profile?.city &&
        !!profile?.barangay &&
        !!profile?.address_line;

      // 7) Route decision (FINAL)
      if (!profileComplete) {
        navigation.reset({ index: 0, routes: [{ name: "PersonalInfo" }] });
        return;
      }

      if (!account?.pin_set || !account?.account_active) {
        // Use your real MPIN screen name:
        // If your actual flow uses MPINSetup + Activated screen, send to MPINSetup.
        navigation.reset({ index: 0, routes: [{ name: "SetMPIN" }] });
        return;
      }

      navigation.reset({ index: 0, routes: [{ name: "Home" }] });
    } catch (err) {
      console.error("❌ OTP Verification Error:", err);
      console.error("Error details:", JSON.stringify(err, null, 2));
      Alert.alert("Verify Error", err?.message || "Failed to verify OTP. Please check the console for details.");
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
