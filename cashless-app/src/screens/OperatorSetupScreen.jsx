import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { listVehicles } from "../api/vehiclesApi";

const KEY = "operator_selected_vehicle";

export default function OperatorSetupScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const saved = await AsyncStorage.getItem(KEY);
      if (saved) setSelectedId(JSON.parse(saved)?.id || null);

      const v = await listVehicles();
      setItems(v);
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = navigation?.addListener?.("focus", load);
    load();
    return unsub;
  }, []);

  const choose = async (vehicle) => {
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(vehicle));
      setSelectedId(vehicle.id);
      Alert.alert("Selected ✅", `${vehicle.plate_no} • ${vehicle.route_name || "No route"}`);
      navigation.navigate("OperatorScan");
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Operator Setup</Text>
        <Text style={styles.sub}>Select the vehicle you are operating today.</Text>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.dim}>Loading vehicles...</Text>
          </View>
        ) : (
          <View style={{ marginTop: 12, gap: 10 }}>
            {items.map((v) => (
              <TouchableOpacity
                key={v.id}
                style={[
                  styles.card,
                  selectedId === v.id && styles.cardActive,
                ]}
                onPress={() => choose(v)}
                activeOpacity={0.9}
              >
                <View>
                  <Text style={styles.cardTitle}>{v.plate_no}</Text>
                  <Text style={styles.cardSub}>
                    Route: {v.route_name || "—"}
                  </Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.ghostBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.9}
        >
          <Text style={styles.ghostText}>Back</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0E14" },
  content: { padding: 18, paddingTop: 60 },
  title: { color: "#fff", fontSize: 26, fontWeight: "900" },
  sub: { marginTop: 8, color: "rgba(255,255,255,0.65)" },

  center: { alignItems: "center", paddingVertical: 30 },
  dim: { marginTop: 10, color: "rgba(255,255,255,0.6)" },

  card: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardActive: {
    borderColor: "rgba(255, 211, 106, 0.65)",
    backgroundColor: "rgba(255, 211, 106, 0.10)",
  },
  cardTitle: { color: "#fff", fontSize: 16, fontWeight: "900" },
  cardSub: { marginTop: 6, color: "rgba(255,255,255,0.65)" },
  arrow: { color: "rgba(255,255,255,0.7)", fontSize: 26 },

  ghostBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  ghostText: { color: "rgba(255,255,255,0.85)", fontWeight: "900", fontSize: 15 },
});
