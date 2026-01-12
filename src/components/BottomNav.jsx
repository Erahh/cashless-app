import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const YELLOW = "#FFD36A";

export default function BottomNav({ navigation, active = "Home", centerRoute = "OperatorScan" }) {
  const go = (route) => {
    if (!navigation) return;
    navigation.navigate(route);
  };

  const tabs = [
    { key: "Home", label: "Home", icon: "home-outline", route: "Home" },
    { key: "Wallet", label: "Wallet", icon: "wallet-outline", route: "Balance" },
    { key: "History", label: "History", icon: "receipt-outline", route: "Transactions" },
    { key: "Profile", label: "Profile", icon: "person-outline", route: "Profile" },
  ];

  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        {/* Left */}
        <TabItem item={tabs[0]} active={active} onPress={() => go(tabs[0].route)} />
        <TabItem item={tabs[1]} active={active} onPress={() => go(tabs[1].route)} />

        {/* Center FAB */}
        <TouchableOpacity activeOpacity={0.9} onPress={() => go(centerRoute)} style={styles.fab}>
          <Ionicons name="add" size={28} color="#0B0E14" />
        </TouchableOpacity>

        {/* Right */}
        <TabItem item={tabs[2]} active={active} onPress={() => go(tabs[2].route)} />
        <TabItem item={tabs[3]} active={active} onPress={() => go(tabs[3].route)} />
      </View>
    </View>
  );
}

function TabItem({ item, active, onPress }) {
  const isActive = active === item.key;
  const color = isActive ? YELLOW : "rgba(255,255,255,0.70)";

  return (
    <TouchableOpacity style={styles.tab} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.iconBox, isActive && styles.iconBoxActive]}>
        <Ionicons name={item.icon} size={18} color={color} />
      </View>
      <Text style={[styles.tabText, isActive && styles.tabTextActive]} numberOfLines={1}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 18 : 12,
  },
  bar: {
    height: 74,
    borderRadius: 24,
    backgroundColor: "rgba(11,14,20,0.96)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
  tab: {
    width: 62,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBoxActive: {
    backgroundColor: "rgba(255, 211, 106, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(255, 211, 106, 0.35)",
  },
  tabText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 10.5,
    fontWeight: "800",
  },
  tabTextActive: { color: YELLOW },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 22,
    backgroundColor: YELLOW,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -26,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.18)",
  },
});
