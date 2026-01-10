import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export default function BottomNav({ navigation, active = "Home" }) {
  const go = (screen) => navigation.navigate(screen);

  return (
    <View style={styles.bottomNav}>
      <NavItem
        label="Home"
        active={active === "Home"}
        onPress={() => go("Home")}
      />
      <NavItem
        label="Wallet"
        active={active === "Wallet"}
        onPress={() => go("Balance")}
      />

      <TouchableOpacity style={styles.fab} onPress={() => go("OperatorScan")}>
        <Text style={styles.fabText}>SCAN</Text>
      </TouchableOpacity>

      <NavItem
        label="Alerts"
        active={active === "Alerts"}
        onPress={() => go("Notifications")}
      />
      <NavItem
        label="Guardian"
        active={active === "Guardian"}
        onPress={() => go("GuardianLink")}
      />
    </View>
  );
}

function NavItem({ label, active, onPress }) {
  return (
    <TouchableOpacity style={styles.navItem} onPress={onPress} activeOpacity={0.9}>
      <Text style={[styles.navText, active && styles.navTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 78,
    paddingHorizontal: 18,
    paddingBottom: 12,
    paddingTop: 10,
    backgroundColor: "rgba(11,14,20,0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navItem: { width: 70, alignItems: "center" },
  navText: { color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: "800" },
  navTextActive: { color: "#FFD36A" },

  fab: {
    width: 76,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#FFD36A",
    alignItems: "center",
    justifyContent: "center",
  },
  fabText: { fontWeight: "900", color: "#0B0E14" },
});
