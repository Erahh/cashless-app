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
import { ArrowLeft01Icon, ArrowRight01Icon, Camera01Icon, Image01Icon, CheckmarkCircle01Icon, IdeaIcon } from "@hugeicons/core-free-icons";
import { useTheme } from "../../context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { AppLockContext } from "../../context/AppLockContext";

export default function UploadFrontIDScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const { setLockSuppressed } = useContext(AppLockContext);
    const { theme, isDarkMode } = useTheme();

    // Prevent app from locking while on this screen
    useEffect(() => {
        setLockSuppressed(true);
        return () => setLockSuppressed(false);
    }, [setLockSuppressed]);
    const styles = getStyles(theme);
    const { passenger_type } = route.params || {};
    const [frontImage, setFrontImage] = useState(null);
    const [uploading, setUploading] = useState(false);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            return Alert.alert("Permission needed", "Please allow access to your photos.");
        }

        setLockSuppressed(true);
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: [ImagePicker.MediaType.Images],
                allowsEditing: true,
                aspect: [3, 4],
                quality: 0.8,
            });

            if (!result.canceled && result.assets?.[0]?.uri) {
                setFrontImage(result.assets[0].uri);
            }
        } finally {
            // Give 1 second delay before re-enabling lock lock to ensure app is active
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
            });

            if (!result.canceled && result.assets?.[0]?.uri) {
                setFrontImage(result.assets[0].uri);
            }
        } finally {
            setTimeout(() => setLockSuppressed(false), 1000);
        }
    };

    const handleContinue = () => {
        if (!frontImage) {
            return Alert.alert("Missing Image", "Please upload the front of your ID.");
        }

        // Navigate to Back ID screen with front image
        navigation.navigate("UploadBackID", {
            passenger_type,
            frontImage,
        });
    };

    const emoji = passenger_type === "student" ? "🎓" : "👴";
    const typeLabel = passenger_type === "student" ? "Student" : "Senior Citizen";

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
                        <View style={[styles.progressFill, { width: "50%" }]} />
                    </View>
                    <Text style={styles.progressText}>Step 1 of 2</Text>
                </View>

                {/* Title Section */}
                <View style={styles.titleSection}>
                    <Text style={styles.title}>{emoji} Upload {typeLabel} ID</Text>
                    <Text style={styles.subtitle}>
                        Take a clear photo of the <Text style={styles.highlight}>FRONT</Text> of your ID
                    </Text>
                </View>

                {/* Upload Area */}
                <View style={styles.uploadSection}>
                    {frontImage ? (
                        <View style={styles.imagePreviewContainer}>
                            <Image source={{ uri: frontImage }} style={styles.imagePreview} />
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

                {/* Tips Card */}
                <View style={styles.tipsCard}>
                    <View style={styles.tipsHeader}>
                        <HugeiconsIcon icon={IdeaIcon} size={20} color={theme.warning} />
                        <Text style={styles.tipsTitle}>Tips for a clear photo</Text>
                    </View>
                    <View style={styles.tipItem}>
                        <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} color={theme.success} />
                        <Text style={styles.tipText}>Make sure all text is readable</Text>
                    </View>
                    <View style={styles.tipItem}>
                        <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} color={theme.success} />
                        <Text style={styles.tipText}>Avoid glare and shadows</Text>
                    </View>
                    <View style={styles.tipItem}>
                        <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} color={theme.success} />
                        <Text style={styles.tipText}>Place ID on a flat surface</Text>
                    </View>
                </View>

                {/* Continue Button */}
                <TouchableOpacity
                    style={[
                        styles.continueBtnWrapper,
                        !frontImage && styles.continueBtnDisabledWrapper
                    ]}
                    onPress={handleContinue}
                    disabled={!frontImage || uploading}
                    activeOpacity={0.9}
                >
                    <LinearGradient
                        colors={
                            !frontImage
                                ? [theme.card, theme.card]
                                : (isDarkMode ? ["#7CFF9B", "#4CAF50"] : ["#4CAF50", "#2E7D32"])
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.continueBtn]}
                    >
                        {uploading ? (
                            <ActivityIndicator color={isDarkMode ? "#0B0E14" : "#FFFFFF"} />
                        ) : (
                            <>
                                <Text style={[styles.continueBtnText, !frontImage && { color: theme.textMuted }]}>
                                    Continue to Back ID
                                </Text>
                                <HugeiconsIcon icon={ArrowRight01Icon} size={20} color={!frontImage ? theme.textMuted : (isDarkMode ? "#0B0E14" : "#FFFFFF")} />
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
        marginBottom: 32,
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
        padding: 40,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 200,
        borderStyle: "dashed",
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

    // Tips Card
    tipsCard: {
        backgroundColor: theme.warningBg,
        borderWidth: 1,
        borderColor: theme.warning,
        borderRadius: 18,
        padding: 18,
        marginBottom: 24,
    },
    tipsHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 14,
    },
    tipsTitle: {
        color: theme.warning,
        fontSize: 15,
        fontWeight: "900",
    },
    tipItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 8,
    },
    tipText: {
        color: theme.textSecondary,
        fontSize: 13,
        lineHeight: 18,
    },

    // Continue Button
    continueBtnWrapper: {
        borderRadius: 16,
        shadowColor: theme.success,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    continueBtnDisabledWrapper: {
        shadowOpacity: 0,
        elevation: 0,
    },
    continueBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        paddingVertical: 18,
        borderRadius: 16,
    },
    continueBtnText: {
        color: theme.isDark ? "#0B0E14" : "#FFFFFF",
        fontSize: 16,
        fontWeight: "900",
    },
});
