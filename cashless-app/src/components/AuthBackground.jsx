import React from "react";
import { StyleSheet, View, StatusBar, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";

export default function AuthBackground({ children }) {
    const { theme, isDarkMode } = useTheme();

    return (
        <View style={[styles.root, { backgroundColor: theme.background }]}>
            <StatusBar
                barStyle={isDarkMode ? "light-content" : "dark-content"}
                backgroundColor={theme.background}
                translucent={false}
            />
            {/* Subtle decorative glow */}
            <View style={[styles.glowCircle, {
                backgroundColor: isDarkMode
                    ? "rgba(247, 227, 83, 0.04)"
                    : "rgba(247, 227, 83, 0.08)",
            }]} />
            <SafeAreaView style={styles.safe}>
                <View style={styles.wrap}>{children}</View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    safe: { flex: 1 },
    wrap: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
    glowCircle: {
        position: "absolute",
        top: -120,
        right: -80,
        width: 300,
        height: 300,
        borderRadius: 150,
    },
});
