import React, { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator } from "react-native";

import { supabase } from "../../api/supabase";
import { API_BASE_URL } from "../../config/api";
import logger from '../../utils/logger';

export default function RegisterRFIDScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [scanning, setScanning] = useState(false);
    const [registeredCards, setRegisteredCards] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRegisteredCards();
    }, []);

    const loadRegisteredCards = async () => {
        try {
            setLoading(true);
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData?.session?.access_token;
            if (!token) return;

            const res = await fetch(`${API_BASE_URL}/credentials/my-rfid`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const json = await res.json();
            if (res.ok) {
                setRegisteredCards(json.credentials || []);
            }
        } catch (e) {
            logger.error("Load RFID cards error:", e);
        } finally {
            setLoading(false);
        }
    };

    const startNFCScan = async () => {
        setScanning(true);

        // Simulate NFC scan (in production, use expo-nfc or react-native-nfc-manager)
        // For demo purposes, we'll generate a random card UID
        setTimeout(async () => {
            // Simulated card UID (8 hex characters = 4 bytes)
            const simulatedCardUID = Math.random()
                .toString(16)
                .substring(2, 10)
                .toUpperCase();

            await registerCard(simulatedCardUID);
            setScanning(false);
        }, 2000);
    };

    const registerCard = async (cardUID) => {
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData?.session?.access_token;
            if (!token) {
                Alert.alert("Error", "Please login again");
                return;
            }

            const res = await fetch(`${API_BASE_URL}/credentials/register-rfid`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ card_uid: cardUID }),
            });

            const json = await res.json();

            if (res.ok) {
                Alert.alert(
                    "Success! ✅",
                    `RFID card registered successfully!\n\nCard UID: ${cardUID}`,
                    [
                        {
                            text: "OK",
                            onPress: () => loadRegisteredCards(),
                        },
                    ]
                );
            } else {
                Alert.alert("Registration Failed", json.error || "Unknown error");
            }
        } catch (e) {
            Alert.alert("Error", e.message);
        }
    };

    const removeCard = async (cardId, cardValue) => {
        Alert.alert(
            "Remove Card",
            `Are you sure you want to remove card ${cardValue}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const { data: sessionData } = await supabase.auth.getSession();
                            const token = sessionData?.session?.access_token;
                            if (!token) return;

                            const res = await fetch(
                                `${API_BASE_URL}/credentials/${cardId}`,
                                {
                                    method: "DELETE",
                                    headers: { Authorization: `Bearer ${token}` },
                                }
                            );

                            if (res.ok) {
                                Alert.alert("Success", "Card removed successfully");
                                loadRegisteredCards();
                            } else {
                                const json = await res.json();
                                Alert.alert("Error", json.error || "Failed to remove card");
                            }
                        } catch (e) {
                            Alert.alert("Error", e.message);
                        }
                    },
                },
            ]
        );
    };

    return (
        <View style={[styles.safe, { paddingTop: insets.top }]}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.backText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Register RFID Card</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Scan Card Section */}
                <View style={styles.scanSection}>
                    <View style={styles.nfcIcon}>
                        <Text style={styles.nfcIconText}>📡</Text>
                    </View>

                    <Text style={styles.scanTitle}>
                        {scanning ? "Scanning..." : "Tap to Scan NFC Card"}
                    </Text>
                    <Text style={styles.scanSubtitle}>
                        {scanning
                            ? "Hold your RFID card near the device"
                            : "Register your RFID card for tap-to-pay"}
                    </Text>

                    <TouchableOpacity
                        style={[styles.scanBtn, scanning && styles.scanBtnActive]}
                        onPress={startNFCScan}
                        disabled={scanning}
                    >
                        {scanning ? (
                            <ActivityIndicator color="#0B0E14" />
                        ) : (
                            <Text style={styles.scanBtnText}>Start Scan</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.infoBox}>
                        <Text style={styles.infoText}>
                            💡 Your RFID card will be linked to your account. You can
                            register up to 5 cards.
                        </Text>
                    </View>
                </View>

                {/* Registered Cards */}
                <View style={styles.cardsSection}>
                    <Text style={styles.sectionTitle}>
                        Registered Cards ({registeredCards.length}/5)
                    </Text>

                    {loading ? (
                        <ActivityIndicator style={{ marginTop: 20 }} />
                    ) : registeredCards.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No cards registered yet</Text>
                            <Text style={styles.emptySubtext}>
                                Scan your first RFID card to get started
                            </Text>
                        </View>
                    ) : (
                        registeredCards.map((card) => (
                            <View key={card.id} style={styles.cardItem}>
                                <View style={styles.cardLeft}>
                                    <View style={styles.cardIcon}>
                                        <Text style={styles.cardIconText}>💳</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.cardUID}>{card.value}</Text>
                                        <Text style={styles.cardDate}>
                                            {new Date(card.issued_at).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.cardRight}>
                                    <View
                                        style={[
                                            styles.statusBadge,
                                            card.status === "active"
                                                ? styles.statusActive
                                                : styles.statusInactive,
                                        ]}
                                    >
                                        <Text style={styles.statusText}>
                                            {card.status.toUpperCase()}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => removeCard(card.id, card.value)}
                                    >
                                        <Text style={styles.removeBtn}>🗑️</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: "#0B0E14" },
    container: { flex: 1, padding: 18 },

    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 24,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 14,
        backgroundColor: "rgba(255,255,255,0.07)",
        alignItems: "center",
        justifyContent: "center",
    },
    backText: { color: "#fff", fontSize: 20 },
    title: { color: "#fff", fontSize: 18, fontWeight: "800" },

    scanSection: {
        padding: 24,
        borderRadius: 22,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
        alignItems: "center",
        marginBottom: 24,
    },
    nfcIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "rgba(255, 211, 106, 0.15)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    nfcIconText: { fontSize: 40 },
    scanTitle: {
        color: "#fff",
        fontSize: 20,
        fontWeight: "800",
        marginBottom: 8,
    },
    scanSubtitle: {
        color: "rgba(255,255,255,0.65)",
        fontSize: 14,
        textAlign: "center",
        marginBottom: 24,
    },
    scanBtn: {
        backgroundColor: "#FFD36A",
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 14,
        minWidth: 160,
        alignItems: "center",
    },
    scanBtnActive: {
        backgroundColor: "rgba(255, 211, 106, 0.5)",
    },
    scanBtnText: {
        color: "#0B0E14",
        fontWeight: "900",
        fontSize: 16,
    },
    infoBox: {
        marginTop: 20,
        padding: 12,
        borderRadius: 12,
        backgroundColor: "rgba(124, 255, 155, 0.10)",
        borderWidth: 1,
        borderColor: "rgba(124, 255, 155, 0.25)",
    },
    infoText: {
        color: "rgba(255,255,255,0.75)",
        fontSize: 13,
        lineHeight: 18,
        textAlign: "center",
    },

    cardsSection: {
        flex: 1,
    },
    sectionTitle: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "800",
        marginBottom: 12,
    },
    emptyState: {
        padding: 32,
        alignItems: "center",
    },
    emptyText: {
        color: "rgba(255,255,255,0.65)",
        fontSize: 16,
        fontWeight: "600",
    },
    emptySubtext: {
        color: "rgba(255,255,255,0.45)",
        fontSize: 14,
        marginTop: 6,
    },

    cardItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 14,
        borderRadius: 16,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
        marginBottom: 10,
    },
    cardLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    cardIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "rgba(255,255,255,0.10)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    cardIconText: { fontSize: 18 },
    cardUID: {
        color: "#fff",
        fontWeight: "800",
        fontSize: 14,
    },
    cardDate: {
        color: "rgba(255,255,255,0.55)",
        fontSize: 12,
        marginTop: 2,
    },

    cardRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusActive: {
        backgroundColor: "rgba(124, 255, 155, 0.20)",
    },
    statusInactive: {
        backgroundColor: "rgba(255, 122, 122, 0.20)",
    },
    statusText: {
        fontSize: 10,
        fontWeight: "800",
        color: "#fff",
    },
    removeBtn: {
        fontSize: 18,
    },
});
