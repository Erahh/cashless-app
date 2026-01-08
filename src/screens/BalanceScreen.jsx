import React from "react";
import { View, Text } from "react-native";
import { Screen, Card, PrimaryButton, GhostButton, Pill } from "../components/ui";

export default function BalanceScreen({ navigation }) {
  return (
    <Screen title="Balance" subtitle="Top up your wallet and view balance details.">
      <Card>
        <Pill text="Wallet" />
        <Text style={{ marginTop: 10, color: "rgba(244,238,230,0.75)" }}>Available Balance</Text>
        <Text style={{ marginTop: 6, color: "#F4EEE6", fontWeight: "900", fontSize: 28 }}>
          ₱ 0.00
        </Text>
        <Text style={{ marginTop: 10, color: "rgba(244,238,230,0.60)", lineHeight: 18 }}>
          Connect this screen to wallets table + top-up flow next.
        </Text>
      </Card>

      <Card>
        <Text style={{ color: "rgba(244,238,230,0.85)", fontWeight: "800" }}>
          Top Up Methods (MVP)
        </Text>
        <Text style={{ marginTop: 8, color: "rgba(244,238,230,0.60)", lineHeight: 18 }}>
          • Bank transfer{"\n"}• Cash-in agent{"\n"}• Admin credit (testing)
        </Text>
      </Card>

      <View style={{ marginTop: "auto", gap: 10, paddingBottom: 18 }}>
        <PrimaryButton label="Top Up (Coming soon)" onPress={() => {}} disabled />
        <GhostButton label="Back" onPress={() => navigation.goBack()} />
      </View>
    </Screen>
  );
}
