import React from "react";
import { Text } from "react-native";
import { Screen, Card, GhostButton, Pill } from "../components/ui";

export default function NotificationsScreen({ navigation }) {
  return (
    <Screen title="Notifications" subtitle="Ride alerts and system updates.">
      <Card>
        <Pill text="In-App" />
        <Text style={{ marginTop: 10, color: "rgba(244,238,230,0.65)", lineHeight: 18 }}>
          No notifications yet.
          {"\n\n"}Next: connect to notification_outbox table.
        </Text>
      </Card>

      <GhostButton label="Back" onPress={() => navigation.goBack()} />
    </Screen>
  );
}
