import React, { useEffect, useState, useMemo, useContext } from "react";
import { AppLockContext } from "../context/AppLockContext";
import { useTheme } from "../context/ThemeContext";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Switch,
  Alert,
  SafeAreaView,
  StyleSheet,
  Image,
  Linking,
} from "react-native";
import { supabase } from "../api/supabase";
import { HugeiconsIcon } from "@hugeicons/react-native";
import {
  ArrowLeft01Icon, Camera01Icon, PencilEdit01Icon, CheckmarkCircle01Icon,
  Clock01Icon, Shield01Icon, CheckmarkBadge01Icon, ArrowRight01Icon,
  SmartPhone01Icon, Logout01Icon, UserIcon, AlertCircleIcon,
  Mail01Icon, CallIcon, Calendar01Icon, Location01Icon, Building01Icon,
  Home01Icon, MapPinIcon, LockIcon, DarkModeIcon, Clock02Icon
} from "@hugeicons/core-free-icons";
import * as ImagePicker from "expo-image-picker";
import { renderApiRequest } from "../api/apiHelper";

export default function ProfileScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [account, setAccount] = useState(null);
  const [uploading, setUploading] = useState(false);
  const { setLocked } = useContext(AppLockContext);
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

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

  // ✅ Profile photo upload using expo-image-picker
  const handleAvatarUpload = async () => {
    try {
      // Ask user to pick from gallery or camera
      const choice = await new Promise((resolve) => {
        Alert.alert("Profile Photo", "Choose a photo source", [
          { text: "Camera", onPress: () => resolve("camera") },
          { text: "Gallery", onPress: () => resolve("gallery") },
          { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
        ]);
      });

      if (!choice) return;

      let result;

      if (choice === "camera") {
        const { status, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          if (!canAskAgain) {
            return Alert.alert(
              "Camera Access Denied",
              "Camera access was denied. Please enable it in Settings.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Open Settings", onPress: () => Linking.openSettings() },
              ]
            );
          }
          return Alert.alert("Permission Required", "Camera access is needed to take a photo.");
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.5,
          base64: true,
        });
      } else {
        const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          if (!canAskAgain) {
            return Alert.alert(
              "Photo Library Access Denied",
              "Photo library access was denied. Please enable it in Settings.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Open Settings", onPress: () => Linking.openSettings() },
              ]
            );
          }
          return Alert.alert("Permission Required", "Photo library access is needed.");
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.5,
          base64: true,
        });
      }

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];

      // Determine mime type from URI
      const ext = (asset.uri || "").split(".").pop()?.toLowerCase();
      const allowedExts = ["jpg", "jpeg", "png"];
      if (!allowedExts.includes(ext)) {
        return Alert.alert("Unsupported File", "Please select a JPEG or PNG image.");
      }

      // Estimate size from base64 if fileSize is missing (base64 is ~33% larger than binary)
      const estimatedSize = asset.base64 ? (asset.base64.length * 0.75) : 0;
      const MAX_BYTES = 2 * 1024 * 1024; // 2MB

      if (estimatedSize > MAX_BYTES) {
        return Alert.alert("File Too Large", "Profile photo must be smaller than 2MB.");
      }

      if (!asset.base64) {
        return Alert.alert("Error", "Failed to process image. Please try again.");
      }

      setUploading(true);

      const mime = ext === "png" ? "image/png" : "image/jpeg";
      const imageData = `data:${mime};base64,${asset.base64}`;

      const res = await renderApiRequest("/me/avatar", {
        method: "PUT",
        body: JSON.stringify({ image: imageData }),
      });

      if (res.ok && res.avatar_url) {
        setProfile((prev) => ({ ...prev, avatar_url: res.avatar_url }));
        Alert.alert("Success", "Profile photo updated!");
      }
    } catch (e) {
      Alert.alert("Upload Failed", e.message || "Failed to upload photo.");
    } finally {
      setUploading(false);
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
            <HugeiconsIcon icon={ArrowLeft01Icon} size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handleAvatarUpload}
            activeOpacity={0.7}
            disabled={uploading}
          >
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
            {/* Camera badge */}
            <View style={styles.cameraBadge}>
              {uploading ? (
                <ActivityIndicator size={12} color="#000" />
              ) : (
                <HugeiconsIcon icon={Camera01Icon} size={14} color="#000" />
              )}
            </View>
          </TouchableOpacity>

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
              <HugeiconsIcon icon={PencilEdit01Icon} size={18} color={theme.isDark ? "#0B0E14" : "#FFFFFF"} />
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
              <HugeiconsIcon
                icon={
                  computed.verLabel === "Verified" ? CheckmarkBadge01Icon :
                    computed.verLabel === "Pending" ? Clock01Icon :
                      Shield01Icon
                }
                size={18}
                color={"#0B0E14"}
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
              <HugeiconsIcon
                icon={computed.discountActive ? CheckmarkCircle01Icon : AlertCircleIcon}
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
                <HugeiconsIcon icon={ArrowRight01Icon} size={20} color={theme.isDark ? "#0B0E14" : "#FFFFFF"} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.infoCard}>
            <InfoRow icon={UserIcon} label="Full Name" value={profile?.full_name} />
            <InfoRow icon={Mail01Icon} label="Email" value={profile?.email || "—"} />
            <InfoRow icon={CallIcon} label="Phone" value={profile?.phone || "—"} />
            <InfoRow icon={Calendar01Icon} label="Birthdate" value={profile?.birthdate || "—"} />
          </View>
        </View>

        {/* Address Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address</Text>
          <View style={styles.infoCard}>
            <InfoRow icon={Location01Icon} label="Province" value={profile?.province || "—"} />
            <InfoRow icon={Building01Icon} label="City/Municipality" value={profile?.city || "—"} />
            <InfoRow icon={Home01Icon} label="Barangay" value={profile?.barangay || "—"} />
            <InfoRow icon={Mail01Icon} label="ZIP Code" value={profile?.zip_code || "—"} />
            <InfoRow icon={MapPinIcon} label="Street Address" value={profile?.address_line || "—"} />
          </View>
        </View>

        {/* Account Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          <View style={styles.infoCard}>
            <InfoRow
              icon={Shield01Icon}
              label="Account Status"
              value={account?.account_active ? "ACTIVE" : "INACTIVE"}
              valueColor={account?.account_active ? "#7CFF9B" : "#FF7A7A"}
            />
            <InfoRow
              icon={LockIcon}
              label="MPIN Status"
              value={account?.pin_set ? "SET" : "NOT SET"}
              valueColor={account?.pin_set ? "#7CFF9B" : "#FFD36A"}
            />
            <InfoRow
              icon={UserIcon}
              label="Passenger Type"
              value={(account?.passenger_type || "casual").toUpperCase()}
            />
            <InfoRow
              icon={CheckmarkBadge01Icon}
              label="Verification"
              value={(account?.verification_status || "unverified").toUpperCase()}
              valueColor={
                computed.verTone === "good" ? "#7CFF9B" :
                  computed.verTone === "warn" ? "#FFD36A" : "#FF7A7A"
              }
            />
            {account?.verified_at && (
              <InfoRow
                icon={Clock02Icon}
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
              icon={DarkModeIcon}
              title="Darkmode"
              onPress={toggleTheme}
              rightComponent={
                <Switch
                  value={isDarkMode}
                  onValueChange={toggleTheme}
                  trackColor={{ false: theme.border, true: theme.accent }}
                  thumbColor={theme.isDark ? "#ffffff" : "#f4f3f4"}
                />
              }
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
              <View style={[styles.actionIcon, { backgroundColor: theme.warningBg }]}>
                <HugeiconsIcon icon={SmartPhone01Icon} size={20} color="#FFD36A" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Use different number</Text>
                <Text style={styles.actionSub}>Switch to another phone number</Text>
              </View>
            </View>
            {<HugeiconsIcon icon={ArrowRight01Icon} size={20} color={theme.textMuted} />}
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
              <View style={[styles.actionIcon, { backgroundColor: theme.dangerBg }]}>
                <HugeiconsIcon icon={Logout01Icon} size={20} color="#FF7A7A" />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: theme.danger }]}>Logout</Text>
                <Text style={styles.actionSub}>Sign out from your account</Text>
              </View>
            </View>
            {<HugeiconsIcon icon={ArrowRight01Icon} size={20} color={theme.textMuted} />}
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <Text style={styles.versionText}>ERA Wallet v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value, valueColor }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <HugeiconsIcon icon={icon || UserIcon} size={18} color={theme.textMuted} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, valueColor && { color: valueColor }]}>
        {value || "—"}
      </Text>
    </View>
  );
}

function MenuItem({ icon, title, onPress, rightComponent }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuLeft}>
        <HugeiconsIcon icon={icon || UserIcon} size={20} color={theme.text} />
        <Text style={styles.menuTitle}>{title}</Text>
      </View>
      {rightComponent || <HugeiconsIcon icon={ArrowRight01Icon} size={20} color={theme.textMuted} />}
    </TouchableOpacity>
  );
}

const createStyles = (theme) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: theme.textSecondary,
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
    backgroundColor: theme.card,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: "900",
  },

  // Profile Card
  profileCard: {
    backgroundColor: theme.card,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 20,
  },
  avatarContainer: {
    marginBottom: 16,
    position: "relative",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.successBg,
    borderWidth: 3,
    borderColor: theme.success,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: theme.success,
    fontSize: 28,
    fontWeight: "900",
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: theme.success,
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.success,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(30,30,30,0.9)",
  },
  profileName: {
    color: theme.text,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 6,
  },
  profileEmail: {
    color: theme.textSecondary,
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
    color: theme.isDark ? "#0B0E14" : "#fff",
    fontWeight: "900",
    fontSize: 12,
  },
  badge_good: {
    backgroundColor: theme.success,
  },
  badge_warn: {
    backgroundColor: theme.warning,
  },
  badge_bad: {
    backgroundColor: theme.danger,
  },
  editProfileBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: theme.success,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  editProfileText: {
    color: theme.isDark ? "#0B0E14" : "#fff",
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
    backgroundColor: theme.warning,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  verifyBtnVerified: {
    backgroundColor: theme.success,
    opacity: 0.7,
  },
  verifyBtnPending: {
    backgroundColor: theme.warning,
    opacity: 0.7,
  },
  verifyBtnText: {
    color: theme.isDark ? "#0B0E14" : "#fff",
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
    backgroundColor: theme.successBg,
    borderColor: theme.success,
  },
  discountInactive: {
    backgroundColor: theme.warningBg,
    borderColor: theme.warning,
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
    color: theme.text,
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 4,
  },
  discountText: {
    color: theme.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  discountBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.warning,
    alignItems: "center",
    justifyContent: "center",
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Info Card
  infoCard: {
    backgroundColor: theme.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  infoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  infoLabel: {
    color: theme.textSecondary,
    fontSize: 14,
  },
  infoValue: {
    color: theme.text,
    fontSize: 14,
    fontWeight: "700",
  },

  // Menu Card
  menuCard: {
    backgroundColor: theme.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuTitle: {
    color: theme.text,
    fontSize: 14,
    fontWeight: "600",
  },

  // Actions
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  actionCardDanger: {
    backgroundColor: theme.dangerBg,
    borderColor: theme.dangerBg,
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
    color: theme.text,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },
  actionSub: {
    color: theme.textSecondary,
    fontSize: 12,
  },

  // Version
  versionText: {
    color: theme.textMuted,
    fontSize: 12,
    textAlign: "center",
    marginTop: 12,
  },
});
