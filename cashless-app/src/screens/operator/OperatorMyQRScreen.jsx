import React, { useEffect, useState, useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, Alert, ActivityIndicator, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { getOperatorQR } from "../../api/operatorApi";
import { useTheme } from "../../context/ThemeContext";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ArrowLeft01Icon, Camera01Icon, CheckmarkBadge01Icon } from "@hugeicons/core-free-icons";

export default function OperatorMyQRScreen({ navigation }) {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
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
        <SafeAreaView style={styles.safe}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.headerRow}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <HugeiconsIcon icon={ArrowLeft01Icon} size={20} color={theme.text} />
                    </TouchableOpacity>
                    <View style={styles.headerTitles}>
                        <Text style={styles.title}>Operator QR</Text>
                        <Text style={styles.subtitle}>Show this QR so commuters can pay you.</Text>
                    </View>
                </View>

                <View style={styles.mainCard}>
                    <View style={styles.pillContainer}>
                        <View style={styles.pill}>
                            <HugeiconsIcon icon={CheckmarkBadge01Icon} size={14} color={theme.warning} />
                            <Text style={styles.pillText}>Operator Payment</Text>
                        </View>
                    </View>

                    {loading ? (
                        <View style={styles.centerPad}>
                            <ActivityIndicator color={theme.success} />
                            <Text style={styles.dimText}>Loading QR…</Text>
                        </View>
                    ) : value ? (
                        <View style={styles.qrContainer}>
                            <View style={styles.qrWrapper}>
                                <QRCode value={value} size={200} />
                            </View>
                            <Text style={styles.qrHint}>
                                Ask the commuter to scan this QR and confirm amount.
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.centerPad}>
                            <Text style={styles.dimText}>No QR available.</Text>
                        </View>
                    )}
                </View>

                <TouchableOpacity
                    onPress={() => navigation.navigate("OperatorScan")}
                    activeOpacity={0.9}
                    style={styles.scanActionBtn}
                >
                    <HugeiconsIcon icon={Camera01Icon} size={20} color={theme.text} />
                    <Text style={styles.scanActionText}>Scan QR</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const createStyles = (theme) => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    content: { padding: 18 },
    
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 24, minHeight: 44, position: "relative" },
    backBtn: {
        position: "absolute",
        left: 0,
        zIndex: 10,
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: theme.border,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: theme.isDark ? 0.4 : 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    headerTitles: { alignItems: "center", paddingHorizontal: 54 },
    title: { fontSize: 22, fontWeight: "900", color: theme.text, textAlign: "center" },
    subtitle: { fontSize: 13, color: theme.textSecondary, marginTop: 4, textAlign: "center" },

    mainCard: {
        borderRadius: 24,
        padding: 24,
        backgroundColor: theme.cardAlt,
        borderWidth: 1,
        borderColor: theme.border,
        minHeight: 340,
    },
    pillContainer: { alignItems: "flex-start" },
    pill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: theme.warningBg,
        borderWidth: 1,
        borderColor: theme.warning,
    },
    pillText: { color: theme.warning, fontWeight: "800", fontSize: 12 },

    centerPad: { paddingVertical: 40, alignItems: "center", justifyContent: "center" },
    dimText: { marginTop: 12, color: theme.textSecondary, fontSize: 14 },

    qrContainer: { marginTop: 30, alignItems: "center" },
    qrWrapper: { padding: 16, backgroundColor: 'white', borderRadius: 16 },
    qrHint: { marginTop: 24, color: theme.textMuted, fontSize: 13, textAlign: "center", paddingHorizontal: 20 },

    scanActionBtn: {
        flexDirection: "row",
        marginTop: 24,
        padding: 16,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        borderColor: theme.isDark ? "rgba(255,255,255,0.1)" : theme.border,
        backgroundColor: theme.isDark ? "rgba(255,255,255,0.05)" : theme.card,
        gap: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: theme.isDark ? 0.3 : 0.05,
        shadowRadius: 10,
        elevation: 4,
    },
    scanActionText: { color: theme.text, fontWeight: "900", fontSize: 16 },
});
