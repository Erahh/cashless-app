import React, { useState, useEffect, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Alert,
    TextInput,
    Modal,
    SafeAreaView,
    RefreshControl,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { QrCodeIcon, WalletAdd01Icon, ArrowLeft01Icon, InvoiceIcon } from "@hugeicons/core-free-icons";
import { API_BASE_URL } from "../../config/api";
import { supabase } from "../../api/supabase";
import * as Clipboard from "expo-clipboard";

export default function AdminRegistrationCodesScreen({ navigation }) {
    const { theme, isDarkMode } = useTheme();
    const styles = useMemo(() => createStyles(theme, isDarkMode), [theme, isDarkMode]);

    const [codes, setCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [assignee, setAssignee] = useState("");
    const [genLoading, setGenLoading] = useState(false);

    useEffect(() => {
        fetchCodes();
    }, []);

    const fetchCodes = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const resp = await fetch(`${API_BASE_URL}/admin/registration-codes`, {
                headers: { Authorization: `Bearer ${session?.access_token}` },
            });
            const json = await resp.json();
            if (!resp.ok) throw new Error(json.error || "Failed to fetch codes");
            setCodes(json.codes);
        } catch (e) {
            Alert.alert("Error", e.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const generateCode = async () => {
        if (!assignee.trim()) return Alert.alert("Required", "Please enter who this code is for.");

        setGenLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const resp = await fetch(`${API_BASE_URL}/admin/registration-codes/generate`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${session?.access_token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ assigned_to: assignee.trim() }),
            });

            const json = await resp.json();
            if (!resp.ok) throw new Error(json.error || "Failed to generate");

            setCodes([json.code, ...codes]);
            setShowModal(false);
            setAssignee("");
            Alert.alert("Success", "Registration code generated successfully!");
        } catch (e) {
            Alert.alert("Error", e.message);
        } finally {
            setGenLoading(false);
        }
    };

    const copyToClipboard = async (code) => {
        await Clipboard.setStringAsync(code);
        Alert.alert("Copied", "Code copied to clipboard!");
    };

    const renderItem = ({ item }) => (
        <View style={styles.codeCard}>
            <View style={styles.codeHeader}>
                <View style={styles.codeInfo}>
                    <Text style={styles.codeText}>{item.code}</Text>
                    <Text style={styles.assigneeText}>For: {item.assigned_to}</Text>
                </View>
                <TouchableOpacity onPress={() => copyToClipboard(item.code)}>
                    <HugeiconsIcon icon={InvoiceIcon} size={20} color={theme.accent} />
                </TouchableOpacity>
            </View>
            <View style={styles.cardFooter}>
                <View style={[styles.badge, { backgroundColor: item.status === "used" ? theme.success + "20" : theme.accent + "20" }]}>
                    <Text style={[styles.badgeText, { color: item.status === "used" ? theme.success : theme.accent }]}>
                        {item.status.toUpperCase()}
                    </Text>
                </View>
                <Text style={styles.dateText}>
                    {new Date(item.created_at).toLocaleDateString()}
                </Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color={theme.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Operator Codes</Text>
                <TouchableOpacity onPress={() => setShowModal(true)} style={styles.addBtn}>
                    <HugeiconsIcon icon={WalletAdd01Icon} size={24} color={theme.text} />
                </TouchableOpacity>
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator color={theme.accent} size="large" />
                </View>
            ) : (
                <FlatList
                    data={codes}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCodes(); }} tintColor={theme.accent} />
                    }
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Text style={styles.emptyText}>No registration codes yet.</Text>
                        </View>
                    }
                />
            )}

            {/* Generate Modal */}
            <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
                <View style={styles.backdrop}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>Generate New Code</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Who is this for? (e.g. John Doe)"
                            placeholderTextColor={theme.textMuted}
                            value={assignee}
                            onChangeText={setAssignee}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.genBtn} onPress={generateCode} disabled={genLoading}>
                                {genLoading ? <ActivityIndicator color="#000" size="small" /> : <Text style={styles.genText}>Generate</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const createStyles = (theme, isDarkMode) =>
    StyleSheet.create({
        safe: { flex: 1, backgroundColor: theme.background },
        header: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 20,
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
        headerTitle: { fontSize: 18, fontWeight: "900", color: theme.text },
        addBtn: {
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: theme.accent,
            alignItems: "center",
            justifyContent: "center",
        },
        list: { padding: 20 },
        codeCard: {
            backgroundColor: theme.card,
            borderRadius: 20,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: theme.border,
        },
        codeHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
        codeText: { fontSize: 22, fontWeight: "900", color: theme.text, letterSpacing: 1 },
        assigneeText: { fontSize: 14, color: theme.textSecondary, marginTop: 4 },
        cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
        badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
        badgeText: { fontSize: 10, fontWeight: "800" },
        dateText: { fontSize: 12, color: theme.textMuted },
        center: { flex: 1, justifyContent: "center", alignItems: "center" },
        empty: { marginTop: 100, alignItems: "center" },
        emptyText: { color: theme.textMuted, fontSize: 16 },
        backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
        modal: { backgroundColor: theme.card, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: theme.border },
        modalTitle: { fontSize: 20, fontWeight: "900", color: theme.text, marginBottom: 20 },
        input: {
            height: 56,
            borderRadius: 16,
            backgroundColor: theme.background,
            borderWidth: 1,
            borderColor: theme.border,
            paddingHorizontal: 16,
            color: theme.text,
            marginBottom: 24,
        },
        modalButtons: { flexDirection: "row", gap: 12 },
        cancelBtn: { flex: 1, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: theme.background },
        cancelText: { fontWeight: "700", color: theme.textMuted },
        genBtn: { flex: 1, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: theme.accent },
        genText: { fontWeight: "900", color: "#0B0E14" },
    });
