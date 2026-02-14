import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    Alert,
    TouchableOpacity,
    KeyboardAvoidingView,
    ScrollView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    StyleSheet,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Card, PrimaryButton, GhostButton, Pill } from "../components/ui";
import { sendLoad } from "../api/walletApi";
import { useRoute } from "@react-navigation/native";

export default function SendLoadScreen({ navigation }) {
    const route = useRoute();
    const [phone, setPhone] = useState(route.params?.phone || "");
    const [amount, setAmount] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        if (route.params?.phone) {
            setPhone(route.params.phone);
        }
    }, [route.params?.phone]);

    // ✅ Phone: digits only, max 11 (PH mobile)
    const handlePhoneChange = (text) => {
        const digits = text.replace(/[^0-9]/g, "");
        setPhone(digits.slice(0, 11));
    };

    // ✅ Amount: digits + single decimal, max 2 decimal places
    const handleAmountChange = (text) => {
        // Allow only digits and a single dot
        let cleaned = text.replace(/[^0-9.]/g, "");
        // Prevent multiple dots
        const parts = cleaned.split(".");
        if (parts.length > 2) {
            cleaned = parts[0] + "." + parts.slice(1).join("");
        }
        // Max 2 decimal places
        if (parts.length === 2 && parts[1].length > 2) {
            cleaned = parts[0] + "." + parts[1].slice(0, 2);
        }
        // Max reasonable amount (e.g. 99999)
        if (Number(cleaned) > 99999) return;
        setAmount(cleaned);
    };

    // ✅ Quick amount presets
    const presets = [50, 100, 200, 500];

    const handleSend = async () => {
        if (!phone) return Alert.alert("Required", "Please enter receiver's phone number");
        if (phone.length < 11) return Alert.alert("Invalid Number", "Please enter a valid 11-digit phone number (e.g. 09171234567)");
        if (!amount || Number(amount) < 10) return Alert.alert("Invalid Amount", "Minimum transfer is ₱10.00");

        try {
            setLoading(true);
            const res = await sendLoad(phone, amount, notes);

            Alert.alert(
                "Success",
                `Successfully sent ₱${Number(amount).toFixed(2)} to ${res.receiver.name}`,
                [{ text: "OK", onPress: () => navigation.goBack() }]
            );
        } catch (e) {
            Alert.alert("Transfer Failed", e.message);
        } finally {
            setLoading(false);
        }
    };

    // Format displayed phone: 0917 123 4567
    const formattedPhone = phone.length > 4
        ? phone.slice(0, 4) + " " + phone.slice(4, 7) + (phone.length > 7 ? " " + phone.slice(7) : "")
        : phone;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <Screen
                    title="Send Load"
                    subtitle="Transfer balance instantly to any ERA user by phone number."
                    onBack={() => navigation.goBack()}
                >
                    <ScrollView
                        contentContainerStyle={{ flexGrow: 1 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <Card style={styles.mainCard}>
                            <View style={styles.pillContainer}>
                                <Pill text="P2P Transfer" />
                            </View>

                            <Text style={styles.label}>Receiver Phone Number</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="call-outline" size={20} color="rgba(244,238,230,0.5)" style={styles.inputIcon} />
                                <TextInput
                                    value={phone}
                                    onChangeText={handlePhoneChange}
                                    keyboardType="phone-pad"
                                    maxLength={11}
                                    placeholder="09XX XXX XXXX"
                                    placeholderTextColor="rgba(244,238,230,0.3)"
                                    style={styles.input}
                                />
                                {phone.length === 11 && (
                                    <View style={styles.checkMark}>
                                        <Ionicons name="checkmark-circle" size={22} color="#7CFF9B" />
                                    </View>
                                )}
                            </View>
                            {phone.length > 0 && phone.length < 11 && (
                                <Text style={styles.phoneHint}>
                                    {11 - phone.length} digits remaining
                                </Text>
                            )}

                            <Text style={styles.label}>Amount (PHP)</Text>
                            <View style={styles.inputWrapper}>
                                <Text style={styles.currencyPrefix}>₱</Text>
                                <TextInput
                                    value={amount}
                                    onChangeText={handleAmountChange}
                                    keyboardType="decimal-pad"
                                    maxLength={8}
                                    placeholder="0.00"
                                    placeholderTextColor="rgba(244,238,230,0.3)"
                                    style={[styles.input, { fontSize: 24, fontWeight: "900" }]}
                                />
                            </View>

                            {/* Quick Amount Presets */}
                            <View style={styles.presetsRow}>
                                {presets.map((val) => (
                                    <TouchableOpacity
                                        key={val}
                                        style={[
                                            styles.presetBtn,
                                            Number(amount) === val && styles.presetBtnActive,
                                        ]}
                                        activeOpacity={0.8}
                                        onPress={() => setAmount(String(val))}
                                    >
                                        <Text
                                            style={[
                                                styles.presetText,
                                                Number(amount) === val && styles.presetTextActive,
                                            ]}
                                        >
                                            ₱{val}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <Text style={styles.hint}>Minimum ₱10.00</Text>

                            <Text style={styles.label}>Message (Optional)</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="chatbubble-outline" size={20} color="rgba(244,238,230,0.5)" style={styles.inputIcon} />
                                <TextInput
                                    value={notes}
                                    onChangeText={setNotes}
                                    multiline
                                    placeholder="What's this for?"
                                    placeholderTextColor="rgba(244,238,230,0.3)"
                                    style={[styles.input, { height: 60, paddingTop: 12 }]}
                                />
                            </View>
                        </Card>

                        {/* Summary before sending */}
                        {phone.length === 11 && Number(amount) >= 10 && (
                            <Card style={styles.summaryCard}>
                                <Text style={styles.summaryTitle}>Transfer Summary</Text>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>To</Text>
                                    <Text style={styles.summaryValue}>{formattedPhone}</Text>
                                </View>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Amount</Text>
                                    <Text style={[styles.summaryValue, { color: "#F2E94E", fontWeight: "900" }]}>
                                        ₱{Number(amount).toFixed(2)}
                                    </Text>
                                </View>
                                {notes ? (
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>Note</Text>
                                        <Text style={styles.summaryValue} numberOfLines={1}>{notes}</Text>
                                    </View>
                                ) : null}
                            </Card>
                        )}

                        <View style={styles.footer}>
                            {loading ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator color="#F2E94E" size="large" />
                                    <Text style={styles.loadingText}>Processing Transfer...</Text>
                                </View>
                            ) : (
                                <>
                                    <PrimaryButton
                                        label="Send Load Now"
                                        onPress={handleSend}
                                        disabled={phone.length < 11 || !amount || Number(amount) < 10}
                                    />
                                    <GhostButton label="Back to Home" onPress={() => navigation.navigate("Home")} />
                                </>
                            )}
                        </View>
                    </ScrollView>
                </Screen>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    mainCard: {
        marginTop: 10,
        padding: 20,
        backgroundColor: "rgba(255,255,255,0.04)",
    },
    pillContainer: {
        marginBottom: 20,
    },
    label: {
        color: "rgba(244,238,230,0.7)",
        fontSize: 13,
        fontWeight: "600",
        marginBottom: 8,
        marginTop: 16,
    },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.25)",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
        paddingHorizontal: 16,
    },
    inputIcon: {
        marginRight: 12,
    },
    currencyPrefix: {
        color: "#F2E94E",
        fontSize: 22,
        fontWeight: "900",
        marginRight: 8,
    },
    input: {
        flex: 1,
        height: 56,
        color: "#F4EEE6",
        fontSize: 16,
        fontWeight: "700",
    },
    hint: {
        color: "rgba(244,238,230,0.4)",
        fontSize: 12,
        marginTop: 6,
        marginLeft: 4,
    },
    footer: {
        marginTop: "auto",
        paddingTop: 30,
        paddingBottom: 20,
        gap: 12,
    },
    loadingContainer: {
        alignItems: "center",
        paddingVertical: 20,
    },
    loadingText: {
        color: "#F2E94E",
        marginTop: 12,
        fontWeight: "700",
    },
    checkMark: {
        marginLeft: 8,
    },
    phoneHint: {
        color: "rgba(244,238,230,0.4)",
        fontSize: 12,
        marginTop: 6,
        marginLeft: 4,
    },
    presetsRow: {
        flexDirection: "row",
        gap: 10,
        marginTop: 12,
    },
    presetBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
        alignItems: "center",
    },
    presetBtnActive: {
        backgroundColor: "rgba(242,233,78,0.15)",
        borderColor: "rgba(242,233,78,0.4)",
    },
    presetText: {
        color: "rgba(244,238,230,0.6)",
        fontWeight: "800",
        fontSize: 13,
    },
    presetTextActive: {
        color: "#F2E94E",
    },
    summaryCard: {
        marginTop: 12,
        padding: 18,
        backgroundColor: "rgba(242,233,78,0.06)",
        borderColor: "rgba(242,233,78,0.15)",
    },
    summaryTitle: {
        color: "#F2E94E",
        fontWeight: "900",
        fontSize: 14,
        marginBottom: 14,
    },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: "rgba(255,255,255,0.06)",
    },
    summaryLabel: {
        color: "rgba(244,238,230,0.5)",
        fontSize: 13,
        fontWeight: "600",
    },
    summaryValue: {
        color: "#F4EEE6",
        fontSize: 14,
        fontWeight: "700",
    },
});
