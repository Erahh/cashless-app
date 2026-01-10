import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  approveGuardianRequest,
  fetchMyGuardianData,
  rejectGuardianRequest,
  requestGuardianLink,
} from "../api/guardianApi";

export default function GuardianLinkScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [commuterPhone, setCommuterPhone] = useState("");
  const [relationship, setRelationship] = useState("");

  const [data, setData] = useState({ requests: [], links: [] });

  const load = async () => {
    try {
      setLoading(true);
      const json = await fetchMyGuardianData();
      setData({ requests: json.requests || [], links: json.links || [] });
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

  const pendingIncoming = useMemo(() => {
    // requests where current user is commuter and pending
    return (data.requests || []).filter((r) => r.status === "pending");
  }, [data]);

  const sendRequest = async () => {
    try {
      const phone = commuterPhone.replace(/\s+/g, "").trim();
      if (!phone) return Alert.alert("Required", "Enter commuter phone number.");

      setBusy(true);
      await requestGuardianLink(phone, relationship.trim() || null);
      setCommuterPhone("");
      setRelationship("");
      await load();
      Alert.alert("Sent ✅", "Guardian link request sent.");
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setBusy(false);
    }
  };

  const approve = async (id) => {
    try {
      setBusy(true);
      await approveGuardianRequest(id);
      await load();
      Alert.alert("Approved ✅", "Guardian link approved.");
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setBusy(false);
    }
  };

  const reject = async (id) => {
    try {
      setBusy(true);
      await rejectGuardianRequest(id);
      await load();
      Alert.alert("Rejected", "Request rejected.");
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setBusy(false);
    }
  };

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

        <Text style={styles.title}>Guardian</Text>
        <Text style={styles.sub}>Link a guardian to receive ride alerts</Text>

        {/* Send request (Guardian side) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Send Link Request</Text>
          <Text style={styles.cardHint}>
            Enter the commuter’s phone number (same format used during signup).
          </Text>

          <TextInput
            value={commuterPhone}
            onChangeText={setCommuterPhone}
            placeholder="Commuter phone (e.g. 6399xxxxxxx)"
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={styles.input}
            keyboardType="phone-pad"
          />

          <TextInput
            value={relationship}
            onChangeText={setRelationship}
            placeholder="Relationship (optional) e.g. Parent"
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={[styles.input, { marginTop: 10 }]}
          />

          <TouchableOpacity
            style={[styles.primaryBtn, (busy || loading) && { opacity: 0.6 }]}
            onPress={sendRequest}
            activeOpacity={0.9}
            disabled={busy || loading}
          >
            <Text style={styles.primaryText}>{busy ? "Sending..." : "Send Request"}</Text>
          </TouchableOpacity>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>MVP MODE • PAYMENTS LATER</Text>
          </View>
        </View>

        {/* Incoming requests (Commuter side) */}
        <Text style={styles.sectionTitle}>Incoming Requests</Text>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.dim}>Loading guardian requests...</Text>
          </View>
        ) : pendingIncoming.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No pending requests</Text>
            <Text style={styles.dim}>If someone requests to be your guardian, it will show here.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {pendingIncoming.map((r) => {
              const guardian = r.guardian || {};
              return (
                <View key={r.id} style={styles.rowCard}>
                  <View style={styles.rowTop}>
                    <View style={styles.rowLeft}>
                      <View style={styles.icon}>
                        <Text style={styles.iconText}>🛡️</Text>
                      </View>
                      <View style={{ flexShrink: 1 }}>
                        <Text style={styles.rowTitle}>{guardian.full_name || "Guardian"}</Text>
                        <Text style={styles.rowMeta}>
                          {guardian.phone || "-"} {r.relationship ? `• ${r.relationship}` : ""}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={[styles.smallBtn, styles.smallGood, busy && { opacity: 0.6 }]}
                        onPress={() => approve(r.id)}
                        disabled={busy}
                        activeOpacity={0.9}
                      >
                        <Text style={styles.smallBtnText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.smallBtn, styles.smallBad, busy && { opacity: 0.6 }]}
                        onPress={() => reject(r.id)}
                        disabled={busy}
                        activeOpacity={0.9}
                      >
                        <Text style={styles.smallBtnTextAlt}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Active links */}
        <Text style={styles.sectionTitle}>Active Links</Text>
        <View style={styles.list}>
          {(data.links || []).map((l) => {
            const isVerified = !!l.verified;
            const guardian = l.guardian || {};
            const commuter = l.commuter || {};
            return (
              <View key={l.id} style={styles.rowCard}>
                <View style={styles.rowTop}>
                  <View style={styles.rowLeft}>
                    <View style={styles.icon}>
                      <Text style={styles.iconText}>✅</Text>
                    </View>
                    <View style={{ flexShrink: 1 }}>
                      <Text style={styles.rowTitle}>
                        {isVerified ? "Linked" : "Unverified"} • {l.relationship || "Guardian"}
                      </Text>
                      <Text style={styles.rowMeta}>
                        Guardian: {guardian.full_name || "-"} • Commuter: {commuter.full_name || "-"}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.statusPill, isVerified ? styles.pillGood : styles.pillWarn]}>
                    <Text style={styles.statusText}>{isVerified ? "VERIFIED" : "PENDING"}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

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

  card: {
    marginTop: 16,
    borderRadius: 22,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  cardTitle: { color: "#fff", fontWeight: "900", fontSize: 16 },
  cardHint: { color: "rgba(255,255,255,0.55)", marginTop: 8, fontSize: 12, lineHeight: 18 },

  input: {
    marginTop: 12,
    borderRadius: 14,
    padding: 12,
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  primaryBtn: {
    marginTop: 12,
    backgroundColor: "#FFD36A",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  primaryText: { color: "#0B0E14", fontWeight: "900", fontSize: 15 },

  badge: {
    alignSelf: "flex-start",
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255, 211, 106, 0.95)",
  },
  badgeText: { color: "#0B0E14", fontWeight: "900", fontSize: 12 },

  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "900", marginTop: 18 },

  center: { marginTop: 20, alignItems: "center" },
  dim: { marginTop: 10, color: "rgba(255,255,255,0.6)" },

  empty: {
    marginTop: 12,
    padding: 18,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  emptyTitle: { color: "#fff", fontWeight: "900", fontSize: 16 },

  list: { marginTop: 12, gap: 10 },

  rowCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },

  icon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 16 },

  rowTitle: { color: "#fff", fontWeight: "900" },
  rowMeta: { color: "rgba(255,255,255,0.55)", marginTop: 4, fontSize: 12 },

  actions: { flexDirection: "row", gap: 8 },
  smallBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14 },
  smallGood: { backgroundColor: "#7CFF9B" },
  smallBad: {
    backgroundColor: "rgba(255, 122, 122, 0.20)",
    borderWidth: 1,
    borderColor: "rgba(255, 122, 122, 0.35)",
  },
  smallBtnText: { color: "#0B0E14", fontWeight: "900" },
  smallBtnTextAlt: { color: "#FF8A8A", fontWeight: "900" },

  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  pillGood: { backgroundColor: "#7CFF9B" },
  pillWarn: { backgroundColor: "#FFD36A" },
  statusText: { color: "#0B0E14", fontWeight: "900", fontSize: 12 },
});
