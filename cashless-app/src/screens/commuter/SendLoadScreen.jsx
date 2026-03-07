import React, { useState, useEffect } from "react";
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
import { useTheme } from "../../context/ThemeContext";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { FlashIcon, CallIcon, CheckmarkCircle01Icon, BubbleChatIcon } from "@hugeicons/core-free-icons";
import { Screen, Card, PrimaryButton, GhostButton, Pill } from "../../components/ui";
import { sendLoad } from "../../api/walletApi";
import { renderApiRequest } from "../../api/apiHelper";
import { useRoute } from "@react-navigation/native";

export default function SendLoadScreen({ navigation }) {
    const { theme } = useTheme();
    const route = useRoute();
    const [phone, setPhone] = useState(route.params?.phone || "");
    const [amount, setAmount] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);

    // Quick Pick data
    const [recentRecipients, setRecentRecipients] = useState([]);
    const [friends, setFriends] = useState([]);
    const [loadingPicks, setLoadingPicks] = useState(true);

    React.useEffect(() => {
        if (route.params?.phone) {
            setPhone(route.params.phone);
        }
    }, [route.params?.phone]);

    // Fetch recent recipients and friends on mount
    useEffect(() => {
        const fetchQuickPicks = async () => {
            try {
                setLoadingPicks(true);

                // Fetch both in parallel
                const [recentRes, friendsRes] = await Promise.all([
                    renderApiRequest("/wallet/recent-recipients").catch(() => ({ recipients: [] })),
                    renderApiRequest("/friends/list").catch(() => ({ friends: [] })),
                ]);

                setRecentRecipients(recentRes?.recipients || []);

                // Filter to accepted friends only
                const accepted = (friendsRes?.friends || [])
                    .filter(f => f.status === "accepted" && f.friend_phone)
                    .slice(0, 10);
                setFriends(accepted);
            } catch {
                // Silently fail — quick picks are optional
            } finally {
                setLoadingPicks(false);
            }
        };

        fetchQuickPicks();
    }, []);

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

    // Convert +63 phone to local 09xx format
    const toLocal = (p) => {
        if (!p) return "";
        const cleaned = p.replace(/[^0-9+]/g, "");
        if (cleaned.startsWith("+63")) return "0" + cleaned.slice(3);
        return cleaned;
    };

    // Pick a contact from quick picks
    const pickContact = (phoneNum) => {
        const local = toLocal(phoneNum);
        setPhone(local);
    };

    // Get initials from a name
    const getInitials = (name) => {
        return (name || "?")
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((s) => s[0]?.toUpperCase())
            .join("") || "?";
    };

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

    const hasQuickPicks = recentRecipients.length > 0 || friends.length > 0;
    const showQuickPicks = phone.length === 0 && hasQuickPicks;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
        >
            <Screen
                title="Send Load"
                onBack={() => navigation.goBack()}
                theme={theme}
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* ✅ Quick Pick Section */}
                    {showQuickPicks && (
                        <Card style={[styles.quickPickCard, { backgroundColor: theme.warningBg, borderColor: theme.warningBg }]}>
                            <View style={styles.quickPickHeader}>
                                <HugeiconsIcon icon={FlashIcon} size={16} color={theme.accentWarm} />
                                <Text style={[styles.quickPickTitle, { color: theme.accentWarm }]}>Quick Pick</Text>
                            </View>

                            {/* Recent Recipients */}
                            {recentRecipients.length > 0 && (
                                <>
                                    <Text style={[styles.quickPickSubtitle, { color: theme.textSecondary }]}>Recent</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
                                        {recentRecipients.map((r, i) => (
                                            <TouchableOpacity
                                                key={`recent-${i}`}
                                                style={styles.chip}
                                                activeOpacity={0.7}
                                                onPress={() => {
                                                    // Recent recipients don't have phone, so we skip
                                                    Alert.alert("Recent", `${r.name}\n\nTo send to this person again, enter their phone number.`);
                                                }}
                                            >
                                                <View style={[styles.chipAvatar, { backgroundColor: theme.successBg, borderColor: theme.successBg }]}>
                                                    <Text style={[styles.chipAvatarText, { color: theme.text }]}>{getInitials(r.name)}</Text>
                                                </View>
                                                <Text style={[styles.chipName, { color: theme.text }]} numberOfLines={1}>{r.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </>
                            )}

                            {/* Friends */}
                            {friends.length > 0 && (
                                <>
                                    <Text style={[styles.quickPickSubtitle, { color: theme.textSecondary }]}>Friends</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
                                        {friends.map((f) => (
                                            <TouchableOpacity
                                                key={f.connection_id}
                                                style={styles.chip}
                                                activeOpacity={0.7}
                                                onPress={() => pickContact(f.friend_phone)}
                                            >
                                                <View style={[styles.chipAvatar, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' }]}>
                                                    <Text style={[styles.chipAvatarText, { color: theme.text }]}>{getInitials(f.friend_name)}</Text>
                                                </View>
                                                <Text style={[styles.chipName, { color: theme.text }]} numberOfLines={1}>{f.friend_name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </>
                            )}

                            {loadingPicks && (
                                <ActivityIndicator size="small" color={theme.accent} style={{ marginTop: 8 }} />
                            )}
                        </Card>
                    )}

                    <Card style={[styles.mainCard, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}>
                        <View style={styles.pillContainer}>
                            <Pill text="P2P Transfer" theme={theme} />
                        </View>

                        <Text style={[styles.label, { color: theme.textSecondary }]}>Receiver Phone Number</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <HugeiconsIcon icon={CallIcon} size={20} color={theme.textMuted} style={styles.inputIcon} />
                            <TextInput
                                value={phone}
                                onChangeText={handlePhoneChange}
                                keyboardType="phone-pad"
                                maxLength={11}
                                placeholder="09XX XXX XXXX"
                                placeholderTextColor={theme.textMuted}
                                style={[styles.input, { color: theme.text }]}
                            />
                            {phone.length === 11 && (
                                <View style={styles.checkMark}>
                                    <HugeiconsIcon icon={CheckmarkCircle01Icon} size={22} color="#7CFF9B" />
                                </View>
                            )}
                        </View>
                        {phone.length > 0 && phone.length < 11 && (
                            <Text style={[styles.phoneHint, { color: theme.textMuted }]}>
                                {11 - phone.length} digits remaining
                            </Text>
                        )}

                        <Text style={[styles.label, { color: theme.textSecondary }]}>Amount (PHP)</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <Text style={{ color: theme.text, fontSize: 22, fontWeight: "900", marginRight: 8, marginTop: 4 }}>₱</Text>
                            <TextInput
                                value={amount}
                                onChangeText={handleAmountChange}
                                keyboardType="decimal-pad"
                                maxLength={8}
                                placeholder="0.00"
                                placeholderTextColor={theme.textMuted}
                                style={[styles.input, { color: theme.text, fontSize: 26, fontWeight: "900" }]}
                            />
                        </View>

                        {/* Quick Amount Presets */}
                        <View style={styles.presetsRow}>
                            {presets.map((val) => (
                                <TouchableOpacity
                                    key={val}
                                    style={[
                                        styles.presetBtn, { backgroundColor: theme.card, borderColor: theme.border },
                                        Number(amount) === val && { backgroundColor: theme.warningBg, borderColor: theme.warning },
                                    ]}
                                    activeOpacity={0.8}
                                    onPress={() => setAmount(String(val))}
                                >
                                    <Text
                                        style={[
                                            styles.presetText, { color: theme.textSecondary },
                                            Number(amount) === val && { color: theme.warning },
                                        ]}
                                    >
                                        ₱{val}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={[styles.hint, { color: theme.textMuted }]}>Minimum ₱10.00</Text>

                        <Text style={[styles.label, { color: theme.textSecondary }]}>Message (Optional)</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <HugeiconsIcon icon={BubbleChatIcon} size={20} color={theme.textMuted} style={styles.inputIcon} />
                            <TextInput
                                value={notes}
                                onChangeText={setNotes}
                                multiline
                                placeholder="What's this for?"
                                placeholderTextColor={theme.textMuted}
                                style={[styles.input, { color: theme.text, height: 60, paddingTop: 12 }]}
                            />
                        </View>
                    </Card>

                    {/* Summary before sending */}
                    {phone.length === 11 && Number(amount) >= 10 && (
                        <Card style={[styles.summaryCard, { backgroundColor: theme.warningBg, borderColor: theme.warningBg }]}>
                            <Text style={[styles.summaryTitle, { color: theme.accentWarm }]}>Transfer Summary</Text>
                            <View style={[styles.summaryRow, { borderTopColor: theme.border }]}>
                                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>To</Text>
                                <Text style={[styles.summaryValue, { color: theme.text }]}>{formattedPhone}</Text>
                            </View>
                            <View style={[styles.summaryRow, { borderTopColor: theme.border }]}>
                                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Amount</Text>
                                <Text style={[styles.summaryValue, { color: theme.text, fontWeight: "900", fontSize: 16 }]}>
                                    ₱{Number(amount).toFixed(2)}
                                </Text>
                            </View>
                            {notes ? (
                                <View style={[styles.summaryRow, { borderTopColor: theme.border }]}>
                                    <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Note</Text>
                                    <Text style={[styles.summaryValue, { color: theme.text }]} numberOfLines={1}>{notes}</Text>
                                </View>
                            ) : null}
                        </Card>
                    )}

                    <View style={styles.footer}>
                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator color={theme.accent} size="large" />
                                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Processing Transfer...</Text>
                            </View>
                        ) : (
                            <>
                                <PrimaryButton
                                    label="Send Load Now"
                                    onPress={handleSend}
                                    disabled={phone.length < 11 || !amount || Number(amount) < 10}
                                    theme={theme}
                                />
                            </>
                        )}
                    </View>
                </ScrollView>
            </Screen>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    // Quick Pick styles
    quickPickCard: {
        marginBottom: 8,
        padding: 16,
        backgroundColor: "rgba(242,233,78,0.04)",
        borderColor: "rgba(242,233,78,0.12)",
    },
    quickPickHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
    },
    quickPickTitle: {
        color: "#F2E94E",
        fontSize: 14,
        fontWeight: "900",
    },
    quickPickSubtitle: {
        color: "rgba(244,238,230,0.45)",
        fontSize: 11,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 8,
        marginTop: 4,
    },
    chipsRow: {
        marginBottom: 12,
    },
    chip: {
        alignItems: "center",
        marginRight: 14,
        width: 64,
    },
    chipAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(124,255,155,0.12)",
        borderWidth: 1.5,
        borderColor: "rgba(124,255,155,0.3)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 6,
    },
    chipAvatarFriend: {
        backgroundColor: "rgba(124,155,255,0.12)",
        borderColor: "rgba(124,155,255,0.3)",
    },
    chipAvatarText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "800",
    },
    chipName: {
        color: "rgba(244,238,230,0.7)",
        fontSize: 11,
        fontWeight: "600",
        textAlign: "center",
    },

    // Existing styles
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
        paddingBottom: 110,
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

