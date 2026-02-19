import React from "react";
import { View, Text } from "react-native";
import { Screen, Card, PrimaryButton, GhostButton, Pill } from "../components/ui";

export default function VerificationSubmittedScreen({ navigation }) {
  return (
    <Screen
      title="Submitted ✅"
      subtitle="Your verification is pending admin approval. You can still ride using casual fare while we review."
    >
      <Card>
        <Pill text="Status: PENDING" />
        <Text style={{ marginTop: 10, color: "rgba(244,238,230,0.9)", fontWeight: "800", fontSize: 16 }}>
          What happens next?
        </Text>
        <Text style={{ marginTop: 8, color: "rgba(244,238,230,0.65)", lineHeight: 18 }}>
          • Admin checks your ID photos{"\n"}
          • If approved, discounted fare activates automatically{"\n"}
          • You’ll see the status on Home
        </Text>
      </Card>

      <View style={{ marginTop: "auto", gap: 10, paddingBottom: 18 }}>
        <PrimaryButton label="Go to Home" onPress={() => navigation.navigate("Home")} />
        <GhostButton label="Upload Again" onPress={() => navigation.navigate("PassengerType")} />
      </View>
    </Screen>
  );
}
