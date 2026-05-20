import React, { useEffect, useState, useMemo, useContext } from "react";
import { AppLockContext } from "../../context/AppLockContext";
import { useTheme } from "../../context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Switch,
  Alert,
  StyleSheet,
  Image,
  Linking,
  StatusBar,
  Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { supabase } from "../../api/supabase";
import { HugeiconsIcon } from "@hugeicons/react-native";
import {
  ArrowLeft01Icon, Camera01Icon, Shield01Icon, ArrowRight01Icon,
  Cancel01Icon, UserIcon,
  LockIcon, Clock01Icon, QrCodeIcon,
  InformationCircleIcon, SmartphoneWifiIcon,
  CheckmarkCircle02Icon, Briefcase01Icon, Bus01Icon,
} from "@hugeicons/core-free-icons";
import * as ImagePicker from "expo-image-picker";
import { renderApiRequest } from "../../api/apiHelper";
import AboutUsModal from "../../components/AboutUsModal";
import BusinessVerifiedBadge from "../../components/BusinessVerifiedBadge";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import VerifiedBadge from "../../components/VerifiedBadge";

let CACHED_PROFILE = null;
let CACHED_ACCOUNT = null;
let CACHED_BUSINESS_VERIFICATION = null;
let CACHED_IS_OPERATOR = null;
let CACHED_OPERATOR_APP = null;
let CACHED_CARD_APP = null;

function normalizeCardStatus(json) {
  const source = json && typeof json === "object" ? json : {};
  const card = source.card || null;
  const latest = source.latest_request || source.latest_application || source.application || source.item || source.data || null;
  const rawStatus = String(
    card?.status || latest?.status || source.status || source.card_status || source.approval_status || source.state || ""
  ).toLowerCase();

  const isLost = rawStatus === "lost";
  const isDisabled = rawStatus === "disabled";

  const approved = Boolean(
    !isLost && !isDisabled && (
      source.verified ||
      source.approved ||
      latest?.verified ||
      latest?.approved ||
      ["approved", "active", "activated", "verified"].includes(rawStatus)
    )
  );

  let status;
  if (isLost) status = "lost";
  else if (isDisabled) status = "disabled";
  else if (approved) status = "approved";
  else if (["pending", "review", "processing"].includes(rawStatus)) status = "pending";
  else if (["rejected", "declined", "denied"].includes(rawStatus)) status = "rejected";
  else status = "form";

  return {
    status,
    number: String(card?.card_number || source.card_number || latest?.card_number || source.account_number || "").trim(),
    cardId: card?.id || source.card_id || null,
    issuedAt: card?.issued_at || source.issued_at || null,
    cvv: String(card?.cvv || source.cvv || "001").trim(),
  };
}

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const hasCachedData = !!(CACHED_PROFILE && CACHED_ACCOUNT);
  const [loading, setLoading] = useState(!hasCachedData);
  const [profile, setProfile] = useState(CACHED_PROFILE);
  const [account, setAccount] = useState(CACHED_ACCOUNT);
  const [businessVerification, setBusinessVerification] = useState(CACHED_BUSINESS_VERIFICATION);
  const [uploading, setUploading] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);
  const [isOperator, setIsOperator] = useState(!!CACHED_IS_OPERATOR);
  const [operatorApp, setOperatorApp] = useState(CACHED_OPERATOR_APP);
  const [cardApp, setCardApp] = useState(CACHED_CARD_APP);
  const { setLocked, setLockSuppressed } = useContext(AppLockContext);

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

  // Pulse animation for verified ring
  const pulse = React.useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let loop;
    if (computed.verLabel === 'Verified') {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
        ])
      );
      loop.start();
    } else {
      pulse.setValue(0);
    }
    return () => { if (loop) loop.stop(); };
  }, [computed.verLabel, businessVerification]);

  const handleVerificationPress = () => {
    const v = computed.verLabel;
    if (v === "Verified") {
      // Open Verification Details for verified users
      return navigation.navigate("VerificationDetails", { profile, account, businessVerification, operatorApp });
    }
    if (v === "Pending") {
      return navigation.navigate("VerificationSubmitted", { flow: "id" });
    }
    // Unverified / Rejected -> open upload flow
    return navigation.navigate("UploadVerification", { passenger_type: computed.passengerType });
  };

  async function load({ silent = false } = {}) {
    if (!silent) setLoading(true);
    try {
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      const userId = userRes?.user?.id;
      if (userErr || !userId) {
        navigation.reset({ index: 0, routes: [{ name: "RoleSelection" }] });
        return;
      }

      const [profileRes, accountRes, businessRes, operatorUserRes, operatorAppRes, cardAppRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, phone, email, birthdate, province, city, barangay, zip_code, address_line, first_name, middle_name, last_name, avatar_url")
          .eq("id", userId)
          .single(),
        supabase
          .from("commuter_accounts")
          .select("passenger_type, verification_status, verified, verified_at, pin_set, account_active")
          .eq("commuter_id", userId)
          .single(),
        renderApiRequest("/me/business-verification").catch((e) => {
          console.warn("Failed to fetch business verification:", e.message);
          return null;
        }),
        (async () => {
          try {
            return await supabase.from("operator_users").select("*").eq("user_id", userId).single();
          } catch (e) {
            return { data: null };
          }
        })(),
        (async () => {
          try {
            return await supabase.from("operator_applications").select("*").eq("user_id", userId).order("submitted_at", { ascending: false }).limit(1).single();
          } catch (e) {
            return { data: null };
          }
        })(),
        renderApiRequest("/registrations/my-card-application").catch(() => null),
      ]);

      const { data: p, error: pErr } = profileRes;
      if (pErr) throw pErr;

      const { data: a, error: aErr } = accountRes;
      if (aErr) throw aErr;

      setProfile(p);
      CACHED_PROFILE = p;
      setAccount(a);
      CACHED_ACCOUNT = a;

      // Fetch business verification status
      try {
        const biz = businessRes;
        setBusinessVerification(biz);
        CACHED_BUSINESS_VERIFICATION = biz;
      } catch (e) {
        console.warn("Failed to fetch business verification:", e.message);
      }

      // Check Operator Status
      const op = operatorUserRes?.data;
      setIsOperator(!!op);
      CACHED_IS_OPERATOR = !!op;

      // Check Application Status
      const app = operatorAppRes?.data;
      setOperatorApp(app);
      CACHED_OPERATOR_APP = app;

      // Card Application Status — backend API + direct Supabase fallback
      let cardRes = cardAppRes;
      if (!cardRes) {
        // Backend API not available — check credentials table directly
        try {
          const [credResult, walletResult, countResult] = await Promise.all([
            supabase
              .from("credentials")
              .select("id, value, type, status, issued_at")
              .eq("commuter_id", userId)
              .eq("type", "rfid")
              .order("issued_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase.from("wallets").select("balance").eq("commuter_id", userId).maybeSingle(),
            supabase.from("credentials").select("id", { count: "exact", head: true }).eq("commuter_id", userId).eq("type", "rfid"),
          ]);

          const credential = credResult.data;
          const cvvCount = countResult?.count || 1;
          
          if (credential) {
            const cardSt = String(credential.status || "active").toLowerCase();
            cardRes = {
              status: ["lost", "disabled"].includes(cardSt) ? cardSt : "approved",
              card: { id: credential.id, card_number: credential.value, status: cardSt, issued_at: credential.issued_at, cvv: String(cvvCount).padStart(3, "0") },
              balance: Number(walletResult.data?.balance ?? 0),
            };
          } else {
            // Check card_applications for pending status
            for (const { table, key } of [
              { table: "card_applications", key: "user_id" },
              { table: "card_applications", key: "commuter_id" },
              { table: "commuter_card_applications", key: "user_id" },
              { table: "commuter_card_applications", key: "commuter_id" },
            ]) {
              try {
                const { data } = await supabase.from(table).select("id, status, submitted_at").eq(key, userId).order("submitted_at", { ascending: false }).limit(1).maybeSingle();
                if (data) { cardRes = { status: data.status || "pending", latest_request: data }; break; }
              } catch (_) { /* try next */ }
            }
          }
        } catch (fallbackErr) {
          console.warn("Card status fallback failed:", fallbackErr?.message);
        }
      }
      const normalizedCard = normalizeCardStatus(cardRes);
      setCardApp(normalizedCard);
      CACHED_CARD_APP = normalizedCard;
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to load profile");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  const signOutToPhone = async () => {
    try {
      await supabase.auth.signOut();
      setLocked(false);
      navigation.reset({ index: 0, routes: [{ name: "RoleSelection" }] });
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
        setLockSuppressed(true);
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
        setLockSuppressed(true);
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.5,
          base64: true,
        });
      }

      if (result.canceled || !result.assets?.[0]) {
        setLockSuppressed(false);
        return;
      }

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
      setTimeout(() => setLockSuppressed(false), 1000);
    }
  };

  useEffect(() => {
    const unsub = navigation.addListener("focus", () => load({ silent: true }));
    return unsub;
  }, [navigation]);

  useEffect(() => {
    load({ silent: hasCachedData });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        automaticallyAdjustsScrollIndicatorInsets={false}
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
            {(() => {
              const ringColor = businessVerification?.verified ? '#7C3AED' : '#2F80ED';
              const ringActive = computed.verLabel === 'Verified';
              const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
              return (
                <Animated.View
                  style={[
                    styles.avatarRing,
                    ringActive ? {
                      borderWidth: 4,
                      borderColor: ringColor,
                      shadowColor: ringColor,
                      shadowOpacity: 0.35,
                      shadowRadius: 10,
                      shadowOffset: { width: 0, height: 4 },
                      elevation: 6,
                    } : {},
                    { transform: [{ scale }] }
                  ]}
                >
                  {profile?.avatar_url ? (
                    <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{computed.initials}</Text>
                    </View>
                  )}
                </Animated.View>
              );
            })()}
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

        {/* Business Upgrade Card */}
        {businessVerification && (
          <>
            {businessVerification.can_apply && !businessVerification.verified && (
              <View style={styles.businessUpgradeCard}>
                <View style={styles.businessCardHeader}>
                  <Text style={styles.businessCardIcon}>📈</Text>
                  <View style={styles.businessCardTitleWrap}>
                    <Text style={styles.businessCardTitle}>Upgrade Wallet</Text>
                    <Text style={styles.businessCardSubtitle}>Unlock ₱500,000 limit</Text>
                  </View>
                </View>
                <Text style={styles.businessCardDescription}>
                  Verify your business to increase your wallet limit by 10x and enjoy higher top-up amounts.
                </Text>
                <TouchableOpacity
                  style={styles.businessCardButton}
                  onPress={() => navigation.navigate('BusinessVerification')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.businessCardButtonText}>Apply Now →</Text>
                </TouchableOpacity>
              </View>
            )}

            {businessVerification.verified && (
              <TouchableOpacity
                style={[styles.businessUpgradeCard, styles.businessCardVerified]}
                onPress={() => navigation.navigate('BusinessVerification')}
                activeOpacity={0.85}
              >
                <View style={styles.businessCardHeader}>
                  <View style={styles.businessBadgeContainer}>
                    <BusinessVerifiedBadge size={36} withEffect={true} effect="small" />
                  </View>
                  <View style={styles.businessCardTitleWrap}>
                    <Text style={styles.businessCardTitle}>Business Account</Text>
                    <Text style={styles.businessCardSubtitle}>Fully Verified</Text>
                  </View>
                </View>
                <Text style={styles.businessCardDescription}>
                  Your wallet limit is now ₱500,000. Thank you for your trust!
                </Text>
              </TouchableOpacity>
            )}

            {businessVerification.application?.status === 'pending' && (
              <TouchableOpacity
                style={[styles.businessUpgradeCard, styles.businessCardPending]}
                onPress={() => navigation.navigate('BusinessVerification')}
                activeOpacity={0.85}
              >
                <View style={styles.businessCardHeader}>
                  <Text style={styles.businessCardIcon}>⏳</Text>
                  <View style={styles.businessCardTitleWrap}>
                    <Text style={styles.businessCardTitle}>Pending Review</Text>
                    <Text style={styles.businessCardSubtitle}>{businessVerification.application.business_name}</Text>
                  </View>
                </View>
                <Text style={styles.businessCardDescription}>
                  Your business verification is under review. We'll notify you within 3-5 days.
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* My Card Section */}
        <Text style={[styles.sectionLabel, { marginTop: 8 }]}>My Card</Text>
        {(cardApp?.status === "approved" || cardApp?.status === "lost" || cardApp?.status === "disabled") ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate("CardApplication", { profile, account })}
            style={{ marginBottom: 24 }}
          >
            <View style={[
              styles.cardShell, 
              { minHeight: 180, padding: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" }, 
              cardApp.status !== "approved" && { opacity: 0.85 }
            ]}>
              <LinearGradient
                colors={cardApp.status === "approved"
                  ? ["#FAF0D4", "#F4C271", "#E58E38", "#D96827"]
                  : ["#9CA3AF", "#6B7280", "#4B5563", "#374151"]
                }
                start={{ x: -0.2, y: -0.2 }}
                end={{ x: 1.2, y: 1.2 }}
                style={[StyleSheet.absoluteFillObject, { opacity: 0.9, borderRadius: 20 }]}
              />
              <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(255,255,255,0.4)", borderRadius: 20 }]} />
              
              <View style={styles.cardTopRow}>
                <Text style={[styles.cardBrand, { color: "#FFFFFF", textShadowColor: "rgba(0,0,0,0.15)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }]}>MotoCard</Text>
                {cardApp.status !== "approved" && (
                  <View style={[styles.activePill, { backgroundColor: "rgba(239,68,68,0.35)", alignSelf: "flex-start" }]}>
                    <HugeiconsIcon icon={LockIcon} size={12} color="#FFFFFF" />
                    <Text style={[styles.activePillText, { color: "#FFFFFF" }]}>
                      {cardApp.status === "lost" ? "FROZEN" : "DISABLED"}
                    </Text>
                  </View>
                )}
              </View>
              
              <View style={[styles.cardMidRow, { marginTop: 16 }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={[styles.chip, { borderColor: "rgba(255,255,255,0.4)", backgroundColor: "rgba(255,255,255,0.2)" }]} />
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} color="rgba(255,255,255,0.8)" style={{ transform: [{ rotate: "90deg" }] }} />
                </View>
                <Text style={[
                  styles.cardNumber, 
                  { 
                    color: "#FFFFFF", 
                    fontSize: 22, 
                    letterSpacing: 2, 
                    marginTop: 8,
                    textShadowColor: "rgba(0,0,0,0.25)",
                    textShadowOffset: { width: 0, height: 2 },
                    textShadowRadius: 6
                  }
                ]}>
                  {cardApp.number ? cardApp.number.replace(/(.{4})/g, "$1 ").trim() : "•••• •••• •••• ••••"}
                </Text>
              </View>

              <View style={[styles.cardTopRow, { marginTop: 'auto', alignItems: "flex-end" }]}>
                <View>
                  <Text style={[styles.cardMetaLabel, { color: "rgba(255,255,255,0.7)" }]}>CARD HOLDER</Text>
                  <Text style={[styles.cardMetaValue, { color: "#FFFFFF", fontSize: 13, textShadowColor: "rgba(0,0,0,0.15)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }]}>
                    {computed.name}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: 16 }}>
                  <View>
                    <Text style={[styles.cardMetaLabel, { color: "rgba(255,255,255,0.7)" }]}>VALID THRU</Text>
                    <Text style={[styles.cardMetaValue, { color: "#FFFFFF", fontSize: 13, textShadowColor: "rgba(0,0,0,0.15)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }]}>
                      04/31
                    </Text>
                  </View>
                  <View>
                    <Text style={[styles.cardMetaLabel, { color: "rgba(255,255,255,0.7)" }]}>CVV</Text>
                    <Text style={[styles.cardMetaValue, { color: "#FFFFFF", fontSize: 13, textShadowColor: "rgba(0,0,0,0.15)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }]}>
                      {cardApp.cvv || "001"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ) : cardApp?.status === "pending" ? (
          <TouchableOpacity 
            style={[styles.businessUpgradeCard, styles.businessCardPending, { marginBottom: 24 }]}
            onPress={() => navigation.navigate("CardApplication", { profile, account })}
            activeOpacity={0.85}
          >
            <View style={styles.businessCardHeader}>
              <Text style={styles.businessCardIcon}>⏳</Text>
              <View style={styles.businessCardTitleWrap}>
                <Text style={styles.businessCardTitle}>Card Application Pending</Text>
                <Text style={styles.businessCardSubtitle}>Under review</Text>
              </View>
            </View>
            <Text style={styles.businessCardDescription}>
              We are reviewing your application. You will be notified once it is approved.
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.businessUpgradeCard, { marginBottom: 24, backgroundColor: isDarkMode ? "rgba(255,255,255,0.03)" : "#FFFFFF", borderColor: theme.border }]}
            onPress={() => navigation.navigate("CardApplication", { profile, account })}
            activeOpacity={0.85}
          >
            <View style={styles.businessCardHeader}>
              <View style={[styles.businessBadgeContainer, { backgroundColor: theme.accent, width: 40, height: 40, borderRadius: 12 }]}>
                 <HugeiconsIcon icon={QrCodeIcon} size={20} color="#0B0E14" />
              </View>
              <View style={styles.businessCardTitleWrap}>
                <Text style={styles.businessCardTitle}>Activate your Card</Text>
                <Text style={styles.businessCardSubtitle}>Unlock NFC & Payments</Text>
              </View>
            </View>
            <Text style={styles.businessCardDescription}>
              You haven't activated your card yet. Apply now to get your physical MotoCard for fast rides.
            </Text>
            <View style={[styles.businessCardButton, { backgroundColor: theme.text }]}>
              <Text style={[styles.businessCardButtonText, { color: theme.background }]}>Apply Now →</Text>
            </View>
          </TouchableOpacity>
        )}

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
            onPress={() => navigation.navigate("PasswordSecurity")}
            theme={theme}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon={CheckmarkCircle02Icon}
            title="Verification Status"
            rightText={computed.verLabel}
            rightColor={
              computed.verTone === "good" ? theme.success :
                computed.verTone === "warn" ? theme.warning : theme.danger
            }
            onPress={() => {
              if (computed.verLabel === "Verified" || computed.verLabel === "Pending") {
                return handleVerificationPress();
              }
              navigation.navigate("PassengerType");
            }}
            theme={theme}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon={Briefcase01Icon}
            title="Business Account"
            rightText={businessVerification?.verified ? "Verified" : "Upgrade"}
            rightColor={businessVerification?.verified ? theme.success : theme.accent}
            onPress={() => navigation.navigate('BusinessVerification')}
            theme={theme}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon={Bus01Icon}
            title="Become an Operator"
            rightText={
              isOperator ? "ACTIVE" :
                operatorApp?.status === "pending" ? "PENDING" :
                  operatorApp?.status === "rejected" ? "REJECTED" : "APPLY"
            }
            rightColor={
              isOperator ? theme.success :
                operatorApp?.status === "pending" ? theme.warning :
                  operatorApp?.status === "rejected" ? theme.danger : theme.accent
            }
            onPress={() => {
              if (isOperator) return Alert.alert("Active", "You are already a verified operator.");
              navigation.navigate("OperatorApply");
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
            onPress={() => setAboutModalVisible(true)}
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

      <AboutUsModal 
        visible={aboutModalVisible} 
        onClose={() => setAboutModalVisible(false)}
        theme={theme}
        isDarkMode={isDarkMode}
      />
    </View>

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
        {!!rightText && (
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
  avatarRing: {
    borderRadius: 40,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    // default transparent ring
    borderWidth: 0,
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
  verifiedRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  verifiedPill: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  verifiedText: { fontSize: 13, fontWeight: '700' },
  businessBadgeWrap: {
    marginTop: 8,
    alignSelf: "flex-start",
    alignItems: "center",
  },
  businessBadgeAura: {
    width: 56,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(124,58,237,0.14)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.34)",
    shadowColor: "#7C3AED",
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  businessBadgeCore: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(124,58,237,0.10)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#C084FC",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
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
    color: theme.text,
    fontSize: 13,
    fontWeight: "600",
  },

  // Business Upgrade Card
  businessUpgradeCard: {
    backgroundColor: isDarkMode ? "rgba(255,211,106,0.1)" : "rgba(255,211,106,0.15)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: isDarkMode ? "rgba(255,211,106,0.3)" : "rgba(255,211,106,0.5)",
  },
  businessCardVerified: {
    backgroundColor: isDarkMode ? "rgba(34,197,94,0.1)" : "rgba(34,197,94,0.08)",
    borderColor: isDarkMode ? "rgba(34,197,94,0.3)" : "rgba(34,197,94,0.4)",
  },
  businessCardPending: {
    backgroundColor: isDarkMode ? "rgba(168,162,158,0.1)" : "rgba(243,244,246,1)",
    borderColor: isDarkMode ? "rgba(168,162,158,0.2)" : "rgba(229,231,235,1)",
  },
  businessCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  businessBadgeContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  businessCardIcon: {
    fontSize: 24,
  },
  businessCardTitleWrap: {
    flex: 1,
  },
  businessCardTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: "900",
  },
  businessCardSubtitle: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  businessCardDescription: {
    color: theme.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  businessCardButton: {
    backgroundColor: theme.accent,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  businessCardButtonText: {
    color: "#0B0E14",
    fontSize: 14,
    fontWeight: "900",
  },

  // Version
  versionText: {
    textAlign: "center",
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 24,
  },

  // Card Shell
  cardShell: {
    borderRadius: 24,
    padding: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  cardGlowOne: {
    position: "absolute",
    right: -32,
    top: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  cardGlowTwo: {
    position: "absolute",
    left: -20,
    bottom: -30,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  cardBrand: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.42)",
  },
  activePillText: {
    color: "#0B0E14",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  cardMidRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 'auto',
  },
  chip: {
    width: 38,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  cardNumber: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 2,
  },
});
