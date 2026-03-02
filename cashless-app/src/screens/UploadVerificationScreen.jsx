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
  Dimensions
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../api/supabase";
import { API_BASE_URL } from "../config/api";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ArrowLeft01Icon, Camera01Icon, CheckmarkCircle01Icon, Shield01Icon } from "@hugeicons/core-free-icons";

const { width } = Dimensions.get("window");

export default function UploadVerificationScreen({ navigation, route }) {
  // passenger_type passed from PassengerType flow: "student" or "senior"
  const passengerType = route?.params?.passenger_type;

  const [front, setFront] = useState(null);
  const [back, setBack] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async (setFn) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      return Alert.alert("Permission needed", "Allow gallery access to upload ID.");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // Updated from deprecated MediaTypeOptions.Images
      allowsEditing: true,
      quality: 0.8,
      base64: true, // Request base64 for backend upload
    });

    if (!result.canceled) {
      setFn(result.assets[0]);
    }
  };

  // Upload via backend to bypass RLS/MIME restrictions
  const uploadViaBackend = async (asset, side) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error("No session user");

    // Determine mime type from URI extension if possible, default to jpeg
    const ext = (asset.uri.split("?")[0].split(".").pop() || "jpg").toLowerCase();
    const mimeMap = {
      png: "image/png",
      webp: "image/webp",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      heic: "image/heic"
    };
    const mimeType = mimeMap[ext] || "image/jpeg";

    // Construct data URI
    if (!asset.base64) {
      console.error("❌ No base64 data found in asset!");
      throw new Error("Could not read image data. Please try again.");
    }

    console.log(`📤 Uploading ${side} ID... Base64 length:`, asset.base64.length);

    const dataUri = `data:${mimeType};base64,${asset.base64}`;

    const res = await fetch(`${API_BASE_URL}/verification/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        image: dataUri,
        document_type: side === "front" ? "id_front" : "id_back",
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || "Upload failed");
    }

    // Return the file path provided by backend
    return json.file_path;
  };

  const handleSubmit = async () => {
    try {
      // Guard: Validate passenger type before proceeding
      if (!passengerType || !["student", "senior"].includes(passengerType)) {
        return Alert.alert("Missing passenger type", "Go back and select Student or Senior.");
      }

      if (!front || !back) {
        return Alert.alert("Missing", "Please upload BOTH front and back ID.");
      }

      setLoading(true);

      // Upload files via backend
      const id_front_path = await uploadViaBackend(front, "front");
      const id_back_path = await uploadViaBackend(back, "back");

      // Get access token for submit call
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("No access token. Please login again.");

      // Submit verification request to backend
      const apiRes = await fetch(`${API_BASE_URL}/verification/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          passenger_type: passengerType,
          id_front_path,
          id_back_path,
        }),
      });

      const json = await apiRes.json();
      if (!apiRes.ok) {
        // Show detailed error message
        const errorMsg = json.error || json.message || "Unknown error";
        console.error("Verification submit error:", errorMsg);
        return Alert.alert(
          "Submit failed",
          errorMsg.includes("ON CONFLICT")
            ? "Database error: Please contact support. The verification system needs to be configured."
            : errorMsg
        );
      }

      Alert.alert("Submitted ✅", "Your verification is now pending admin approval.");
      navigation.navigate("VerificationSubmitted");
    } catch (e) {
      console.error("Upload error:", e);
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate progress (0-100%)
  const progress = (!front && !back) ? 0 : (front && !back) ? 50 : (front && back) ? 100 : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress}% Complete</Text>
        </View>

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Upload a photo of your</Text>
          <Text style={styles.titleHighlight}>
            {passengerType === "student" ? "Student ID 🎓" : passengerType === "senior" ? "Senior Citizen ID 👴" : "National ID Card 🪪"}
          </Text>
          <Text style={styles.subtitle}>
            Regulations require you to upload a national identity card. Don't worry, your data will stay safe and private.
          </Text>
        </View>

        {/* Upload Cards */}
        <View style={styles.uploadSection}>
          {/* Front ID Card */}
          <TouchableOpacity
            style={styles.uploadCard}
            onPress={() => pickImage(setFront)}
            activeOpacity={0.8}
          >
            {front ? (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: front.uri }}
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
                <View style={styles.imageOverlay}>
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} size={32} color="#7CFF9B" />
                  <Text style={styles.imageOverlayText}>Front ID Uploaded</Text>
                </View>
              </View>
            ) : (
              <View style={styles.uploadPlaceholder}>
                <View style={styles.iconCircle}>
                  <HugeiconsIcon icon={Camera01Icon} size={32} color="#7CFF9B" />
                </View>
                <Text style={styles.uploadLabel}>Select file</Text>
                <Text style={styles.uploadHint}>Tap to upload front of your ID</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Camera Button (Optional - can be implemented later) */}
          <TouchableOpacity
            style={styles.cameraBtn}
            onPress={() => Alert.alert("Camera", "Camera feature coming soon!")}
            activeOpacity={0.8}
          >
            <HugeiconsIcon icon={Camera01Icon} size={20} color="#7CFF9B" />
            <Text style={styles.cameraBtnText}>Open Camera & Take Photo</Text>
          </TouchableOpacity>

          {/* Back ID Card */}
          <View style={styles.sectionDivider} />

          <TouchableOpacity
            style={styles.uploadCard}
            onPress={() => pickImage(setBack)}
            activeOpacity={0.8}
          >
            {back ? (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: back.uri }}
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
                <View style={styles.imageOverlay}>
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} size={32} color="#7CFF9B" />
                  <Text style={styles.imageOverlayText}>Back ID Uploaded</Text>
                </View>
              </View>
            ) : (
              <View style={styles.uploadPlaceholder}>
                <View style={styles.iconCircle}>
                  <HugeiconsIcon icon={Camera01Icon} size={32} color="#7CFF9B" />
                </View>
                <Text style={styles.uploadLabel}>Select file</Text>
                <Text style={styles.uploadHint}>Tap to upload back of your ID</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Camera Button for Back */}
          <TouchableOpacity
            style={styles.cameraBtn}
            onPress={() => Alert.alert("Camera", "Camera feature coming soon!")}
            activeOpacity={0.8}
          >
            <HugeiconsIcon icon={Camera01Icon} size={20} color="#7CFF9B" />
            <Text style={styles.cameraBtnText}>Open Camera & Take Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <HugeiconsIcon icon={ShieldCheckIcon} size={20} color="#7CFF9B" />
          <Text style={styles.infoText}>
            Your documents are encrypted and stored securely. Only admins can review them for verification.
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            (!front || !back || loading) && styles.submitBtnDisabled
          ]}
          onPress={handleSubmit}
          disabled={!front || !back || loading}
          activeOpacity={0.9}
        >
          {loading ? (
            <ActivityIndicator color="#0B0E14" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>Continue</Text>
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

  // Progress Bar
  progressContainer: {
    marginBottom: 28,
  },
  progressBg: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#7CFF9B",
    borderRadius: 999,
  },
  progressText: {
    marginTop: 8,
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    fontWeight: "600",
  },

  // Title Section
  titleSection: {
    marginBottom: 32,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 36,
  },
  titleHighlight: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 36,
    marginTop: 4,
  },
  subtitle: {
    marginTop: 12,
    color: "rgba(255,255,255,0.65)",
    fontSize: 14,
    lineHeight: 20,
  },

  // Upload Section
  uploadSection: {
    marginBottom: 24,
  },
  uploadCard: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(124,255,155,0.3)",
    borderStyle: "dashed",
    backgroundColor: "rgba(124,255,155,0.05)",
    overflow: "hidden",
    minHeight: 200,
  },
  uploadPlaceholder: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(124,255,155,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  uploadLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },
  uploadHint: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
  },

  // Image Preview
  imagePreviewContainer: {
    position: "relative",
    width: "100%",
    height: 200,
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(11,14,20,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageOverlayText: {
    color: "#7CFF9B",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 8,
  },

  // Divider
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  dividerText: {
    marginHorizontal: 16,
    color: "rgba(255,255,255,0.45)",
    fontSize: 13,
    fontWeight: "600",
  },

  // Camera Button
  cameraBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(124,255,155,0.12)",
    borderWidth: 1,
    borderColor: "rgba(124,255,155,0.25)",
    gap: 10,
  },
  cameraBtnText: {
    color: "#7CFF9B",
    fontSize: 15,
    fontWeight: "800",
  },

  // Section Divider
  sectionDivider: {
    height: 32,
  },

  // Info Card
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(124,255,155,0.08)",
    borderWidth: 1,
    borderColor: "rgba(124,255,155,0.2)",
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    lineHeight: 18,
  },

  // Submit Button
  submitBtn: {
    backgroundColor: "#7CFF9B",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
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
