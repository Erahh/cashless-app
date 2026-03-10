import React, { useState, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import AuthBackground from "../../components/AuthBackground";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ArrowLeft01Icon, QrCodeIcon } from "@hugeicons/core-free-icons";
import { API_BASE_URL } from "../../config/api";
import FloatingLabelInput from "../../components/Input";


export default function OperatorCodeScreen({ navigation, route }) {
    const { theme, isDarkMode } = useTheme();
    const styles = useMemo(() => createStyles(theme, isDarkMode), [theme, isDarkMode]);

    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);

    // Data passed from previous screens
    const { role, phone } = route.params || {};

    const validateCode = async () => {
        if (!code.trim()) return Alert.alert("Required", "Please enter your special registration code.");

        setLoading(true);
        try {
            const resp = await fetch(`${API_BASE_URL}/auth/validate-operator-code`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: code.trim().toUpperCase() }),
            });

            const json = await resp.json();
            if (!resp.ok) throw new Error(json.error || "Invalid code");

            // Success - proceed to Personal Info
            navigation.navigate("PersonalInfo", {
                role,
                phone,
                registration_code: code.trim().toUpperCase()
            });
        } catch (e) {
            Alert.alert("Error", e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthBackground>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.container}
                >
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color={theme.text} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        <View style={styles.iconCircle}>
                            <HugeiconsIcon icon={QrCodeIcon} size={40} color={theme.accent} />
                        </View>
                        <Text style={styles.title}>Operator Verification</Text>
                        <Text style={styles.subtitle}>
                            Please enter the special registration code provided by your administrator.
                        </Text>

                        <FloatingLabelInput
                            label="Registration Code"
                            placeholder="OP-XXXXXX"
                            value={code}
                            onChangeText={(t) => setCode(t.toUpperCase())}
                            autoCapitalize="characters"
                            bgColor={theme.background}
                            style={{ marginBottom: 20 }}
                        />


                        <TouchableOpacity
                            style={[styles.btn, loading && { opacity: 0.7 }]}
                            onPress={validateCode}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={isDarkMode ? "#000" : "#fff"} />
                            ) : (
                                <Text style={styles.btnText}>Verify Code</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
        </AuthBackground>
    );
}

const createStyles = (theme, isDarkMode) =>
    StyleSheet.create({
        container: {
            flex: 1,
            paddingHorizontal: 24,
        },
        headerRow: {
            marginTop: 12,
        },
        backBtn: {
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
            alignItems: "center",
            justifyContent: "center",
        },
        content: {
            flex: 1,
            justifyContent: "center",
            paddingBottom: 40,
        },
        iconCircle: {
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: "rgba(247, 227, 83, 0.1)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
        },
        title: {
            fontSize: 28,
            fontWeight: "900",
            color: theme.text,
            marginBottom: 12,
        },
        subtitle: {
            fontSize: 16,
            color: theme.textSecondary,
            lineHeight: 24,
            marginBottom: 32,
        },
        inputWrap: {
            height: 64,
            borderRadius: 18,
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
            paddingHorizontal: 20,
            justifyContent: "center",
            marginBottom: 20,
        },
        input: {
            fontSize: 20,
            fontWeight: "800",
            color: theme.text,
            letterSpacing: 2,
        },
        btn: {
            height: 56,
            borderRadius: 18,
            backgroundColor: theme.accent,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
            elevation: 4,
        },
        btnText: {
            fontSize: 16,
            fontWeight: "900",
            color: isDarkMode ? "#0B0E14" : "#FFFFFF",
        },
    });
