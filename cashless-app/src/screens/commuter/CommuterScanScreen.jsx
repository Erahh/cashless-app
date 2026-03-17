import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Alert, TouchableOpacity } from "react-native";
import { Screen, Card, PrimaryButton, GhostButton, Pill } from "../../components/ui";
import QRScanView from "../../components/QRScanView";
import { payOperator } from "../../api/payApi";
import { useTheme } from "../../context/ThemeContext";

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
    const [amount, setAmount] = useState("");
    const [step, setStep] = useState("scan"); // scan | pay
    const [loading, setLoading] = useState(false);

    const amountNum = useMemo(() => Number(amount || 0), [amount]);

    const onScanned = ({ data }) => {
        const op = extractOperatorQr(data);
        if (!op) return;

        setOperatorQr(op);
        setStep("pay");
    };

    const confirmPay = async () => {
        try {
            if (!operatorQr) return Alert.alert("Pay", "Missing operator QR.");
            if (!amountNum || amountNum <= 0) return Alert.alert("Pay", "Enter a valid amount.");
            if (amountNum < 5) return Alert.alert("Pay", "Minimum fare is ₱5 (for demo).");

            Alert.alert(
                "Confirm Payment",
                `Pay ₱${amountNum.toFixed(2)} to operator?`,
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Pay",
                        style: "default",
                        onPress: async () => {
                            setLoading(true);
                            try {
                                const res = await payOperator({ operator_qr: operatorQr, amount: amountNum });

                                Alert.alert(
                                    "Paid ✅",
                                    `Transaction: ${res?.tx_id || "OK"}\nNew balance: ₱${Number(res?.commuter_balance ?? 0).toFixed(2)}`,
                                    [
                                        {
                                            text: "Back to Home",
                                            onPress: () => navigation.navigate("Home", { refresh: true }),
                                        },
                                    ]
                                );
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
                        <Pill text="Step 2 • Enter Fare" theme={theme} />

                        <Text style={{ marginTop: 16, color: theme.textSecondary, fontWeight: "800" }}>
                            Operator QR
                        </Text>
                        <Text style={{ marginTop: 6, color: theme.text, fontWeight: "900" }} numberOfLines={1}>
                            {operatorQr}
                        </Text>

                        <Text style={{ marginTop: 18, color: theme.textSecondary }}>Fare Amount (PHP)</Text>
                        <TextInput
                            value={amount}
                            onChangeText={(t) => setAmount(t.replace(/[^\d.]/g, ""))}
                            keyboardType="decimal-pad"
                            placeholder="e.g. 15"
                            placeholderTextColor={theme.textMuted}
                            style={{
                                marginTop: 10,
                                borderRadius: 14,
                                padding: 14,
                                borderWidth: 1,
                                borderColor: theme.border,
                                backgroundColor: isDarkMode ? "rgba(0,0,0,0.18)" : theme.background,
                                color: theme.text,
                                fontWeight: "900",
                                fontSize: 18,
                            }}
                        />

                        <View style={{ marginTop: 16, gap: 10 }}>
                            <PrimaryButton label={loading ? "Processing..." : "Pay Now"} onPress={confirmPay} disabled={loading} theme={theme} />
                            <TouchableOpacity
                                onPress={() => {
                                    setStep("scan");
                                    setAmount("");
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
        </Screen>
    );
}
