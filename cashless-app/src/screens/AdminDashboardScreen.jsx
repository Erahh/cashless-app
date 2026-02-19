import React from "react";
import { View, Text } from "react-native";

export default function AdminDashboardScreen() {
    return (
        <View style={{ flex: 1, backgroundColor: "#0B0E14", justifyContent: "center", alignItems: "center" }}>
            <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900" }}>Admin Dashboard</Text>
        </View>
    );
}
