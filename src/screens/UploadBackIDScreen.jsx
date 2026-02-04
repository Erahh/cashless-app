import React, { useState } from "react";
import {
    View,
    Text,
    Alert,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    SafeAreaView,
    ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../api/supabase";

export default function UploadBackIDScreen({ navigation, route }) {
    const { passenger_type, frontImage } = route.params || {};
    const [backImage, setBackImage] = useState(null);
    const [uploading, setUploading] = useState(false);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            return Alert.alert("Permission needed", "Please allow access to your photos.");
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets?.[0]?.uri) {
            setBackImage(result.assets[0].uri);
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
            return Alert.alert("Permission needed", "Please allow access to your camera.");
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets?.[0]?.uri) {
            setBackImage(result.assets[0].uri);
        }
    };

    const uploadToSupabase = async (uri, side) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const ext = uri.split(".").pop();
            const fileName = `${user.id}/${passenger_type}_${side}_${Date.now()}.${ext}`;

            const response = await fetch(uri);
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();

            const { data, error } = await supabase.storage
                .from("verification-docs")
                .upload(fileName, arrayBuffer, {
                    contentType: `image/${ext}`,
                    upsert: false,
                });

            if (error) throw error;
            return data.path;
        } catch (err) {
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
            // Upload both images
            const frontPath = await uploadToSupabase(frontImage, "front");
            const backPath = await uploadToSupabase(backImage, "back");

            // Submit verification request to backend
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) throw new Error("No auth token");

            const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://cashless-backend.onrender.com";
            const response = await fetch(`${API_URL}/verification/submit`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    passenger_type,
                    id_front_path: frontPath,
                    id_back_path: backPath,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Submission failed");
            }

            Alert.alert("Success", "Your verification request has been submitted!");
            navigation.navigate("VerificationSubmitted");
        } catch (err) {
            Alert.alert("Error", err.message || "Failed to submit verification");
        } finally {
            setUploading(false);
        }
    };

    const emoji = passenger_type === "student" ? "🎓" : "👴";
    const typeLabel = passenger_type === "student" ? "Student" : "Senior Citizen";

    return (
        <SafeAreaView style={styles.safe}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={24} color="#fff" />
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
                        <Ionicons name="checkmark-circle" size={18} color="#7CFF9B" />
                        <Text style={styles.frontPreviewText}>Front ID uploaded</Text>
                    </View>
                    {frontImage && (
                        <Image source={{ uri: frontImage }} style={styles.frontPreviewImage} />
                    )}
                </View>

                {/* Upload Area */}
                <View style={styles.uploadSection}>
                    {backImage ? (
                        <View style={styles.imagePreviewContainer}>
                            <Image source={{ uri: backImage }} style={styles.imagePreview} />
                            <View style={styles.checkmarkOverlay}>
                                <Ionicons name="checkmark-circle" size={48} color="#7CFF9B" />
                            </View>
                            <View style={styles.actionButtons}>
                                <TouchableOpacity
                                    style={styles.actionBtn}
                                    onPress={takePhoto}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="camera" size={18} color="#fff" />
                                    <Text style={styles.actionBtnText}>Retake</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.actionBtn}
                                    onPress={pickImage}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="images" size={18} color="#fff" />
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
                                    <Ionicons name="image-outline" size={40} color="rgba(255,255,255,0.4)" />
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
                                <Ionicons name="camera" size={20} color="#fff" />
                                <Text style={styles.cameraButtonText}>Take Photo</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {/* Security Info */}
                <View style={styles.securityCard}>
                    <Ionicons name="shield-checkmark" size={20} color="#7CFF9B" />
                    <Text style={styles.securityText}>
                        Your documents are encrypted and stored securely. Only admins can review them for verification.
                    </Text>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    style={[
                        styles.submitBtn,
                        (!backImage || uploading) && styles.submitBtnDisabled
                    ]}
                    onPress={handleSubmit}
                    disabled={!backImage || uploading}
                    activeOpacity={0.9}
                >
                    {uploading ? (
                        <ActivityIndicator color="#0B0E14" />
                    ) : (
                        <>
                            <Text style={styles.submitBtnText}>Submit for Verification</Text>
                            <Ionicons name="checkmark-circle" size={20} color="#0B0E14" />
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: "#0B0E14",
    },
    scroll: {
        flex: 1,
    },
    content: {
        padding: 20,
        paddingBottom: 40,
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
        backgroundColor: "rgba(255,255,255,0.08)",
        alignItems: "center",
        justifyContent: "center",
    },

    // Progress
    progressSection: {
        marginBottom: 24,
    },
    progressBar: {
        height: 6,
        backgroundColor: "rgba(255,255,255,0.1)",
        borderRadius: 999,
        overflow: "hidden",
        marginBottom: 8,
    },
    progressFill: {
        height: "100%",
        backgroundColor: "#7CFF9B",
        borderRadius: 999,
    },
    progressText: {
        color: "rgba(255,255,255,0.65)",
        fontSize: 12,
        fontWeight: "700",
    },

    // Title
    titleSection: {
        marginBottom: 20,
    },
    title: {
        color: "#fff",
        fontSize: 26,
        fontWeight: "900",
        lineHeight: 34,
        marginBottom: 10,
    },
    subtitle: {
        color: "rgba(255,255,255,0.65)",
        fontSize: 15,
        lineHeight: 22,
    },
    highlight: {
        color: "#7CFF9B",
        fontWeight: "900",
    },

    // Front Preview
    frontPreview: {
        backgroundColor: "rgba(124,255,155,0.08)",
        borderWidth: 1,
        borderColor: "rgba(124,255,155,0.2)",
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
        color: "#7CFF9B",
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
        borderColor: "#7CFF9B",
        backgroundColor: "rgba(11,14,20,0.6)",
        padding: 40,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 200,
    },
    fileCardIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: "rgba(255,255,255,0.05)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    fileCardText: {
        color: "rgba(255,255,255,0.6)",
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
        backgroundColor: "rgba(255,255,255,0.1)",
    },
    dividerText: {
        color: "rgba(255,255,255,0.4)",
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
        backgroundColor: "rgba(255,255,255,0.12)",
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.15)",
    },
    cameraButtonText: {
        color: "#fff",
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
        backgroundColor: "rgba(11,14,20,0.8)",
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
        backgroundColor: "rgba(255,255,255,0.15)",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    actionBtnText: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "700",
    },

    // Security Card
    securityCard: {
        flexDirection: "row",
        alignItems: "flex-start",
        padding: 16,
        borderRadius: 16,
        backgroundColor: "rgba(124,255,155,0.08)",
        borderWidth: 1,
        borderColor: "rgba(124,255,155,0.2)",
        marginBottom: 24,
        gap: 12,
    },
    securityText: {
        flex: 1,
        color: "rgba(255,255,255,0.75)",
        fontSize: 13,
        lineHeight: 18,
    },

    // Submit Button
    submitBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        backgroundColor: "#7CFF9B",
        paddingVertical: 18,
        borderRadius: 16,
        shadowColor: "#7CFF9B",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    submitBtnDisabled: {
        backgroundColor: "rgba(255,255,255,0.15)",
        shadowOpacity: 0,
    },
    submitBtnText: {
        color: "#0B0E14",
        fontSize: 16,
        fontWeight: "900",
    },
});
