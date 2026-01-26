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
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { supabase } from "../api/supabase";

// New UI Components
import AuthBackground from "../components/AuthBackground";
import GlassInput from "../components/GlassInput";
import { GoldButton } from "../components/AuthButtons";

/**
 * ✅ What this version gives you:
 * - Birthdate DATE PICKER (no typing YYYY-MM-DD)
 * - Province + City/Municipality + Barangay PICKERS (cascading)
 * - Keeps your dark UI style
 * - Saves birthdate as "YYYY-MM-DD" to Supabase
 *
 * 📦 Install:
 *   npm i @react-native-community/datetimepicker @react-native-picker/picker
 */

// ------- Sample address data (replace with your real PH dataset) -------
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
  // friendly display (e.g., Jan 2, 2004)
  try {
    return dateObj.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return toISODateOnly(dateObj);
  }
}

function clampMaxDate(d) {
  // optional: users must be at least 5 years old? (remove if you want)
  return d;
}

function getPhoneFromUserOrSession(user, sessionUser) {
  return user?.phone || sessionUser?.phone || "";
}

// ------- Reusable Picker Modal -------
function PickerModal({
  visible,
  title,
  value,
  items,
  onChange,
  onClose,
  placeholder = "Select",
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={pmStyles.backdrop}>
        <View style={pmStyles.card}>
          <Text style={pmStyles.title}>{title}</Text>

          <View style={pmStyles.pickerWrap}>
            <Picker
              selectedValue={value}
              onValueChange={(v) => onChange(v)}
              dropdownIconColor="#fff"
              style={pmStyles.picker}
            >
              <Picker.Item label={placeholder} value="" />
              {items.map((it) => (
                <Picker.Item key={it.value} label={it.label} value={it.value} />
              ))}
            </Picker>
          </View>

          <TouchableOpacity style={pmStyles.doneBtn} onPress={onClose} activeOpacity={0.9}>
            <Text style={pmStyles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function PersonalInfoScreen({ navigation }) {
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");

  // ✅ Date picker state (store Date object)
  const [birthdateObj, setBirthdateObj] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [email, setEmail] = useState("");

  // ✅ Pickers (cascading)
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [barangay, setBarangay] = useState("");

  const [zipCode, setZipCode] = useState("");
  const [addressLine, setAddressLine] = useState("");

  const [loading, setLoading] = useState(false);

  // Picker modals
  const [provinceModal, setProvinceModal] = useState(false);
  const [cityModal, setCityModal] = useState(false);
  const [barangayModal, setBarangayModal] = useState(false);

  const fullName = useMemo(() => {
    return [firstName, middleName, lastName]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" ");
  }, [firstName, middleName, lastName]);

  const provinceOptions = useMemo(() => {
    return ADDRESS_DATA.map((p) => ({ label: p.province, value: p.province }));
  }, []);

  const cityOptions = useMemo(() => {
    const p = ADDRESS_DATA.find((x) => x.province === province);
    if (!p) return [];
    return p.cities.map((c) => ({ label: c.city, value: c.city }));
  }, [province]);

  const barangayOptions = useMemo(() => {
    const p = ADDRESS_DATA.find((x) => x.province === province);
    const c = p?.cities.find((x) => x.city === city);
    if (!c) return [];
    return c.barangays.map((b) => ({ label: b, value: b }));
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

    setLoading(true);
    try {
      // 1) Get authenticated user
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;

      const user = authData?.user;
      const userId = user?.id;
      if (!userId) throw new Error("Not logged in. Please login again.");

      // 2) Get phone number
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      const phone = getPhoneFromUserOrSession(user, sessionData?.session?.user);
      if (!phone) throw new Error("Phone number not found. Please login again.");

      // 3) Build profile payload
      const profilePayload = {
        id: userId,
        phone: phone.trim(),
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

      // 4) Upsert profile
      const { error: profileErr } = await supabase
        .from("profiles")
        .upsert(profilePayload, { onConflict: "id" });

      if (profileErr) throw profileErr;

      // 5) Ensure commuter_accounts exists (inactive until MPIN setup)
      const { data: acct, error: acctReadErr } = await supabase
        .from("commuter_accounts")
        .select("commuter_id, account_active")
        .eq("commuter_id", userId)
        .maybeSingle();

      if (acctReadErr) throw acctReadErr;

      if (!acct) {
        const { error: acctCreateErr } = await supabase.from("commuter_accounts").insert({
          commuter_id: userId,
          account_active: false,
          pin_set: false,
          passenger_type: "casual",
          verification_status: "unverified",
        });

        if (acctCreateErr) throw acctCreateErr;
      }

      // 6) Navigate to MPINSetup to complete registration
      // Note: Wallet is created by backend when MPIN is set
      navigation.replace("MPINSetup", { profile: profilePayload });
    } catch (e) {
      console.error("Registration error:", e);
      Alert.alert("Error", e?.message || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  }

  const onPickProvince = (v) => {
    setProvince(v);
    // reset dependent fields
    setCity("");
    setBarangay("");
  };

  const onPickCity = (v) => {
    setCity(v);
    setBarangay("");
  };

  const onPickBarangay = (v) => setBarangay(v);

  const renderBirthdateInput = () => {
    const display = birthdateObj ? formatNiceDate(birthdateObj) : "";
    return (
      <>
        <Text style={styles.label}>Birthdate *</Text>

        {/* Touchable input-style field */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setShowDatePicker(true)}
          style={[styles.input, styles.touchInput]}
        >
          <Text style={[styles.touchValue, !display && styles.touchPlaceholder]}>
            {display || "Select birthdate"}
          </Text>
        </TouchableOpacity>

        {/* Android inline picker */}
        {showDatePicker && Platform.OS === "android" && (
          <DateTimePicker
            value={birthdateObj || new Date(2000, 0, 1)}
            mode="date"
            display="calendar"
            maximumDate={clampMaxDate(new Date())}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (event.type === "dismissed") return;
              if (selectedDate) setBirthdateObj(selectedDate);
            }}
          />
        )}

        {/* iOS modal picker */}
        {Platform.OS === "ios" && (
          <Modal
            visible={showDatePicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View style={dpStyles.backdrop}>
              <View style={dpStyles.card}>
                <Text style={dpStyles.title}>Select birthdate</Text>

                <DateTimePicker
                  value={birthdateObj || new Date(2000, 0, 1)}
                  mode="date"
                  display="spinner"
                  maximumDate={clampMaxDate(new Date())}
                  onChange={(event, selectedDate) => {
                    if (selectedDate) setBirthdateObj(selectedDate);
                  }}
                />

                <TouchableOpacity
                  style={dpStyles.doneBtn}
                  onPress={() => setShowDatePicker(false)}
                  activeOpacity={0.9}
                >
                  <Text style={dpStyles.doneText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}
      </>
    );
  };

  return (
    <AuthBackground>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Personal Information</Text>
        <Text style={styles.subtitle}>Fill in your details to continue</Text>

        <GlassInput
          label="First Name *"
          value={firstName}
          onChangeText={setFirstName}
          placeholder="First name"
        />

        <GlassInput
          label="Middle Name"
          value={middleName}
          onChangeText={setMiddleName}
          placeholder="Middle name"
        />

        <GlassInput
          label="Last Name *"
          value={lastName}
          onChangeText={setLastName}
          placeholder="Last name"
        />

        {/* ✅ Date picker birthdate */}
        {renderBirthdateInput()}

        <GlassInput
          label="Email (optional)"
          value={email}
          onChangeText={setEmail}
          placeholder="name@gmail.com"
          keyboardType="email-address"
        />

        <Text style={styles.sectionTitle}>Address</Text>

        {/* ✅ Province Picker */}
        <Text style={styles.label}>Province *</Text>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setProvinceModal(true)}
          style={[styles.input, styles.touchInput]}
        >
          <Text style={[styles.touchValue, !province && styles.touchPlaceholder]}>
            {province || "Select province"}
          </Text>
        </TouchableOpacity>

        {/* ✅ City Picker */}
        <Text style={styles.label}>City/Municipality *</Text>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            if (!province) return Alert.alert("Select province first", "Please select a province first.");
            setCityModal(true);
          }}
          style={[styles.input, styles.touchInput, !province && { opacity: 0.55 }]}
        >
          <Text style={[styles.touchValue, !city && styles.touchPlaceholder]}>
            {city || "Select city/municipality"}
          </Text>
        </TouchableOpacity>

        {/* ✅ Barangay Picker */}
        <Text style={styles.label}>Barangay *</Text>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            if (!province || !city)
              return Alert.alert("Select location first", "Please select province and city first.");
            setBarangayModal(true);
          }}
          style={[styles.input, styles.touchInput, (!province || !city) && { opacity: 0.55 }]}
        >
          <Text style={[styles.touchValue, !barangay && styles.touchPlaceholder]}>
            {barangay || "Select barangay"}
          </Text>
        </TouchableOpacity>

        <GlassInput
          label="ZIP Code"
          value={zipCode}
          onChangeText={setZipCode}
          placeholder="8709"
          keyboardType="numeric"
        />

        <GlassInput
          label="House No. + Street Address *"
          value={addressLine}
          onChangeText={setAddressLine}
          placeholder="P6 Lower Sugod"
        />

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>Full Name (auto): {fullName || "-"}</Text>
        </View>

        <GoldButton
          label={loading ? "Saving..." : "Continue"}
          onPress={onContinue}
          disabled={loading}
        />
      </ScrollView>

      {/* Picker Modals */}
      <PickerModal
        visible={provinceModal}
        title="Select Province"
        value={province}
        items={provinceOptions}
        onChange={onPickProvince}
        onClose={() => setProvinceModal(false)}
        placeholder="Choose province"
      />

      <PickerModal
        visible={cityModal}
        title="Select City/Municipality"
        value={city}
        items={cityOptions}
        onChange={onPickCity}
        onClose={() => setCityModal(false)}
        placeholder={province ? "Choose city" : "Select province first"}
      />

      <PickerModal
        visible={barangayModal}
        title="Select Barangay"
        value={barangay}
        items={barangayOptions}
        onChange={onPickBarangay}
        onClose={() => setBarangayModal(false)}
        placeholder={city ? "Choose barangay" : "Select city first"}
      />
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0E14" },
  content: { padding: 18, paddingBottom: 40 },
  title: { color: "#fff", fontSize: 26, fontWeight: "900", marginBottom: 8 },
  subtitle: { color: "rgba(255,255,255,0.65)", marginBottom: 20 },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 12,
    marginBottom: 12,
  },
  label: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    color: "#fff",
    fontSize: 15,
    marginBottom: 4,
  },

  // Touchable "input" style
  touchInput: {
    justifyContent: "center",
  },
  touchValue: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  touchPlaceholder: {
    color: "rgba(255,255,255,0.35)",
    fontWeight: "600",
  },

  infoBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  infoText: { color: "rgba(255,255,255,0.65)", fontSize: 13 },
  btn: {
    marginTop: 20,
    backgroundColor: "#FFD36A",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  btnText: { color: "#0B0E14", fontWeight: "900", fontSize: 16 },
});

// Picker modal styles
const pmStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 18,
  },
  card: {
    backgroundColor: "#111623",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 14,
  },
  title: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
    marginBottom: 10,
  },
  pickerWrap: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  picker: {
    color: "#fff",
  },
  doneBtn: {
    marginTop: 12,
    backgroundColor: "#FFD36A",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  doneText: { color: "#0B0E14", fontWeight: "900", fontSize: 15 },
});

// iOS date picker modal styles
const dpStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 18,
  },
  card: {
    backgroundColor: "#111623",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 14,
  },
  title: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
    marginBottom: 10,
  },
  doneBtn: {
    marginTop: 12,
    backgroundColor: "#FFD36A",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  doneText: { color: "#0B0E14", fontWeight: "900", fontSize: 15 },
});
