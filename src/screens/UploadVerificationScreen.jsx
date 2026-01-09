import React, { useState } from "react";
import { View, Text, Button, Alert, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../api/supabase";
import { API_BASE_URL } from "../config/api";

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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setFn(result.assets[0]);
    }
  };

  // Upload to private bucket verification-docs
  const uploadToSupabase = async (asset, side) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) throw new Error("No session user");

    // Fetch image bytes from local uri
    const res = await fetch(asset.uri);
    const blob = await res.blob();

    const ext = (asset.uri.split(".").pop() || "jpg").toLowerCase();
    const path = `${userId}/${passengerType}_${side}_${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("verification-docs")
      .upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: true });

    if (error) throw error;

    // Return the file path inside bucket (store in DB)
    return path;
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

      // Upload files first
      const id_front_path = await uploadToSupabase(front, "front");
      const id_back_path = await uploadToSupabase(back, "back");

      // Get access token for backend call
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
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20, marginTop: 60 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>Upload Verification</Text>
      {passengerType && (
        <Text style={{ marginTop: 10 }}>
          Passenger type: {passengerType.toUpperCase()}
        </Text>
      )}

      <TouchableOpacity
        style={{ marginTop: 18, padding: 14, borderWidth: 1, borderRadius: 10 }}
        onPress={() => pickImage(setFront)}
      >
        <Text style={{ fontWeight: "700" }}>Upload ID Front</Text>
        {front ? (
          <Image
            source={{ uri: front.uri }}
            style={{ height: 160, borderRadius: 10, marginTop: 10 }}
          />
        ) : (
          <Text style={{ marginTop: 6, color: "#666" }}>No file selected</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={{ marginTop: 14, padding: 14, borderWidth: 1, borderRadius: 10 }}
        onPress={() => pickImage(setBack)}
      >
        <Text style={{ fontWeight: "700" }}>Upload ID Back</Text>
        {back ? (
          <Image
            source={{ uri: back.uri }}
            style={{ height: 160, borderRadius: 10, marginTop: 10 }}
          />
        ) : (
          <Text style={{ marginTop: 6, color: "#666" }}>No file selected</Text>
        )}
      </TouchableOpacity>

      <View style={{ marginTop: 18 }}>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <Button title="Submit for Admin Review" onPress={handleSubmit} />
        )}
      </View>
    </View>
  );
}
