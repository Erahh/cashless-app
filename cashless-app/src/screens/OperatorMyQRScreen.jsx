import React, { useEffect, useState } from "react";
import { View, Text, Alert, ActivityIndicator, TouchableOpacity } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Screen, Card, Pill } from "../components/ui";
import { getOperatorQR } from "../api/operatorApi";

export default function OperatorMyQRScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [value, setValue] = useState("");

    const load = async () => {
        setLoading(true);
        try {
            const json = await getOperatorQR();
            setValue(json?.credential?.value || "");
        } catch (e) {
            Alert.alert("Operator QR", e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    return (
        <Screen title="Operator QR" subtitle="Show this QR so commuters can pay you.">
            <Card>
                <Pill text="Operator Payment" />
                {loading ? (
                    <View style={{ paddingVertical: 24, alignItems: "center" }}>
                        <ActivityIndicator />
                        <Text style={{ marginTop: 10, color: "rgba(244,238,230,0.65)" }}>Loading QR…</Text>
                    </View>
                ) : value ? (
                    <View style={{ marginTop: 18, alignItems: "center" }}>
                        <View style={{ padding: 10, backgroundColor: 'white', borderRadius: 10 }}>
                            <QRCode value={value} size={200} />
                        </View>
                        <Text style={{ marginTop: 14, color: "rgba(244,238,230,0.6)", fontSize: 12, textAlign: "center" }}>
                            Ask the commuter to scan this QR and confirm amount.
                        </Text>
                    </View>
                ) : (
                    <Text style={{ marginTop: 16, color: "rgba(244,238,230,0.65)" }}>No QR available.</Text>
                )}
            </Card>

            <TouchableOpacity
                onPress={load}
                activeOpacity={0.9}
                style={{
                    marginTop: 12,
                    padding: 14,
                    borderRadius: 14,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.12)",
                }}
            >
                <Text style={{ color: "#F4EEE6", fontWeight: "900" }}>Refresh QR</Text>
            </TouchableOpacity>
        </Screen>
    );
}
