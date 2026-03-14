import React, { useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Dimensions,
    Alert,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import AuthBackground from "../../components/AuthBackground";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { UserIcon, Bus01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import CEraLogo from "../../components/CEraLogo";

const { width } = Dimensions.get("window");

export default function RoleSelectionScreen({ navigation }) {
    const { theme, isDarkMode } = useTheme();
    const styles = useMemo(() => createStyles(theme, isDarkMode), [theme, isDarkMode]);

    const selectRole = (role) => {
        navigation.navigate("PhoneScreen", { role });
    };

    return (
        <AuthBackground>
            <SafeAreaView style={styles.safe}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={styles.logoWrapper}>
                            <CEraLogo size="small" />
                        </View>
                        <Text style={styles.title}>Join the Future of Mobility</Text>
                        <Text style={styles.subtitle}>Choose your path to get started</Text>
                    </View>

                    <View style={styles.rolesContainer}>
                        {/* Commuter Role */}
                        <TouchableOpacity
                            activeOpacity={0.9}
                            style={styles.card}
                            onPress={() => selectRole("commuter")}
                        >
                            <View style={[styles.iconWrap, { backgroundColor: "rgba(76, 175, 80, 0.1)" }]}>
                                <HugeiconsIcon icon={UserIcon} size={32} color={theme.success} />
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={styles.cardTitle}>Commuter</Text>
                                <Text style={styles.cardDesc}>Fast, cashless, and reliable daily travel.</Text>
                            </View>
                            <HugeiconsIcon icon={ArrowRight01Icon} size={24} color={theme.textMuted} />
                        </TouchableOpacity>

                        {/* Operator Role */}
                        <TouchableOpacity
                            activeOpacity={0.9}
                            style={[styles.card, { marginTop: 20 }]}
                            onPress={() => selectRole("operator")}
                        >
                            <View style={[styles.iconWrap, { backgroundColor: "rgba(247, 227, 83, 0.1)" }]}>
                                <HugeiconsIcon icon={Bus01Icon} size={32} color={theme.accent} />
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={styles.cardTitle}>Operator</Text>
                                <Text style={styles.cardDesc}>Manage your fleet and maximize earnings.</Text>
                            </View>
                            <HugeiconsIcon icon={ArrowRight01Icon} size={24} color={theme.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            Already have an account?{" "}
                            <Text
                                style={styles.loginLink}
                                onPress={() => {
                                    Alert.alert(
                                        "Log In",
                                        "Select your account type:",
                                        [
                                            { text: "Commuter", onPress: () => navigation.navigate("PhoneScreen", { mode: "login", role: "commuter" }) },
                                            { text: "Operator", onPress: () => navigation.navigate("PhoneScreen", { mode: "login", role: "operator" }) },
                                            { text: "Cancel", style: "cancel" }
                                        ]
                                    );
                                }}
                            >
                                Log In
                            </Text>
                        </Text>
                    </View>
                </View>
            </SafeAreaView>
        </AuthBackground>
    );
}

const createStyles = (theme, isDarkMode) =>
    StyleSheet.create({
        safe: {
            flex: 1,
        },
        container: {
            flex: 1,
            paddingHorizontal: 24,
            justifyContent: "center",
        },
        header: {
            marginBottom: 48,
        },
        logoWrapper: {
            marginBottom: 16,
            alignItems: "flex-start",
        },
        title: {
            fontSize: 32,
            fontWeight: "900",
            color: theme.text,
            lineHeight: 40,
            marginBottom: 8,
        },
        subtitle: {
            fontSize: 16,
            color: theme.textSecondary,
            fontWeight: "500",
        },
        rolesContainer: {
            width: "100%",
        },
        card: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: theme.card,
            padding: 20,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: theme.border,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.1,
            shadowRadius: 16,
            elevation: 4,
        },
        iconWrap: {
            width: 64,
            height: 64,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
        },
        cardContent: {
            flex: 1,
            marginLeft: 20,
        },
        cardTitle: {
            fontSize: 20,
            fontWeight: "800",
            color: theme.text,
            marginBottom: 4,
        },
        cardDesc: {
            fontSize: 14,
            color: theme.textSecondary,
            lineHeight: 20,
        },
        footer: {
            marginTop: 48,
            alignItems: "center",
        },
        footerText: {
            fontSize: 14,
            color: theme.textSecondary,
        },
        loginLink: {
            color: isDarkMode ? theme.accent : "#333333",
            fontWeight: "800",
        },
    });
