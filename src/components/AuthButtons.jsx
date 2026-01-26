import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";

export function GoldButton({ label, onPress, disabled }) {
    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={onPress}
            disabled={disabled}
            style={[styles.goldBtn, disabled && { opacity: 0.6 }]}
        >
            <Text style={styles.goldText}>{label}</Text>
        </TouchableOpacity>
    );
}

export function TextLink({ label, onPress }) {
    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
            <Text style={styles.link}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    goldBtn: {
        marginTop: 22,
        height: 54,
        borderRadius: 999,
        backgroundColor: "#FFD36A",
        alignItems: "center",
        justifyContent: "center",
    },
    goldText: { color: "#0B0E14", fontWeight: "900", fontSize: 16 },
    link: { color: "#FFD36A", fontWeight: "900" },
});
