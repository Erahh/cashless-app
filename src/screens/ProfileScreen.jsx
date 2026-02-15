import React, { useEffect, useState, useMemo, useContext } from "react";
import { AppLockContext } from "../context/AppLockContext";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  SafeAreaView,
  StyleSheet,
  Image,
} from "react-native";
import { supabase } from "../api/supabase";
import { Ionicons } from "@expo/vector-icons";

export default function ProfileScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [account, setAccount] = useState(null);
  const { setLocked } = useContext(AppLockContext);

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
    let discountActive = false;

    if (ver === "verified" || account?.verified) {
      verLabel = "Verified";
      verTone = "good";
      discountActive = true;
    }
    else if (ver === "pending") { verLabel = "Pending"; verTone = "warn"; }
    else if (ver === "rejected") { verLabel = "Rejected"; verTone = "bad"; }

    const chipText =
      passengerType === "casual"
        ? "CASUAL • Regular Fare"
        : `${passengerLabel.toUpperCase()} • ${verLabel.toUpperCase()}`;

    return { name, initials, passengerLabel, verLabel, verTone, chipText, passengerType, discountActive };
  }, [profile, account]);

  async function load() {
    setLoading(true);
    try {
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      const userId = userRes?.user?.id;
      if (userErr || !userId) {
        navigation.reset({ index: 0, routes: [{ name: "PhoneScreen" }] });
        return;
      }

      const { data: p, error: pErr } = await supabase
        .from("profiles")
        .select("full_name, phone, email, birthdate, province, city, barangay, zip_code, address_line, first_name, middle_name, last_name, avatar_url")
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

  const signOutToPhone = async () => {
    try {
      await supabase.auth.signOut();
      setLocked(false);
      navigation.reset({ index: 0, routes: [{ name: "PhoneScreen" }] });
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to sign out");
    }
  };

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    return unsub;
  }, [navigation]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7CFF9B" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{computed.initials}</Text>
              </View>
            )}
          </View>

          <Text style={styles.profileName}>{computed.name}</Text>
          <Text style={styles.profileEmail}>{profile?.email || profile?.phone || "—"}</Text>

          <View style={[styles.badge, styles[`badge_${computed.verTone}`]]}>
            <Text style={styles.badgeText}>{computed.chipText}</Text>
          </View>

          <View style={styles.profileActions}>
            <TouchableOpacity
              style={styles.editProfileBtn}
              onPress={() => navigation.navigate("PersonalInfo", {
                editMode: true,
                profile: profile
              })}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={18} color="#0B0E14" />
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.verifyBtn,
                computed.verLabel === "Verified" && styles.verifyBtnVerified,
                computed.verLabel === "Pending" && styles.verifyBtnPending,
              ]}
              onPress={() => {
                if (computed.verLabel === "Verified" || computed.verLabel === "Pending") return;
                navigation.navigate("PassengerType");
              }}
              activeOpacity={computed.verLabel === "Verified" || computed.verLabel === "Pending" ? 1 : 0.8}
              disabled={computed.verLabel === "Verified" || computed.verLabel === "Pending"}
            >
              <Ionicons
                name={
                  computed.verLabel === "Verified" ? "checkmark-circle" :
                    computed.verLabel === "Pending" ? "time-outline" :
                      "shield-checkmark-outline"
                }
                size={18}
                color={
                  computed.verLabel === "Verified" ? "#0B0E14" :
                    computed.verLabel === "Pending" ? "#0B0E14" :
                      "#0B0E14"
                }
              />
              <Text style={styles.verifyBtnText}>
                {computed.verLabel === "Verified" ? "Verified ✓" :
                  computed.verLabel === "Pending" ? "Pending" :
                    computed.verLabel === "Rejected" ? "Re-upload ID" :
                      "Verify ID"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Discount Status Indicator */}
        {computed.passengerType !== "casual" && (
          <View style={[
            styles.discountIndicator,
            computed.discountActive ? styles.discountActive : styles.discountInactive
          ]}>
            <View style={styles.discountLeft}>
              <Ionicons
                name={computed.discountActive ? "checkmark-circle" : "alert-circle"}
                size={24}
                color={computed.discountActive ? "#7CFF9B" : "#FFD36A"}
              />
              <View style={styles.discountContent}>
                <Text style={styles.discountTitle}>
                  {computed.discountActive ? "Discount Active ✅" : "Discount Not Active"}
                </Text>
                <Text style={styles.discountText}>
                  {computed.discountActive
                    ? `You're receiving ${computed.passengerLabel} discounted fares`
                    : computed.verLabel === "Pending"
                      ? "Your verification is pending admin approval"
                      : "Upload your ID to activate discounted fares"
                  }
                </Text>
              </View>
            </View>
            {!computed.discountActive && (
              <TouchableOpacity
                style={styles.discountBtn}
                onPress={() => navigation.navigate("PassengerType")}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-forward" size={20} color="#0B0E14" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.infoCard}>
            <InfoRow icon="person-outline" label="Full Name" value={profile?.full_name} />
            <InfoRow icon="mail-outline" label="Email" value={profile?.email || "—"} />
            <InfoRow icon="call-outline" label="Phone" value={profile?.phone || "—"} />
            <InfoRow icon="calendar-outline" label="Birthdate" value={profile?.birthdate || "—"} />
          </View>
        </View>

        {/* Address Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address</Text>
          <View style={styles.infoCard}>
            <InfoRow icon="location-outline" label="Province" value={profile?.province || "—"} />
            <InfoRow icon="business-outline" label="City/Municipality" value={profile?.city || "—"} />
            <InfoRow icon="home-outline" label="Barangay" value={profile?.barangay || "—"} />
            <InfoRow icon="mail-outline" label="ZIP Code" value={profile?.zip_code || "—"} />
            <InfoRow icon="navigate-outline" label="Street Address" value={profile?.address_line || "—"} />
          </View>
        </View>

        {/* Account Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          <View style={styles.infoCard}>
            <InfoRow
              icon="shield-checkmark-outline"
              label="Account Status"
              value={account?.account_active ? "ACTIVE" : "INACTIVE"}
              valueColor={account?.account_active ? "#7CFF9B" : "#FF7A7A"}
            />
            <InfoRow
              icon="key-outline"
              label="MPIN Status"
              value={account?.pin_set ? "SET" : "NOT SET"}
              valueColor={account?.pin_set ? "#7CFF9B" : "#FFD36A"}
            />
            <InfoRow
              icon="person-outline"
              label="Passenger Type"
              value={(account?.passenger_type || "casual").toUpperCase()}
            />
            <InfoRow
              icon="checkmark-done-outline"
              label="Verification"
              value={(account?.verification_status || "unverified").toUpperCase()}
              valueColor={
                computed.verTone === "good" ? "#7CFF9B" :
                  computed.verTone === "warn" ? "#FFD36A" : "#FF7A7A"
              }
            />
            {account?.verified_at && (
              <InfoRow
                icon="time-outline"
                label="Verified At"
                value={new Date(account.verified_at).toLocaleDateString()}
              />
            )}
          </View>
        </View>

        {/* Settings Menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="language-outline"
              title="Language"
              onPress={() => Alert.alert("Language", "Language settings coming soon!")}
            />
            <MenuItem
              icon="color-palette-outline"
              title="Appearance"
              onPress={() => Alert.alert("Appearance", "Theme settings coming soon!")}
            />
            <MenuItem
              icon="shield-checkmark-outline"
              title="Security"
              onPress={() => Alert.alert("Security", "Security settings coming soon!")}
            />
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Actions</Text>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => {
              Alert.alert("Switch number", "Sign out and use a different phone number?", [
                { text: "Cancel", style: "cancel" },
                { text: "Switch", style: "destructive", onPress: signOutToPhone },
              ]);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.actionIcon, { backgroundColor: "rgba(255,211,106,0.15)" }]}>
                <Ionicons name="phone-portrait-outline" size={20} color="#FFD36A" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Use different number</Text>
                <Text style={styles.actionSub}>Switch to another phone number</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, styles.actionCardDanger]}
            onPress={() => {
              Alert.alert("Logout", "Are you sure you want to logout?", [
                { text: "Cancel", style: "cancel" },
                { text: "Logout", style: "destructive", onPress: signOutToPhone },
              ]);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.actionIcon, { backgroundColor: "rgba(255,122,122,0.15)" }]}>
                <Ionicons name="log-out-outline" size={20} color="#FF7A7A" />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: "#FF7A7A" }]}>Logout</Text>
                <Text style={styles.actionSub}>Sign out from your account</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <Text style={styles.versionText}>ERA Wallet v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value, valueColor }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Ionicons name={icon} size={18} color="rgba(255,255,255,0.5)" />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, valueColor && { color: valueColor }]}>
        {value || "—"}
      </Text>
    </View>
  );
}

function MenuItem({ icon, title, onPress }) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuLeft}>
        <Ionicons name={icon} size={20} color="#fff" />
        <Text style={styles.menuTitle}>{title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0B0E14",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "rgba(255,255,255,0.65)",
    marginTop: 12,
    fontSize: 14,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 28,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },

  // Profile Card
  profileCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 20,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(124,255,155,0.15)",
    borderWidth: 3,
    borderColor: "#7CFF9B",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#7CFF9B",
    fontSize: 28,
    fontWeight: "900",
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "#7CFF9B",
  },
  profileName: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 6,
  },
  profileEmail: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 14,
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 20,
  },
  badgeText: {
    color: "#0B0E14",
    fontWeight: "900",
    fontSize: 12,
  },
  badge_good: {
    backgroundColor: "#7CFF9B",
  },
  badge_warn: {
    backgroundColor: "#FFD36A",
  },
  badge_bad: {
    backgroundColor: "#FF7A7A",
  },
  editProfileBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#7CFF9B",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  editProfileText: {
    color: "#0B0E14",
    fontSize: 15,
    fontWeight: "900",
  },
  profileActions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  verifyBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFD36A",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  verifyBtnVerified: {
    backgroundColor: "#7CFF9B",
    opacity: 0.7,
  },
  verifyBtnPending: {
    backgroundColor: "#FFD36A",
    opacity: 0.7,
  },
  verifyBtnText: {
    color: "#0B0E14",
    fontSize: 15,
    fontWeight: "900",
  },


  // Discount Indicator
  discountIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
    borderWidth: 2,
  },
  discountActive: {
    backgroundColor: "rgba(124,255,155,0.10)",
    borderColor: "#7CFF9B",
  },
  discountInactive: {
    backgroundColor: "rgba(255,211,106,0.10)",
    borderColor: "#FFD36A",
  },
  discountLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  discountContent: {
    flex: 1,
  },
  discountTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 4,
  },
  discountText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    lineHeight: 16,
  },
  discountBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFD36A",
    alignItems: "center",
    justifyContent: "center",
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Info Card
  infoCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  infoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  infoLabel: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 14,
  },
  infoValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  // Menu Card
  menuCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  // Actions
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  actionCardDanger: {
    backgroundColor: "rgba(255,122,122,0.08)",
    borderColor: "rgba(255,122,122,0.20)",
  },
  actionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },
  actionSub: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
  },

  // Version
  versionText: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 12,
    textAlign: "center",
    marginTop: 12,
  },
});
