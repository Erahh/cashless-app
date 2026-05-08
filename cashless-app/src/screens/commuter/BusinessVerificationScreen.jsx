import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    Alert,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { Screen, PrimaryButton } from "../../components/ui";
import { supabase } from "../../api/supabase";
import { API_BASE_URL } from "../../config/api";
import { useTheme } from "../../context/ThemeContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';

export default function BusinessVerificationScreen({ navigation }) {
    const { theme, isDarkMode } = useTheme();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null); // 'loading', 'verified', 'pending', 'rejected', 'form'
    const [businessName, setBusinessName] = useState("");
    const [businessType, setBusinessType] = useState("");
    const [registrationNumber, setRegistrationNumber] = useState("");
    const [tinNumber, setTinNumber] = useState("");
    const [businessAddress, setBusinessAddress] = useState("");
    const [contactName, setContactName] = useState("");
    const [contactPhone, setContactPhone] = useState("");
    const [latestRequest, setLatestRequest] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const businessTypes = [
        {
            value: "retail",
            label: "Retail / Store",
            description: "Shops, convenience stores, sari-sari stores, and small merchants",
            icon: "storefront-outline",
        },
        {
            value: "transport",
            label: "Transport / Logistics",
            description: "Operators, dispatchers, delivery, and fleet businesses",
            icon: "bus-side",
        },
        {
            value: "restaurant",
            label: "Restaurant / Food",
            description: "Cafes, eateries, food stalls, and catering services",
            icon: "silverware-fork-knife",
        },
        {
            value: "service",
            label: "Service / Professional",
            description: "Repair, consulting, beauty, health, and other services",
            icon: "briefcase-outline",
        },
        {
            value: "other",
            label: "Other",
            description: "Any valid business that does not fit the categories above",
            icon: "shape-outline",
        },
    ];
    const selectedBusinessType = businessTypes.find((type) => type.value === businessType) || null;

    // Fetch verification status on mount
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                setStatus("loading");
                const { data: s } = await supabase.auth.getSession();
                const token = s?.session?.access_token;
                if (!token) return;

                const res = await fetch(`${API_BASE_URL}/business-verification/status`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (res.ok) {
                    const json = await res.json();
                    if (json.verified) {
                        setStatus("verified");
                    } else if (json.latest_request) {
                        setLatestRequest(json.latest_request);
                        setStatus(json.latest_request.status === "pending" ? "pending" : "rejected");
                    } else {
                        setStatus("form");
                    }
                } else {
                    setStatus("form");
                }
            } catch (e) {
                console.warn("Failed to fetch status:", e.message);
                setStatus("form");
            }
        };

        fetchStatus();
    }, []);

    const handleSubmit = async () => {
        if (!businessName.trim()) return Alert.alert("Required", "Please enter business name");
        if (!businessType) return Alert.alert("Required", "Please select business type");
        if (!registrationNumber.trim()) return Alert.alert("Required", "Please enter business registration number");
        if (!businessAddress.trim()) return Alert.alert("Required", "Please enter business address");
        if (!contactName.trim()) return Alert.alert("Required", "Please enter contact person name");
        if (!contactPhone.trim()) return Alert.alert("Required", "Please enter contact phone number");

        try {
            setSubmitting(true);
            const { data: s } = await supabase.auth.getSession();
            const token = s?.session?.access_token;
            if (!token) return Alert.alert("Session", "Please login again.");

            const res = await fetch(`${API_BASE_URL}/business-verification/submit`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    business_name: businessName.trim(),
                    business_type: businessType,
                    business_registration_number: registrationNumber.trim(),
                    tin_number: tinNumber.trim() || null,
                    business_address: businessAddress.trim(),
                    contact_person_name: contactName.trim(),
                    contact_person_phone: contactPhone.trim(),
                }),
            });

            const json = await res.json();
            if (!res.ok) {
                return Alert.alert("Error", json.error || "Failed to submit application");
            }

            Alert.alert(
                "Success",
                "Your business verification application has been submitted successfully! Our team will review it within 3-5 business days.",
                [
                    {
                        text: "OK",
                        onPress: () => {
                            setStatus("pending");
                            setLatestRequest({
                                status: "pending",
                                submitted_at: new Date().toISOString(),
                            });
                        },
                    }
                ]
            );
        } catch (e) {
            Alert.alert("Error", e.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (status === "loading") {
        return (
            <Screen title="Business Verification" theme={theme} onBack={() => navigation.goBack()}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={theme.warning} />
                    <Text style={{ color: theme.text, marginTop: 16 }}>Loading...</Text>
                </View>
            </Screen>
        );
    }

    if (status === "verified") {
        return (
            <Screen title="Business Verification" theme={theme} onBack={() => navigation.goBack()}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
                    <MaterialCommunityIcons name="check-circle" size={80} color="#4CAF50" style={{ marginBottom: 16 }} />
                    <Text style={[styles.title, { color: theme.text }]}>Verified</Text>
                    <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                        Your business account has been verified. You can now top up and hold up to ₱500,000 in your wallet.
                    </Text>
                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: theme.warning }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={[styles.buttonText, { color: '#000' }]}>Back to Wallet</Text>
                    </TouchableOpacity>
                </View>
            </Screen>
        );
    }

    if (status === "pending") {
        return (
            <Screen title="Business Verification" theme={theme} onBack={() => navigation.goBack()}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
                    <MaterialCommunityIcons name="clock-outline" size={80} color={theme.warning} style={{ marginBottom: 16 }} />
                    <Text style={[styles.title, { color: theme.text }]}>Verification Pending</Text>
                    <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                        Your application was submitted on {new Date(latestRequest?.submitted_at).toLocaleDateString()}. Our team is reviewing it and will respond within 3-5 business days.
                    </Text>
                    <Text style={[styles.note, { color: theme.textMuted }]}>
                        You'll receive a notification once your application has been reviewed.
                    </Text>
                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: theme.textSecondary }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={[styles.buttonText, { color: '#000' }]}>Back to Wallet</Text>
                    </TouchableOpacity>
                </View>
            </Screen>
        );
    }

    if (status === "rejected") {
        return (
            <Screen title="Business Verification" theme={theme} onBack={() => navigation.goBack()}>
                <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingVertical: 20 }}>
                    <View style={{ alignItems: 'center', marginBottom: 24 }}>
                        <MaterialCommunityIcons name="alert-circle" size={80} color="#FF6B6B" style={{ marginBottom: 16 }} />
                        <Text style={[styles.title, { color: theme.text }]}>Verification Rejected</Text>
                    </View>

                    {latestRequest?.review_notes && (
                        <View style={[styles.infoCard, { backgroundColor: isDarkMode ? 'rgba(255, 107, 107, 0.1)' : 'rgba(255, 107, 107, 0.05)', borderColor: '#FF6B6B' }]}>
                            <Text style={[styles.infoLabel, { color: theme.text }]}>Reason:</Text>
                            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                                {latestRequest.review_notes}
                            </Text>
                        </View>
                    )}

                    <Text style={[styles.instruction, { color: theme.textSecondary }]}>
                        You can submit another application with the correct information. Make sure to provide:
                    </Text>

                    <View style={styles.checklistContainer}>
                        <View style={styles.checklistItem}>
                            <Text style={[styles.checklistDot, { color: '#FFD36A' }]}>✓</Text>
                            <Text style={[styles.checklistText, { color: theme.text }]}>Valid business registration number</Text>
                        </View>
                        <View style={styles.checklistItem}>
                            <Text style={[styles.checklistDot, { color: '#FFD36A' }]}>✓</Text>
                            <Text style={[styles.checklistText, { color: theme.text }]}>Correct business address</Text>
                        </View>
                        <View style={styles.checklistItem}>
                            <Text style={[styles.checklistDot, { color: '#FFD36A' }]}>✓</Text>
                            <Text style={[styles.checklistText, { color: theme.text }]}>Valid contact information</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: theme.warning }]}
                        onPress={() => setStatus("form")}
                    >
                        <Text style={[styles.buttonText, { color: '#000' }]}>Submit New Application</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: theme.textSecondary }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={[styles.buttonText, { color: '#000' }]}>Back to Wallet</Text>
                    </TouchableOpacity>
                </ScrollView>
            </Screen>
        );
    }

    // Form view
    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
        >
            <Screen title="Business Verification" theme={theme} onBack={() => navigation.goBack()}>
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={{ paddingHorizontal: 20, paddingVertical: 20 }}>
                        <LinearGradient
                            colors={isDarkMode ? ['#1e3a1f', '#0f1f11'] : ['#e8f5e9', '#c8e6c9']}
                            style={styles.infoCard}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                <MaterialCommunityIcons
                                    name="information"
                                    size={24}
                                    color="#2e7d32"
                                    style={{ marginRight: 12, marginTop: 4 }}
                                />
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.infoLabel, { color: theme.text }]}>Why Business Verification?</Text>
                                    <Text style={[styles.infoText, { color: theme.textSecondary, marginTop: 8 }]}>
                                        Business accounts can hold up to ₱500,000. Submit your business details to increase your wallet limit.
                                    </Text>
                                </View>
                            </View>
                        </LinearGradient>

                        <Text style={[styles.label, { color: theme.text, marginTop: 24 }]}>Business Name *</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: isDarkMode ? '#1e1e1e' : '#f5f5f5', color: theme.text, borderColor: theme.border }]}
                            placeholder="e.g., Juan's Transportation"
                            placeholderTextColor={theme.textMuted}
                            value={businessName}
                            onChangeText={setBusinessName}
                        />

                        <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>Business Type *</Text>
                        <Text style={[styles.helperText, { color: theme.textMuted }]}>
                            Pick the closest match. This helps us review your business faster and keep your wallet limits accurate.
                        </Text>
                        <View style={styles.typeSelector}>
                            {businessTypes.map((type) => (
                                <TouchableOpacity
                                    key={type.value}
                                    style={[
                                        styles.typeButton,
                                        {
                                            backgroundColor: businessType === type.value
                                                ? theme.warning
                                                : isDarkMode ? '#1e1e1e' : '#f5f5f5',
                                            borderColor: businessType === type.value ? theme.warning : theme.border,
                                        }
                                    ]}
                                    onPress={() => setBusinessType(type.value)}
                                >
                                    <View style={styles.typeButtonHeader}>
                                        <View style={[
                                            styles.typeButtonIcon,
                                            { backgroundColor: businessType === type.value ? 'rgba(0,0,0,0.12)' : (isDarkMode ? '#2a2a2a' : '#ececec') }
                                        ]}>
                                            <MaterialCommunityIcons
                                                name={type.icon}
                                                size={18}
                                                color={businessType === type.value ? '#000' : theme.text}
                                            />
                                        </View>
                                        <Text
                                            style={[
                                                styles.typeButtonText,
                                                { color: businessType === type.value ? '#000' : theme.text }
                                            ]}
                                        >
                                            {type.label}
                                        </Text>
                                    </View>
                                    <Text
                                        style={[
                                            styles.typeButtonDesc,
                                            { color: businessType === type.value ? 'rgba(0,0,0,0.75)' : theme.textSecondary }
                                        ]}
                                    >
                                        {type.description}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {selectedBusinessType && (
                            <View style={[styles.selectionCard, { backgroundColor: isDarkMode ? 'rgba(255, 211, 106, 0.08)' : 'rgba(255, 211, 106, 0.12)', borderColor: theme.warning }]}>
                                <MaterialCommunityIcons name="check-decagram-outline" size={18} color={theme.warning} style={{ marginRight: 10 }} />
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.selectionTitle, { color: theme.text }]}>Selected category</Text>
                                    <Text style={[styles.selectionText, { color: theme.textSecondary }]}>
                                        {selectedBusinessType.label} - {selectedBusinessType.description}
                                    </Text>
                                </View>
                            </View>
                        )}

                        <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>Business Registration Number *</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: isDarkMode ? '#1e1e1e' : '#f5f5f5', color: theme.text, borderColor: theme.border }]}
                            placeholder="e.g., BN-2024-001234"
                            placeholderTextColor={theme.textMuted}
                            value={registrationNumber}
                            onChangeText={setRegistrationNumber}
                        />

                        <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>TIN Number (Optional)</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: isDarkMode ? '#1e1e1e' : '#f5f5f5', color: theme.text, borderColor: theme.border }]}
                            placeholder="12-345-678-901"
                            placeholderTextColor={theme.textMuted}
                            value={tinNumber}
                            onChangeText={setTinNumber}
                        />

                        <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>Business Address *</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: isDarkMode ? '#1e1e1e' : '#f5f5f5', color: theme.text, borderColor: theme.border, height: 80 }]}
                            placeholder="Complete business address"
                            placeholderTextColor={theme.textMuted}
                            value={businessAddress}
                            onChangeText={setBusinessAddress}
                            multiline
                            numberOfLines={3}
                        />

                        <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>Contact Person Name *</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: isDarkMode ? '#1e1e1e' : '#f5f5f5', color: theme.text, borderColor: theme.border }]}
                            placeholder="Full name of business owner/representative"
                            placeholderTextColor={theme.textMuted}
                            value={contactName}
                            onChangeText={setContactName}
                        />

                        <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>Contact Phone Number *</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: isDarkMode ? '#1e1e1e' : '#f5f5f5', color: theme.text, borderColor: theme.border }]}
                            placeholder="09xxxxxxxxx"
                            placeholderTextColor={theme.textMuted}
                            value={contactPhone}
                            onChangeText={setContactPhone}
                            keyboardType="phone-pad"
                        />

                        <View style={{ height: 24 }} />
                    </View>
                </ScrollView>

                <View style={{ paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 100 }}>
                    <TouchableOpacity
                        style={[
                            styles.button,
                            { backgroundColor: theme.warning, opacity: submitting ? 0.6 : 1 }
                        ]}
                        onPress={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color="#000" />
                        ) : (
                            <Text style={[styles.buttonText, { color: '#000' }]}>Submit Application</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </Screen>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    title: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 24,
        textAlign: 'center',
    },
    note: {
        fontSize: 12,
        lineHeight: 18,
        marginBottom: 24,
        textAlign: 'center',
    },
    button: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
    },
    helperText: {
        fontSize: 12,
        lineHeight: 18,
        marginBottom: 10,
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
    },
    typeSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 10,
    },
    typeButton: {
        width: '48%',
        minHeight: 92,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 14,
        borderWidth: 1.5,
        justifyContent: 'space-between',
    },
    typeButtonHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    typeButtonIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    typeButtonText: {
        flex: 1,
        fontSize: 12,
        fontWeight: '700',
        lineHeight: 16,
    },
    typeButtonDesc: {
        fontSize: 11,
        lineHeight: 16,
    },
    selectionCard: {
        marginTop: 14,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    selectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 2,
    },
    selectionText: {
        fontSize: 12,
        lineHeight: 18,
    },
    infoCard: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(46, 125, 50, 0.2)',
    },
    infoLabel: {
        fontSize: 13,
        fontWeight: '700',
    },
    infoText: {
        fontSize: 12,
        lineHeight: 18,
    },
    instruction: {
        fontSize: 13,
        lineHeight: 20,
        marginTop: 16,
        marginBottom: 12,
    },
    checklistContainer: {
        marginVertical: 16,
    },
    checklistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    checklistDot: {
        fontSize: 20,
        marginRight: 12,
    },
    checklistText: {
        fontSize: 13,
        flex: 1,
    },
});
