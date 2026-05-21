import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Alert, NativeModules } from "react-native";
import { Screen, Card, PrimaryButton } from "../../components/ui";
import { useTheme } from "../../context/ThemeContext";
import { payOperator } from "../../api/payApi";
import FareSuccessModal from "../../components/FareSuccessModal";

// Check if Native NFC is available (Prevents Expo Go crash)
const isNativeNfcAvailable = !!NativeModules.NfcManager;
let NfcManager, NfcTech, Ndef;

if (isNativeNfcAvailable) {
    const nfc = require('react-native-nfc-manager');
    NfcManager = nfc.default;
    NfcTech = nfc.NfcTech;
    Ndef = nfc.Ndef;
}

export default function NFCTapPayScreen({ navigation }) {
    const [busy, setBusy] = useState(false);
    const { theme } = useTheme();
    const styles = React.useMemo(() => createStyles(theme), [theme]);
    
    const [successVisible, setSuccessVisible] = useState(false);
    const [paymentResult, setPaymentResult] = useState(null);

    const startNfcScan = async () => {
        if (!isNativeNfcAvailable) {
            // EXPO GO FALLBACK (Simulate)
            try {
                setBusy(true);
                await new Promise((r) => setTimeout(r, 900));
                
                Alert.prompt(
                    "Simulator Mode (Expo Go)",
                    "Native NFC isn't available in Expo Go. Enter a dummy Operator QR Token to simulate a scan:",
                    async (token) => {
                        if (!token) return;
                        try {
                            setBusy(true);
                            const res = await payOperator({ operator_qr: token });
                            setPaymentResult(res);
                            setSuccessVisible(true);
                        } catch (e) {
                            Alert.alert("Simulated Payment Failed", e.message);
                        } finally {
                            setBusy(false);
                        }
                    }
                );
            } finally {
                setBusy(false);
            }
            return;
        }

        // REAL NATIVE NFC LOGIC
        try {
            setBusy(true);
            await NfcManager.requestTechnology(NfcTech.Ndef);
            const tag = await NfcManager.getTag();
            
            let operator_qr = "";
            if (tag.ndefMessage && tag.ndefMessage.length > 0) {
                const ndefRecord = tag.ndefMessage[0];
                operator_qr = Ndef.text.decodePayload(ndefRecord.payload);
            }

            if (!operator_qr) {
                Alert.alert("NFC Error", "Tag is empty or not formatted with an operator token.");
                setBusy(false);
                return;
            }

            const raw = String(operator_qr).trim();
            if (raw.startsWith("{") && raw.endsWith("}")) {
                try {
                    const obj = JSON.parse(raw);
                    if (obj?.operator_qr) operator_qr = String(obj.operator_qr).trim();
                } catch { }
            }

            const res = await payOperator({ operator_qr });
            setPaymentResult(res);
            setSuccessVisible(true);
        } catch (ex) {
            console.warn('NFC Error:', ex);
            if (ex !== 'cancelled') {
                Alert.alert("NFC Error", ex.message || "Failed to read tag or process payment.");
            }
        } finally {
            if (isNativeNfcAvailable) NfcManager.cancelTechnologyRequest().catch(() => {});
            setBusy(false);
        }
    };

    useEffect(() => {
        if (isNativeNfcAvailable) {
            NfcManager.start().catch(() => {});
            startNfcScan(); // Auto-start real NFC

            return () => {
                NfcManager.cancelTechnologyRequest().catch(() => {});
            };
        } else {
            // In Expo Go, don't auto-start to avoid annoying prompts immediately
        }
    }, []);

    return (
        <Screen
            title="Tap to Pay"
            subtitle="Hold your phone near the operator's NFC tag to pay fare."
            onBack={() => navigation.goBack()}
            theme={theme}
        >
            <View style={{ flex: 1, paddingBottom: 140 }}>
                <Card theme={theme}>
                    <View style={styles.bigIconWrap}>
                        <Text style={styles.bigIcon}>📳</Text>
                    </View>

                    <Text style={styles.hint}>
                        {isNativeNfcAvailable 
                            ? "Ready to scan! Please hold your phone against the Operator's NFC Tag."
                            : "Running in Expo Go (Simulator). Tap below to simulate an NFC scan."}
                    </Text>

                    <View style={{ marginTop: 24 }}>
                        <PrimaryButton
                            label={busy ? (isNativeNfcAvailable ? "Scanning automatically..." : "Simulating...") : (isNativeNfcAvailable ? "Try Scanning Again" : "Simulate NFC Tap")}
                            onPress={startNfcScan}
                            disabled={busy}
                            theme={theme}
                        />
                    </View>
                </Card>
            </View>

            <FareSuccessModal
                visible={successVisible}
                result={paymentResult}
                onDone={() => {
                    setSuccessVisible(false);
                    setPaymentResult(null);
                    navigation.navigate("Home", { refresh: true });
                }}
            />
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
