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
  StatusBar,
} from "react-native";
import { supabase } from "../api/supabase";
import { HugeiconsIcon } from "@hugeicons/react-native";
import {
  ArrowLeft01Icon, Camera01Icon, Shield01Icon, ArrowRight01Icon,
  Cancel01Icon, UserIcon,
  LockIcon, Clock01Icon, QrCodeIcon,
  Notification01Icon, InformationCircleIcon, SmartphoneWifiIcon,
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
  const styles = useMemo(() => createStyles(theme, isDarkMode), [theme, isDarkMode]);

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
        ? "Regular Fare"
        : `${passengerLabel} • ${verLabel}`;

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

  const handleAvatarUpload = async () => {
    try {
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
      const ext = (asset.uri || "").split(".").pop()?.toLowerCase();
      const allowedExts = ["jpg", "jpeg", "png"];
      if (!allowedExts.includes(ext)) {
        return Alert.alert("Unsupported File", "Please select a JPEG or PNG image.");
      }

      const estimatedSize = asset.base64 ? (asset.base64.length * 0.75) : 0;
      const MAX_BYTES = 2 * 1024 * 1024;
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

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

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
            <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Profile Card — Minimal style */}
        <View style={styles.profileRow}>
          <TouchableOpacity
            onPress={handleAvatarUpload}
            activeOpacity={0.7}
            disabled={uploading}
            style={styles.avatarWrap}
          >
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{computed.initials}</Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              {uploading ? (
                <ActivityIndicator size={10} color={isDarkMode ? "#0B0E14" : "#fff"} />
              ) : (
                <HugeiconsIcon icon={Camera01Icon} size={12} color={isDarkMode ? "#0B0E14" : "#fff"} />
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>{computed.name}</Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {profile?.email || profile?.phone || "—"}
            </Text>
          </View>
        </View>

        {/* Account Section */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon={UserIcon}
            title="Manage Profile"
            onPress={() => navigation.navigate("PersonalInfo", {
              editMode: true,
              profile: profile
            })}
            theme={theme}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon={LockIcon}
            title="Password & Security"
            rightText={account?.pin_set ? "SET" : "NOT SET"}
            rightColor={account?.pin_set ? theme.success : theme.danger}
            theme={theme}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon={Notification01Icon}
            title="Notifications"
            onPress={() => navigation.navigate("Notifications")}
            theme={theme}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon={Shield01Icon}
            title="Verification Status"
            rightText={computed.verLabel}
            rightColor={
              computed.verTone === "good" ? theme.success :
                computed.verTone === "warn" ? theme.warning : theme.danger
            }
            onPress={() => {
              if (computed.verLabel === "Verified" || computed.verLabel === "Pending") return;
              navigation.navigate("PassengerType");
            }}
            theme={theme}
          />
        </View>

        {/* Preferences Section */}
        <Text style={styles.sectionLabel}>Preferences</Text>
        <View style={styles.menuCard}>
          <View style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={styles.menuIconWrap}>
                <HugeiconsIcon icon={Clock01Icon} size={20} color={theme.text} />
              </View>
              <Text style={styles.menuTitle}>Theme</Text>
            </View>
            <View style={styles.menuRight}>
              <Text style={styles.menuRightText}>{isDarkMode ? "Dark" : "Light"}</Text>
              <Switch
                value={isDarkMode}
                onValueChange={toggleTheme}
                trackColor={{ false: theme.border, true: theme.accent }}
                thumbColor={isDarkMode ? "#ffffff" : "#f4f3f4"}
              />
            </View>
          </View>
          <View style={styles.menuDivider} />
          <MenuItem
            icon={InformationCircleIcon}
            title="About Us"
            theme={theme}
          />
        </View>

        {/* Support Section */}
        <Text style={styles.sectionLabel}>Support</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon={SmartphoneWifiIcon}
            title="Switch Account"
            onPress={() => {
              Alert.alert("Switch number", "Sign out and use a different phone number?", [
                { text: "Cancel", style: "cancel" },
                { text: "Switch", style: "destructive", onPress: signOutToPhone },
              ]);
            }}
            theme={theme}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon={Cancel01Icon}
            title="Logout"
            titleColor={theme.danger}
            onPress={() => {
              Alert.alert("Logout", "Are you sure you want to logout?", [
                { text: "Cancel", style: "cancel" },
                { text: "Logout", style: "destructive", onPress: signOutToPhone },
              ]);
            }}
            theme={theme}
          />
        </View>

        {/* App Version */}
        <Text style={styles.versionText}>ERA Wallet v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({ icon, title, onPress, rightText, rightColor, titleColor, theme }) {
  return (
    <TouchableOpacity
      style={menuStyles.item}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={menuStyles.left}>
        <View style={[menuStyles.iconWrap, { backgroundColor: theme.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }]}>
          <HugeiconsIcon icon={icon || UserIcon} size={20} color={titleColor || theme.text} />
        </View>
        <Text style={[menuStyles.title, { color: titleColor || theme.text }]}>{title}</Text>
      </View>
      <View style={menuStyles.right}>
        {rightText && (
          <Text style={[menuStyles.rightText, rightColor && { color: rightColor }]}>
            {rightText}
          </Text>
        )}
        <HugeiconsIcon icon={ArrowRight01Icon} size={18} color={theme.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

const menuStyles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rightText: {
    fontSize: 13,
    fontWeight: "600",
  },
});

const createStyles = (theme, isDarkMode) => StyleSheet.create({
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
    paddingHorizontal: 20,
    paddingBottom: 120,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    marginBottom: 24,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: "900",
  },

  // Profile row (horizontal profile card like reference)
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: theme.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 28,
    gap: 16,
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: isDarkMode
      ? "rgba(247, 227, 83, 0.1)"
      : "rgba(26, 26, 26, 0.06)",
    borderWidth: 2,
    borderColor: isDarkMode
      ? "rgba(247, 227, 83, 0.3)"
      : "rgba(26, 26, 26, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: isDarkMode ? theme.accent : theme.primary,
    fontSize: 22,
    fontWeight: "900",
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: theme.border,
  },
  cameraBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: theme.background,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: theme.text,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 4,
  },
  profileEmail: {
    color: theme.textSecondary,
    fontSize: 13,
  },

  // Section labels
  sectionLabel: {
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 10,
    marginLeft: 4,
  },

  // Menu card
  menuCard: {
    backgroundColor: theme.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 24,
    overflow: "hidden",
  },
  menuDivider: {
    height: 1,
    backgroundColor: theme.border,
    marginLeft: 66,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuTitle: {
    color: theme.text,
    fontSize: 15,
    fontWeight: "600",
  },
  menuRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  menuRightText: {
    color: theme.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },

  // Version
  versionText: {
    textAlign: "center",
    color: theme.textMuted,
    fontSize: 12,
    marginTop: 8,
    marginBottom: 20,
  },
});
