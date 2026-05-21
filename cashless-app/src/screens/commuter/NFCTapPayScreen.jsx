import React, { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { Screen, Card, PrimaryButton } from "../../components/ui";
import { useTheme } from "../../context/ThemeContext";

export default function NFCTapPayScreen({ navigation }) {
    const [busy, setBusy] = useState(false);
    const { theme } = useTheme();
    const styles = React.useMemo(() => createStyles(theme), [theme]);

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
            theme={theme}
        >
            <View style={{ flex: 1, paddingBottom: 140 }}>
                <Card theme={theme}>
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
                            theme={theme}
                        />
                    </View>
                </Card>

            </View>
        </Screen>
    );
}

const createStyles = (theme) => StyleSheet.create({
    bigIconWrap: {
        marginTop: 18,
        height: 140,
        borderRadius: 20,
        backgroundColor: theme.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
        borderWidth: 1,
        borderColor: theme.isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)",
        alignItems: "center",
        justifyContent: "center",
    },
    bigIcon: { fontSize: 56 },
    hint: { color: theme.textSecondary || "rgba(0,0,0,0.60)", marginTop: 20, textAlign: 'center' },
});
