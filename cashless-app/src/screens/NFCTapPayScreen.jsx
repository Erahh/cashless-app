import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";

export default function NFCTapPayScreen({ navigation }) {
    const [busy, setBusy] = useState(false);

    const simulateTap = async () => {
        try {
            setBusy(true);

            // Demo-safe delay (pretend NFC read)
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
        <View style={styles.safe}>
            <View style={styles.card}>
                <Text style={styles.title}>Tap to Pay</Text>
                <Text style={styles.subtitle}>
                    Hold your NFC card/phone near the device to pay fare.
                </Text>

                <View style={styles.bigIconWrap}>
                    <Text style={styles.bigIcon}>📳</Text>
                </View>

                <Text style={styles.hint}>
                    Demo Mode: Tap the button below to simulate NFC.
                </Text>

                <TouchableOpacity
                    style={[styles.btn, busy && { opacity: 0.6 }]}
                    onPress={simulateTap}
                    disabled={busy}
                    activeOpacity={0.9}
                >
                    <Text style={styles.btnText}>{busy ? "Reading..." : "Simulate NFC Tap"}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.back}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: "#0B0E14", justifyContent: "center", padding: 18 },
    card: {
        borderRadius: 22,
        padding: 18,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
    },
    title: { color: "#fff", fontSize: 26, fontWeight: "900" },
    subtitle: { color: "rgba(255,255,255,0.70)", marginTop: 8, lineHeight: 20 },
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
    hint: { color: "rgba(255,255,255,0.60)", marginTop: 14 },
    btn: {
        marginTop: 16,
        backgroundColor: "#FFD36A",
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: "center",
    },
    btnText: { color: "#0B0E14", fontWeight: "900", fontSize: 16 },
    back: { marginTop: 14, paddingVertical: 12, alignItems: "center" },
    backText: { color: "rgba(255,255,255,0.75)", fontWeight: "800" },
});
