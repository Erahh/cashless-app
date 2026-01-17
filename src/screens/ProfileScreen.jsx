import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  SafeAreaView,
  StyleSheet,
} from "react-native";
import { supabase } from "../api/supabase";

export default function ProfileScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [account, setAccount] = useState(null);

  const computed = useMemo(() => {
    const name = profile?.full_name || "—";
    const initials = name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "U";

    const passengerType = String(account?.passenger_type || "casual").toLowerCase();
    const passengerLabel = passengerType.charAt(0).toUpperCase() + passengerType.slice(1);

    const ver = String(account?.verification_status || "unverified").toLowerCase();

    let verLabel = "Unverified";
    let verTone = "bad";
    if (ver === "verified" || account?.verified) { verLabel = "Verified"; verTone = "good"; }
    else if (ver === "pending") { verLabel = "Pending"; verTone = "warn"; }
    else if (ver === "rejected") { verLabel = "Rejected"; verTone = "bad"; }

    const chipText =
      passengerType === "casual"
        ? "CASUAL • Regular Fare"
        : `${passengerLabel.toUpperCase()} • ${verLabel.toUpperCase()}`;

    return { name, initials, passengerLabel, verLabel, verTone, chipText };
  }, [profile, account]);

  async function load() {
    setLoading(true);
    try {
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      const userId = userRes?.user?.id;
      if (userErr || !userId) {
        navigation.reset({ index: 0, routes: [{ name: "OTPScreen" }] });
        return;
      }

      const { data: p, error: pErr } = await supabase
        .from("profiles")
        .select("full_name, phone, email, birthdate, province, city, barangay, zip_code, address_line")
        .eq("id", userId)
        .single();
      if (pErr) throw pErr;

      const { data: a, error: aErr } = await supabase
        .from("commuter_accounts")
        .select("passenger_type, verification_status, verified, verified_at, pin_set, account_active")
        .eq("commuter_id", userId)
        .single();
      if (aErr) throw aErr;

      setProfile(p);
      setAccount(a);
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    return unsub;
  }, [navigation]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Top header */}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} activeOpacity={0.9}>
            <Text style={styles.iconTxt}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Profile</Text>

          <TouchableOpacity
            onPress={async () => {
              await supabase.auth.signOut();
              navigation.reset({ index: 0, routes: [{ name: "OTPScreen" }] });
            }}
            style={[styles.iconBtn, { backgroundColor: "rgba(255, 90, 90, 0.14)" }]}
            activeOpacity={0.9}
          >
            <Text style={[styles.iconTxt, { color: "#FF7A7A" }]}>⎋</Text>
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <View style={styles.heroCard}>
          {loading ? (
            <View style={{ paddingVertical: 30, alignItems: "center" }}>
              <ActivityIndicator />
              <Text style={styles.loadingText}>Loading your profile…</Text>
            </View>
          ) : (
            <>
              <View style={styles.heroTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{computed.initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{computed.name}</Text>
                  <Text style={styles.subLine}>{profile?.phone || "—"}</Text>
                </View>
              </View>

              <View style={[styles.chip, styles[`chip_${computed.verTone}`]]}>
                <Text style={styles.chipText}>{computed.chipText}</Text>
              </View>

              {/* Quick actions */}
              <View style={styles.quickRow}>
                <QuickButton
                  icon="🪪"
                  title="Verification"
                  sub="Student/Senior"
                  onPress={() => navigation.navigate("PassengerType")}
                />
                <QuickButton
                  icon="✏️"
                  title="Edit"
                  sub="Personal info"
                  onPress={() => navigation.navigate("PersonalInfo")}
                />
                <QuickButton
                  icon="🧾"
                  title="History"
                  sub="Transactions"
                  onPress={() => navigation.navigate("Transactions")}
                />
              </View>
            </>
          )}
        </View>

        {/* Details cards */}
        {!loading ? (
          <>
            <GlassCard title="Personal Details" icon="👤">
              <Row label="Full Name" value={profile?.full_name} />
              <Row label="Email" value={profile?.email || "—"} />
              <Row label="Birthdate" value={profile?.birthdate || "—"} />
            </GlassCard>

            <GlassCard title="Address" icon="📍">
              <Row label="Province" value={profile?.province || "—"} />
              <Row label="City/Municipality" value={profile?.city || "—"} />
              <Row label="Barangay" value={profile?.barangay || "—"} />
              <Row label="ZIP Code" value={profile?.zip_code || "—"} />
              <Row label="House No. + Street" value={profile?.address_line || "—"} />
            </GlassCard>

            <GlassCard title="Account" icon="🔐">
              <Row label="Account Active" value={account?.account_active ? "YES" : "NO"} />
              <Row label="MPIN Set" value={account?.pin_set ? "YES" : "NO"} />
              <Row label="Passenger Type" value={(account?.passenger_type || "casual").toUpperCase()} />
              <Row label="Verification Status" value={(account?.verification_status || "unverified").toUpperCase()} />
              <Row label="Verified At" value={account?.verified_at || "—"} />
            </GlassCard>

            {/* CTA */}
            <View style={styles.ctaWrap}>
              <Text style={styles.ctaTitle}>Want discounted fares?</Text>
              <Text style={styles.ctaText}>
                Apply for Student/Senior verification. Upload your ID now and wait for approval.
              </Text>
              <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.navigate("PassengerType")} activeOpacity={0.9}>
                <Text style={styles.ctaBtnText}>Apply for Verification</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function GlassCard({ title, icon, children }) {
  return (
    <View style={styles.glassCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>{icon}</Text>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || "—"}</Text>
    </View>
  );
}

function QuickButton({ icon, title, sub, onPress }) {
  return (
    <TouchableOpacity style={styles.quickBtn} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.quickIcon}>
        <Text style={{ fontSize: 16 }}>{icon}</Text>
      </View>
      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.quickSub}>{sub}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0E14" },
  content: { padding: 18, paddingBottom: 40 },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 14,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "900" },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconTxt: { color: "#fff", fontSize: 20, fontWeight: "900" },

  heroCard: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 12,
  },
  loadingText: { color: "rgba(255,255,255,0.65)", marginTop: 10 },

  heroTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "rgba(255,211,106,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,211,106,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#FFD36A", fontWeight: "900", fontSize: 16 },
  name: { color: "#fff", fontWeight: "900", fontSize: 18 },
  subLine: { color: "rgba(255,255,255,0.65)", marginTop: 2 },

  chip: { marginTop: 12, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  chipText: { color: "#0B0E14", fontWeight: "900", fontSize: 12 },
  chip_good: { backgroundColor: "#7CFF9B" },
  chip_warn: { backgroundColor: "#FFD36A" },
  chip_bad: { backgroundColor: "#FF7A7A" },

  quickRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  quickBtn: {
    flex: 1,
    borderRadius: 18,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  quickTitle: { color: "#fff", fontWeight: "900" },
  quickSub: { color: "rgba(255,255,255,0.55)", marginTop: 4, fontSize: 12 },

  glassCard: {
    marginTop: 12,
    borderRadius: 22,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  cardIcon: { fontSize: 16 },
  cardTitle: { color: "#fff", fontWeight: "900", fontSize: 16 },

  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  rowLabel: { color: "rgba(255,255,255,0.55)", fontSize: 12 },
  rowValue: { color: "#fff", fontWeight: "800", marginTop: 4 },

  ctaWrap: {
    marginTop: 14,
    borderRadius: 22,
    padding: 16,
    backgroundColor: "rgba(255, 211, 106, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(255, 211, 106, 0.22)",
  },
  ctaTitle: { color: "#FFD36A", fontWeight: "900", fontSize: 14 },
  ctaText: { color: "rgba(255,255,255,0.75)", marginTop: 8, lineHeight: 18 },
  ctaBtn: {
    marginTop: 12,
    backgroundColor: "#FFD36A",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  ctaBtnText: { color: "#0B0E14", fontWeight: "900" },
});
