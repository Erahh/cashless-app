import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from "react-native";
import BottomNav from "../components/BottomNav";

export default function ProfileScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Profile Settings</Text>
          <Text style={styles.cardText}>
            Profile management features will be available here.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("PassengerType")}
        >
          <Text style={styles.buttonText}>Edit Passenger Type</Text>
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>

      <BottomNav navigation={navigation} active="Profile" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0E14" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
  },
  back: { color: "rgba(255,255,255,0.85)", fontWeight: "900", fontSize: 16 },
  title: { color: "#fff", fontSize: 22, fontWeight: "900" },
  content: { padding: 18 },
  card: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 12,
  },
  cardTitle: { color: "#fff", fontSize: 18, fontWeight: "900", marginBottom: 8 },
  cardText: { color: "rgba(255,255,255,0.65)", fontSize: 14 },
  button: {
    backgroundColor: "#FFD36A",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: { color: "#0B0E14", fontWeight: "900", fontSize: 15 },
});
