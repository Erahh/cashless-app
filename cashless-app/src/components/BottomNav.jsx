import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Home01Icon, WalletAdd01Icon, InvoiceIcon, UserIcon, QrCodeIcon } from "@hugeicons/core-free-icons";
import { useTheme } from "../context/ThemeContext";

export default function BottomNav({
  state,
  navigation,
  active = "Home",
  centerRoute = "MyQR",
  tabs = [
    { key: "Home", label: "Home", icon: Home01Icon, route: "Home" },
    { key: "Wallet", label: "Wallet", icon: WalletAdd01Icon, route: "Balance" },
    { key: "History", label: "History", icon: InvoiceIcon, route: "Transactions" },
    { key: "Profile", label: "Profile", icon: UserIcon, route: "Profile" },
  ],
  centerIcon = QrCodeIcon,
  onNavigate
}) {
  const { theme } = useTheme();

  // If used as a custom React Navigation tabBar, use the state to determine active route
  const currentRoute = state ? state.routes[state.index].name : active;

  const go = (route) => {
    if (onNavigate) {
      onNavigate(route);
      return;
    }
    if (!navigation || !route) return;
    navigation.navigate(route);
  };

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={[styles.bar, { backgroundColor: theme.bottomNavBg, borderColor: theme.border }]}>
        {/* Left 2 */}
        <View style={[styles.side, { left: 10 }]}>
          <TabItem item={tabs[0]} active={currentRoute} theme={theme} onPress={() => go(tabs[0].route)} />
          <TabItem item={tabs[1]} active={currentRoute} theme={theme} onPress={() => go(tabs[1].route)} />
        </View>

        {/* Center Spacer (reserve space for FAB so tabs don't squeeze) */}
        <View style={styles.centerSpace} />

        {/* Right 2 */}
        <View style={[styles.side, { right: 10 }]}>
          <TabItem item={tabs[2]} active={currentRoute} theme={theme} onPress={() => go(tabs[2].route)} />
          <TabItem item={tabs[3]} active={currentRoute} theme={theme} onPress={() => go(tabs[3].route)} />
        </View>

        {/* Floating FAB */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => go(centerRoute)}
          style={[styles.fab, { backgroundColor: theme.accent }]}
        >
          <HugeiconsIcon icon={centerIcon} size={24} color={theme.isDark ? '#0B0E14' : '#1A1A1A'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TabItem({ item, active, onPress, theme }) {
  const isActive = active === item.key || active === item.route;

  // Icon and Box colors:
  // Active: Yellow background with dark icon (matches reference image)
  // Inactive: Subtle grey background with muted icon
  const boxBg = isActive ? theme.accent : "rgba(150,150,150,0.1)";
  const iconColor = isActive ? "#0B0E14" : theme.textSecondary;

  // Text color:
  // Active: Darker Yellow/Gold in light mode for readability, Accent in dark mode
  const activeTextColor = theme.isDark ? theme.accent : "#827100";
  const textColor = isActive ? activeTextColor : theme.textMuted;

  return (
    <TouchableOpacity style={styles.tab} onPress={onPress} activeOpacity={0.85}>
      <View style={[
        styles.iconBox,
        {
          backgroundColor: isActive ? "rgba(247, 227, 83, 0.85)" : "rgba(150,150,150,0.1)",
          borderWidth: isActive ? 1 : 0,
          borderColor: isActive ? "rgba(255, 255, 255, 0.4)" : "transparent"
        },
        isActive && { elevation: 8, shadowColor: "#F7E353", shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } }
      ]}>
        <HugeiconsIcon icon={isActive ? item.icon : item.icon} size={20} color={iconColor} strokeWidth={isActive ? 2 : 1.5} />
      </View>

      <Text
        style={[styles.tabText, { color: textColor }]}
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
    borderWidth: 1,
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
    width: 50,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },

  tabText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  fab: {
    position: "absolute",
    alignSelf: "center",
    top: -8,
    width: 52,
    height: 52,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.18)",
    zIndex: 10,
  },
});
