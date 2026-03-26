import React, { useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Modal,
    Pressable
} from "react-native";

import { useTheme } from "../../context/ThemeContext";
import AuthBackground from "../../components/AuthBackground";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { UserIcon, Bus01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import CEraLogo from "../../components/CEraLogo";

export default function RoleSelectionScreen({ navigation }) {
    const { theme, isDarkMode } = useTheme();
    const styles = useMemo(() => createStyles(theme, isDarkMode), [theme, isDarkMode]);

    const [showLoginModal, setShowLoginModal] = useState(false);

    const selectRole = (role) => {
        navigation.navigate("PhoneScreen", { mode: "register", role });
    };

    const handleLoginSelect = (role) => {
        setShowLoginModal(false);
        navigation.navigate("PhoneScreen", { mode: "login", role });
    };

    const handleLogin = () => {
        setShowLoginModal(true);
    };

    return (
        <AuthBackground>
            <SafeAreaView style={styles.safe}>
                <View style={styles.container}>
                    <View style={styles.header}>
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
                                onPress={handleLogin}
                            >
                                Log In
                            </Text>
                        </Text>
                    </View>
                </View>
            </SafeAreaView>

            <Modal
                visible={showLoginModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowLoginModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <Pressable style={{ flex: 1 }} onPress={() => setShowLoginModal(false)} />
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHandle} />
                            <Text style={styles.modalTitle}>Choose Account Type</Text>
                            <Text style={styles.modalSubtitle}>Which portal would you like to access?</Text>
                        </View>

                        <View style={styles.modalOptions}>
                            <TouchableOpacity
                                style={styles.modalOptionBtn}
                                onPress={() => handleLoginSelect("commuter")}
                            >
                                <View style={[styles.modalIconWrap, { backgroundColor: "rgba(76, 175, 80, 0.1)" }]}>
                                    <HugeiconsIcon icon={UserIcon} size={28} color={theme.success} />
                                </View>
                                <Text style={styles.modalOptionText}>Commuter Login</Text>
                                <HugeiconsIcon icon={ArrowRight01Icon} size={20} color={theme.textMuted} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.modalOptionBtn}
                                onPress={() => handleLoginSelect("operator")}
                            >
                                <View style={[styles.modalIconWrap, { backgroundColor: "rgba(247, 227, 83, 0.1)" }]}>
                                    <HugeiconsIcon icon={Bus01Icon} size={28} color={theme.accent} />
                                </View>
                                <Text style={styles.modalOptionText}>Operator Portal</Text>
                                <HugeiconsIcon icon={ArrowRight01Icon} size={20} color={theme.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.modalCancelBtn}
                            onPress={() => setShowLoginModal(false)}
                        >
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
            justifyContent: "flex-start",
        },
        header: {
            marginTop: 120,
            marginBottom: 48,
        },
        title: {
            fontSize: 32,
            fontWeight: "900",
            color: theme.text,
            lineHeight: 40,
            marginBottom: 8,
            textAlign: "center",
        },
        subtitle: {
            fontSize: 16,
            color: theme.textSecondary,
            fontWeight: "500",
            textAlign: "center",
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
        modalOverlay: {
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "flex-end",
        },
        modalContent: {
            backgroundColor: isDarkMode ? theme.background : theme.card,
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            padding: 24,
            paddingBottom: 48,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -8 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 10,
        },
        modalHeader: {
            alignItems: "center",
            marginBottom: 32,
        },
        modalHandle: {
            width: 48,
            height: 6,
            borderRadius: 3,
            backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)",
            marginBottom: 24,
            marginTop: -8,
        },
        modalTitle: {
            fontSize: 28,
            fontWeight: "900",
            color: theme.text,
            marginBottom: 8,
            textAlign: "center",
        },
        modalSubtitle: {
            fontSize: 16,
            color: theme.textSecondary,
            textAlign: "center",
        },
        modalOptions: {
            gap: 16,
            marginBottom: 32,
        },
        modalOptionBtn: {
            flexDirection: "row",
            alignItems: "center",
            padding: 16,
            backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.03)" : "#F9F9F9",
            borderRadius: 24,
            borderWidth: 1,
            borderColor: theme.border,
        },
        modalIconWrap: {
            width: 56,
            height: 56,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 16,
        },
        modalOptionText: {
            flex: 1,
            fontSize: 19,
            fontWeight: "800",
            color: theme.text,
        },
        modalCancelBtn: {
            padding: 18,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 20,
            backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
        },
        modalCancelText: {
            fontSize: 17,
            fontWeight: "700",
            color: theme.text,
        },
    });
