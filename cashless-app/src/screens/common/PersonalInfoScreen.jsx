import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Alert,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  StyleSheet,
  TextInput,
  SafeAreaView,
  StatusBar,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { supabase } from "../../api/supabase";
import { useTheme } from "../../context/ThemeContext";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";

// ------- Sample address data -------
const ADDRESS_DATA = [
  {
    province: "Bukidnon",
    cities: [
      { city: "Malaybalay City", barangays: ["Aglayan", "Bangcud", "Busdi"] },
      { city: "Valencia City", barangays: ["Bagontaas", "Batangan", "Poblacion"] },
    ],
  },
  {
    province: "Misamis Oriental",
    cities: [
      { city: "Cagayan de Oro", barangays: ["Carmen", "Lapasan", "Nazareth"] },
      { city: "Gingoog", barangays: ["Agay-ayan", "Anakan", "Poblacion"] },
    ],
  },
  {
    province: "Cebu",
    cities: [
      { city: "Cebu City", barangays: ["Lahug", "Mabolo", "Guadalupe"] },
      { city: "Mandaue", barangays: ["Alang-alang", "Bakilid", "Centro"] },
    ],
  },
];

function toISODateOnly(dateObj) {
  if (!dateObj) return "";
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatNiceDate(dateObj) {
  if (!dateObj) return "";
  try {
    return dateObj.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return toISODateOnly(dateObj);
  }
}

function getPhoneFromUserOrSession(user, sessionUser) {
  return user?.phone || sessionUser?.phone || "";
}

// ------- Themed Picker Modal -------
function PickerModal({ visible, title, value, items, onChange, onClose, placeholder = "Select", theme }) {
  const s = useMemo(() => pickerModalStyles(theme), [theme]);
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
              {items.map((it) => (
                <Picker.Item key={it.value} label={it.label} value={it.value} color={theme.text} />
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

// ------- Themed Text Input Field -------
function Field({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize, theme }) {
  const s = useMemo(() => fieldStyles(theme), [theme]);
  return (
    <View style={s.wrap}>
      {!!label && <Text style={s.label}>{label}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? "none"}
        style={s.input}
      />
    </View>
  );
}

// ------- Themed Select Field (Touchable dropdown) -------
function SelectField({ label, value, placeholder, onPress, disabled, theme }) {
  const s = useMemo(() => fieldStyles(theme), [theme]);
  return (
    <View style={[s.wrap, disabled && { opacity: 0.5 }]}>
      {!!label && <Text style={s.label}>{label}</Text>}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        disabled={disabled}
        style={s.selectInput}
      >
        <Text style={[s.selectText, !value && s.selectPlaceholder]}>
          {value || placeholder}
        </Text>
        <Text style={s.chevron}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function PersonalInfoScreen({ navigation, route }) {
  const { theme, isDarkMode } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDarkMode), [theme, isDarkMode]);

  const editMode = route?.params?.editMode === true;
  const existingProfile = route?.params?.profile || null;

  const nameParts = (existingProfile?.full_name || "").split(" ").filter(Boolean);
  const initFirst = editMode ? (existingProfile?.first_name || nameParts[0] || "") : "";
  const initMiddle = editMode ? (existingProfile?.middle_name || (nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : "")) : "";
  const initLast = editMode ? (existingProfile?.last_name || nameParts[nameParts.length - 1] || "") : "";

  const [firstName, setFirstName] = useState(initFirst);
  const [middleName, setMiddleName] = useState(initMiddle);
  const [lastName, setLastName] = useState(initLast);

  const initBirthdate = editMode && existingProfile?.birthdate
    ? new Date(existingProfile.birthdate + "T00:00:00")
    : null;
  const [birthdateObj, setBirthdateObj] = useState(initBirthdate);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [email, setEmail] = useState(editMode ? (existingProfile?.email || "") : "");

  const [province, setProvince] = useState(editMode ? (existingProfile?.province || "") : "");
  const [city, setCity] = useState(editMode ? (existingProfile?.city || "") : "");
  const [barangay, setBarangay] = useState(editMode ? (existingProfile?.barangay || "") : "");
  const [zipCode, setZipCode] = useState(editMode ? (existingProfile?.zip_code || "") : "");
  const [addressLine, setAddressLine] = useState(editMode ? (existingProfile?.address_line || "") : "");

  const [loading, setLoading] = useState(false);
  const [provinceModal, setProvinceModal] = useState(false);
  const [cityModal, setCityModal] = useState(false);
  const [barangayModal, setBarangayModal] = useState(false);

  const fullName = useMemo(() => {
    return [firstName, middleName, lastName].map((s) => s.trim()).filter(Boolean).join(" ");
  }, [firstName, middleName, lastName]);

  const provinceOptions = useMemo(() => ADDRESS_DATA.map((p) => ({ label: p.province, value: p.province })), []);
  const cityOptions = useMemo(() => {
    const p = ADDRESS_DATA.find((x) => x.province === province);
    return p ? p.cities.map((c) => ({ label: c.city, value: c.city })) : [];
  }, [province]);
  const barangayOptions = useMemo(() => {
    const p = ADDRESS_DATA.find((x) => x.province === province);
    const c = p?.cities.find((x) => x.city === city);
    return c ? c.barangays.map((b) => ({ label: b, value: b })) : [];
  }, [province, city]);

  function validate() {
    if (!firstName.trim()) return "First name is required";
    if (!lastName.trim()) return "Last name is required";
    if (!birthdateObj) return "Birthdate is required";
    if (!province.trim()) return "Province is required";
    if (!city.trim()) return "City/Municipality is required";
    if (!barangay.trim()) return "Barangay is required";
    if (!addressLine.trim()) return "Address line is required";
    const em = email.trim();
    if (em && !/^\S+@\S+\.\S+$/.test(em)) return "Email is invalid (or leave it blank)";
    return null;
  }

  async function onContinue() {
    const msg = validate();
    if (msg) return Alert.alert("Missing info", msg);

    if (editMode) {
      setLoading(true);
      try {
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;

        const userId = authData?.user?.id;
        if (!userId) throw new Error("Not logged in.");

        const profilePayload = {
          id: userId,
          first_name: firstName.trim(),
          middle_name: middleName.trim() || null,
          last_name: lastName.trim(),
          full_name: fullName || null,
          birthdate: toISODateOnly(birthdateObj),
          email: email.trim() || null,
          province: province.trim(),
          city: city.trim(),
          barangay: barangay.trim(),
          zip_code: zipCode.trim() || null,
          address_line: addressLine.trim(),
        };

        const { error: profileErr } = await supabase.from("profiles").upsert(profilePayload);
        if (profileErr) throw profileErr;

        Alert.alert("Success", "Profile updated successfully!", [
          { text: "OK", onPress: () => navigation.goBack() }
        ]);
      } catch (e) {
        Alert.alert("Error", e.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Signup mode: just pass data to MPINSetup
    const registrationData = {
      ...route.params, // contains role, phone, registration_code
      first_name: firstName.trim(),
      middle_name: middleName.trim() || null,
      last_name: lastName.trim(),
      full_name: fullName || null,
      birthdate: toISODateOnly(birthdateObj),
      email: email.trim() || null,
      province: province.trim(),
      city: city.trim(),
      barangay: barangay.trim(),
      zip_code: zipCode.trim() || null,
      address_line: addressLine.trim(),
    };

    navigation.replace("MPINSetup", { registrationData });
  }

  const onPickProvince = (v) => { setProvince(v); setCity(""); setBarangay(""); };
  const onPickCity = (v) => { setCity(v); setBarangay(""); };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={styles.header}>
        {editMode ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color={theme.text} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}
        <Text style={styles.headerTitle}>
          {editMode ? "Edit Profile" : "Personal Info"}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.subtitle}>
          {editMode ? "Update your details below" : "Fill in your details to continue"}
        </Text>

        {/* ── NAME SECTION ── */}
        <Text style={styles.sectionLabel}>Full Name</Text>
        <View style={styles.card}>
          <Field label="First Name *" value={firstName} onChangeText={setFirstName} placeholder="First name" autoCapitalize="words" theme={theme} />
          <View style={styles.divider} />
          <Field label="Middle Name" value={middleName} onChangeText={setMiddleName} placeholder="Middle name (optional)" autoCapitalize="words" theme={theme} />
          <View style={styles.divider} />
          <Field label="Last Name *" value={lastName} onChangeText={setLastName} placeholder="Last name" autoCapitalize="words" theme={theme} />
        </View>

        {/* ── PERSONAL DETAILS ── */}
        <Text style={styles.sectionLabel}>Personal Details</Text>
        <View style={styles.card}>
          {/* Birthdate */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Birthdate *</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowDatePicker(true)}
              style={styles.selectInputInCard}
            >
              <Text style={[styles.selectText, !birthdateObj && styles.selectPlaceholder]}>
                {birthdateObj ? formatNiceDate(birthdateObj) : "Select birthdate"}
              </Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
          <Field label="Email (optional)" value={email} onChangeText={setEmail} placeholder="name@gmail.com" keyboardType="email-address" theme={theme} />
        </View>

        {/* ── ADDRESS SECTION ── */}
        <Text style={styles.sectionLabel}>Address</Text>
        <View style={styles.card}>
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Province *</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setProvinceModal(true)}
              style={styles.selectInputInCard}
            >
              <Text style={[styles.selectText, !province && styles.selectPlaceholder]}>
                {province || "Select province"}
              </Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
          <View style={[styles.fieldWrap, !province && { opacity: 0.5 }]}>
            <Text style={styles.fieldLabel}>City/Municipality *</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                if (!province) return Alert.alert("Select province first", "Please select a province first.");
                setCityModal(true);
              }}
              style={styles.selectInputInCard}
            >
              <Text style={[styles.selectText, !city && styles.selectPlaceholder]}>
                {city || "Select city/municipality"}
              </Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
          <View style={[styles.fieldWrap, (!province || !city) && { opacity: 0.5 }]}>
            <Text style={styles.fieldLabel}>Barangay *</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                if (!province || !city) return Alert.alert("Select location first", "Please select province and city first.");
                setBarangayModal(true);
              }}
              style={styles.selectInputInCard}
            >
              <Text style={[styles.selectText, !barangay && styles.selectPlaceholder]}>
                {barangay || "Select barangay"}
              </Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
          <Field label="ZIP Code" value={zipCode} onChangeText={setZipCode} placeholder="e.g. 8709" keyboardType="numeric" theme={theme} />
          <View style={styles.divider} />
          <Field label="House No. + Street Address *" value={addressLine} onChangeText={setAddressLine} placeholder="e.g. P6 Lower Sugod" autoCapitalize="words" theme={theme} />
        </View>

        {/* Full name preview */}
        {!!fullName && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>Full Name: {fullName}</Text>
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, loading && { opacity: 0.6 }]}
          onPress={onContinue}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>
            {loading ? "Saving..." : editMode ? "Save Changes" : "Continue"}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── DATE PICKER ── */}
      {showDatePicker && Platform.OS === "android" && (
        <DateTimePicker
          value={birthdateObj || new Date(2000, 0, 1)}
          mode="date"
          display="calendar"
          maximumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (event.type !== "dismissed" && selectedDate) setBirthdateObj(selectedDate);
          }}
        />
      )}

      {Platform.OS === "ios" && (
        <Modal visible={showDatePicker} transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Select Birthdate</Text>
              <DateTimePicker
                value={birthdateObj || new Date(2000, 0, 1)}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={(event, selectedDate) => { if (selectedDate) setBirthdateObj(selectedDate); }}
                themeVariant={isDarkMode ? "dark" : "light"}
              />
              <TouchableOpacity style={styles.modalDoneBtn} onPress={() => setShowDatePicker(false)} activeOpacity={0.9}>
                <Text style={styles.modalDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* ── PICKER MODALS ── */}
      <PickerModal visible={provinceModal} title="Select Province" value={province} items={provinceOptions} onChange={onPickProvince} onClose={() => setProvinceModal(false)} placeholder="Choose province" theme={theme} />
      <PickerModal visible={cityModal} title="Select City/Municipality" value={city} items={cityOptions} onChange={onPickCity} onClose={() => setCityModal(false)} placeholder={province ? "Choose city" : "Select province first"} theme={theme} />
      <PickerModal visible={barangayModal} title="Select Barangay" value={barangay} items={barangayOptions} onChange={(v) => setBarangay(v)} onClose={() => setBarangayModal(false)} placeholder={city ? "Choose barangay" : "Select city first"} theme={theme} />
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
    },
    sectionLabel: {
      color: theme.textSecondary,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.5,
      textTransform: "uppercase",
      marginBottom: 10,
    },

    // Card container for grouped fields
    card: {
      backgroundColor: theme.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 24,
      overflow: "hidden",
    },
    divider: {
      height: 1,
      backgroundColor: theme.border,
    },
    fieldWrap: {
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    fieldLabel: {
      color: theme.textSecondary,
      fontSize: 12,
      fontWeight: "700",
      marginBottom: 6,
      letterSpacing: 0.2,
    },
    selectInputInCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    selectText: {
      color: theme.text,
      fontSize: 15,
      fontWeight: "700",
      flex: 1,
    },
    selectPlaceholder: {
      color: theme.textMuted,
      fontWeight: "500",
    },
    chevron: {
      color: theme.textMuted,
      fontSize: 22,
      marginLeft: 8,
    },

    // Full name preview box
    infoBox: {
      marginBottom: 20,
      padding: 14,
      borderRadius: 14,
      backgroundColor: isDarkMode ? "rgba(124,255,155,0.07)" : "rgba(76,175,80,0.07)",
      borderWidth: 1,
      borderColor: isDarkMode ? "rgba(124,255,155,0.2)" : "rgba(76,175,80,0.2)",
    },
    infoText: {
      color: theme.success,
      fontSize: 14,
      fontWeight: "700",
    },

    // Save button
    saveBtn: {
      height: 54,
      borderRadius: 16,
      backgroundColor: theme.success,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
    },
    saveBtnText: {
      color: isDarkMode ? "#0B0E14" : "#FFFFFF",
      fontWeight: "900",
      fontSize: 16,
    },

    // Modal (date picker + pickers)
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "center",
      padding: 20,
    },
    modalCard: {
      backgroundColor: theme.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
    },
    modalTitle: {
      color: theme.text,
      fontWeight: "900",
      fontSize: 16,
      marginBottom: 10,
    },
    modalDoneBtn: {
      marginTop: 14,
      backgroundColor: theme.success,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
    },
    modalDoneText: {
      color: isDarkMode ? "#0B0E14" : "#FFFFFF",
      fontWeight: "900",
      fontSize: 15,
    },
  });

// Field styles (theme-aware)
const fieldStyles = (theme) =>
  StyleSheet.create({
    wrap: {
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    label: {
      color: theme.textSecondary,
      fontSize: 12,
      fontWeight: "700",
      marginBottom: 6,
      letterSpacing: 0.2,
    },
    input: {
      color: theme.text,
      fontSize: 15,
      fontWeight: "700",
      paddingVertical: 0,
    },
    selectInput: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    selectText: {
      color: theme.text,
      fontSize: 15,
      fontWeight: "700",
      flex: 1,
    },
    selectPlaceholder: {
      color: theme.textMuted,
      fontWeight: "500",
    },
  });

// Picker modal styles (theme-aware)
const pickerModalStyles = (theme) =>
  StyleSheet.create({
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
  });
