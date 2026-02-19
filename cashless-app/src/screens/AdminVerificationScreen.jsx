import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { fetchPendingVerifications } from "../api/adminApi";

export default function AdminVerificationScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchPendingVerifications();
      setItems(data);
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = navigation?.addListener?.("focus", load);
    load();
    return unsub;
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Admin Review</Text>
            <Text style={styles.sub}>Pending verification requests</Text>
          </View>

          <TouchableOpacity style={styles.refreshBtn} onPress={load} activeOpacity={0.9}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.dim}>Loading pending requests...</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No pending requests</Text>
            <Text style={styles.dim}>You're all caught up.</Text>
          </View>
        ) : (
          <View style={{ gap: 10, marginTop: 14 }}>
            {items.map((it) => (
              <TouchableOpacity
                key={it.id}
                style={styles.card}
                activeOpacity={0.9}
                onPress={() => navigation.navigate("AdminVerificationDetail", { request: it })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>
                    {it.profiles?.full_name || "Unknown User"}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {it.requested_type?.toUpperCase()} • {it.profiles?.phone || "-"}
                  </Text>
                  <Text style={styles.cardMeta2}>
                    Submitted: {new Date(it.submitted_at).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>PENDING</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0E14" },
  content: { padding: 18, paddingTop: 26 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: { color: "#fff", fontSize: 26, fontWeight: "900" },
  sub: { marginTop: 8, color: "rgba(255,255,255,0.65)" },

  refreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  refreshText: { color: "#fff", fontWeight: "800" },

  center: { marginTop: 30, alignItems: "center" },
  dim: { marginTop: 10, color: "rgba(255,255,255,0.6)" },

  empty: {
    marginTop: 18,
    padding: 18,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  emptyTitle: { color: "#fff", fontWeight: "900", fontSize: 16 },

  card: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  cardTitle: { color: "#fff", fontWeight: "900", fontSize: 15 },
  cardMeta: { marginTop: 4, color: "rgba(255,255,255,0.65)", fontSize: 12 },
  cardMeta2: { marginTop: 4, color: "rgba(255,255,255,0.45)", fontSize: 12 },

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255, 211, 106, 0.95)",
  },
  statusPillText: { color: "#0B0E14", fontWeight: "900", fontSize: 12 },
});
