import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const YELLOW = "#FFD36A";
const BG = "#0B0E14";

export default function BottomNav({
  navigation,
  active = "Home",
  centerRoute = "MyQR",
}) {
  const go = (route) => {
    if (!navigation || !route) return;
    navigation.navigate(route);
  };

  const tabs = [
    { key: "Home", label: "Home", icon: "home-outline", route: "Home" },
    { key: "Wallet", label: "Wallet", icon: "wallet-outline", route: "Balance" },
    { key: "History", label: "History", icon: "receipt-outline", route: "Transactions" },
    { key: "Profile", label: "Profile", icon: "person-outline", route: "Profile" },
  ];

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.bar}>
        {/* Left 2 */}
        <View style={[styles.side, { left: 10 }]}>
          <TabItem item={tabs[0]} active={active} onPress={() => go(tabs[0].route)} />
          <TabItem item={tabs[1]} active={active} onPress={() => go(tabs[1].route)} />
        </View>

        {/* Center Spacer (reserve space for FAB so tabs don't squeeze) */}
        <View style={styles.centerSpace} />

        {/* Right 2 */}
        <View style={[styles.side, { right: 10 }]}>
          <TabItem item={tabs[2]} active={active} onPress={() => go(tabs[2].route)} />
          <TabItem item={tabs[3]} active={active} onPress={() => go(tabs[3].route)} />
        </View>

        {/* Floating FAB */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => go(centerRoute)}
          style={styles.fab}
        >
          <Ionicons name="qr-code-outline" size={24} color={BG} />
        </TouchableOpacity>
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

      <Text
        style={[styles.tabText, isActive && styles.tabTextActive]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
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
    zIndex: 50,
    elevation: 50,
  },

  bar: {
    height: 74,
    borderRadius: 24,
    backgroundColor: "rgba(11,14,20,0.96)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    position: "relative",
  },

  side: {
    position: "absolute",
    top: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
  },

  centerSpace: {
    width: 110, // more space between Wallet and History (around FAB)
    height: 1,
  },

  tab: {
    width: 68, // slightly narrower to fit better
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: -4, // very tight spacing between Home/Wallet and History/Profile
  },

  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },

  iconBoxActive: {
    backgroundColor: "rgba(255, 211, 106, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(255, 211, 106, 0.35)",
  },

  tabText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    fontWeight: "800",
  },
  tabTextActive: { color: YELLOW },

  fab: {
    position: "absolute",
    alignSelf: "center",
    top: -8,
    width: 52,
    height: 52,
    borderRadius: 20,
    backgroundColor: YELLOW,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.18)",
    zIndex: 10,
  },
});
