import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../api/supabase";

export default function PersonalInfoScreen({ navigation }) {
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthdate, setBirthdate] = useState(""); // YYYY-MM-DD
  const [email, setEmail] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [barangay, setBarangay] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [loading, setLoading] = useState(false);

  const fullName = useMemo(() => {
    return [firstName, middleName, lastName].map((s) => s.trim()).filter(Boolean).join(" ");
  }, [firstName, middleName, lastName]);

  function validate() {
    if (!firstName.trim()) return "First name is required";
    if (!lastName.trim()) return "Last name is required";
    if (!birthdate.trim()) return "Birthdate is required (YYYY-MM-DD)";
    if (!province.trim()) return "Province is required";
    if (!city.trim()) return "City is required";
    if (!barangay.trim()) return "Barangay is required";
    if (!addressLine.trim()) return "Address line is required";
    return null;
  }

  async function onContinue() {
    const msg = validate();
    if (msg) return Alert.alert("Missing info", msg);

    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) throw new Error("Not logged in");

      // Get phone number from auth user (Supabase stores it in user.phone)
      let phone = auth?.user?.phone;
      
      // If not found in user object, try getting from session
      if (!phone) {
        const { data: sessionData } = await supabase.auth.getSession();
        phone = sessionData?.session?.user?.phone;
      }

      if (!phone) {
        throw new Error("Phone number not found. Please login again.");
      }

      const payload = {
        id: userId, // profiles.id = auth user id
        phone: phone, // Required field in profiles table
        first_name: firstName.trim(),
        middle_name: middleName.trim() || null,
        last_name: lastName.trim(),
        full_name: fullName,
        birthdate: birthdate.trim(), // date in DB
        email: email.trim() || null,
        province: province.trim(),
        city: city.trim(),
        barangay: barangay.trim(),
        zip_code: zipCode.trim() || null,
        address_line: addressLine.trim(),
      };

      // Use upsert so it works even if profiles row already exists
      const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
      if (error) throw error;

      navigation.navigate("ReviewInfo", { profile: payload });
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Personal Information</Text>
        <Text style={styles.subtitle}>Fill in your details to continue</Text>

        <Text style={styles.label}>First Name *</Text>
        <TextInput
          value={firstName}
          onChangeText={setFirstName}
          placeholder="First name"
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={styles.input}
        />

        <Text style={styles.label}>Middle Name</Text>
        <TextInput
          value={middleName}
          onChangeText={setMiddleName}
          placeholder="Middle name"
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={styles.input}
        />

        <Text style={styles.label}>Last Name *</Text>
        <TextInput
          value={lastName}
          onChangeText={setLastName}
          placeholder="Last name"
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={styles.input}
        />

        <Text style={styles.label}>Birthdate * (YYYY-MM-DD)</Text>
        <TextInput
          value={birthdate}
          onChangeText={setBirthdate}
          placeholder="2004-01-02"
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={styles.input}
        />

        <Text style={styles.label}>Email (optional)</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="name@gmail.com"
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.sectionTitle}>Address</Text>

        <Text style={styles.label}>Province *</Text>
        <TextInput
          value={province}
          onChangeText={setProvince}
          placeholder="Province"
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={styles.input}
        />

        <Text style={styles.label}>City/Municipality *</Text>
        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder="City"
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={styles.input}
        />

        <Text style={styles.label}>Barangay *</Text>
        <TextInput
          value={barangay}
          onChangeText={setBarangay}
          placeholder="Barangay"
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={styles.input}
        />

        <Text style={styles.label}>ZIP Code</Text>
        <TextInput
          value={zipCode}
          onChangeText={setZipCode}
          placeholder="8709"
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={styles.input}
          keyboardType="numeric"
        />

        <Text style={styles.label}>House No. + Street Address *</Text>
        <TextInput
          value={addressLine}
          onChangeText={setAddressLine}
          placeholder="p6 lower Sugod"
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={styles.input}
        />

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>Full Name (auto): {fullName || "-"}</Text>
        </View>

        <TouchableOpacity
          disabled={loading}
          onPress={onContinue}
          style={[styles.btn, loading && { opacity: 0.6 }]}
          activeOpacity={0.9}
        >
          {loading ? (
            <ActivityIndicator color="#0B0E14" />
          ) : (
            <Text style={styles.btnText}>Continue</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
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
