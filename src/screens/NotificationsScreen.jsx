import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { fetchNotifications } from "../api/notificationsApi";

function normalizePayload(payload) {
  const p = payload && typeof payload === "object" ? payload : {};
  return {
    title: String(p.title || "Notification"),
    body: String(p.body || ""),
    fare_amount: p.fare_amount != null ? Number(p.fare_amount) : null,
    route_name: p.route_name != null ? String(p.route_name) : null,
    scanned_at: p.scanned_at ? String(p.scanned_at) : null,
  };
}

export default function NotificationsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchNotifications(50);
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

  const computed = useMemo(() => {
    const queued = items.filter((x) => x.status === "queued").length;
    const failed = items.filter((x) => x.status === "failed").length;
    return { queued, failed };
  }, [items]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={styles.back}>‹ Back</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.refreshBtn} onPress={load} activeOpacity={0.9}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.sub}>Ride alerts and system messages</Text>

        {/* Small status pills (UI only) */}
        <View style={styles.pillsRow}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>Queued: {computed.queued}</Text>
          </View>
          <View style={[styles.pill, styles.pillWarn]}>
            <Text style={styles.pillText}>Failed: {computed.failed}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.dim}>Loading notifications...</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.dim}>
              Once guardian alerts or ride events happen, they will appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((n) => {
              const p = normalizePayload(n.payload);
              const when = new Date(n.created_at).toLocaleString();

              const statusText = String(n.status || "").toUpperCase();
              const tone =
                n.status === "sent" ? "good" : n.status === "failed" ? "bad" : "warn";

              return (
                <View key={n.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.left}>
                      <View style={styles.icon}>
                        <Text style={styles.iconText}>🔔</Text>
                      </View>
                      <View style={{ flexShrink: 1 }}>
                        <Text style={styles.cardTitle}>{p.title}</Text>
                        <Text style={styles.cardMeta}>{when}</Text>
                      </View>
                    </View>

                    <View style={[styles.statusPill, styles[`status_${tone}`]]}>
                      <Text style={styles.statusPillText}>{statusText || "QUEUED"}</Text>
                    </View>
                  </View>

                  {p.body ? <Text style={styles.body}>{p.body}</Text> : null}

                  {(p.route_name || p.fare_amount != null) ? (
                    <View style={styles.details}>
                      {p.route_name ? (
                        <Text style={styles.detailText}>Route: {p.route_name}</Text>
                      ) : null}
                      {p.fare_amount != null ? (
                        <Text style={styles.detailText}>
                          Fare: ₱{Number(p.fare_amount).toFixed(2)}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {n.status === "failed" && n.error ? (
                    <Text style={styles.errorText}>Error: {String(n.error)}</Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0E14" },
  content: { padding: 18, paddingTop: 18 },

  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  back: { color: "rgba(255,255,255,0.75)", fontWeight: "800" },

  refreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  refreshText: { color: "#fff", fontWeight: "800" },

  title: { color: "#fff", fontSize: 26, fontWeight: "900", marginTop: 14 },
  sub: { marginTop: 8, color: "rgba(255,255,255,0.65)" },

  pillsRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  pill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
  },
  pillWarn: {
    backgroundColor: "rgba(255, 211, 106, 0.10)",
    borderColor: "rgba(255, 211, 106, 0.25)",
  },
  pillText: { color: "rgba(255,255,255,0.75)", fontWeight: "800" },

  center: { marginTop: 20, alignItems: "center" },
  dim: { marginTop: 10, color: "rgba(255,255,255,0.6)" },

  empty: {
    marginTop: 14,
    padding: 18,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  emptyTitle: { color: "#fff", fontWeight: "900", fontSize: 16 },

  list: { marginTop: 12, gap: 10 },

  card: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  left: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },

  icon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 16 },

  cardTitle: { color: "#fff", fontWeight: "900" },
  cardMeta: { color: "rgba(255,255,255,0.55)", marginTop: 4, fontSize: 12 },

  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  status_good: { backgroundColor: "#7CFF9B" },
  status_warn: { backgroundColor: "#FFD36A" },
  status_bad: {
    backgroundColor: "rgba(255, 122, 122, 0.25)",
    borderWidth: 1,
    borderColor: "rgba(255, 122, 122, 0.35)",
  },
  statusPillText: { color: "#0B0E14", fontWeight: "900", fontSize: 12 },

  body: { color: "rgba(255,255,255,0.78)", marginTop: 12, lineHeight: 18 },
  details: { marginTop: 10, gap: 4 },
  detailText: { color: "rgba(255,255,255,0.62)", fontSize: 12 },

  errorText: { marginTop: 10, color: "#FF8A8A", fontWeight: "800", fontSize: 12 },
});
