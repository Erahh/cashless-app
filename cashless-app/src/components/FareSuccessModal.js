import React from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity, Pressable, Dimensions } from "react-native";
import { useTheme } from "../context/ThemeContext";

const { width } = Dimensions.get("window");

function getFareTitle(result) {
    const passengerType = String(result?.passenger_type || "").toLowerCase();
    const discounted = !!result?.discount_applied;

    if (discounted && passengerType === "student") return "Student Fare";
    if (discounted && passengerType === "senior") return "Senior Fare";
    return result?.fare_label || "Regular Fare";
}

export default function FareSuccessModal({ visible, result, onDone }) {
    const { theme } = useTheme();
    const fareTitle = getFareTitle(result);
    const amount = Number(result?.amount ?? result?.fare_amount ?? 0);
    const route = String(result?.route || "").trim();
    const balance = Number(result?.commuter_balance);
    const canShowBalance = Number.isFinite(balance);
    const subtitle = result?.ui_summary?.subtitle || result?.success_message || "Payment completed successfully.";

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
            <View style={styles.backdrop}>
                <Pressable style={styles.backdropPress} onPress={onDone} />

                <View style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                    <View style={styles.sheetTop} />

                    <View style={[styles.badgeOuter, { backgroundColor: theme.successBg }]}> 
                        <View style={[styles.badgeInner, { backgroundColor: theme.success }]}> 
                            <Text style={styles.check}>✓</Text>
                        </View>
                    </View>

                    <Text style={[styles.title, { color: theme.text }]}>{fareTitle}</Text>
                    <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>

                    <View style={[styles.amountCard, { backgroundColor: theme.background, borderColor: theme.border }]}> 
                        <Text style={[styles.amountLabel, { color: theme.textSecondary }]}>Amount Paid</Text>
                        <Text style={[styles.amount, { color: theme.text }]}>₱{amount.toFixed(2)}</Text>
                    </View>

                    <View style={styles.metaRow}>
                        <View style={[styles.metaChip, { backgroundColor: theme.background, borderColor: theme.border }]}> 
                            <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Status</Text>
                            <Text style={[styles.metaValue, { color: theme.success }]}>Successful</Text>
                        </View>

                        <View style={[styles.metaChip, { backgroundColor: theme.background, borderColor: theme.border }]}> 
                            <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Fare Type</Text>
                            <Text style={[styles.metaValue, { color: theme.text }]} numberOfLines={1}>{fareTitle}</Text>
                        </View>
                    </View>

                    {route ? (
                        <View style={[styles.routeBox, { backgroundColor: theme.cardAlt || theme.background, borderColor: theme.border }]}> 
                            <Text style={[styles.routeLabel, { color: theme.textSecondary }]}>Route</Text>
                            <Text style={[styles.routeValue, { color: theme.text }]} numberOfLines={1}>{route}</Text>
                        </View>
                    ) : null}

                    {canShowBalance ? (
                        <Text style={[styles.balance, { color: theme.textSecondary }]}>Remaining balance: ₱{balance.toFixed(2)}</Text>
                    ) : null}

                    <TouchableOpacity style={[styles.button, { backgroundColor: theme.accent }]} onPress={onDone} activeOpacity={0.9}>
                        <Text style={[styles.buttonText, { color: "#0B0E14" }]}>Done</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(11, 14, 20, 0.52)",
    },
    backdropPress: {
        ...StyleSheet.absoluteFillObject,
    },
    sheet: {
        width: Math.min(width - 20, 390),
        alignSelf: "center",
        borderTopLeftRadius: 34,
        borderTopRightRadius: 34,
        borderWidth: 1,
        borderBottomWidth: 0,
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 22,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: -6 },
        elevation: 20,
    },
    sheetTop: {
        alignSelf: "center",
        width: 54,
        height: 5,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.18)",
        marginBottom: 18,
    },
    badgeOuter: {
        width: 92,
        height: 92,
        borderRadius: 46,
        alignSelf: "center",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 18,
    },
    badgeInner: {
        width: 74,
        height: 74,
        borderRadius: 37,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    check: {
        color: "#0B0E14",
        fontSize: 38,
        fontWeight: "900",
        marginTop: -2,
    },
    title: {
        fontSize: 28,
        fontWeight: "900",
        letterSpacing: -0.4,
        textAlign: "center",
    },
    subtitle: {
        marginTop: 8,
        fontSize: 14,
        lineHeight: 20,
        textAlign: "center",
        paddingHorizontal: 8,
    },
    amountCard: {
        marginTop: 18,
        borderRadius: 22,
        borderWidth: 1,
        paddingVertical: 16,
        paddingHorizontal: 16,
        alignItems: "center",
    },
    amountLabel: {
        fontSize: 12,
        fontWeight: "800",
        textTransform: "uppercase",
        letterSpacing: 0.8,
    },
    amount: {
        marginTop: 8,
        fontSize: 32,
        fontWeight: "900",
        letterSpacing: -0.5,
    },
    metaRow: {
        flexDirection: "row",
        gap: 10,
        marginTop: 14,
    },
    metaChip: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 12,
        minHeight: 76,
    },
    metaLabel: {
        fontSize: 12,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.6,
        marginBottom: 8,
    },
    metaValue: {
        fontSize: 16,
        fontWeight: "900",
    },
    routeBox: {
        marginTop: 14,
        borderRadius: 18,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    routeLabel: {
        fontSize: 12,
        fontWeight: "800",
        textTransform: "uppercase",
        letterSpacing: 0.6,
    },
    routeValue: {
        marginTop: 4,
        fontSize: 15,
        fontWeight: "800",
    },
    balance: {
        marginTop: 12,
        textAlign: "center",
        fontSize: 13,
        fontWeight: "600",
    },
    button: {
        marginTop: 18,
        height: 50,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    buttonText: {
        fontSize: 16,
        fontWeight: "900",
        letterSpacing: 0.2,
    },
});