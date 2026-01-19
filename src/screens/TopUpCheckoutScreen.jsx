import React, { useEffect, useState } from "react";
import { View, Text, Alert } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Screen, Card, PrimaryButton, GhostButton, Pill } from "../components/ui";
import { supabase } from "../api/supabase";
import { API_BASE_URL } from "../config/api";

export default function TopUpCheckoutScreen({ navigation, route }) {
    const { ref, url } = route.params;

    const [status, setStatus] = useState("PENDING");
    const [loading, setLoading] = useState(true);

    const pollOnce = async () => {
        try {
            const { data: s } = await supabase.auth.getSession();
            const token = s?.session?.access_token;
            if (!token) return;

            const res = await fetch(`${API_BASE_URL}/wallet/topup/${ref}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            if (res.ok && json?.status) setStatus(json.status);
        } catch (e) {
            // silent polling errors
        }
    };

    useEffect(() => {
        let interval;

        (async () => {
            // open PayMongo checkout
            await WebBrowser.openBrowserAsync(url);

            // once user closes browser, start polling
            setLoading(false);
            await pollOnce();

            interval = setInterval(pollOnce, 1500);

            // stop polling after 45 seconds
            setTimeout(() => clearInterval(interval), 45000);
        })();

        return () => {
            if (interval) clearInterval(interval);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (status === "PAID") {
            Alert.alert("Top Up Success ✅", "Your wallet has been credited.", [
                {
                    text: "Go to Home",
                    onPress: () =>
                        navigation.reset({
                            index: 0,
                            routes: [{ name: "Home", params: { refresh: Date.now() } }],
                        }),
                },
            ]);
        }
    }, [status, navigation]);

    return (
        <Screen
            title="Processing Payment"
            subtitle="Complete your payment in GCash. We'll update your wallet automatically."
        >
            <Card>
                <Pill text="PayMongo Checkout" />

                <Text style={{ marginTop: 16, color: "rgba(244,238,230,0.8)" }}>
                    Reference
                </Text>
                <Text style={{ marginTop: 6, color: "#F4EEE6", fontWeight: "900" }}>
                    {ref}
                </Text>

                <View
                    style={{
                        marginTop: 18,
                        borderRadius: 16,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.10)",
                        backgroundColor: "rgba(0,0,0,0.18)",
                    }}
                >
                    <Text style={{ color: "rgba(244,238,230,0.7)" }}>Status</Text>
                    <Text style={{ marginTop: 6, color: "#F4EEE6", fontWeight: "900", fontSize: 18 }}>
                        {loading ? "Opening checkout..." : status}
                    </Text>

                    <Text style={{ marginTop: 10, color: "rgba(244,238,230,0.55)", fontSize: 12 }}>
                        If you already paid, tap Refresh. If you canceled, you can go back and try again.
                    </Text>
                </View>
            </Card>

            <View style={{ marginTop: 14, gap: 10 }}>
                <PrimaryButton label="Refresh Status" onPress={pollOnce} />
                <GhostButton label="Back" onPress={() => navigation.goBack()} />
            </View>
        </Screen>
    );
}
