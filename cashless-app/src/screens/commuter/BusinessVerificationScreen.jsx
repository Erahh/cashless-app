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
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { getInfoAsync } from 'expo-file-system/legacy';
import { useTheme } from "../../context/ThemeContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function BusinessVerificationScreen({ navigation }) {
    const { theme, isDarkMode } = useTheme();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null); // 'loading', 'verified', 'pending', 'rejected', 'form'
    const [businessName, setBusinessName] = useState("");
    const [businessType, setBusinessType] = useState("");
    const [registrationNumber, setRegistrationNumber] = useState("");
    const [tinNumber, setTinNumber] = useState("");
    const [tinType, setTinType] = useState(null); // 'individual' | 'company'
    const [tinTypeError, setTinTypeError] = useState("");
    const [businessAddress, setBusinessAddress] = useState("");
    const [contactName, setContactName] = useState("");
    const [contactPhone, setContactPhone] = useState("");
    // validation errors
    const [regNumError, setRegNumError] = useState("");
    const [tinError, setTinError] = useState("");
    const [phoneError, setPhoneError] = useState("");
    const [latestRequest, setLatestRequest] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    // Document uploads (base64 strings)
    const [businessPermit, setBusinessPermit] = useState(null);
    const [registrationId, setRegistrationId] = useState(null);
    const [ownerId, setOwnerId] = useState(null);
    const [selfieWithId, setSelfieWithId] = useState(null);
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [docUploading, setDocUploading] = useState(false);
    const [step, setStep] = useState(1);

    const totalSteps = 4;

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

    const stepTitles = [
        "Business Type",
        "Business Details",
        "Documents",
        "Review",
    ];

    const progressPct = `${(step / totalSteps) * 100}%`;

    const validateStep = () => {
        if (step === 1) {
            if (!businessName.trim()) return Alert.alert("Required", "Please enter business name");
            if (!businessType) return Alert.alert("Required", "Please select business type");
            return true;
        }

        if (step === 2) {
            if (!registrationNumber.trim()) return Alert.alert("Required", "Please enter business registration number");
            // registration number length
            if (registrationNumber.trim().length > 30) return Alert.alert("Invalid", "Registration number is too long");
            // TIN validation if provided
            if (tinNumber) {
                if (!tinType) return Alert.alert("Required", "Please select TIN type (Individual or Company)");
                if (tinType === 'individual' && tinNumber.length !== 9) return Alert.alert("Invalid", "TIN for Individual must be exactly 9 digits");
                if (tinType === 'company' && tinNumber.length !== 12) return Alert.alert("Invalid", "TIN for Company must be exactly 12 digits");
            }
            if (!businessAddress.trim()) return Alert.alert("Required", "Please enter business address");
            return true;
        }

        if (step === 3) {
            if (!contactName.trim()) return Alert.alert("Required", "Please enter contact person name");
            if (!contactPhone.trim()) return Alert.alert("Required", "Please enter contact phone number");
            // normalize phone: accept +63 or local 0-prefixed. Final must be 11 digits starting with 09
            let phoneDigits = contactPhone.replace(/\s|\-|\(|\)/g, '');
            if (phoneDigits.startsWith('+63')) phoneDigits = '0' + phoneDigits.slice(3);
            phoneDigits = phoneDigits.replace(/\D/g, '');
            if (!(phoneDigits.length === 11 && phoneDigits.startsWith('09'))) return Alert.alert("Invalid", "Please enter a valid Philippine mobile number (11 digits, starts with 09)");
            if (!businessPermit && !registrationId) return Alert.alert("Required", "Please upload at least one business proof document");
            if (!ownerId) return Alert.alert("Required", "Please upload an owner ID / selfie with ID");
            if (!selfieWithId) return Alert.alert("Required", "Please take a selfie with ID");
            if (!acceptTerms) return Alert.alert("Terms", "You must accept the terms to continue");
            return true;
        }

        return true;
    };

    const goNext = () => {
        if (!validateStep()) return;
        setStep((current) => Math.min(totalSteps, current + 1));
    };

    const goBack = () => {
        setStep((current) => Math.max(1, current - 1));
    };

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

    const readAssetBase64 = async (asset) => {
        if (!asset?.uri) return null;
        if (asset.base64) return asset.base64;
        return FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
    };

    const pickDocument = async (docType) => {
        try {
            setDocUploading(true);
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                Alert.alert('Permission required', 'We need permission to access your photos.');
                setDocUploading(false);
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                allowsEditing: true,
                quality: 0.7,
                base64: true,
            });

            if (result.canceled || result.cancelled || !result.assets?.[0]) {
                setDocUploading(false);
                return;
            }

            const asset = result.assets[0];

            // Get file info and validate size
            const info = await getInfoAsync(asset.uri);
            const maxBytes = 5 * 1024 * 1024; // 5MB
            if (info.size && info.size > maxBytes) {
                Alert.alert('File too large', 'Please select a file smaller than 5 MB.');
                setDocUploading(false);
                return;
            }

            // Read as base64
            const base64 = await readAssetBase64(asset);

            if (docType === 'business_permit') setBusinessPermit(base64);
            else if (docType === 'registration_id') setRegistrationId(base64);
            else if (docType === 'owner_id') setOwnerId(base64);
            else if (docType === 'selfie_with_id') setSelfieWithId(base64);

        } catch (e) {
            console.warn('Document pick failed', e.message);
            Alert.alert('Error', 'Failed to select document');
        } finally {
            setDocUploading(false);
        }
    };

    const takeSelfie = async () => {
        try {
            setDocUploading(true);
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
                Alert.alert('Permission required', 'We need camera access to capture your selfie.');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [3, 4],
                quality: 0.8,
                base64: true,
            });

            if (result.canceled || result.cancelled || !result.assets?.[0]) {
                return;
            }

            const asset = result.assets[0];
            const info = await getInfoAsync(asset.uri);
            const maxBytes = 5 * 1024 * 1024;
            if (info.size && info.size > maxBytes) {
                Alert.alert('File too large', 'Please capture a selfie smaller than 5 MB.');
                return;
            }

            const base64 = await readAssetBase64(asset);
            setSelfieWithId(base64);
            setOwnerId(base64);
        } catch (e) {
            console.warn('Selfie capture failed', e.message);
            Alert.alert('Error', 'Failed to take selfie');
        } finally {
            setDocUploading(false);
        }
    };

    const handleSubmit = async () => {
        if (!businessName.trim()) return Alert.alert("Required", "Please enter business name");
        if (!businessType) return Alert.alert("Required", "Please select business type");
        if (!registrationNumber.trim()) return Alert.alert("Required", "Please enter business registration number");
        if (!businessAddress.trim()) return Alert.alert("Required", "Please enter business address");
        if (!contactName.trim()) return Alert.alert("Required", "Please enter contact person name");
        if (!contactPhone.trim()) return Alert.alert("Required", "Please enter contact phone number");
        // normalize to local 11-digit format
        let phoneDigits = contactPhone.replace(/\s|\-|\(|\)/g, '');
        if (phoneDigits.startsWith('+63')) phoneDigits = '0' + phoneDigits.slice(3);
        phoneDigits = phoneDigits.replace(/\D/g, '');
        if (!(phoneDigits.length === 11 && phoneDigits.startsWith('09'))) return Alert.alert("Invalid", "Please enter a valid Philippine mobile number (11 digits, starts with 09)");
        if (!businessPermit && !registrationId) return Alert.alert("Required", "Please upload at least one business proof document (business permit or registration ID)");
        if (!ownerId) return Alert.alert("Required", "Please upload an owner ID / selfie with ID");
        if (!acceptTerms) return Alert.alert("Terms", "You must accept the terms to submit your application");

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
                        // send normalized TIN (digits only) if present
                        tin_type: tinType || null,
                        // send normalized TIN (digits only) if present and ensure exact length per type
                        tin_number: tinNumber ? (tinType === 'company' ? tinNumber.replace(/\D/g, '').slice(0, 12) : tinNumber.replace(/\D/g, '').slice(0, 9)) : null,
                    business_address: businessAddress.trim(),
                    contact_person_name: contactName.trim(),
                        contact_person_phone: contactPhone.trim(),
                    // Attach documents as base64-encoded strings (without data URI prefix)
                    documents: {
                        business_permit: businessPermit || null,
                        registration_id: registrationId || null,
                        owner_id: ownerId || null,
                        selfie_with_id: selfieWithId || ownerId || null,
                    },
                }),
            });

            const json = await res.json();
            if (!res.ok) {
                return Alert.alert("Error", json.error || "Failed to submit application");
            }

            setStatus("pending");
            setLatestRequest({
                status: "pending",
                submitted_at: new Date().toISOString(),
            });

            Alert.alert(
                "Success",
                "Your business verification application has been submitted successfully! Our team will review it within 3-5 business days.",
                [
                    {
                        text: "OK",
                        onPress: () => {
                            navigation.navigate('VerificationSubmitted');
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
                    style={{ flex: 1 }}
                    contentContainerStyle={{ flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={{ paddingHorizontal: 20, paddingVertical: 20 }}>
                        {/* Stepper */}
                        <View style={[styles.stepperCard, { borderColor: theme.border, backgroundColor: isDarkMode ? '#171717' : '#fff' }]}>
                            <View style={styles.stepperHeader}>
                                <View>
                                    <Text style={[styles.stepperTitle, { color: theme.text }]}>Step {step} of {totalSteps}</Text>
                                    <Text style={[styles.stepperSubtitle, { color: theme.textSecondary }]}>{stepTitles[step - 1]}</Text>
                                </View>
                                <Text style={[styles.stepperPercent, { color: theme.warning }]}>{Math.round((step / totalSteps) * 100)}%</Text>
                            </View>
                            <View style={[styles.stepperTrack, { backgroundColor: theme.border }]}>
                                <View style={[styles.stepperFill, { width: progressPct, backgroundColor: theme.warning }]} />
                            </View>
                            <View style={styles.stepDotsRow}>
                                {stepTitles.map((label, index) => {
                                    const active = index + 1 <= step;
                                    return (
                                        <View key={label} style={styles.stepDotItem}>
                                            <View style={[styles.stepDot, { backgroundColor: active ? theme.warning : theme.border }]} />
                                        </View>
                                    );
                                })}
                            </View>
                        </View>

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

                        {step === 1 && (
                            <>
                                <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>Step 1 · Business Type</Text>
                                <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>Business Name *</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: isDarkMode ? '#1e1e1e' : '#f5f5f5', color: theme.text, borderColor: theme.border }]}
                                    placeholder="e.g., Juan's Transportation"
                                    placeholderTextColor={theme.textMuted}
                                    value={businessName}
                                    onChangeText={setBusinessName}
                                />

                                <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>Business Type *</Text>
                                <Text style={[styles.helperText, { color: theme.textMuted }]}>Pick the closest match. This helps us review your business faster and keep your wallet limits accurate.</Text>
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
                                                    <MaterialCommunityIcons name={type.icon} size={18} color={businessType === type.value ? '#000' : theme.text} />
                                                </View>
                                                <Text style={[styles.typeButtonText, { color: businessType === type.value ? '#000' : theme.text }]}>{type.label}</Text>
                                            </View>
                                            <Text style={[styles.typeButtonDesc, { color: businessType === type.value ? 'rgba(0,0,0,0.75)' : theme.textSecondary }]}>
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
                                            <Text style={[styles.selectionText, { color: theme.textSecondary }]}>{selectedBusinessType.label} - {selectedBusinessType.description}</Text>
                                        </View>
                                    </View>
                                )}
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>Step 2 · Business Details</Text>
                                <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>Business Registration Number *</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: isDarkMode ? '#1e1e1e' : '#f5f5f5', color: theme.text, borderColor: theme.border }]}
                                    placeholder="e.g., BN-2024-001234"
                                    placeholderTextColor={theme.textMuted}
                                    value={registrationNumber}
                                    onChangeText={(t) => {
                                        // limit length and strip control characters
                                        const cleaned = t.replace(/[\x00-\x1F\x7F]/g, '').slice(0, 30);
                                        setRegistrationNumber(cleaned);
                                        if (cleaned.length > 25) setRegNumError('Registration number is unusually long'); else setRegNumError('');
                                    }}
                                    maxLength={30}
                                />
                                {regNumError ? <Text style={{ color: '#FF6B6B', marginTop: 6 }}>{regNumError}</Text> : null}

                                <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>TIN Number (Optional)</Text>
                                <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        style={[styles.typeButtonSmall, { backgroundColor: tinType === 'individual' ? theme.warning : (isDarkMode ? '#1e1e1e' : '#f5f5f5'), borderColor: tinType === 'individual' ? theme.warning : theme.border }]}
                                        onPress={() => setTinType('individual')}
                                    >
                                        <Text style={{ color: tinType === 'individual' ? '#000' : theme.text }}>Individual (9 digits)</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        style={[styles.typeButtonSmall, { backgroundColor: tinType === 'company' ? theme.warning : (isDarkMode ? '#1e1e1e' : '#f5f5f5'), borderColor: tinType === 'company' ? theme.warning : theme.border }]}
                                        onPress={() => setTinType('company')}
                                    >
                                        <Text style={{ color: tinType === 'company' ? '#000' : theme.text }}>Company (12 digits)</Text>
                                    </TouchableOpacity>
                                </View>
                                {tinTypeError ? <Text style={{ color: '#FF6B6B', marginTop: 6 }}>{tinTypeError}</Text> : null}
                                <TextInput
                                    style={[styles.input, { backgroundColor: isDarkMode ? '#1e1e1e' : '#f5f5f5', color: theme.text, borderColor: theme.border }]}
                                    placeholder="123456789012"
                                    placeholderTextColor={theme.textMuted}
                                    value={tinNumber}
                                    onChangeText={(t) => {
                                        // allow only digits, limit to 12
                                        const digits = t.replace(/\D/g, '').slice(0, 12);
                                        setTinNumber(digits);
                                        // validate against selected type if present
                                        if (tinType === 'individual') {
                                            if (digits.length !== 9) setTinError('TIN must be exactly 9 digits for individuals'); else setTinError('');
                                        } else if (tinType === 'company') {
                                            if (digits.length !== 12) setTinError('TIN must be exactly 12 digits for companies'); else setTinError('');
                                        } else {
                                            if (digits && digits.length < 9) setTinError('TIN looks too short'); else setTinError('');
                                        }
                                    }}
                                    keyboardType="number-pad"
                                    maxLength={12}
                                />
                                {tinError ? <Text style={{ color: '#FF6B6B', marginTop: 6 }}>{tinError}</Text> : null}

                                <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>Business Address *</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: isDarkMode ? '#1e1e1e' : '#f5f5f5', color: theme.text, borderColor: theme.border, height: 96 }]}
                                    placeholder="Complete business address"
                                    placeholderTextColor={theme.textMuted}
                                    value={businessAddress}
                                    onChangeText={setBusinessAddress}
                                    multiline
                                    numberOfLines={3}
                                />
                            </>
                        )}

                        {step === 3 && (
                            <>
                                <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>Step 3 · Contact and Documents</Text>
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
                                    onChangeText={(t) => {
                                        // allow digits and plus sign, but store as typed; show validation
                                        const cleaned = t.replace(/[^+\d]/g, '');
                                        setContactPhone(cleaned);
                                        const digits = cleaned.replace(/\D/g, '');
                                        if (digits && (digits.length < 10 || digits.length > 13)) setPhoneError('Enter a valid phone number'); else setPhoneError('');
                                    }}
                                    keyboardType="phone-pad"
                                    maxLength={15}
                                />
                                {phoneError ? <Text style={{ color: '#FF6B6B', marginTop: 6 }}>{phoneError}</Text> : null}

                                <Text style={[styles.label, { color: theme.text, marginTop: 20 }]}>Required Documents *</Text>
                                <Text style={[styles.helperText, { color: theme.textMuted }]}>Use a clear photo or scan. Business proof and selfie verification are required before submission.</Text>

                                <TouchableOpacity style={[styles.uploadButton, { borderColor: theme.border, backgroundColor: isDarkMode ? '#1e1e1e' : '#f5f5f5' }]} onPress={() => pickDocument('business_permit')} activeOpacity={0.7}>
                                    <View style={styles.uploadButtonLeft}>
                                        <MaterialCommunityIcons name="file-document-outline" size={20} color={theme.text} />
                                        <View style={{ marginLeft: 10, flex: 1 }}>
                                            <Text style={[styles.uploadTitle, { color: theme.text }]}>Business Permit / Registration ID</Text>
                                            <Text style={[styles.uploadSubtitle, { color: theme.textMuted }]}>{businessPermit ? 'File attached' : 'Tap to upload'}</Text>
                                        </View>
                                    </View>
                                    <MaterialCommunityIcons name={businessPermit ? 'check-circle' : 'chevron-right'} size={20} color={businessPermit ? '#4CAF50' : theme.textMuted} />
                                </TouchableOpacity>

                                <TouchableOpacity style={[styles.uploadButton, { borderColor: theme.border, backgroundColor: isDarkMode ? '#1e1e1e' : '#f5f5f5' }]} onPress={() => pickDocument('owner_id')} activeOpacity={0.7}>
                                    <View style={styles.uploadButtonLeft}>
                                        <MaterialCommunityIcons name="account-box-outline" size={20} color={theme.text} />
                                        <View style={{ marginLeft: 10, flex: 1 }}>
                                            <Text style={[styles.uploadTitle, { color: theme.text }]}>Upload ID / Business Proof</Text>
                                            <Text style={[styles.uploadSubtitle, { color: theme.textMuted }]}>{ownerId ? 'File attached' : 'Tap to choose from album'}</Text>
                                        </View>
                                    </View>
                                    <MaterialCommunityIcons name={ownerId ? 'check-circle' : 'chevron-right'} size={20} color={ownerId ? '#4CAF50' : theme.textMuted} />
                                </TouchableOpacity>

                                <TouchableOpacity style={[styles.uploadButton, { borderColor: theme.border, backgroundColor: isDarkMode ? '#1e1e1e' : '#f5f5f5' }]} onPress={takeSelfie} activeOpacity={0.7}>
                                    <View style={styles.uploadButtonLeft}>
                                        <MaterialCommunityIcons name="camera-outline" size={20} color={theme.text} />
                                        <View style={{ marginLeft: 10, flex: 1 }}>
                                            <Text style={[styles.uploadTitle, { color: theme.text }]}>Take Selfie with ID</Text>
                                            <Text style={[styles.uploadSubtitle, { color: theme.textMuted }]}>{selfieWithId ? 'Selfie captured' : 'Open camera now'}</Text>
                                        </View>
                                    </View>
                                    <MaterialCommunityIcons name={selfieWithId ? 'check-circle' : 'chevron-right'} size={20} color={selfieWithId ? '#4CAF50' : theme.textMuted} />
                                </TouchableOpacity>

                                <TouchableOpacity style={[styles.uploadButton, { borderColor: theme.border, backgroundColor: isDarkMode ? '#1e1e1e' : '#f5f5f5' }]} onPress={() => pickDocument('registration_id')} activeOpacity={0.7}>
                                    <View style={styles.uploadButtonLeft}>
                                        <MaterialCommunityIcons name="card-account-details-outline" size={20} color={theme.text} />
                                        <View style={{ marginLeft: 10, flex: 1 }}>
                                            <Text style={[styles.uploadTitle, { color: theme.text }]}>Additional Registration Document</Text>
                                            <Text style={[styles.uploadSubtitle, { color: theme.textMuted }]}>{registrationId ? 'File attached' : 'Optional'}</Text>
                                        </View>
                                    </View>
                                    <MaterialCommunityIcons name={registrationId ? 'check-circle' : 'chevron-right'} size={20} color={registrationId ? '#4CAF50' : theme.textMuted} />
                                </TouchableOpacity>

                                <View style={[styles.termsCard, { borderColor: theme.border, backgroundColor: isDarkMode ? '#1e1e1e' : '#f5f5f5' }]}>
                                    <TouchableOpacity onPress={() => setAcceptTerms(!acceptTerms)} style={styles.termsRow} activeOpacity={0.8}>
                                        <View style={[styles.checkbox, { borderColor: acceptTerms ? theme.warning : theme.border, backgroundColor: acceptTerms ? theme.warning : 'transparent' }]}>
                                            {acceptTerms && <MaterialCommunityIcons name="check" size={14} color="#000" />}
                                        </View>
                                        <Text style={[styles.termsText, { color: theme.textSecondary }]}>I confirm that all provided information is accurate and I agree to the review process and terms of service.</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}

                        {step === 4 && (
                            <>
                                <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>Step 4 · Review</Text>
                                <View style={[styles.reviewCard, { borderColor: theme.border, backgroundColor: isDarkMode ? '#1e1e1e' : '#f5f5f5' }]}>
                                    <ReviewRow label="Business Name" value={businessName || '—'} theme={theme} />
                                    <ReviewRow label="Business Type" value={selectedBusinessType?.label || '—'} theme={theme} />
                                    <ReviewRow label="Registration Number" value={registrationNumber || '—'} theme={theme} />
                                    <ReviewRow label="TIN" value={tinNumber || 'Optional'} theme={theme} />
                                    <ReviewRow label="Business Address" value={businessAddress || '—'} theme={theme} />
                                    <ReviewRow label="Contact Person" value={contactName || '—'} theme={theme} />
                                    <ReviewRow label="Contact Phone" value={contactPhone || '—'} theme={theme} />
                                    <ReviewRow label="Docs" value={`${businessPermit ? 'Permit ✓ ' : ''}${ownerId ? 'ID ✓' : ''}`.trim() || 'Missing'} theme={theme} />
                                    <ReviewRow label="Terms" value={acceptTerms ? 'Accepted' : 'Not accepted'} theme={theme} />
                                </View>

                                <Text style={[styles.helperText, { color: theme.textMuted, marginTop: 12 }]}>Double check everything before you submit. Once submitted, your application will enter review.</Text>
                            </>
                        )}

                        <View style={{ height: 20 }} />

                        <View style={{ paddingTop: 16, paddingBottom: insets.bottom + 80 }}>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                {step > 1 && (
                                    <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: isDarkMode ? '#2a2a2a' : '#ededed' }]} onPress={goBack}>
                                        <Text style={[styles.buttonText, { color: theme.text }]}>Back</Text>
                                    </TouchableOpacity>
                                )}

                                {step < totalSteps ? (
                                    <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: theme.warning }]} onPress={goNext}>
                                        <Text style={[styles.buttonText, { color: '#000' }]}>Next</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        style={[styles.button, { flex: 1, backgroundColor: theme.warning, opacity: submitting ? 0.6 : 1 }]}
                                        onPress={handleSubmit}
                                        disabled={submitting}
                                    >
                                        {submitting ? <ActivityIndicator size="small" color="#000" /> : <Text style={[styles.buttonText, { color: '#000' }]}>Submit Application</Text>}
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </Screen>
        </KeyboardAvoidingView>
    );
}

function ReviewRow({ label, value, theme }) {
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(127,127,127,0.12)' }}>
            <Text style={{ color: theme.textMuted, fontSize: 12, flex: 1 }}>{label}</Text>
            <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600', flex: 1, textAlign: 'right' }} numberOfLines={2}>{value}</Text>
        </View>
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
    stepperCard: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        marginBottom: 16,
    },
    stepperHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    stepperTitle: {
        fontSize: 13,
        fontWeight: '700',
    },
    stepperSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    stepperPercent: {
        fontSize: 13,
        fontWeight: '800',
    },
    stepperTrack: {
        height: 8,
        borderRadius: 999,
        overflow: 'hidden',
    },
    stepperFill: {
        height: 8,
        borderRadius: 999,
    },
    stepDotsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    stepDotItem: {
        flex: 1,
        alignItems: 'center',
    },
    stepDot: {
        width: 10,
        height: 10,
        borderRadius: 999,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 4,
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
    uploadButton: {
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 14,
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    uploadButtonLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        paddingRight: 12,
    },
    uploadTitle: {
        fontSize: 13,
        fontWeight: '700',
        lineHeight: 18,
    },
    uploadSubtitle: {
        fontSize: 11,
        lineHeight: 16,
        marginTop: 2,
    },
    termsCard: {
        marginTop: 16,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
    },
    termsRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        marginTop: 2,
    },
    termsText: {
        fontSize: 12,
        lineHeight: 18,
        flex: 1,
    },
    reviewCard: {
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 6,
        marginTop: 8,
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
