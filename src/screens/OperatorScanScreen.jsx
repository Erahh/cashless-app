import React from "react";
import { Text } from "react-native";
import { Screen, Card, PrimaryButton, GhostButton, Pill } from "../components/ui";

export default function OperatorScanScreen({ navigation }) {
  return (
    <Screen title="Scan QR" subtitle="Operator mode: scan commuter QR to process fare.">
      <Card>
        <Pill text="Operator" />
        <Text style={{ marginTop: 10, color: "rgba(244,238,230,0.65)", lineHeight: 18 }}>
          Scanner UI will be added next using expo-camera.
          {"\n\n"}This screen is now registered so navigation works.
        </Text>
      </Card>

      <PrimaryButton label="Open Scanner (Next step)" onPress={() => {}} disabled />
      <GhostButton label="Back" onPress={() => navigation.goBack()} />
    </Screen>
  );
}
