import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import { sendOtp, verifyOtp } from "../api/authApi";
import { hasMpin } from "../api/mpinLocal";

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);

  const handleSendOtp = async () => {
    try {
      await sendOtp(phone);
      Alert.alert("OTP Sent", "Check your phone for the code.");
      setStep(2);
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const handleVerifyOtp = async () => {
    try {
      const data = await verifyOtp(phone, otp);

      const mpinExists = await hasMpin();

      if (!mpinExists) {
        navigation.replace("MPINSetup");
      } else {
        navigation.replace("Home");
      }
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };


  return (
    <View style={{ padding: 20, marginTop: 60 }}>
      {step === 1 ? (
        <>
          <Text>Enter phone number</Text>
          <TextInput
            placeholder="09XXXXXXXXX or +639XXXXXXXXX"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={{ borderWidth: 1, padding: 10, marginVertical: 10 }}
          />
          <Button title="Send OTP" onPress={handleSendOtp} />
        </>
      ) : (
        <>
          <Text>Enter OTP</Text>
          <TextInput
            placeholder="123456"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            style={{ borderWidth: 1, padding: 10, marginVertical: 10 }}
          />
          <Button title="Verify OTP" onPress={handleVerifyOtp} />
        </>
      )}
    </View>
  );
}
