import React, { useState } from "react";
import { View, Text, Alert, TouchableOpacity } from "react-native";
import { Screen, Card, PrimaryButton, Pill } from "../../components/ui";
import QRScanView from "../../components/QRScanView";
import { payOperator } from "../../api/payApi";
import { useTheme } from "../../context/ThemeContext";
import FareSuccessModal from "../../components/FareSuccessModal";

/**
 * What QR should contain:
 * - simplest: "OPQR-<operatorId>-...." (raw string)
 * - OR JSON: {"operator_qr":"OPQR-..."}
 */
function extractOperatorQr(scanned) {
    const raw = String(scanned || "").trim();
    if (!raw) return "";

    // If JSON payload
    if (raw.startsWith("{") && raw.endsWith("}")) {
        try {
            const obj = JSON.parse(raw);
            if (obj?.operator_qr) return String(obj.operator_qr).trim();
        } catch { }
    }

    // otherwise raw token
    return raw;
}

export default function CommuterScanScreen({ navigation }) {
    const { theme, isDarkMode } = useTheme();
    const [operatorQr, setOperatorQr] = useState("");
    const [step, setStep] = useState("scan"); // scan | pay
    const [loading, setLoading] = useState(false);
    const [successVisible, setSuccessVisible] = useState(false);
    const [paymentResult, setPaymentResult] = useState(null);

    const onScanned = ({ data }) => {
        const op = extractOperatorQr(data);
        if (!op) return;

        setOperatorQr(op);
        setStep("pay");
    };

    const confirmPay = async () => {
        try {
            if (!operatorQr) return Alert.alert("Pay", "Missing operator QR.");

            Alert.alert(
                "Confirm Payment",
                "Pay your fare using your discounted account fare?",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Pay",
                        style: "default",
                        onPress: async () => {
                            setLoading(true);
                            try {
                                const res = await payOperator({ operator_qr: operatorQr });
                                setPaymentResult(res);
                                setSuccessVisible(true);
                            } catch (e) {
                                Alert.alert("Payment Failed", e.message || "Unable to pay");
                            } finally {
                                setLoading(false);
                            }
                        },
                    },
                ]
            );
        } catch (e) {
            Alert.alert("Error", e.message);
        }
    };

    return (
        <Screen
            title="Commuter Scan"
            subtitle="Scan operator QR then pay fare from your wallet."
            onBack={() => navigation.goBack()}
            theme={theme}
        >
            <View style={{ flex: 1, paddingBottom: 120 }}>
                {step === "scan" ? (
                    <Card theme={theme}>
                        <Pill text="Step 1 • Scan Operator QR" theme={theme} />
                        <View style={{ marginTop: 14 }}>
                            <QRScanView
                                label="Scan Operator QR"
                                hint="Point camera to the operator’s QR code."
                                onScanned={onScanned}
                                enabled={step === "scan"}
                            />
                        </View>
                    </Card>
                ) : (
                    <Card theme={theme}>
                        <Pill text="Step 2 • Fare Detected" theme={theme} />

                        <Text style={{ marginTop: 16, color: theme.textSecondary, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.7, fontSize: 12 }}>
                            Operator QR
                        </Text>
                        <Text style={{ marginTop: 6, color: theme.text, fontWeight: "900", fontSize: 16 }} numberOfLines={1}>
                            {operatorQr}
                        </Text>

                        <View style={{ marginTop: 18, padding: 16, borderRadius: 18, backgroundColor: isDarkMode ? "rgba(255,255,255,0.03)" : theme.background, borderWidth: 1, borderColor: theme.border }}>
                            <Text style={{ color: theme.textSecondary, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.7, fontSize: 12 }}>Fare</Text>
                            <Text style={{ marginTop: 6, color: theme.text, fontWeight: "900", fontSize: 19, letterSpacing: -0.2 }}>
                                Automatic discounted fare
                            </Text>
                            <Text style={{ marginTop: 8, color: theme.textMuted, lineHeight: 18 }}>
                                Your commuter account and verification status determine whether this is a Student Fare, Senior Fare, or Regular Fare.
                            </Text>
                        </View>

                        <View style={{ marginTop: 16, gap: 10 }}>
                            <PrimaryButton label={loading ? "Processing..." : "Pay Now"} onPress={confirmPay} disabled={loading} theme={theme} />
                            <TouchableOpacity
                                onPress={() => {
                                    setStep("scan");
                                    setOperatorQr("");
                                }}
                                style={{ paddingVertical: 12 }}
                                activeOpacity={0.9}
                            >
                                <Text style={{ color: theme.textSecondary, textAlign: "center", fontWeight: "800" }}>
                                    Scan different operator
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Card>
                )}
            </View>

            <FareSuccessModal
                visible={successVisible}
                result={paymentResult}
                onDone={() => {
                    setSuccessVisible(false);
                    setPaymentResult(null);
                    setStep("scan");
                    setOperatorQr("");
                    navigation.navigate("Home", { refresh: true });
                }}
            />
        </Screen>
    );
}
