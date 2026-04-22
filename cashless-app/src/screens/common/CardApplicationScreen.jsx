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
  ActivityIndicator
} from "react-native";

import { useTheme } from "../../context/ThemeContext";
import { supabase } from "../../api/supabase";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
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

export default function CardApplicationScreen({ navigation, route }) {
  const { theme, isDarkMode } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDarkMode), [theme, isDarkMode]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [profile, setProfile] = useState(route?.params?.profile || null);
  const [branch, setBranch] = useState("");
  const [branchModal, setBranchModal] = useState(false);

  async function loadProfile() {
    setLoading(true);
    try {
      if (route?.params?.profile) {
        setProfile(route.params.profile);
        return;
      }

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
    if (!branch) {
      return Alert.alert("Missing Branch", "Please select a branch to pick up your card.");
    }
    if (hasMissingRequiredProfileData()) {
      return Alert.alert(
        "Incomplete Personal Details",
        "Please complete your profile details first before opening a card account.",
        [
          { text: "Not now", style: "cancel" },
          {
            text: "Complete Profile",
            onPress: () =>
              navigation.navigate("PersonalInfo", {
                editMode: true,
                profile,
              }),
          },
        ]
      );
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

      Alert.alert("Application Successful", "Your NFC Card application has been submitted. Please wait for SMS confirmation for pickup at " + branch, [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert("Submission Failed", error.message);
    } finally {
      setSubmitting(false);
    }
  }

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

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Open Card Account</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.subtitle}>
          Your details are automatically filled in. Select a branch below for card pickup to activate your account for a physical NFC card.
        </Text>

        {/* ── PERSONAL DETAILS ── */}
        <Text style={styles.sectionLabel}>Personal Details</Text>
        <View style={styles.cardInfo}>
            <Field label="Full Name" value={profile?.full_name || ""} theme={theme} />
            <Field label="Phone Number" value={profile?.phone || ""} theme={theme} />
            <Field label="Email Address" value={profile?.email || ""} theme={theme} />
            <Field label="Birthdate" value={profile?.birthdate || ""} theme={theme} />
        </View>

        {/* ── ADDRESS SECTION ── */}
        <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Delivery / Pick-Up Address</Text>
        <View style={styles.cardInfo}>
            <Field label="Province" value={profile?.province || ""} theme={theme} />
            <Field label="City" value={profile?.city || ""} theme={theme} />
            <Field label="Barangay" value={profile?.barangay || ""} theme={theme} />
            <Field label="Address Line" value={profile?.address_line || ""} theme={theme} />
        </View>

        {/* ── BRANCH SELECTION ── */}
        <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Choose Branch</Text>
        <SelectField
          label="Preferred Branch *"
          value={branch}
          placeholder="Select branch for pickup"
          onPress={() => setBranchModal(true)}
          theme={theme}
        />

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.saveBtn, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
             <ActivityIndicator size="small" color={isDarkMode ? "#0B0E14" : "#FFFFFF"} />
          ) : (
             <Text style={styles.saveBtnText}>Submit Application</Text>
          )}
        </TouchableOpacity>

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
  });
