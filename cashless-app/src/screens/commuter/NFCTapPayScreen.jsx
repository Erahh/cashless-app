import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { Screen, Card, PrimaryButton } from "../../components/ui";
import { useTheme } from "../../context/ThemeContext";
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import { payOperator } from "../../api/payApi";
import FareSuccessModal from "../../components/FareSuccessModal";

export default function NFCTapPayScreen({ navigation }) {
    const [busy, setBusy] = useState(false);
    const { theme } = useTheme();
    const styles = React.useMemo(() => createStyles(theme), [theme]);
    
    const [successVisible, setSuccessVisible] = useState(false);
    const [paymentResult, setPaymentResult] = useState(null);

    useEffect(() => {
        NfcManager.start().catch(() => {});
        return () => {
            NfcManager.cancelTechnologyRequest().catch(() => {});
        };
    }, []);

    const readNfc = async () => {
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

            // Extract if JSON
            const raw = String(operator_qr).trim();
            if (raw.startsWith("{") && raw.endsWith("}")) {
                try {
                    const obj = JSON.parse(raw);
                    if (obj?.operator_qr) operator_qr = String(obj.operator_qr).trim();
                } catch { }
            }

            // We have the operator token, now pay!
            const res = await payOperator({ operator_qr });
            setPaymentResult(res);
            setSuccessVisible(true);
        } catch (ex) {
            console.warn('NFC Error:', ex);
            // Ignore cancel exceptions
            if (ex !== 'cancelled') {
                Alert.alert("NFC Error", ex.message || "Failed to read tag or process payment.");
            }
        } finally {
            NfcManager.cancelTechnologyRequest().catch(() => {});
            setBusy(false);
        }
    };

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
                        Tap the button below and hold your phone against the Operator's NFC Tag.
                    </Text>

                    <View style={{ marginTop: 24 }}>
                        <PrimaryButton
                            label={busy ? "Ready to Scan..." : "Start NFC Scan"}
                            onPress={readNfc}
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
