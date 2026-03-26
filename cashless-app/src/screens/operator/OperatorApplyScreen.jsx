import React, { useState, useContext, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View,
    Text,
    Alert,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    ScrollView,
    TextInput,
    Dimensions } from "react-native";

import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../api/supabase";
import { API_BASE_URL } from "../../config/api";
import { HugeiconsIcon } from "@hugeicons/react-native";
import {
    ArrowLeft01Icon,
    Camera01Icon,
    CheckmarkCircle01Icon,
    Shield01Icon,
    Clock01Icon,
    User01Icon,
    InformationCircleIcon,
    DeliveryTruck01Icon
} from "@hugeicons/core-free-icons";
import { AppLockContext } from "../../context/AppLockContext";
import { useTheme } from "../../context/ThemeContext";
import { submitOperatorApplication } from "../../api/operatorApi";

const { width } = Dimensions.get("window");

export default function OperatorApplyScreen({ navigation }) {
    const { setLockSuppressed } = useContext(AppLockContext);
    const { theme, isDarkMode } = useTheme();

    const [licenseNo, setLicenseNo] = useState("");
    const [experience, setExperience] = useState("");
    const [vehicleType, setVehicleType] = useState("");

    const [front, setFront] = useState(null);
    const [back, setBack] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLockSuppressed(true);
        return () => setLockSuppressed(false);
    }, [setLockSuppressed]);

    const pickImage = async (setFn) => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            return Alert.alert("Permission needed", "Allow gallery access to upload documents.");
        }

        setLockSuppressed(true);
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.8,
                base64: true,
            });

            if (!result.canceled) {
                setFn(result.assets[0]);
            }
        } finally {
            setTimeout(() => setLockSuppressed(false), 1000);
        }
    };

    const uploadViaBackend = async (asset, side) => {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) throw new Error("No session user");

        const ext = (asset.uri.split("?")[0].split(".").pop() || "jpg").toLowerCase();
        const mimeMap = { png: "image/png", webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg" };
        const mimeType = mimeMap[ext] || "image/jpeg";

        if (!asset.base64) throw new Error("Could not read image data.");

        const dataUri = `data:${mimeType};base64,${asset.base64}`;

        const res = await fetch(`${API_BASE_URL}/verification/upload`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                image: dataUri,
                document_type: side === "license_front" ? "id_front" : "id_back",
            }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Upload failed");
        return json.file_path;
    };

    const handleSubmit = async () => {
        if (!licenseNo.trim() || !experience.trim() || !vehicleType.trim()) {
            return Alert.alert("Missing Fields", "Please fill in all the driver information.");
        }
        if (!front || !back) {
            return Alert.alert("Missing Documents", "Please upload both front and back of your driver's license.");
        }

        try {
            setLoading(true);

            const frontPath = await uploadViaBackend(front, "license_front");
            const backPath = await uploadViaBackend(back, "license_back");

            await submitOperatorApplication({
                license_no: licenseNo,
                experience_years: parseInt(experience) || 0,
                vehicle_type: vehicleType,
                documents: [
                    { type: "license_front", path: frontPath },
                    { type: "license_back", path: backPath }
                ]
            });

            Alert.alert("Success ✅", "Your application has been submitted and is awaiting admin review.");
            navigation.goBack();
        } catch (e) {
            Alert.alert("Error", e.message);
        } finally {
            setLoading(false);
        }
    };

    const progress = (!front && !back) ? 0 : (front && !back) ? 50 : (front && back) ? 100 : 0;

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={[styles.backBtn, { backgroundColor: theme.card }]}
                        onPress={() => navigation.goBack()}
                    >
                        <HugeiconsIcon icon={ArrowLeft01Icon} size={24} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Apply as Operator</Text>
                </View>

                <View style={styles.progressContainer}>
                    <View style={[styles.progressBg, { backgroundColor: theme.border }]}>
                        <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: theme.accent }]} />
                    </View>
                    <Text style={[styles.progressText, { color: theme.textMuted }]}>{progress}% Documents Ready</Text>
                </View>

                <View style={styles.formSection}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Driver Information</Text>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>Driver's License Number</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <HugeiconsIcon icon={Shield01Icon || User01Icon} size={20} color={theme.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                placeholder="N01-XX-XXXXXX"
                                placeholderTextColor={theme.textMuted}
                                value={licenseNo}
                                onChangeText={setLicenseNo}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>Years of Experience</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <HugeiconsIcon icon={Clock01Icon} size={20} color={theme.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                placeholder="e.g. 5"
                                placeholderTextColor={theme.textMuted}
                                keyboardType="numeric"
                                value={experience}
                                onChangeText={setExperience}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>Primary Vehicle Operated</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <HugeiconsIcon icon={DeliveryTruck01Icon || User01Icon} size={20} color={theme.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                placeholder="e.g. Jeepney, Bus, Tricycle"
                                placeholderTextColor={theme.textMuted}
                                value={vehicleType}
                                onChangeText={setVehicleType}
                            />
                        </View>
                    </View>
                </View>

                <View style={styles.uploadSection}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Requirements</Text>
                    <Text style={[styles.sub, { color: theme.textSecondary }]}>Upload clear photos of your Professional Driver's License.</Text>

                    <TouchableOpacity
                        style={[styles.uploadCard, { borderColor: theme.accent + "40", backgroundColor: theme.accent + "10" }]}
                        onPress={() => pickImage(setFront)}
                    >
                        {front ? (
                            <View style={styles.preview}>
                                <Image source={{ uri: front.uri }} style={styles.image} />
                                <View style={styles.overlay}>
                                    <HugeiconsIcon icon={CheckmarkCircle01Icon} size={32} color={theme.success} />
                                    <Text style={[styles.overlayText, { color: theme.success }]}>License Front Uploaded</Text>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.placeholder}>
                                <HugeiconsIcon icon={Camera01Icon} size={32} color={theme.accent} />
                                <Text style={[styles.uploadLabel, { color: theme.text }]}>License Front</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.uploadCard, { borderColor: theme.accent + "40", backgroundColor: theme.accent + "10", marginTop: 16 }]}
                        onPress={() => pickImage(setBack)}
                    >
                        {back ? (
                            <View style={styles.preview}>
                                <Image source={{ uri: back.uri }} style={styles.image} />
                                <View style={styles.overlay}>
                                    <HugeiconsIcon icon={CheckmarkCircle01Icon} size={32} color={theme.success} />
                                    <Text style={[styles.overlayText, { color: theme.success }]}>License Back Uploaded</Text>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.placeholder}>
                                <HugeiconsIcon icon={Camera01Icon} size={32} color={theme.accent} />
                                <Text style={[styles.uploadLabel, { color: theme.text }]}>License Back</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={[styles.infoCard, { backgroundColor: (theme?.accent || '#F7E353') + "15", borderColor: (theme?.accent || '#F7E353') + "30" }]}>
                    <HugeiconsIcon icon={Shield01Icon || InformationCircleIcon || User01Icon} size={20} color={theme.accent} />
                    <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                        Your data is encrypted. Admins will review your license to grant operator access.
                    </Text>
                </View>

                <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: theme.accent }, (!front || !back || !licenseNo || loading) && styles.disabled]}
                    onPress={handleSubmit}
                    disabled={!front || !back || !licenseNo || loading}
                >
                    {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.submitText}>Submit Application</Text>}
                </TouchableOpacity>

                <View style={{ height: 120 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    content: { padding: 20 },
    header: { flexDirection: "row", alignItems: "center", marginBottom: 20, gap: 16 },
    backBtn: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    headerTitle: { fontSize: 20, fontWeight: "900" },

    progressContainer: { marginBottom: 24 },
    progressBg: { height: 6, borderRadius: 3 },
    progressFill: { height: "100%", borderRadius: 3 },
    progressText: { marginTop: 8, fontSize: 12, fontWeight: "700" },

    formSection: { marginBottom: 24 },
    sectionTitle: { fontSize: 18, fontWeight: "900", marginBottom: 16 },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: "700", marginBottom: 8 },
    inputWrapper: { height: 56, borderRadius: 16, borderWidth: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 16 },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontSize: 15, fontWeight: "600" },

    uploadSection: { marginBottom: 24 },
    sub: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
    uploadCard: { borderRadius: 20, borderWidth: 2, borderStyle: "dashed", minHeight: 160, overflow: "hidden" },
    placeholder: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
    uploadLabel: { marginTop: 12, fontWeight: "800", fontSize: 15 },
    preview: { width: "100%", height: 160 },
    image: { width: "100%", height: "100%" },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
    overlayText: { marginTop: 8, fontWeight: "800", fontSize: 14 },

    infoCard: { flexDirection: "row", padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 24, gap: 12 },
    infoText: { flex: 1, fontSize: 13, lineHeight: 18 },

    submitBtn: { height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    disabled: { opacity: 0.5 },
    submitText: { color: "#000", fontWeight: "900", fontSize: 16 }
});
