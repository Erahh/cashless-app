import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert, ActivityIndicator } from "react-native";
import { setMpinOnRender } from "../api/apiHelper";

export default function MPINSetupScreen({ navigation }) {
  const [mpin, setMpin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSetMpin = async () => {
    try {
      if (!/^\d{6}$/.test(mpin)) {
        return Alert.alert("Invalid MPIN", "MPIN must be exactly 6 digits.");
      }
      if (mpin !== confirm) {
        return Alert.alert("Mismatch", "MPIN does not match.");
      }

      setLoading(true);

      // Use the helper function which handles auth token automatically
      await setMpinOnRender(mpin, confirm);

      // MPIN set + account activated in backend ✅
      navigation.reset({
        index: 0,
        routes: [{ name: "Activated" }],
      });
    } catch (err) {
      Alert.alert("Error", err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20, marginTop: 60 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>Create MPIN</Text>
      <Text style={{ marginTop: 8 }}>
        Set a 6-digit MPIN to secure your wallet.
      </Text>

      <Text style={{ marginTop: 20 }}>MPIN</Text>
      <TextInput
        value={mpin}
        onChangeText={(t) => setMpin(t.replace(/[^\d]/g, ""))}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={6}
        placeholder="••••••"
        style={{
          borderWidth: 1,
          padding: 12,
          marginTop: 8,
          borderRadius: 8,
          textAlign: "center",
          fontSize: 18,
          letterSpacing: 6,
        }}
      />

      <Text style={{ marginTop: 20 }}>Confirm MPIN</Text>
      <TextInput
        value={confirm}
        onChangeText={(t) => setConfirm(t.replace(/[^\d]/g, ""))}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={6}
        placeholder="••••••"
        style={{
          borderWidth: 1,
          padding: 12,
          marginTop: 8,
          borderRadius: 8,
          textAlign: "center",
          fontSize: 18,
          letterSpacing: 6,
        }}
      />

      <View style={{ marginTop: 20 }}>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <Button title="Set MPIN" onPress={handleSetMpin} />
        )}
      </View>
    </View>
  );
}
