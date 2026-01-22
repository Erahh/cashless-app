import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { Screen, Card, Pill, PrimaryButton, GhostButton } from "../components/ui";
import { supabase } from "../api/supabase";
import { API_BASE_URL } from "../config/api";

export default function PayConfirmScreen({ navigation, route }) {
    const { qr_token } = route.params || {};
    const [amount, setAmount] = useState(15); // demo fare default

    const onPay = async () => {
        try {
            const { data: s } = await supabase.auth.getSession();
            const token = s?.session?.access_token;
            if (!token) throw new Error("No session");

            const res = await fetch(`${API_BASE_URL}/wallet/fare/pay`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    qr_token,
                    amount: 15, // demo fixed fare
                    route: "ROUTE A",
                }),
            });

            const text = await res.text();
            const json = text ? JSON.parse(text) : null;
            if (!res.ok) throw new Error(json?.error || "Payment failed");

            Alert.alert("Paid ✅", `New balance: ₱${Number(json.balance).toFixed(2)}`, [
                { text: "OK", onPress: () => navigation.reset({ index: 0, routes: [{ name: "Home", params: { refresh: true } }] }) },
            ]);
        } catch (e) {
            Alert.alert("Pay failed", e.message);
        }
    };

    return (
        <Screen title="Confirm Payment" subtitle="Review fare before paying.">
            <Card>
                <Pill text="Operator QR scanned" />

                <Text style={styles.label}>QR Token</Text>
                <Text style={styles.value}>{qr_token}</Text>

                <View style={styles.box}>
                    <Text style={styles.label}>Fare Amount</Text>
                    <Text style={styles.money}>₱{Number(amount).toFixed(2)}</Text>

                    <Text style={styles.dim}>
                        This fare will be deducted from your wallet balance.
                    </Text>
                </View>
            </Card>

            <View style={{ marginTop: 14, gap: 10 }}>
                <PrimaryButton label="Pay Now" onPress={onPay} />
                <GhostButton label="Cancel" onPress={() => navigation.goBack()} />
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    label: { marginTop: 16, color: "rgba(244,238,230,0.7)" },
    value: { marginTop: 6, color: "#F4EEE6", fontWeight: "900" },
    box: {
        marginTop: 16,
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
        backgroundColor: "rgba(0,0,0,0.18)",
    },
    money: { marginTop: 6, color: "#F4EEE6", fontWeight: "900", fontSize: 22 },
    dim: { marginTop: 10, color: "rgba(244,238,230,0.55)", fontSize: 12, lineHeight: 16 },
});
