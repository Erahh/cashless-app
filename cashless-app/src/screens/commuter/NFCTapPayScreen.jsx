import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Alert, NativeModules, TouchableOpacity, ScrollView } from "react-native";
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
    const [extraFare, setExtraFare] = useState(0);
    const [scannedOpQr, setScannedOpQr] = useState("");
    const [step, setStep] = useState("scan"); // "scan" | "pay"

    const startNfcScan = async () => {
        if (!isNativeNfcAvailable) {
            // EXPO GO FALLBACK (Simulate)
            try {
                setBusy(true);
                
                Alert.prompt(
                    "Simulator Mode (Expo Go)",
                    "Native NFC isn't available in Expo Go. Enter a dummy Operator QR Token to simulate a scan:",
                    async (token) => {
                        if (!token) return;
                        try {
                            setScannedOpQr(token);
                            setStep("pay");
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

            setScannedOpQr(operator_qr);
            setStep("pay");
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

    const confirmPay = async () => {
        if (!scannedOpQr) return;
        try {
            setBusy(true);
            const res = await payOperator({ operator_qr: scannedOpQr, extra_fare: extraFare });
            setPaymentResult(res);
            setSuccessVisible(true);
        } catch (e) {
            Alert.alert("Payment Failed", e.message || "Unable to pay");
        } finally {
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
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 140 }}
                showsVerticalScrollIndicator={false}
            >
                {step === "scan" ? (
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
                ) : (
                    <Card theme={theme}>
                        <View style={{ marginTop: 8, padding: 16, borderRadius: 18, backgroundColor: theme.isDark ? "rgba(255,255,255,0.03)" : theme.background, borderWidth: 1, borderColor: theme.border }}>
                            <Text style={{ color: theme.textSecondary, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.7, fontSize: 12 }}>Base Fare</Text>
                            <Text style={{ marginTop: 6, color: theme.text, fontWeight: "900", fontSize: 19, letterSpacing: -0.2 }}>
                                Automatic discounted fare
                            </Text>
                            <Text style={{ marginTop: 8, color: theme.textMuted, lineHeight: 18 }}>
                                Based on your verification status.
                            </Text>
                        </View>

                        <View style={{ marginTop: 20 }}>
                            <Text style={{ color: theme.textSecondary, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.7, fontSize: 12 }}>
                                Exceeded Commute Area?
                            </Text>
                            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                                {[0, 5, 10, 15, 20].map((amt) => {
                                    const isSelected = extraFare === amt;
                                    return (
                                        <TouchableOpacity
                                            key={amt}
                                            activeOpacity={0.8}
                                            onPress={() => setExtraFare(amt)}
                                            style={{
                                                paddingVertical: 10,
                                                paddingHorizontal: 16,
                                                borderRadius: 12,
                                                borderWidth: 2,
                                                borderColor: isSelected ? theme.primary : (theme.isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"),
                                                backgroundColor: isSelected ? theme.primary : "transparent",
                                            }}
                                        >
                                            <Text style={{
                                                fontWeight: "800",
                                                color: isSelected ? "#fff" : theme.text,
                                            }}>
                                                {amt === 0 ? "No Thanks" : `+ ₱${amt}`}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        <View style={{ marginTop: 24, gap: 10 }}>
                            <PrimaryButton label={busy ? "Processing..." : "Pay Now"} onPress={confirmPay} disabled={busy} theme={theme} />
                            <TouchableOpacity
                                onPress={() => {
                                    setStep("scan");
                                    setScannedOpQr("");
                                    setExtraFare(0);
                                    if (isNativeNfcAvailable) startNfcScan();
                                }}
                                style={{ paddingVertical: 12 }}
                                activeOpacity={0.9}
                            >
                                <Text style={{ color: theme.textSecondary, textAlign: "center", fontWeight: "800" }}>
                                    Cancel / Scan Again
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Card>
                )}
            </ScrollView>

            <FareSuccessModal
                visible={successVisible}
                result={paymentResult}
                onDone={() => {
                    setSuccessVisible(false);
                    setPaymentResult(null);
                    setStep("scan");
                    setScannedOpQr("");
                    setExtraFare(0);
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
