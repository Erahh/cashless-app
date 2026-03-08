import React, { useState } from "react";
import { View, Text, TextInput, Alert, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform, TouchableWithoutFeedback, Keyboard, StyleSheet } from "react-native";
import { Screen, Card, PrimaryButton, GhostButton, Pill } from "../../components/ui";
import { supabase } from "../../api/supabase";
import { API_BASE_URL } from "../../config/api";

const PRESETS = [50, 100, 200, 500, 1000];

export default function TopUpScreen({ navigation }) {
    const [amount, setAmount] = useState("");

    const startTopup = async () => {
        try {
            const amt = Number(amount);
            if (!amt || amt < 20) return Alert.alert("Top Up", "Minimum is ₱20");

            const { data: s } = await supabase.auth.getSession();
            const token = s?.session?.access_token;
            if (!token) return Alert.alert("Session", "Please login again.");

            const res = await fetch(`${API_BASE_URL}/wallet/topup/checkout`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ amount: amt }),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed to create checkout");

            navigation.navigate("TopUpCheckout", { ref: json.ref, url: json.checkout_url });
        } catch (e) {
            Alert.alert("Error", e.message);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
        >
            <Screen title="Top Up" subtitle="Add funds to your wallet using GCash.">
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <Card>
                        <Pill text="GCash / PayMongo" />

                        <Text style={s.label}>Amount (PHP)</Text>
                        <TextInput
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="numeric"
                            placeholder="e.g. 100"
                            placeholderTextColor="rgba(244,238,230,0.35)"
                            style={s.amountInput}
                        />

                        {/* ✅ Quick Amount Presets */}
                        <Text style={s.presetLabel}>Quick Select</Text>
                        <View style={s.presetsRow}>
                            {PRESETS.map((val) => (
                                <TouchableOpacity
                                    key={val}
                                    style={[
                                        s.presetBtn,
                                        Number(amount) === val && s.presetBtnActive,
                                    ]}
                                    activeOpacity={0.8}
                                    onPress={() => setAmount(String(val))}
                                >
                                    <Text
                                        style={[
                                            s.presetText,
                                            Number(amount) === val && s.presetTextActive,
                                        ]}
                                    >
                                        ₱{val.toLocaleString()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={s.hint}>
                            Minimum amount is ₱20.00
                        </Text>
                    </Card>

                    <View style={{ marginTop: "auto", gap: 10, paddingBottom: 140, paddingTop: 20 }}>
                        <PrimaryButton label="Continue to GCash" onPress={startTopup} />
                    </View>
                </ScrollView>
            </Screen>
        </KeyboardAvoidingView>
    );
}

const s = StyleSheet.create({
    label: {
        marginTop: 20,
        color: "rgba(244,238,230,0.8)",
        fontSize: 13,
        fontWeight: "600",
    },
    amountInput: {
        marginTop: 10,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
        backgroundColor: "rgba(0,0,0,0.18)",
        color: "#F4EEE6",
        fontWeight: "800",
        fontSize: 18,
    },
    presetLabel: {
        marginTop: 16,
        color: "rgba(244,238,230,0.5)",
        fontSize: 12,
        fontWeight: "600",
        marginBottom: 8,
    },
    presetsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    presetBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
    },
    presetBtnActive: {
        backgroundColor: "rgba(242,233,78,0.15)",
        borderColor: "rgba(242,233,78,0.4)",
    },
    presetText: {
        color: "rgba(244,238,230,0.6)",
        fontWeight: "800",
        fontSize: 14,
    },
    presetTextActive: {
        color: "#F2E94E",
    },
    hint: {
        marginTop: 12,
        fontSize: 12,
        color: "rgba(244,238,230,0.5)",
    },
});
