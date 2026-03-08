import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { QrCodeIcon, UserIcon, AnalyticsUpIcon } from "@hugeicons/core-free-icons";

export default function AdminDashboardScreen({ navigation }) {
    const { theme, isDarkMode } = useTheme();
    const styles = useMemo(() => createStyles(theme, isDarkMode), [theme, isDarkMode]);

    return (
        <SafeAreaView style={styles.safe}>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.welcome}>Admin Panel</Text>
                    <Text style={styles.title}>System Overview</Text>
                </View>

                <View style={styles.grid}>
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => navigation.navigate("AdminRegistrationCodes")}
                    >
                        <View style={[styles.iconWrap, { backgroundColor: "rgba(247, 227, 83, 0.1)" }]}>
                            <HugeiconsIcon icon={QrCodeIcon} size={28} color={theme.accent} />
                        </View>
                        <Text style={styles.cardLabel}>Operator Codes</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.card}>
                        <View style={[styles.iconWrap, { backgroundColor: "rgba(76, 175, 80, 0.1)" }]}>
                            <HugeiconsIcon icon={UserIcon} size={28} color={theme.success} />
                        </View>
                        <Text style={styles.cardLabel}>User Management</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.card}>
                        <View style={[styles.iconWrap, { backgroundColor: "rgba(33, 150, 243, 0.1)" }]}>
                            <HugeiconsIcon icon={AnalyticsUpIcon} size={28} color="#2196F3" />
                        </View>
                        <Text style={styles.cardLabel}>System Reports</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const createStyles = (theme, isDarkMode) =>
    StyleSheet.create({
        safe: { flex: 1, backgroundColor: theme.background },
        container: { padding: 24 },
        header: { marginBottom: 32, marginTop: 20 },
        welcome: { fontSize: 14, fontWeight: "700", color: theme.textSecondary, textTransform: "uppercase", letterSpacing: 1 },
        title: { fontSize: 32, fontWeight: "900", color: theme.text, marginTop: 4 },
        grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
        card: {
            width: "47%",
            backgroundColor: theme.card,
            borderRadius: 24,
            padding: 20,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: theme.border,
            alignItems: "center",
        },
        iconWrap: {
            width: 56,
            height: 56,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
        },
        cardLabel: { fontSize: 14, fontWeight: "800", color: theme.text, textAlign: "center" },
    });
