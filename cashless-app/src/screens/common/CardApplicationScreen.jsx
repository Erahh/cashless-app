import React, { useMemo, useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  Alert,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Modal,
  ActivityIndicator,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";

import { useTheme } from "../../context/ThemeContext";
import { supabase } from "../../api/supabase";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ArrowLeft01Icon, CheckmarkCircle01Icon, Clock01Icon, Shield01Icon, Camera01Icon, LockIcon } from "@hugeicons/core-free-icons";
import { Picker } from "@react-native-picker/picker";
import FloatingLabelInput from "../../components/Input";
import { renderApiRequest } from "../../api/apiHelper";

const BRANCHES = [
  "Main Branch (Bukidnon)",
  "Downtown Branch (Cagayan de Oro)",
  "North Branch (Cebu City)",
];

const TABLE_CANDIDATES = [
  { table: "card_applications", userKey: "user_id" },
  { table: "card_applications", userKey: "commuter_id" },
  { table: "commuter_card_applications", userKey: "user_id" },
  { table: "commuter_card_applications", userKey: "commuter_id" },
];

function shouldTryNextSchema(errorMessage) {
  const msg = String(errorMessage || "").toLowerCase();
  return (
    msg.includes("does not exist") ||
    msg.includes("column") ||
    msg.includes("relation") ||
    msg.includes("schema cache")
  );
}

async function submitCardApplicationToSupabase({ userId, branch, profile }) {
  const now = new Date().toISOString();
  const profileSnapshot = {
    full_name: profile?.full_name || null,
    first_name: profile?.first_name || null,
    middle_name: profile?.middle_name || null,
    last_name: profile?.last_name || null,
    phone: profile?.phone || null,
    email: profile?.email || null,
    birthdate: profile?.birthdate || null,
    province: profile?.province || null,
    city: profile?.city || null,
    barangay: profile?.barangay || null,
    zip_code: profile?.zip_code || null,
    address_line: profile?.address_line || null,
  };

  const payloadFactories = (userKey) => ([
    {
      [userKey]: userId,
      preferred_branch: branch,
      status: "pending",
      submitted_at: now,
      profile_snapshot: profileSnapshot,
    },
    {
      [userKey]: userId,
      branch,
      status: "pending",
      submitted_at: now,
      profile_snapshot: profileSnapshot,
    },
    {
      [userKey]: userId,
      preferred_branch: branch,
      status: "pending",
      submitted_at: now,
    },
    {
      [userKey]: userId,
      branch,
      status: "pending",
      submitted_at: now,
    },
    {
      [userKey]: userId,
      preferred_branch: branch,
    },
    {
      [userKey]: userId,
      branch,
    },
  ]);

  let lastError = null;

  for (const candidate of TABLE_CANDIDATES) {
    const payloads = payloadFactories(candidate.userKey);

    for (const payload of payloads) {
      const { data, error } = await supabase
        .from(candidate.table)
        .insert(payload)
        .select("*")
        .single();

      if (!error) return data;

      lastError = error;
      if (!shouldTryNextSchema(error.message)) throw error;
    }
  }

  throw lastError || new Error("No compatible card application table was found.");
}

function shouldFallbackToDirectSupabase(errorMessage) {
  const msg = String(errorMessage || "").toLowerCase();
  return (
    msg.includes("not found") ||
    msg.includes("404") ||
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("cannot") ||
    msg.includes("endpoint")
  );
}

async function submitCardApplicationViaBackend({ branch }) {
  return renderApiRequest("/registrations/my-card-application", {
    method: "POST",
    body: JSON.stringify({
      branch,
      preferred_branch: branch,
    }),
  });
}

// ------- Themed Text Input Field (Read Only or Editable) -------
function Field({ label, value, theme, disabled = true }) {
  return (
    <View style={[{ opacity: disabled ? 0.7 : 1 }, { marginBottom: 12 }]}>
      <FloatingLabelInput
        label={label}
        value={value}
        onChangeText={() => {}}
        bgColor={theme.background}
        editable={!disabled}
      />
    </View>
  );
}

function SummaryField({ label, value, theme }) {
  return (
    <View style={[
      {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.card,
        paddingHorizontal: 14,
        paddingVertical: 12,
      }
    ]}>
      <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: "800", letterSpacing: 1, marginBottom: 6 }}>
        {label}
      </Text>
      <Text style={{ color: theme.text, fontSize: 14, fontWeight: "800", lineHeight: 20 }} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function IdUploadCard({ title, description, asset, onPress, theme }) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[
      {
        flex: 1,
        minHeight: 170,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.background,
        padding: 14,
        overflow: "hidden",
      }
    ]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <Text style={{ color: theme.text, fontWeight: "900", fontSize: 14 }}>{title}</Text>
        <View style={{ width: 32, height: 32, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: theme.card }}>
          <HugeiconsIcon icon={Camera01Icon} size={15} color={theme.accent} />
        </View>
      </View>
      <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 17, marginBottom: 12 }}>{description}</Text>
      {asset?.uri ? (
        <Image source={{ uri: asset.uri }} style={{ width: "100%", height: 92, borderRadius: 16, backgroundColor: theme.card }} />
      ) : (
        <View style={{ flex: 1, borderRadius: 16, borderWidth: 1, borderStyle: "dashed", borderColor: theme.border, alignItems: "center", justifyContent: "center", minHeight: 92 }}>
          <Text style={{ color: theme.textMuted, fontWeight: "800", fontSize: 12 }}>Tap to upload</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ------- Themed Select Field (Touchable dropdown) -------
function SelectField({ label, value, placeholder, onPress, theme }) {
  const isSelected = !!value;
  const activeColor = isSelected ? theme.success : theme.accent;
  return (
    <View style={{ marginTop: 14, marginBottom: 4 }}>
      <View style={{ position: 'relative' }}>
        <Text style={{
          position: 'absolute',
          left: 14,
          top: -10,
          fontSize: 12,
          color: isSelected ? activeColor : theme.textMuted,
          backgroundColor: theme.background,
          paddingHorizontal: 6,
          zIndex: 1,
          fontWeight: '700'
        }}>
          {label}
        </Text>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onPress}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderWidth: 1.5,
            borderColor: isSelected ? activeColor : theme.border,
            borderRadius: 14,
            height: 56,
            paddingHorizontal: 16,
            backgroundColor: theme.background,
          }}
        >
          <Text style={{
            color: isSelected ? theme.text : theme.textMuted,
            fontSize: 16,
            fontWeight: "700",
            flex: 1,
          }}>
            {value || placeholder}
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 18 }}>▾</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ------- Themed Picker Modal -------
function PickerModal({ visible, title, value, items, onChange, onClose, placeholder = "Select", theme }) {
  const s = useMemo(() => StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "center",
      padding: 20,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
    },
    title: {
      color: theme.text,
      fontWeight: "900",
      fontSize: 16,
      marginBottom: 10,
    },
    pickerWrap: {
      borderRadius: 14,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
    },
    picker: {
      color: theme.text,
    },
    doneBtn: {
      marginTop: 14,
      backgroundColor: theme.success,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
    },
    doneText: {
      color: theme.isDark ? "#0B0E14" : "#FFFFFF",
      fontWeight: "900",
      fontSize: 15,
    },
  }), [theme]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.card}>
          <Text style={s.title}>{title}</Text>
          <View style={s.pickerWrap}>
            <Picker
              selectedValue={value}
              onValueChange={(v) => onChange(v)}
              dropdownIconColor={theme.text}
              style={s.picker}
            >
              <Picker.Item label={placeholder} value="" color={theme.textMuted} />
              {(Array.isArray(items) ? items : []).map((it) => (
                 <Picker.Item key={it} label={it} value={it} color={theme.text} />
              ))}
            </Picker>
          </View>
          <TouchableOpacity style={s.doneBtn} onPress={onClose} activeOpacity={0.9}>
            <Text style={s.doneText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function normalizeCardApplicationPayload(payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  const latest = source.latest_request || source.latest_application || source.application || source.item || source.data || null;
  const card = source.card || null;
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
  const pending = !isLost && !isDisabled && ["pending", "review", "processing"].includes(rawStatus);
  const rejected = !isLost && !isDisabled && ["rejected", "declined", "denied"].includes(rawStatus);

  let status;
  if (isLost) status = "lost";
  else if (isDisabled) status = "disabled";
  else if (approved) status = "approved";
  else if (pending) status = "pending";
  else if (rejected) status = "rejected";
  else status = "form";

  return {
    latest,
    card,
    cardId: card?.id || source.card_id || null,
    status,
    number: String(
      source.card_number || card?.card_number || latest?.card_number || source.account_number || ""
    ).trim(),
    validThru: String(
      source.valid_thru || card?.valid_thru || latest?.valid_thru || source.expiry || "04/31"
    ).trim(),
    cvv: String(card?.cvv || source.cvv || "001").trim(),
    branch: String(
      latest?.preferred_branch || latest?.branch || source.preferred_branch || source.branch || ""
    ).trim(),
    submittedAt: latest?.submitted_at || source.submitted_at || null,
    issuedAt: card?.issued_at || source.issued_at || null,
    balance: Number(source.balance ?? 0),
    rawStatus,
  };
}

export default function CardApplicationScreen({ navigation, route }) {
  const { theme, isDarkMode } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDarkMode), [theme, isDarkMode]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cardStatus, setCardStatus] = useState("loading");
  const [cardApplication, setCardApplication] = useState(null);

  const [profile, setProfile] = useState(route?.params?.profile || null);
  const [account, setAccount] = useState(route?.params?.account || null);
  const [branch, setBranch] = useState("");
  const [branchModal, setBranchModal] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [frontId, setFrontId] = useState(null);
  const [backId, setBackId] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [cardId, setCardId] = useState(null);
  const [reportingLost, setReportingLost] = useState(false);

  const cardHolderName = useMemo(() => {
    const name = String(profile?.full_name || "Card Holder").trim();
    return name || "Card Holder";
  }, [profile]);

  const cardNumberDisplay = useMemo(() => {
    const raw = String(cardApplication?.number || "").replace(/\s+/g, "");
    if (!raw) return "7A4E7CD1";
    if (raw.length <= 8) return raw.toUpperCase();
    return raw.replace(/.(?=.{4})/g, "•");
  }, [cardApplication]);

  const derivedApproved = cardStatus === "approved" || cardStatus === "lost" || cardStatus === "disabled";
  const derivedPending = cardStatus === "pending";
  const derivedRejected = cardStatus === "rejected";
  const idVerified = Boolean(account?.verified || ["verified", "active", "activated"].includes(String(account?.verification_status || "").toLowerCase()) || account?.verified_at);

  const missingProfileFields = useMemo(() => {
    const checks = [
      { key: "full_name", label: "Full name" },
      { key: "phone", label: "Mobile number" },
      { key: "email", label: "Email address" },
      { key: "birthdate", label: "Birthdate" },
      { key: "province", label: "Province" },
      { key: "city", label: "City" },
      { key: "barangay", label: "Barangay" },
      { key: "address_line", label: "Address line" },
    ];

    return checks.filter(({ key }) => !String(profile?.[key] || "").trim());
  }, [profile]);

  const isProfileComplete = missingProfileFields.length === 0;

  const applicationSteps = useMemo(() => ([
    {
      id: 1,
      title: "Personal details",
      subtitle: "Auto-filled from your registration profile",
      complete: isProfileComplete,
    },
    {
      id: 2,
      title: "Residential details",
      subtitle: "Used for card activation and verification",
      complete: isProfileComplete,
    },
    {
      id: 3,
      title: "Valid ID verification",
      subtitle: idVerified ? "Already verified in your account" : "Upload your valid ID to continue",
      complete: idVerified || (frontId && backId),
    },
    {
      id: 4,
      title: "Branch & declaration",
      subtitle: "Select pickup branch and accept activation terms",
      complete: Boolean(branch) && acceptTerms,
    },
  ]), [acceptTerms, backId, branch, frontId, idVerified, isProfileComplete]);

  const currentStep = applicationSteps.find((step) => step.id === activeStep) || applicationSteps[0];

  useEffect(() => {
    if (idVerified && activeStep < 3) {
      setActiveStep(3);
    }
    if (!idVerified && activeStep === 3 && frontId && backId) {
      setActiveStep(4);
    }
  }, [activeStep, backId, frontId, idVerified]);

  async function loadProfile() {
    setLoading(true);
    try {
      if (route?.params?.profile) {
        setProfile(route.params.profile);
      } else {
        const { data: userRes, error: userErr } = await supabase.auth.getUser();
        const userId = userRes?.user?.id;
        if (userErr || !userId) throw new Error("Could not find user.");

        const { data: p, error: pErr } = await supabase
          .from("profiles")
          .select("full_name, phone, email, birthdate, province, city, barangay, zip_code, address_line, first_name, middle_name, last_name")
          .eq("id", userId)
          .single();
        if (pErr) throw pErr;

        setProfile(p);
      }

      try {
        const json = await renderApiRequest("/me/status");
        setAccount(json?.account || route?.params?.account || null);
      } catch (statusErr) {
        if (__DEV__) {
          console.warn("Failed to load account status:", statusErr?.message || statusErr);
        }
      }

      // ── Card status: try backend API first, fallback to direct Supabase ──
      try {
        const json = await renderApiRequest("/registrations/my-card-application");
        const normalized = normalizeCardApplicationPayload(json);
        setCardApplication(normalized);
        setCardStatus(normalized.status);
        setWalletBalance(normalized.balance ?? 0);
        setCardId(normalized.cardId ?? null);
      } catch (cardErr) {
        // API endpoint not deployed yet or network issue — query Supabase directly
        if (__DEV__) {
          console.warn("Backend card API failed, using Supabase fallback:", cardErr?.message);
        }
        try {
          const { data: userRes } = await supabase.auth.getUser();
          const userId = userRes?.user?.id;

          if (userId) {
            const [credResult, walletResult] = await Promise.all([
              supabase
                .from("credentials")
                .select("id, value, type, status, issued_at")
                .eq("commuter_id", userId)
                .eq("type", "rfid")
                .order("issued_at", { ascending: false })
                .limit(1)
                .maybeSingle(),
              supabase
                .from("wallets")
                .select("balance")
                .eq("commuter_id", userId)
                .maybeSingle(),
            ]);

            const credential = credResult.data;
            const balance = Number(walletResult.data?.balance ?? 0);
            setWalletBalance(balance);

            if (credential) {
              // Admin has issued a card
              const cardSt = String(credential.status || "active").toLowerCase();
              const responseStatus = ["lost", "disabled"].includes(cardSt) ? cardSt : "approved";
              const normalized = normalizeCardApplicationPayload({
                status: responseStatus,
                card: {
                  id: credential.id,
                  card_number: credential.value,
                  status: cardSt,
                  issued_at: credential.issued_at,
                },
                balance,
              });
              setCardApplication(normalized);
              setCardStatus(normalized.status);
              setCardId(credential.id);
            } else {
              // No card issued — check for a pending application
              let foundApp = null;
              for (const { table, key } of [
                { table: "card_applications", key: "user_id" },
                { table: "card_applications", key: "commuter_id" },
                { table: "commuter_card_applications", key: "user_id" },
                { table: "commuter_card_applications", key: "commuter_id" },
              ]) {
                try {
                  const { data } = await supabase
                    .from(table)
                    .select("id, status, preferred_branch, branch, submitted_at")
                    .eq(key, userId)
                    .order("submitted_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();
                  if (data) { foundApp = data; break; }
                } catch (_) { /* try next */ }
              }

              if (foundApp) {
                const normalized = normalizeCardApplicationPayload({
                  status: foundApp.status || "pending",
                  latest_request: foundApp,
                  balance,
                });
                setCardApplication(normalized);
                setCardStatus(normalized.status);
              } else {
                setCardApplication(null);
                setCardStatus("form");
              }
            }
          } else {
            setCardApplication(null);
            setCardStatus("form");
          }
        } catch (fallbackErr) {
          if (__DEV__) {
            console.warn("Supabase fallback also failed:", fallbackErr?.message);
          }
          setCardApplication(null);
          setCardStatus("form");
        }
      }

    } catch (e) {
      Alert.alert("Error", e.message || "Failed to load profile. Please make sure your profile is complete.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  // ── Realtime: auto-activate when admin issues a card ──
  // The moment admin inserts an RFID credential for this user,
  // the screen automatically switches to the activated card view.
  useEffect(() => {
    let channel = null;

    const setupRealtime = async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes?.user?.id;
      if (!userId) return;

      channel = supabase
        .channel(`card-issued-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "credentials",
            filter: `commuter_id=eq.${userId}`,
          },
          (payload) => {
            // Admin issued a new RFID card — reload to show the card
            if (String(payload.new?.type || "").toLowerCase() === "rfid") {
              loadProfile();
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "credentials",
            filter: `commuter_id=eq.${userId}`,
          },
          (payload) => {
            // Card status updated (activated, lost, disabled) — sync the UI
            if (String(payload.new?.type || "").toLowerCase() === "rfid") {
              loadProfile();
            }
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  function hasMissingRequiredProfileData() {
    const required = [
      "full_name",
      "phone",
      "province",
      "city",
      "barangay",
      "address_line",
    ];
    return required.some((key) => !String(profile?.[key] || "").trim());
  }

  async function handleSubmit() {
    if (!isProfileComplete) {
      return Alert.alert(
        "Complete your profile",
        `Your registration profile is still missing: ${missingProfileFields.map((field) => field.label).join(", ")}.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Finish Profile",
            onPress: () => navigation.navigate("PersonalInfo", { editMode: true, profile }),
          },
        ]
      );
    }

    if (!idVerified && (!frontId || !backId)) {
      return Alert.alert("Valid ID required", "Please upload both front and back of a valid ID to continue.");
    }

    if (!branch) {
      return Alert.alert("Missing Branch", "Please select a branch to pick up your card.");
    }
    if (!acceptTerms) {
      return Alert.alert("Declaration Required", "Please accept the activation declaration to continue.");
    }

    if (!hasMissingRequiredProfileData()) {
      // keep the stricter check above, but retain this guard for any legacy fields
    }

    setSubmitting(true);
    try {
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      const userId = userRes?.user?.id;
      if (userErr || !userId) throw new Error("Could not find logged-in user.");

      try {
        await submitCardApplicationViaBackend({ branch });
      } catch (backendErr) {
        if (!shouldFallbackToDirectSupabase(backendErr?.message)) {
          throw backendErr;
        }

        await submitCardApplicationToSupabase({
          userId,
          branch,
          profile,
        });
      }

      const nextApplication = {
        status: "pending",
        branch,
        preferred_branch: branch,
        submitted_at: new Date().toISOString(),
      };
      setCardApplication(normalizeCardApplicationPayload(nextApplication));
      setCardStatus("pending");

      Alert.alert("Submitted ✅", "Your card application is now pending activation. We will update the status once admin approves it.");
    } catch (error) {
      Alert.alert("Submission Failed", error.message);
    } finally {
      setSubmitting(false);
    }
  }

  const goNextStep = () => {
    if (activeStep === 1 && !isProfileComplete) {
      return Alert.alert(
        "Incomplete registration profile",
        `Please complete: ${missingProfileFields.map((field) => field.label).join(", ")}.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Go to Profile",
            onPress: () => navigation.navigate("PersonalInfo", { editMode: true, profile }),
          },
        ]
      );
    }

    if (activeStep === 2 && !isProfileComplete) {
      return Alert.alert("Profile required", "Please complete your registration profile first.");
    }

    if (activeStep === 3 && !idVerified && (!frontId || !backId)) {
      return Alert.alert("Valid ID required", "Please upload both front and back ID photos before you continue.");
    }

    setActiveStep((step) => Math.min(4, step + 1));
  };

  const goBackStep = () => {
    setActiveStep((step) => Math.max(1, step - 1));
  };

  const handleReportLost = () => {
    if (!cardId) return Alert.alert("Error", "Card ID not found. Please reload the screen and try again.");
    Alert.alert(
      "⚠️ Report Card as Lost",
      "This will immediately freeze your card and block ALL transactions. You will need to visit a branch or contact support to get a replacement.\n\nAre you absolutely sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Freeze Card",
          style: "destructive",
          onPress: async () => {
            setReportingLost(true);
            try {
              let frozeOk = false;
              try {
                const res = await renderApiRequest(`/credentials/${cardId}/status`, {
                  method: "PATCH",
                  body: JSON.stringify({ status: "lost" }),
                });
                frozeOk = res?.ok === true;
              } catch (_) {
                // Backend not reachable — update directly via Supabase
                const { error: updateErr } = await supabase
                  .from("credentials")
                  .update({ status: "lost" })
                  .eq("id", cardId);
                if (!updateErr) frozeOk = true;
              }

              if (frozeOk) {
                setCardStatus("lost");
                setCardApplication((prev) => prev ? { ...prev, status: "lost", rawStatus: "lost" } : prev);
                Alert.alert(
                  "Card Frozen ✅",
                  "Your card has been reported as lost. All transactions are now blocked. Contact support to request a replacement card."
                );
              } else {
                Alert.alert("Failed", "Could not freeze the card. Please try again.");
              }
            } catch (e) {
              Alert.alert("Error", e.message || "Failed to freeze card.");
            } finally {
              setReportingLost(false);
            }

          },
        },
      ]
    );
  };

  const renderApprovedState = () => {
    const isLost = cardStatus === "lost";
    const isDisabled = cardStatus === "disabled";
    const isFrozen = isLost || isDisabled;

    const cardGradientColors = isFrozen
      ? ["#9CA3AF", "#6B7280", "#4B5563", "#374151"]
      : ["#FFF7DA", "#F6D48A", "#E7B15D", "#F4E7CF"];

    const statusLabel = isLost ? "FROZEN" : isDisabled ? "DISABLED" : "ACTIVE";

    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Card</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Balance Card */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceMeta}>WALLET BALANCE</Text>
            <Text style={styles.balanceAmount}>
              ₱{Number(walletBalance).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            {isFrozen && (
              <View style={styles.frozenPill}>
                <Text style={styles.frozenPillText}>🔒 Card Frozen — Transactions Blocked</Text>
              </View>
            )}
          </View>

          {/* Card Visual */}
          <View style={[
            styles.cardShell, 
            { minHeight: 180, padding: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" }, 
            isFrozen && { opacity: 0.85 }
          ]}>
            <LinearGradient
              colors={!isFrozen
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
              {!isFrozen ? (
                <View style={{ height: 14 }} /> 
              ) : (
                <View style={[styles.activePill, { backgroundColor: "rgba(239,68,68,0.35)", alignSelf: "flex-start" }]}>
                  <HugeiconsIcon icon={LockIcon} size={12} color="#FFFFFF" />
                  <Text style={[styles.activePillText, { color: "#FFFFFF" }]}>
                    {statusLabel}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={[styles.cardMidRow, { marginTop: 16 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={[styles.chip, { borderColor: "rgba(255,255,255,0.4)", backgroundColor: "rgba(255,255,255,0.2)" }]} />
                <View style={styles.contactlessWrap}>
                  <View style={[styles.contactlessWave, { borderColor: "rgba(255,255,255,0.8)" }]} />
                  <View style={[styles.contactlessWave, { borderColor: "rgba(255,255,255,0.8)", transform: [{ scale: 0.74 }] }]} />
                  <View style={[styles.contactlessWave, { borderColor: "rgba(255,255,255,0.8)", transform: [{ scale: 0.48 }] }]} />
                </View>
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
                {cardNumberDisplay}
              </Text>
            </View>

            <View style={[styles.cardTopRow, { marginTop: 'auto', alignItems: "flex-end" }]}>
              <View>
                <Text style={[styles.cardMetaLabel, { color: "rgba(255,255,255,0.7)" }]}>CARD HOLDER</Text>
                <Text style={[styles.cardMetaValue, { color: "#FFFFFF", fontSize: 13, textShadowColor: "rgba(0,0,0,0.15)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }]}>
                  {cardHolderName}
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 16 }}>
                <View>
                  <Text style={[styles.cardMetaLabel, { color: "rgba(255,255,255,0.7)" }]}>VALID THRU</Text>
                  <Text style={[styles.cardMetaValue, { color: "#FFFFFF", fontSize: 13, textShadowColor: "rgba(0,0,0,0.15)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }]}>
                    {cardApplication?.validThru || "04/31"}
                  </Text>
                </View>
                <View>
                  <Text style={[styles.cardMetaLabel, { color: "rgba(255,255,255,0.7)" }]}>CVV</Text>
                  <Text style={[styles.cardMetaValue, { color: "#FFFFFF", fontSize: 13, textShadowColor: "rgba(0,0,0,0.15)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }]}>
                    {cardApplication?.cvv || "001"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Info Grid */}
          <View style={styles.heroGrid}>
            <View style={styles.heroStatCard}>
              <HugeiconsIcon icon={Shield01Icon} size={18} color={isFrozen ? "#EF4444" : theme.accent} />
              <Text style={styles.heroStatTitle}>Card Status</Text>
              <Text style={[styles.heroStatText, { color: isFrozen ? "#EF4444" : "#22C55E", fontWeight: "900" }]}>
                {isLost ? "Frozen / Lost" : isDisabled ? "Disabled" : "Active ✓"}
              </Text>
            </View>
            <View style={styles.heroStatCard}>
              <HugeiconsIcon icon={Clock01Icon} size={18} color={theme.success} />
              <Text style={styles.heroStatTitle}>Issued On</Text>
              <Text style={styles.heroStatText}>
                {cardApplication?.issuedAt
                  ? new Date(cardApplication.issuedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
                  : "Issued by Admin"}
              </Text>
            </View>
          </View>

          {/* Frozen Banner */}
          {isFrozen && (
            <View style={styles.frozenBanner}>
              <Text style={styles.frozenBannerTitle}>🔒 Your card is currently frozen</Text>
              <Text style={styles.frozenBannerText}>
                All transactions using this card are blocked. Contact support or visit a branch to request a replacement.
              </Text>
            </View>
          )}

          {/* Active Card Actions */}
          {!isFrozen && (
            <>
              <TouchableOpacity
                style={[styles.lostCardBtn, reportingLost && { opacity: 0.55 }]}
                onPress={handleReportLost}
                disabled={reportingLost}
                activeOpacity={0.85}
              >
                {reportingLost ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <>
                    <HugeiconsIcon icon={LockIcon} size={15} color="#EF4444" />
                    <Text style={styles.lostCardBtnText}>Report Card as Lost / Freeze</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    );
  };

  const renderPendingState = () => {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Card</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.stateIntro, styles.pendingIntro]}>
            <Text style={styles.stateEyebrow}>PENDING ACTIVATION</Text>
            <Text style={styles.stateTitle}>Your card account is under review.</Text>
            <Text style={styles.stateSub}>
              We already received your card application. Once admin approves it, your account will switch to the active card view automatically.
            </Text>
          </View>

          <View style={styles.pendingShell}>
            <View style={styles.pendingBadgeRow}>
              <View style={styles.pendingBadge}>
                <HugeiconsIcon icon={Clock01Icon} size={14} color="#F4C15A" />
                <Text style={styles.pendingBadgeText}>Waiting for approval</Text>
              </View>
            </View>

            <View style={styles.pendingTimeline}>
              <View style={styles.timelineItemActive}>
                <View style={styles.timelineDotActive} />
                <View style={styles.timelineCopy}>
                  <Text style={styles.timelineTitle}>Requirements submitted</Text>
                  <Text style={styles.timelineText}>Your personal details and pickup branch were received.</Text>
                </View>
              </View>
              <View style={styles.timelineLine} />
              <View style={styles.timelineItemActive}>
                <View style={styles.timelineDotActive} />
                <View style={styles.timelineCopy}>
                  <Text style={styles.timelineTitle}>Admin review</Text>
                  <Text style={styles.timelineText}>Pending approval from the admin team.</Text>
                </View>
              </View>
              <View style={styles.timelineLine} />
              <View style={styles.timelineItemMuted}>
                <View style={styles.timelineDotMuted} />
                <View style={styles.timelineCopy}>
                  <Text style={styles.timelineTitle}>Card activated</Text>
                  <Text style={styles.timelineText}>The clean card view will appear here once approved.</Text>
                </View>
              </View>
            </View>

          </View>

          <View style={{ height: 80 }} />
        </ScrollView>
      </SafeAreaView>
    );
  };

  const pickIdImage = async (side) => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        return Alert.alert("Permission needed", "Allow photo access so you can upload your ID.");
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      if (side === "front") {
        setFrontId(asset);
      } else {
        setBackId(asset);
      }
    } catch (error) {
      Alert.alert("Upload error", error.message || "Could not open photo library.");
    }
  };

  const renderStrictFormStep = (step) => {
    if (step === 1) {
      return (
        <View style={styles.stepCard}>
          <View style={styles.stepCardHeader}>
            <Text style={styles.stepCardTitle}>Step 1 · Personal details</Text>
            <View style={[styles.stepPill, isProfileComplete ? styles.stepPillDone : styles.stepPillWarn]}>
              <Text style={styles.stepPillText}>{isProfileComplete ? "AUTO-FILLED" : "NEEDS PROFILE"}</Text>
            </View>
          </View>

          <Text style={styles.stepCardText}>
            These details are pulled from your existing registration profile. If anything is missing, complete your profile first.
          </Text>

          <View style={styles.summaryGrid}>
            <SummaryField label="Full Name" value={profile?.full_name || "Not set"} theme={theme} />
            <SummaryField label="Mobile Number" value={profile?.phone || "Not set"} theme={theme} />
            <SummaryField label="Email Address" value={profile?.email || "Not set"} theme={theme} />
            <SummaryField label="Birthdate" value={profile?.birthdate || "Not set"} theme={theme} />
          </View>
        </View>
      );
    }

    if (step === 2) {
      return (
        <View style={styles.stepCard}>
          <View style={styles.stepCardHeader}>
            <Text style={styles.stepCardTitle}>Step 2 · Residential details</Text>
            <View style={[styles.stepPill, isProfileComplete ? styles.stepPillDone : styles.stepPillWarn]}>
              <Text style={styles.stepPillText}>{isProfileComplete ? "READY" : "INCOMPLETE"}</Text>
            </View>
          </View>

          <Text style={styles.stepCardText}>
            We use your current profile address for card verification and pickup processing.
          </Text>

          <View style={styles.summaryGrid}>
            <SummaryField label="Province" value={profile?.province || "Not set"} theme={theme} />
            <SummaryField label="City" value={profile?.city || "Not set"} theme={theme} />
            <SummaryField label="Barangay" value={profile?.barangay || "Not set"} theme={theme} />
            <SummaryField label="Address Line" value={profile?.address_line || "Not set"} theme={theme} />
          </View>
        </View>
      );
    }

    if (step === 3) {
      return (
        <View style={styles.stepCard}>
          <View style={styles.stepCardHeader}>
            <Text style={styles.stepCardTitle}>Step 3 · Valid ID verification</Text>
            <View style={[styles.stepPill, idVerified || (frontId && backId) ? styles.stepPillDone : styles.stepPillWarn]}>
              <Text style={styles.stepPillText}>{idVerified ? "ALREADY VERIFIED" : (frontId && backId) ? "READY" : "UPLOAD REQUIRED"}</Text>
            </View>
          </View>

          {idVerified ? (
            <View style={styles.verifiedBox}>
              <View style={styles.verifiedBadgeRow}>
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={18} color={theme.success} />
                <Text style={styles.verifiedBadgeText}>Your ID is already verified</Text>
              </View>
              <Text style={styles.stepCardText}>
                We already have your valid ID on file. You can continue to the next step right away.
              </Text>
              <View style={styles.verifiedMetaRow}>
                <SummaryField label="Verification status" value={String(account?.verification_status || "verified").toUpperCase()} theme={theme} />
                <SummaryField label="Verified at" value={account?.verified_at || "Recorded in your account"} theme={theme} />
              </View>
            </View>
          ) : (
            <View>
              <Text style={styles.stepCardText}>
                Upload the front and back of a valid ID so your activation can proceed like a proper bank-style review.
              </Text>
              <View style={styles.idUploadGrid}>
                <IdUploadCard
                  title="Front ID"
                  description="Tap to upload the front side of your valid ID."
                  asset={frontId}
                  onPress={() => pickIdImage("front")}
                  theme={theme}
                />
                <IdUploadCard
                  title="Back ID"
                  description="Tap to upload the back side of your valid ID."
                  asset={backId}
                  onPress={() => pickIdImage("back")}
                  theme={theme}
                />
              </View>
              <View style={styles.uploadHintBox}>
                <Text style={styles.uploadHintTitle}>Required for activation</Text>
                <Text style={styles.uploadHintText}>
                  Make sure the images are clear, uncropped, and readable before continuing.
                </Text>
              </View>
            </View>
          )}
        </View>
      );
    }

    return (
      <View style={styles.stepCard}>
        <View style={styles.stepCardHeader}>
          <Text style={styles.stepCardTitle}>Step 4 · Branch and declaration</Text>
          <View style={[styles.stepPill, branch && acceptTerms ? styles.stepPillDone : styles.stepPillWarn]}>
            <Text style={styles.stepPillText}>{branch && acceptTerms ? "READY TO SUBMIT" : "REQUIRED"}</Text>
          </View>
        </View>

        <Text style={styles.stepCardText}>
          Pick the branch where you want to activate or claim your card, then accept the activation declaration.
        </Text>

        <SelectField
          label="Preferred Branch *"
          value={branch}
          placeholder="Select branch for pickup"
          onPress={() => setBranchModal(true)}
          theme={theme}
        />

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.checkboxRow}
          onPress={() => setAcceptTerms((value) => !value)}
        >
          <View style={[styles.checkboxBox, acceptTerms && styles.checkboxBoxChecked]}>
            {acceptTerms ? <Text style={styles.checkboxCheck}>✓</Text> : null}
          </View>
          <Text style={styles.checkboxText}>
            I confirm that the details above are correct and I agree to activate my card account under the stated requirements.
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={{ color: theme.textSecondary, marginTop: 12 }}>Loading details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (derivedApproved) {
    return renderApprovedState();
  }

  if (derivedPending) {
    return renderPendingState();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Card</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formHeroCard}>
          <LinearGradient
            colors={["rgba(255,211,106,0.24)", "rgba(255,255,255,0.03)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.formHeroGradient}
          >
            <View style={styles.formHeroTop}>
              <View style={styles.formHeroIconWrap}>
                <HugeiconsIcon icon={Shield01Icon} size={20} color={theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.subtitleTitle}>Activate your Card account</Text>
                <Text style={styles.subtitle}>
                  Your details are automatically filled in. Select a branch below for card pickup to activate your account.
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {derivedRejected ? (
          <View style={styles.rejectedBanner}>
            <Text style={styles.rejectedTitle}>Previous application was declined</Text>
            <Text style={styles.rejectedText}>You can review your details below and submit again.</Text>
          </View>
        ) : null}

        <View style={styles.stepperWrap}>
          {applicationSteps.map((step, index) => {
            const isActive = activeStep === step.id;
            const isDone = step.complete && step.id < activeStep;
            return (
              <React.Fragment key={step.id}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setActiveStep(step.id)}
                  style={[
                    styles.stepperItem,
                    isActive && styles.stepperItemActive,
                    isDone && styles.stepperItemDone,
                  ]}
                >
                  <View style={[styles.stepperDot, isDone && styles.stepperDotDone, isActive && styles.stepperDotActive]}>
                    <Text style={styles.stepperDotText}>{isDone ? "✓" : step.id}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stepperTitle}>{step.title}</Text>
                    <Text style={styles.stepperSubtitle}>{step.subtitle}</Text>
                  </View>
                </TouchableOpacity>
                {index < applicationSteps.length - 1 ? <View style={styles.stepperLine} /> : null}
              </React.Fragment>
            );
          })}
        </View>

        <View style={styles.stepHeaderCard}>
          <Text style={styles.stepHeaderKicker}>CURRENT STEP</Text>
          <Text style={styles.stepHeaderTitle}>{currentStep?.title}</Text>
          <Text style={styles.stepHeaderText}>{currentStep?.subtitle}</Text>
        </View>

        {renderStrictFormStep(activeStep)}

        <View style={styles.stepActionsRow}>
          <TouchableOpacity
            style={[styles.stepActionSecondary, activeStep === 1 && styles.stepActionDisabled]}
            onPress={goBackStep}
            disabled={activeStep === 1}
            activeOpacity={0.85}
          >
            <Text style={styles.stepActionSecondaryText}>Back</Text>
          </TouchableOpacity>

          {activeStep < 3 ? (
            <TouchableOpacity
              style={styles.stepActionPrimary}
              onPress={goNextStep}
              activeOpacity={0.9}
            >
              <Text style={styles.stepActionPrimaryText}>Continue</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.stepActionPrimary, (submitting || !isProfileComplete) && styles.stepActionDisabled]}
              onPress={handleSubmit}
              disabled={submitting || !isProfileComplete}
              activeOpacity={0.9}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={isDarkMode ? "#0B0E14" : "#FFFFFF"} />
              ) : (
                <Text style={styles.stepActionPrimaryText}>Submit Activation</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.requirementsCard}>
          <Text style={styles.requirementsTitle}>Activation requirements</Text>
          <View style={styles.requirementRow}>
            <Text style={styles.requirementDot}>{isProfileComplete ? "✓" : "1"}</Text>
            <Text style={styles.requirementText}>Complete profile details from registration</Text>
          </View>
          <View style={styles.requirementRow}>
            <Text style={styles.requirementDot}>{idVerified || (frontId && backId) ? "✓" : "2"}</Text>
            <Text style={styles.requirementText}>Verify your valid ID or use the one already verified in your account</Text>
          </View>
          <View style={styles.requirementRow}>
            <Text style={styles.requirementDot}>{branch ? "✓" : "3"}</Text>
            <Text style={styles.requirementText}>Select a pickup branch</Text>
          </View>
          <View style={styles.requirementRow}>
            <Text style={styles.requirementDot}>{acceptTerms ? "✓" : "4"}</Text>
            <Text style={styles.requirementText}>Accept the activation declaration</Text>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── PICKER MODAL ── */}
      <PickerModal 
        visible={branchModal} 
        title="Select Branch" 
        value={branch} 
        items={BRANCHES} 
        onChange={(v) => setBranch(v)} 
        onClose={() => setBranchModal(false)} 
        placeholder="Choose nearest branch" 
        theme={theme} 
      />
    </SafeAreaView>
  );
}

// ── STYLES ──
const createStyles = (theme, isDarkMode) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
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
    content: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 20,
    },
    subtitle: {
      color: theme.textSecondary,
      fontSize: 14,
      marginBottom: 24,
      lineHeight: 20,
    },
    subtitleTitle: {
      color: theme.text,
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 6,
    },
    formHeroCard: {
      marginBottom: 16,
    },
    formHeroGradient: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      overflow: "hidden",
    },
    formHeroTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    formHeroIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
    },
    rejectedBanner: {
      marginBottom: 16,
      padding: 16,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: "rgba(239,68,68,0.25)",
      backgroundColor: isDarkMode ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.08)",
    },
    rejectedTitle: {
      color: theme.text,
      fontWeight: "900",
      fontSize: 15,
      marginBottom: 4,
    },
    rejectedText: {
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    stepperWrap: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
      padding: 14,
      marginBottom: 16,
    },
    stepperItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 16,
    },
    stepperItemActive: {
      backgroundColor: isDarkMode ? "rgba(255,211,106,0.10)" : "rgba(255,211,106,0.16)",
    },
    stepperItemDone: {
      backgroundColor: isDarkMode ? "rgba(47,128,237,0.08)" : "rgba(47,128,237,0.09)",
    },
    stepperDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
      backgroundColor: theme.background,
    },
    stepperDotActive: {
      borderColor: theme.accent,
      backgroundColor: theme.accent,
    },
    stepperDotDone: {
      borderColor: theme.success,
      backgroundColor: theme.success,
    },
    stepperDotText: {
      color: isDarkMode ? "#0B0E14" : theme.text,
      fontSize: 11,
      fontWeight: "900",
    },
    stepperTitle: {
      color: theme.text,
      fontSize: 14,
      fontWeight: "900",
      marginBottom: 3,
    },
    stepperSubtitle: {
      color: theme.textSecondary,
      fontSize: 12,
      lineHeight: 17,
    },
    stepperLine: {
      height: 8,
    },
    stepHeaderCard: {
      borderRadius: 22,
      padding: 18,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
      marginBottom: 14,
    },
    stepHeaderKicker: {
      color: theme.accent,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.2,
      marginBottom: 8,
    },
    stepHeaderTitle: {
      color: theme.text,
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 6,
    },
    stepHeaderText: {
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 19,
    },
    stepCard: {
      borderRadius: 26,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
      padding: 18,
      marginBottom: 16,
    },
    stepCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 10,
    },
    stepCardTitle: {
      color: theme.text,
      fontSize: 16,
      fontWeight: "900",
      flex: 1,
    },
    stepPill: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
    },
    stepPillDone: {
      backgroundColor: isDarkMode ? "rgba(34,197,94,0.12)" : "rgba(34,197,94,0.16)",
      borderColor: isDarkMode ? "rgba(34,197,94,0.18)" : "rgba(34,197,94,0.24)",
    },
    stepPillWarn: {
      backgroundColor: isDarkMode ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.16)",
      borderColor: isDarkMode ? "rgba(245,158,11,0.18)" : "rgba(245,158,11,0.24)",
    },
    stepPillText: {
      color: theme.text,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 0.8,
    },
    stepCardText: {
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 14,
    },
    summaryGrid: {
      gap: 10,
    },
    checkboxRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      marginTop: 14,
      padding: 14,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: isDarkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
    },
    checkboxBox: {
      width: 22,
      height: 22,
      borderRadius: 7,
      borderWidth: 1.5,
      borderColor: theme.border,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 1,
      backgroundColor: theme.background,
    },
    checkboxBoxChecked: {
      backgroundColor: theme.accent,
      borderColor: theme.accent,
    },
    checkboxCheck: {
      color: isDarkMode ? "#0B0E14" : "#FFFFFF",
      fontSize: 12,
      fontWeight: "900",
      lineHeight: 12,
    },
    checkboxText: {
      flex: 1,
      color: theme.text,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: "600",
    },
    stepActionsRow: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 16,
    },
    stepActionSecondary: {
      flex: 1,
      height: 54,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    stepActionPrimary: {
      flex: 1.4,
      height: 54,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.accent,
    },
    stepActionDisabled: {
      opacity: 0.45,
    },
    stepActionSecondaryText: {
      color: theme.text,
      fontSize: 15,
      fontWeight: "900",
    },
    stepActionPrimaryText: {
      color: "#0B0E14",
      fontSize: 15,
      fontWeight: "900",
    },
    requirementsCard: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
      padding: 16,
      marginBottom: 12,
    },
    requirementsTitle: {
      color: theme.text,
      fontSize: 15,
      fontWeight: "900",
      marginBottom: 12,
    },
    requirementRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      marginBottom: 10,
    },
    requirementDot: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
      color: theme.text,
      fontSize: 11,
      fontWeight: "900",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      lineHeight: 22,
      overflow: "hidden",
    },
    requirementText: {
      flex: 1,
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "600",
    },
    stateIntro: {
      marginBottom: 18,
      borderRadius: 26,
      padding: 18,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    pendingIntro: {
      backgroundColor: isDarkMode ? "rgba(255,211,106,0.08)" : "rgba(255,211,106,0.12)",
      borderColor: isDarkMode ? "rgba(255,211,106,0.18)" : "rgba(255,211,106,0.32)",
    },
    stateEyebrow: {
      color: theme.accent,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.4,
      marginBottom: 8,
    },
    stateTitle: {
      color: theme.text,
      fontSize: 26,
      lineHeight: 32,
      fontWeight: "900",
      marginBottom: 10,
    },
    stateSub: {
      color: theme.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
    cardShell: {
      borderRadius: 30,
      padding: 20,
      minHeight: 220,
      overflow: "hidden",
      marginBottom: 18,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.55)",
      shadowColor: "#000",
      shadowOpacity: 0.18,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 8,
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
      marginBottom: 24,
    },
    cardBrand: {
      color: "#FFFFFF",
      fontSize: 20,
      fontWeight: "900",
      letterSpacing: 0.4,
    },
    activePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: "rgba(255,255,255,0.42)",
    },
    activePillText: {
      color: "#0B0E14",
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.1,
    },
    cardMidRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 28,
    },
    chip: {
      width: 44,
      height: 34,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.35)",
      backgroundColor: "rgba(255,255,255,0.16)",
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 2,
    },
    contactlessWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      marginLeft: "auto",
      marginRight: 12,
    },
    contactlessWave: {
      width: 8,
      height: 18,
      borderTopRightRadius: 10,
      borderBottomRightRadius: 10,
      borderWidth: 2,
      borderLeftWidth: 0,
      borderColor: "rgba(255,255,255,0.82)",
      opacity: 0.95,
      transform: [{ rotate: "-12deg" }],
    },
    cardNumber: {
      color: "#FFFFFF",
      fontSize: 20,
      letterSpacing: 3.2,
      fontWeight: "900",
      textAlign: "right",
      textShadowColor: "rgba(0,0,0,0.18)",
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    cardBottomRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: 12,
    },
    cardMetaBlock: {
      flex: 1,
    },
    cardMetaLabel: {
      color: "rgba(255,255,255,0.68)",
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.1,
      marginBottom: 5,
    },
    cardMetaValue: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "900",
    },
    heroGrid: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 18,
    },
    heroStatCard: {
      flex: 1,
      padding: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    heroStatTitle: {
      marginTop: 10,
      color: theme.text,
      fontSize: 14,
      fontWeight: "900",
      marginBottom: 6,
    },
    heroStatText: {
      color: theme.textSecondary,
      fontSize: 12,
      lineHeight: 18,
    },
    primaryAction: {
      height: 54,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.accent,
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 4,
    },
    primaryActionText: {
      color: "#0B0E14",
      fontSize: 15,
      fontWeight: "900",
    },
    pendingShell: {
      borderRadius: 28,
      padding: 18,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
      marginBottom: 18,
    },
    pendingBadgeRow: {
      marginBottom: 16,
    },
    pendingBadge: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: isDarkMode ? "rgba(255,211,106,0.12)" : "rgba(255,211,106,0.22)",
      borderWidth: 1,
      borderColor: isDarkMode ? "rgba(255,211,106,0.18)" : "rgba(255,211,106,0.32)",
    },
    pendingBadgeText: {
      color: theme.text,
      fontSize: 12,
      fontWeight: "900",
    },
    pendingTimeline: {
      paddingVertical: 6,
      marginBottom: 16,
    },
    timelineItemActive: {
      flexDirection: "row",
      gap: 12,
      alignItems: "flex-start",
    },
    timelineItemMuted: {
      flexDirection: "row",
      gap: 12,
      alignItems: "flex-start",
      opacity: 0.72,
    },
    timelineDotActive: {
      width: 12,
      height: 12,
      marginTop: 4,
      borderRadius: 6,
      backgroundColor: theme.accent,
      shadowColor: theme.accent,
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 2,
    },
    timelineDotMuted: {
      width: 12,
      height: 12,
      marginTop: 4,
      borderRadius: 6,
      backgroundColor: theme.border,
    },
    timelineCopy: {
      flex: 1,
      paddingBottom: 18,
    },
    timelineTitle: {
      color: theme.text,
      fontSize: 15,
      fontWeight: "900",
      marginBottom: 4,
    },
    timelineText: {
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    timelineLine: {
      width: 2,
      height: 24,
      marginLeft: 5,
      marginVertical: 2,
      backgroundColor: theme.border,
    },
    secondaryAction: {
      height: 52,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
    },
    secondaryActionText: {
      color: theme.text,
      fontSize: 15,
      fontWeight: "900",
    },
    sectionLabel: {
      color: theme.textSecondary,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.5,
      textTransform: "uppercase",
      marginBottom: 10,
    },
    cardInfo: {
       backgroundColor: theme.card,
       borderRadius: 18,
       borderWidth: 1,
       borderColor: theme.border,
       padding: 16,
       paddingBottom: 4,
    },
    saveBtn: {
      height: 54,
      borderRadius: 16,
      backgroundColor: theme.success,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 24,
      flexDirection: "row"
    },
    saveBtnText: {
      color: isDarkMode ? "#0B0E14" : "#FFFFFF",
      fontWeight: "900",
      fontSize: 16,
    },

    // ── My Card: Balance & Frozen States ──
    balanceCard: {
      backgroundColor: theme.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 20,
      marginBottom: 16,
      alignItems: "center",
    },
    balanceMeta: {
      color: theme.textMuted,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.4,
      marginBottom: 8,
    },
    balanceAmount: {
      color: theme.text,
      fontSize: 38,
      fontWeight: "900",
      letterSpacing: -0.5,
      marginBottom: 4,
    },
    frozenPill: {
      marginTop: 10,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: isDarkMode ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.10)",
      borderWidth: 1,
      borderColor: isDarkMode ? "rgba(239,68,68,0.25)" : "rgba(239,68,68,0.20)",
    },
    frozenPillText: {
      color: "#EF4444",
      fontSize: 12,
      fontWeight: "800",
      textAlign: "center",
    },
    frozenBanner: {
      backgroundColor: isDarkMode ? "rgba(239,68,68,0.10)" : "rgba(239,68,68,0.07)",
      borderRadius: 22,
      borderWidth: 1,
      borderColor: isDarkMode ? "rgba(239,68,68,0.22)" : "rgba(239,68,68,0.18)",
      padding: 18,
      marginBottom: 18,
    },
    frozenBannerTitle: {
      color: "#EF4444",
      fontSize: 16,
      fontWeight: "900",
      marginBottom: 8,
    },
    frozenBannerText: {
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 19,
    },
    lostCardBtn: {
      height: 50,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      marginTop: 12,
      borderWidth: 1.5,
      borderColor: isDarkMode ? "rgba(239,68,68,0.30)" : "rgba(239,68,68,0.25)",
      backgroundColor: isDarkMode ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.06)",
    },
    lostCardBtnText: {
      color: "#EF4444",
      fontSize: 14,
      fontWeight: "900",
    },
  });
