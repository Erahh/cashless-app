import React, { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { Screen, Card, PrimaryButton } from "../components/ui";

export default function NFCTapPayScreen({ navigation }) {
    const [busy, setBusy] = useState(false);

    const simulateTap = async () => {
        try {
            setBusy(true);
            await new Promise((r) => setTimeout(r, 900));

            Alert.alert(
                "NFC Tap Detected (Demo)",
                "Card/phone detected successfully.\n\nNext: this will send the UID/token to backend for fare deduction.",
                [
                    { text: "OK", onPress: () => navigation.goBack() },
                ]
            );
        } finally {
            setBusy(false);
        }
    };

    return (
        <Screen
            title="Tap to Pay"
            subtitle="Hold your NFC card/phone near the device to pay fare."
            onBack={() => navigation.goBack()}
        >
            <View style={{ flex: 1, paddingBottom: 110 }}>
                <Card>
                    <View style={styles.bigIconWrap}>
                        <Text style={styles.bigIcon}>📳</Text>
                    </View>

                    <Text style={styles.hint}>
                        Demo Mode: Tap the button below to simulate NFC.
                    </Text>

                    <View style={{ marginTop: 24 }}>
                        <PrimaryButton
                            label={busy ? "Reading..." : "Simulate NFC Tap"}
                            onPress={simulateTap}
                            disabled={busy}
                        />
                    </View>
                </Card>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    bigIconWrap: {
        marginTop: 18,
        height: 140,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.05)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
        alignItems: "center",
        justifyContent: "center",
    },
    bigIcon: { fontSize: 56 },
    hint: { color: "rgba(255,255,255,0.60)", marginTop: 20, textAlign: 'center' },
});
