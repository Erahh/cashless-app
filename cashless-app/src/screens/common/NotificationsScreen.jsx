import React, { useEffect, useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TouchableWithoutFeedback } from "react-native";

import { HugeiconsIcon } from "@hugeicons/react-native";
import { ArrowLeft01Icon, RefreshIcon, ArrowRight01Icon, MoreVerticalCircle01Icon, Notification03Icon } from "@hugeicons/core-free-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { fetchNotifications, deleteNotification, clearNotifications } from "../../api/notificationsApi";
import { useTheme } from "../../context/ThemeContext";

function normalizePayload(payload) {
  const p = payload && typeof payload === "object" ? payload : {};
  return {
    title: String(p.title || "Notification"),
    body: String(p.body || ""),
    type: String(p.type || "system"), // 'transfer', 'payment', 'system'
  };
}

export default function NotificationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0 });
  const [isClearing, setIsClearing] = useState(false);
  const [isFullList, setIsFullList] = useState(false);

  const load = async (limit = 10) => {
    try {
      setLoading(true);
      const data = await fetchNotifications(limit);
      setItems(data);
      setIsFullList(limit > 10);
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = navigation?.addListener?.("focus", () => load(10));
    load(10);
    return unsub;
  }, []);

  const handleSeeAll = () => {
    load(50);
  };

  const handleNotificationClick = (n, p) => {
    // Navigate based on notification type
    const lowerType = String(p.type || "").toLowerCase();
    
    // Security or Account related go to Profile
    if (lowerType.includes("security") || lowerType.includes("account")) {
      navigation.navigate("Profile");
    } else {
      // By default (rides, send, top-up, transfer, payment, etc.), go to Transactions history
      navigation.navigate("Transactions");
    }
  };

  const handleDelete = async (id) => {
    try {
      setMenuVisible(false);
      await deleteNotification(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      Alert.alert("Error", "Could not delete notification");
    }
  };

  const handleClearAll = async () => {
    Alert.alert(
      "Clear All",
      "Are you sure you want to delete all notifications?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              setIsClearing(true);
              await clearNotifications();
              setItems([]);
            } catch (e) {
              Alert.alert("Error", "Could not clear notifications");
            } finally {
              setIsClearing(false);
            }
          }
        }
      ]
    );
  };

  const openMenu = (id, event) => {
    const { pageY } = event.nativeEvent;
    setSelectedId(id);
    setMenuPos({ top: pageY - 20 }); // Position box near the tap
    setMenuVisible(true);
  };

  const getIconInfo = (title = "", type = "") => {
    const isDark = theme?.isDark ?? true;
    const yellowColor = isDark ? "#F7E353" : "#C69C00";

    const lowerTitle = title.toLowerCase();
    const lowerType = type.toLowerCase();

    // 1) Top-Up / Cash-in
    if (lowerTitle.includes("top-up") || lowerTitle.includes("top up") || lowerType === "topup" || lowerTitle.includes("cash")) {
      return { icon: "wallet-plus-outline", color: yellowColor, lib: "MaterialCommunityIcons" };
    }

    // 2) IC Card / RFID / Tap Payments
    if (lowerTitle.includes("rfid") || lowerTitle.includes("ic card") || lowerTitle.includes("card") || lowerTitle.includes("nfc") || lowerTitle.includes("tap")) {
      return { icon: "credit-card-wireless-outline", color: "#a259ff", lib: "MaterialCommunityIcons" };
    }

    // 3) Ride / Travel Related
    if (lowerTitle.includes("ride") || lowerTitle.includes("scanned") || lowerType === "ride" || lowerTitle.includes("fare") || lowerTitle.includes("transit") || lowerTitle.includes("jeep")) {
      return { icon: "bus-clock", color: "#FF9F43", lib: "MaterialCommunityIcons" };
    }

    // 4) Transfers / Send Load
    if (lowerTitle.includes("transfer") || lowerTitle.includes("send") || lowerTitle.includes("load") || lowerTitle.includes("received") || lowerType === "transfer") {
      return { icon: "swap-horizontal-circle-outline", color: "#3B99FF", lib: "MaterialCommunityIcons" };
    }

    // 5) Wallet / General Payments
    if (lowerTitle.includes("payment") || lowerTitle.includes("pay") || lowerType === "payment" || lowerTitle.includes("wallet")) {
      return { icon: "wallet-outline", color: yellowColor, lib: "MaterialCommunityIcons" };
    }

    // 6) Success / Verified / Identity
    if (lowerTitle.includes("verified") || lowerTitle.includes("approved") || lowerTitle.includes("identity") || lowerTitle.includes("success")) {
      return { icon: "check-decagram-outline", color: "#28C76F", lib: "MaterialCommunityIcons" };
    }

    // 7) Account / Profile
    if (lowerTitle.includes("account") || lowerTitle.includes("profile") || lowerTitle.includes("mpin")) {
      return { icon: "account-cog-outline", color: "#A0A0A0", lib: "MaterialCommunityIcons" };
    }

    // 8) Security / Alerts
    if (lowerTitle.includes("security") || lowerTitle.includes("logged") || lowerTitle.includes("device") || lowerTitle.includes("failed") || lowerTitle.includes("declined")) {
      return { icon: "shield-alert-outline", color: "#FF5C5C", lib: "MaterialCommunityIcons" };
    }

    return { icon: "bell-outline", color: "#A0A0A0", lib: "MaterialCommunityIcons" };
  };

  const RenderIcon = ({ name, color, lib }) => {
    // New Style: Outlined circular icons with soft inner background
    return (
      <View style={[styles.iconWrapper, { borderColor: color + '50' }]}>
        <View style={[styles.iconInner, { backgroundColor: color + '15' }]}>
          {lib === "MaterialCommunityIcons" ? (
            <MaterialCommunityIcons name={name} size={20} color={color} />
          ) : (
            <HugeiconsIcon icon={Notification03Icon} size={20} color={color} />
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: theme.card }]}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification</Text>
        <TouchableOpacity onPress={load} style={[styles.headerRefresh, { backgroundColor: theme.card }]}>
          <HugeiconsIcon icon={RefreshIcon} size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        automaticallyAdjustsScrollIndicatorInsets={false}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>News</Text>
          {items.length > 0 && (
            <TouchableOpacity onPress={handleClearAll}>
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading || isClearing ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <HugeiconsIcon icon={Notification03Icon} size={60} color={theme.textMuted} />
            <Text style={styles.emptyText}>Nothing here yet</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((n) => {
              const p = normalizePayload(n.payload);
              const { icon, color, lib } = getIconInfo(p.title, p.type);

              const date = new Date(n.created_at);
              const now = new Date();
              const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
              const displayTime = diffDays === 0 ? "Today" : diffDays === 1 ? "Yesterday" : `${diffDays} days ago`;

              return (
                <TouchableOpacity 
                  key={n.id} 
                  style={styles.notificationItem}
                  activeOpacity={0.7}
                  onPress={() => handleNotificationClick(n, p)}
                >
                  <View style={styles.itemRow}>
                     <RenderIcon name={icon} color={color} lib={lib} />

                    <View style={styles.itemContent}>
                      <Text style={styles.itemTitle}>{p.title}</Text>
                      <Text style={styles.itemBody} numberOfLines={2}>
                        {p.body || "Notification details..."}
                      </Text>
                      <Text style={styles.itemTime}>{displayTime}</Text>
                    </View>

                    <TouchableOpacity onPress={(e) => openMenu(n.id, e)} style={styles.itemMenuBtn}>
                      <HugeiconsIcon icon={MoreVerticalCircle01Icon} size={20} color={theme.textMuted} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}

            {!isFullList && items.length === 10 && (
              <TouchableOpacity style={styles.seeAllBtn} onPress={handleSeeAll}>
                <Text style={styles.seeAllText}>See All Notifications</Text>
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} color={theme.accent} />
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating Popover Menu */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.popoverOverlay}>
            <View style={[styles.popoverMenu, { top: menuPos.top }]}>
              {/* Pointer Arrow */}
              <View style={styles.popoverPointer} />

              <TouchableOpacity style={styles.popoverOption} onPress={() => setMenuVisible(false)}>
                <MaterialCommunityIcons name="eye-check-outline" size={18} color="rgba(255,255,255,0.6)" />
                <Text style={styles.popoverOptionText}>Mark as read</Text>
              </TouchableOpacity>

              <View style={styles.popoverDivider} />

              <TouchableOpacity style={styles.popoverOption} onPress={() => handleDelete(selectedId)}>
                <MaterialCommunityIcons name="trash-can-outline" size={18} color="#FF5C5C" />
                <Text style={[styles.popoverOptionText, { color: "#FF5C5C" }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: theme.text,
    fontSize: 20,
    fontWeight: "700",
  },
  headerRefresh: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  scrollContent: { paddingHorizontal: 20 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 25 },
  sectionTitle: { color: theme.textSecondary, fontSize: 18, fontWeight: "600" },
  clearAllText: { color: theme.danger, fontSize: 13, fontWeight: "600" },

  list: { gap: 10 },

  notificationItem: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  itemRow: { flexDirection: "row", alignItems: "flex-start", gap: 16 },

  iconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  iconInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  itemContent: { flex: 1, gap: 4 },
  itemTitle: { color: theme.text, fontSize: 17, fontWeight: "700" },
  itemBody: { color: theme.textSecondary, fontSize: 14, lineHeight: 20 },
  itemTime: { color: theme.textMuted, fontSize: 12, marginTop: 4 },

  itemMenuBtn: { padding: 4, marginRight: -4 },

  center: { marginTop: 50, alignItems: "center" },
  emptyContainer: { marginTop: 100, alignItems: "center", opacity: 0.5 },
  emptyText: { color: theme.text, marginTop: 10, fontSize: 14 },

  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginTop: 15,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    gap: 8,
  },
  seeAllText: { color: theme.accent, fontSize: 14, fontWeight: "700" },

  popoverOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  popoverMenu: {
    position: "absolute",
    right: 20,
    backgroundColor: theme.isDark ? "rgba(35, 35, 40, 0.98)" : "rgba(255, 255, 255, 0.98)",
    borderRadius: 14,
    width: 170,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 15,
  },
  popoverPointer: {
    position: "absolute",
    top: -8,
    right: 18,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: theme.isDark ? "rgba(35, 35, 40, 0.98)" : "rgba(255, 255, 255, 0.98)",
  },
  popoverOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  popoverOptionText: {
    color: theme.text,
    fontSize: 15,
    fontWeight: "600",
  },
  popoverDivider: {
    height: 1,
    backgroundColor: theme.border,
    marginHorizontal: 12,
  },
});
