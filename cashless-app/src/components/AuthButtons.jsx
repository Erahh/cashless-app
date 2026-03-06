import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { useTheme } from "../context/ThemeContext";

export function GoldButton({ label, onPress, disabled }) {
    const { theme } = useTheme();

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={onPress}
            disabled={disabled}
            style={[
                styles.goldBtn,
                {
                    backgroundColor: theme.isDark ? theme.accent : theme.primary,
                },
                disabled && { opacity: 0.5 },
            ]}
        >
            <Text style={[
                styles.goldText,
                { color: theme.isDark ? "#0B0E14" : "#FFFFFF" }
            ]}>{label}</Text>
        </TouchableOpacity>
    );
}

export function TextLink({ label, onPress }) {
    const { theme } = useTheme();

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
            <Text style={[styles.link, { color: theme.accent }]}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    goldBtn: {
        marginTop: 24,
        height: 56,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 4,
    },
    goldText: { fontWeight: "900", fontSize: 16, letterSpacing: 0.3 },
    link: { fontWeight: "800", fontSize: 14 },
});
