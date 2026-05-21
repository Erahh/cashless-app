import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert, StyleSheet, ScrollView } from "react-native";
import { Screen, Card, Pill, PrimaryButton, GhostButton } from "../../components/ui";
import { supabase } from "../../api/supabase";
import { payOperator } from "../../api/payApi";
import FareSuccessModal from "../../components/FareSuccessModal";

export default function PayConfirmScreen({ navigation, route }) {
    const { qr_token, route_name = null } = route.params || {};
    const [loading, setLoading] = useState(false);
    const [successVisible, setSuccessVisible] = useState(false);
    const [paymentResult, setPaymentResult] = useState(null);

    const onPay = async () => {
        try {
            const { data: s } = await supabase.auth.getSession();
            if (!s?.session?.access_token) throw new Error("No session");

            setLoading(true);
            const json = await payOperator({ operator_qr: qr_token, route: route_name });
            setPaymentResult(json);
            setSuccessVisible(true);
        } catch (e) {
            Alert.alert("Pay failed", e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Screen title="Confirm Payment" subtitle="Review fare before paying.">
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
                <Card>
                    <Pill text="Operator QR scanned" />

                    <Text style={styles.label}>QR Token</Text>
                    <Text style={styles.value}>{qr_token}</Text>

                    <View style={styles.box}>
                        <Text style={styles.label}>Fare</Text>
                        <Text style={styles.money}>Automatic discounted fare</Text>

                        <Text style={styles.dim}>
                            Your commuter account determines whether this is Student Fare, Senior Fare, or Regular Fare.
                        </Text>
                    </View>
                </Card>

                <View style={{ marginTop: 14, gap: 10 }}>
                    <PrimaryButton label={loading ? "Processing..." : "Pay Now"} onPress={onPay} disabled={loading} />
                    <GhostButton label="Cancel" onPress={() => navigation.goBack()} />
                </View>
            </ScrollView>

            <FareSuccessModal
                visible={successVisible}
                result={paymentResult}
                onDone={() => {
                    setSuccessVisible(false);
                    setPaymentResult(null);
                    navigation.reset({ index: 0, routes: [{ name: "Home", params: { refresh: true } }] });
                }}
            />
        </Screen>
    );
}

const styles = StyleSheet.create({
    label: { marginTop: 16, color: "rgba(244,238,230,0.7)", textTransform: "uppercase", letterSpacing: 0.6, fontSize: 12, fontWeight: "800" },
    value: { marginTop: 6, color: "#F4EEE6", fontWeight: "900" },
    box: {
        marginTop: 16,
        padding: 16,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
        backgroundColor: "rgba(0,0,0,0.18)",
    },
    money: { marginTop: 6, color: "#F4EEE6", fontWeight: "900", fontSize: 20, letterSpacing: -0.2 },
    dim: { marginTop: 10, color: "rgba(244,238,230,0.55)", fontSize: 12, lineHeight: 16 },
});
