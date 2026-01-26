import React from "react";
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, StyleSheet } from "react-native";

export default function ReviewInfoScreen({ route, navigation }) {
  const p = route.params?.profile;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Review your information</Text>
        <Text style={styles.subtitle}>
          Make sure details match your ID, otherwise your application may not be approved.
        </Text>

        <Block title="Personal">
          <Row k="Full Name" v={p?.full_name} />
          <Row k="Birthdate" v={p?.birthdate} />
          <Row k="Email" v={p?.email || "-"} />
        </Block>

        <Block title="Address">
          <Row k="Province" v={p?.province} />
          <Row k="City" v={p?.city} />
          <Row k="Barangay" v={p?.barangay} />
          <Row k="ZIP" v={p?.zip_code || "-"} />
          <Row k="Address" v={p?.address_line} />
        </Block>

        <TouchableOpacity onPress={() => navigation.navigate("MPINSetup")} style={styles.btn} activeOpacity={0.9}>
          <Text style={styles.btnText}>Confirm</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>Press back to edit your details.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Block({ title, children }) {
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ k, v }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowKey}>{k}</Text>
      <Text style={styles.rowValue}>{v || "-"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0E14" },
  content: { padding: 18, paddingBottom: 40 },
  title: { color: "#fff", fontSize: 26, fontWeight: "900", marginBottom: 8 },
  subtitle: { color: "rgba(255,255,255,0.65)", marginBottom: 20, lineHeight: 20 },
  block: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  blockTitle: { color: "#fff", fontWeight: "900", fontSize: 16, marginBottom: 12 },
  row: { marginBottom: 12 },
  rowKey: { color: "rgba(255,255,255,0.65)", fontSize: 13, marginBottom: 4 },
  rowValue: { color: "#fff", fontWeight: "700", fontSize: 15 },
  btn: {
    marginTop: 20,
    backgroundColor: "#FFD36A",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  btnText: { color: "#0B0E14", fontWeight: "900", fontSize: 16 },
  hint: {
    textAlign: "center",
    marginTop: 16,
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
  },
});
