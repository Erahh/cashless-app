import React, { useEffect } from "react";
import { View, Text, Button } from "react-native";

export default function ActivatedScreen({ navigation }) {
  useEffect(() => {
    const t = setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: "Home" }],
      });
    }, 1500);

    return () => clearTimeout(t);
  }, [navigation]);

  return (
    <View style={{ padding: 20, marginTop: 80 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>
        Account Activated ✅
      </Text>

      <Text style={{ marginTop: 12 }}>
        Your account is now active. You can start using cashless commuting.
      </Text>

      <View style={{ marginTop: 24 }}>
        <Button
          title="Continue to Home"
          onPress={() =>
            navigation.reset({
              index: 0,
              routes: [{ name: "Home" }],
            })
          }
        />
      </View>
    </View>
  );
}
