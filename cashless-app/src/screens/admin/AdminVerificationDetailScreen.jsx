import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  TextInput } from "react-native";

import { approveVerification, rejectVerification, fetchVerificationFiles } from "../../api/adminApi";

export default function AdminVerificationDetailScreen({ navigation, route }) {
  const request = route?.params?.request;
  const requestId = request?.id;
  const isBusinessRequest = String(request?.requested_type || "").toLowerCase() === "business";

  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState([]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const f = await fetchVerificationFiles(requestId);
      setFiles(f);
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [requestId]);

  const businessFiles = files.filter((x) => x.document_type !== "id_front" && x.document_type !== "id_back");
  const front = files.find((x) => x.document_type === "id_front");
  const back = files.find((x) => x.document_type === "id_back");

  const doApprove = async () => {
    try {
      setBusy(true);
      await approveVerification(requestId, notes.trim() || null);
      Alert.alert("Approved ✅", "User is now verified.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setBusy(false);
    }
  };

  const doReject = async () => {
    try {
      if (!notes.trim()) {
        return Alert.alert("Reason required", "Please type the rejection reason in notes.");
      }
      setBusy(true);
      await rejectVerification(requestId, notes.trim());
      Alert.alert("Rejected ❌", "User verification was rejected.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Request Detail</Text>
        <Text style={styles.sub}>
          {request?.profiles?.full_name || "Unknown"} • {request?.requested_type?.toUpperCase()}
        </Text>

        {isBusinessRequest && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Business Details</Text>
            <Text style={styles.cardText}>Business Name: {request?.business_details?.name || request?.business_name || "-"}</Text>
            <Text style={styles.cardText}>Business Type: {request?.business_details?.type || request?.business_type || "-"}</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact</Text>
          <Text style={styles.cardText}>Phone: {request?.profiles?.phone || "-"}</Text>
          <Text style={styles.cardText}>Email: {request?.profiles?.email || "-"}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notes / Reason</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional for approve, required for reject"
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={styles.input}
            multiline
          />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.dim}>Loading files...</Text>
          </View>
        ) : (
          <>
            {!isBusinessRequest && (
              <>
                <Text style={styles.section}>ID Front</Text>
                <View style={styles.imageBox}>
                  {front?.signed_url ? (
                    <Image source={{ uri: front.signed_url }} style={styles.image} />
                  ) : (
                    <Text style={styles.dim}>No front image</Text>
                  )}
                </View>

                <Text style={styles.section}>ID Back</Text>
                <View style={styles.imageBox}>
                  {back?.signed_url ? (
                    <Image source={{ uri: back.signed_url }} style={styles.image} />
                  ) : (
                    <Text style={styles.dim}>No back image</Text>
                  )}
                </View>
              </>
            )}

            {isBusinessRequest && businessFiles.length > 0 && (
              <>
                <Text style={styles.section}>Uploaded Business Documents</Text>
                {businessFiles.map((file) => (
                  <View key={file.id || file.document_type} style={styles.fileCard}>
                    <Text style={styles.fileTitle}>{String(file.document_type || "document").replace(/_/g, " ").toUpperCase()}</Text>
                    {file.signed_url ? (
                      <Image source={{ uri: file.signed_url }} style={styles.image} />
                    ) : (
                      <Text style={styles.dim}>No preview available</Text>
                    )}
                  </View>
                ))}
              </>
            )}
          </>
        )}

        <View style={{ height: 14 }} />

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryBtn, busy && { opacity: 0.6 }]}
            onPress={doApprove}
            activeOpacity={0.9}
            disabled={busy}
          >
            <Text style={styles.primaryText}>Approve</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dangerBtn, busy && { opacity: 0.6 }]}
            onPress={doReject}
            activeOpacity={0.9}
            disabled={busy}
          >
            <Text style={styles.dangerText}>Reject</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0E14" },
  content: { padding: 18, paddingTop: 18 },

  back: { color: "rgba(255,255,255,0.75)", fontWeight: "800", marginBottom: 10 },

  title: { color: "#fff", fontSize: 24, fontWeight: "900" },
  sub: { marginTop: 8, color: "rgba(255,255,255,0.65)" },

  card: {
    marginTop: 14,
    borderRadius: 18,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  cardTitle: { color: "#fff", fontWeight: "900", marginBottom: 8 },
  cardText: { color: "rgba(255,255,255,0.7)", marginTop: 4 },

  input: {
    minHeight: 64,
    borderRadius: 14,
    padding: 12,
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  center: { marginTop: 20, alignItems: "center" },
  dim: { marginTop: 10, color: "rgba(255,255,255,0.6)" },

  section: { color: "#fff", fontWeight: "900", marginTop: 16, marginBottom: 10 },
  imageBox: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    height: 240,
    alignItems: "center",
    justifyContent: "center",
  },
  image: { width: "100%", height: "100%", resizeMode: "cover" },

  fileCard: {
    marginTop: 10,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    minHeight: 220,
  },
  fileTitle: {
    color: "#fff",
    fontWeight: "900",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },

  actions: { marginTop: 18, gap: 10 },
  primaryBtn: {
    backgroundColor: "#FFD36A",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  primaryText: { color: "#0B0E14", fontWeight: "900", fontSize: 15 },

  dangerBtn: {
    backgroundColor: "rgba(255, 90, 90, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(255, 90, 90, 0.35)",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  dangerText: { color: "#FF8A8A", fontWeight: "900", fontSize: 15 },
});
