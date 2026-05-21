import React, { useState, useContext, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View,
    Text,
    Alert,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    ScrollView } from "react-native";

import * as ImagePicker from "expo-image-picker";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ArrowLeft01Icon, Camera01Icon, Image01Icon, CheckmarkCircle01Icon, Shield01Icon } from "@hugeicons/core-free-icons";
import { supabase } from "../../api/supabase";
import { API_BASE_URL } from "../../config/api";
import logger from '../../utils/logger';
import * as FileSystem from 'expo-file-system';
import { useTheme } from "../../context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { AppLockContext } from "../../context/AppLockContext";

export default function UploadBackIDScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const { setLockSuppressed } = useContext(AppLockContext);
    const { theme, isDarkMode } = useTheme();

    // Prevent app from locking while on this screen
    useEffect(() => {
        setLockSuppressed(true);
        return () => setLockSuppressed(false);
    }, [setLockSuppressed]);
    const styles = getStyles(theme);
    const { passenger_type, frontImage } = route.params || {};
    const [backImage, setBackImage] = useState(null);
    const [uploading, setUploading] = useState(false);

    const pickImage = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        const granted = perm?.granted === true || perm?.status === "granted" || perm?.accessPrivileges === "limited";
        if (!granted) {
            return Alert.alert("Permission needed", "Please allow access to your photos.");
        }

        setLockSuppressed(true);
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                allowsEditing: true,
                aspect: [3, 4],
                quality: 0.8,
                base64: true,
            });

            if (!result.canceled && result.assets?.[0]) {
                setBackImage(result.assets[0]);
            }
        } catch (err) {
            Alert.alert("Gallery Error", "Could not open photo library. Please try again.");
        } finally {
            setTimeout(() => setLockSuppressed(false), 1000);
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
            return Alert.alert("Permission needed", "Please allow access to your camera.");
        }

        setLockSuppressed(true);
        try {
            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [3, 4],
                quality: 0.8,
                base64: true,
            });

            if (!result.canceled && result.assets?.[0]) {
                setBackImage(result.assets[0]);
            }
        } finally {
            setTimeout(() => setLockSuppressed(false), 1000);
        }
    };

    const uploadToBackend = async (asset, side) => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;
                if (!token) throw new Error("No auth token");

                const uri = typeof asset === "string" ? asset : asset?.uri;
                if (!uri) {
                    throw new Error("Could not read selected file");
                }

                let base64Data = typeof asset === "object" && asset?.base64 ? asset.base64 : null;
                if (!base64Data) {
                    try {
                        base64Data = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
                    } catch (readErr) {
                        logger.error('Failed to read file as base64', readErr);
                        throw new Error('Could not read selected file. Try using the camera option instead.');
                    }
                }

                base64Data = `data:image/jpeg;base64,${base64Data}`;

                const res = await fetch(`${API_BASE_URL}/verification/upload`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        image: base64Data,
                        document_type: side === "front" ? "id_front" : "id_back"
                    })
                });

                const result = await res.json();
                if (!res.ok) throw new Error(result.error || "Upload failed");

                return result.file_path;
            } catch (err) {
                logger.error(`❌ Upload error (${side}):`, err);
                throw new Error(`Upload failed: ${err.message}`);
            }
    };

    const handleSubmit = async () => {
        if (!backImage) {
            return Alert.alert("Missing Image", "Please upload the back of your ID.");
        }

        if (!frontImage) {
            return Alert.alert("Error", "Front image is missing. Please go back and upload it again.");
        }

        setUploading(true);

        try {
            // Upload both images using our backend endpoint (fixes 0-byte issue)
            const frontPath = await uploadToBackend(frontImage, "front");
            const backPath = await uploadToBackend(backImage, "back");

            // Submit verification request to backend
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) throw new Error("No auth token");

            const submitType = passenger_type === "pwd" ? "student" : passenger_type;

            const response = await fetch(`${API_BASE_URL}/verification/submit`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    passenger_type: submitType,
                    id_front_path: frontPath,
                    id_back_path: backPath,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Submission failed");
            }

            Alert.alert("Success", "Your verification request has been submitted!");
            navigation.navigate("VerificationSubmitted", { flow: "id" });
        } catch (err) {
            Alert.alert("Error", err.message || "Failed to submit verification");
        } finally {
            setUploading(false);
        }
    };

    const emoji = passenger_type === "student" ? "🎓" : (passenger_type === "senior" ? "👴" : (passenger_type === "pwd" ? "♿" : ""));
    const typeLabel = passenger_type === "student" ? "Student" : (passenger_type === "senior" ? "Senior Citizen" : (passenger_type === "pwd" ? "PWD" : ""));

    return (
        <View style={[styles.safe, { paddingTop: insets.top }]}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                contentInsetAdjustmentBehavior="never"
                automaticallyAdjustContentInsets={false}
                automaticallyAdjustsScrollIndicatorInsets={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.7}
                    >
                        <HugeiconsIcon icon={ArrowLeft01Icon} size={24} color={theme.text} />
                    </TouchableOpacity>
                </View>

                {/* Progress Indicator */}
                <View style={styles.progressSection}>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: "100%" }]} />
                    </View>
                    <Text style={styles.progressText}>Step 2 of 2</Text>
                </View>

                {/* Title Section */}
                <View style={styles.titleSection}>
                    <Text style={styles.title}>{emoji} Upload {typeLabel} ID</Text>
                    <Text style={styles.subtitle}>
                        Take a clear photo of the <Text style={styles.highlight}>BACK</Text> of your ID
                    </Text>
                </View>

                {/* Front ID Preview (Small) */}
                <View style={styles.frontPreview}>
                    <View style={styles.frontPreviewHeader}>
                        <HugeiconsIcon icon={CheckmarkCircle01Icon} size={18} color={theme.success} />
                        <Text style={styles.frontPreviewText}>Front ID uploaded</Text>
                    </View>
                        {frontImage && (
                        <Image source={{ uri: frontImage?.uri || frontImage }} style={styles.frontPreviewImage} />
                    )}
                </View>

                {/* Upload Area */}
                <View style={styles.uploadSection}>
                        {backImage ? (
                        <View style={styles.imagePreviewContainer}>
                            <Image source={{ uri: (typeof backImage === 'string' ? backImage : backImage?.uri) }} style={styles.imagePreview} />
                            <View style={styles.checkmarkOverlay}>
                                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={48} color={theme.success} />
                            </View>
                            <View style={styles.actionButtons}>
                                <TouchableOpacity
                                    style={styles.actionBtn}
                                    onPress={takePhoto}
                                    activeOpacity={0.8}
                                >
                                    <HugeiconsIcon icon={Camera01Icon} size={18} color={theme.text} />
                                    <Text style={styles.actionBtnText}>Retake</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.actionBtn}
                                    onPress={pickImage}
                                    activeOpacity={0.8}
                                >
                                    <HugeiconsIcon icon={Image01Icon} size={18} color={theme.text} />
                                    <Text style={styles.actionBtnText}>Choose Another</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <>
                            {/* File Selector Card */}
                            <TouchableOpacity
                                style={styles.fileCard}
                                onPress={pickImage}
                                activeOpacity={0.8}
                            >
                                <View style={styles.fileCardIcon}>
                                    <HugeiconsIcon icon={Image01Icon} size={40} color={theme.textMuted} />
                                </View>
                                <Text style={styles.fileCardText}>Select file</Text>
                            </TouchableOpacity>

                            {/* Divider */}
                            <View style={styles.divider}>
                                <View style={styles.dividerLine} />
                                <Text style={styles.dividerText}>or</Text>
                                <View style={styles.dividerLine} />
                            </View>

                            {/* Camera Button */}
                            <TouchableOpacity
                                style={styles.cameraButton}
                                onPress={takePhoto}
                                activeOpacity={0.9}
                            >
                                <HugeiconsIcon icon={Camera01Icon} size={20} color={theme.text} />
                                <Text style={styles.cameraButtonText}>Take Photo</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {/* Security Info */}
                <View style={styles.securityCard}>
                    <HugeiconsIcon icon={Shield01Icon} size={20} color={theme.success} />
                    <Text style={styles.securityText}>
                        Your documents are encrypted and stored securely. Only admins can review them for verification.
                    </Text>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    style={[
                        styles.submitBtnWrapper,
                        (!backImage || uploading) && styles.submitBtnDisabledWrapper
                    ]}
                    onPress={handleSubmit}
                    disabled={!backImage || uploading}
                    activeOpacity={0.9}
                >
                    <LinearGradient
                        colors={
                            (!backImage || uploading)
                                ? [theme.card, theme.card]
                                : (isDarkMode ? ["#7CFF9B", "#4CAF50"] : ["#4CAF50", "#2E7D32"])
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.submitBtn]}
                    >
                        {uploading ? (
                            <ActivityIndicator color={isDarkMode ? "#0B0E14" : "#FFFFFF"} />
                        ) : (
                            <>
                                <Text style={[styles.submitBtnText, (!backImage || uploading) && { color: theme.textMuted }]}>
                                    Submit for Verification
                                </Text>
                                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={20} color={(!backImage || uploading) ? theme.textMuted : (isDarkMode ? "#0B0E14" : "#FFFFFF")} />
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const getStyles = (theme) => StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: theme.background,
    },
    scroll: {
        flex: 1,
    },
    content: {
        padding: 20,
        paddingBottom: 170,
    },

    // Header
    header: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 10,
        marginBottom: 20,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: theme.border,
        alignItems: "center",
        justifyContent: "center",
    },

    // Progress
    progressSection: {
        marginBottom: 24,
    },
    progressBar: {
        height: 6,
        backgroundColor: theme.border,
        borderRadius: 999,
        overflow: "hidden",
        marginBottom: 8,
    },
    progressFill: {
        height: "100%",
        backgroundColor: theme.success,
        borderRadius: 999,
    },
    progressText: {
        color: theme.textSecondary,
        fontSize: 12,
        fontWeight: "700",
    },

    // Title
    titleSection: {
        marginBottom: 20,
    },
    title: {
        color: theme.text,
        fontSize: 26,
        fontWeight: "900",
        lineHeight: 34,
        marginBottom: 10,
    },
    subtitle: {
        color: theme.textSecondary,
        fontSize: 15,
        lineHeight: 22,
    },
    highlight: {
        color: theme.success,
        fontWeight: "900",
    },

    // Front Preview
    frontPreview: {
        backgroundColor: theme.successBg,
        borderWidth: 1,
        borderColor: theme.success,
        borderRadius: 16,
        padding: 14,
        marginBottom: 24,
    },
    frontPreviewHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 10,
    },
    frontPreviewText: {
        color: theme.success,
        fontSize: 13,
        fontWeight: "700",
    },
    frontPreviewImage: {
        width: "100%",
        height: 100,
        borderRadius: 12,
    },

    // Upload Section
    uploadSection: {
        marginBottom: 24,
    },

    // File Selector Card
    fileCard: {
        borderRadius: 20,
        borderWidth: 2,
        borderColor: theme.success,
        backgroundColor: theme.successBg,
        borderStyle: "dashed",
        padding: 40,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 200,
    },
    fileCardIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: theme.card,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    fileCardText: {
        color: theme.textSecondary,
        fontSize: 15,
        fontWeight: "600",
    },

    // Divider
    divider: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: theme.border,
    },
    dividerText: {
        color: theme.textMuted,
        fontSize: 13,
        fontWeight: "600",
        marginHorizontal: 16,
    },

    // Camera Button
    cameraButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        backgroundColor: theme.card,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.border,
    },
    cameraButtonText: {
        color: theme.text,
        fontSize: 15,
        fontWeight: "700",
    },

    // Image Preview
    imagePreviewContainer: {
        borderRadius: 20,
        overflow: "hidden",
        position: "relative",
    },
    imagePreview: {
        width: "100%",
        height: 280,
        borderRadius: 20,
    },
    checkmarkOverlay: {
        position: "absolute",
        top: 16,
        right: 16,
        backgroundColor: theme.background,
        borderRadius: 999,
        padding: 4,
    },
    actionButtons: {
        flexDirection: "row",
        gap: 10,
        marginTop: 12,
    },
    actionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: theme.border,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    actionBtnText: {
        color: theme.text,
        fontSize: 13,
        fontWeight: "700",
    },

    // Security Card
    securityCard: {
        flexDirection: "row",
        alignItems: "flex-start",
        padding: 16,
        borderRadius: 16,
        backgroundColor: theme.successBg,
        borderWidth: 1,
        borderColor: theme.success,
        marginBottom: 24,
        gap: 12,
    },
    securityText: {
        flex: 1,
        color: theme.textSecondary,
        fontSize: 13,
        lineHeight: 18,
    },

    // Submit Button
    submitBtnWrapper: {
        borderRadius: 16,
        shadowColor: theme.success,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    submitBtnDisabledWrapper: {
        shadowOpacity: 0,
        elevation: 0,
    },
    submitBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        paddingVertical: 18,
        borderRadius: 16,
    },
    submitBtnText: {
        color: theme.isDark ? "#0B0E14" : "#FFFFFF",
        fontSize: 16,
        fontWeight: "900",
    },
});
