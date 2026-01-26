import React, { useState } from "react";
import { View, Text, TextInput, Alert, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { createOperatorByPhone } from "../api/adminApi";

export default function AdminCreateOperatorScreen({ navigation }) {
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        try {
            const p = phone.trim();
            if (!/^\+63\d{10}$/.test(p)) {
                return Alert.alert("Error", "Use format: +639xxxxxxxxx");
            }

            setLoading(true);
            await createOperatorByPhone(p);
            Alert.alert("Success", "Operator created!", [
                { text: "OK", onPress: () => navigation.goBack() }
            ]);
        } catch (e) {
            Alert.alert("Error", e.message || "Failed to create operator");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Text style={styles.backText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Create Operator</Text>
                </View>

                <View style={styles.content}>
                    <Text style={styles.label}>Phone Number</Text>
                    <Text style={styles.subLabel}>Enter the mobile number for the new operator account.</Text>

                    <TextInput
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="+639xxxxxxxxx"
                        placeholderTextColor="rgba(255,255,255,0.35)"
                        keyboardType="phone-pad"
                        style={styles.input}
                    />

                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={loading}
                        style={[styles.btn, loading && { opacity: 0.7 }]}
                    >
                        <Text style={styles.btnText}>{loading ? "Creating..." : "Create Operator"}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: "#0B0E14" },
    container: { flex: 1, padding: 18 },
    header: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
    backBtn: { marginRight: 14, padding: 8 },
    backText: { color: "#fff", fontSize: 24, fontWeight: "900" },
    title: { color: "#fff", fontSize: 20, fontWeight: "900" },

    content: { marginTop: 10 },
    label: { color: "#fff", fontSize: 16, fontWeight: "700" },
    subLabel: { color: "rgba(255,255,255,0.6)", marginTop: 6, fontSize: 13, marginBottom: 14 },

    input: {
        backgroundColor: "rgba(255,255,255,0.06)",
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
        color: "#fff",
        fontSize: 16,
    },

    btn: {
        marginTop: 24,
        backgroundColor: "#FFD36A",
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
    },
    btnText: { fontWeight: "900", color: "#0B0E14", fontSize: 16 },
});
