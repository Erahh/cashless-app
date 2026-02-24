import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { fetchNotifications, deleteNotification, clearNotifications } from "../api/notificationsApi";
import BottomNav from "../components/BottomNav";

function normalizePayload(payload) {
  const p = payload && typeof payload === "object" ? payload : {};
  return {
    title: String(p.title || "Notification"),
    body: String(p.body || ""),
    type: String(p.type || "system"), // 'transfer', 'payment', 'system'
  };
}

export default function NotificationsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
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

  const openMenu = (id) => {
    setSelectedId(id);
    setMenuVisible(true);
  };

  // Icon mapping helper based on title/type (Upgraded Icons)
  const getIconInfo = (title = "", type = "") => {
    const lowerTitle = title.toLowerCase();
    const lowerType = type.toLowerCase();

    // 1) Ride / Travel Related
    if (lowerTitle.includes("ride") || lowerTitle.includes("scanned") || lowerType === "ride" || lowerTitle.includes("fare")) {
      return { icon: "bus-clock", color: "#FF9F43", lib: "MaterialCommunityIcons" };
    }
    // 2) Transfers / Sent
    if (lowerTitle.includes("transfer") || lowerTitle.includes("send") || lowerType === "transfer") {
      return { icon: "bank-transfer", color: "#3B99FF", lib: "MaterialCommunityIcons" };
    }
    // 3) Wallet / Payments
    if (lowerTitle.includes("payment") || lowerTitle.includes("receive") || lowerType === "payment" || lowerTitle.includes("wallet")) {
      return { icon: "wallet-outline", color: "#F7E353", lib: "MaterialCommunityIcons" };
    }
    // 4) Success / Verified / Identity
    if (lowerTitle.includes("verified") || lowerTitle.includes("approved") || lowerTitle.includes("identity")) {
      return { icon: "check-decagram", color: "#28C76F", lib: "MaterialCommunityIcons" };
    }
    // 5) Account / Profile
    if (lowerTitle.includes("account") || lowerTitle.includes("profile") || lowerTitle.includes("mpin")) {
      return { icon: "account-edit-outline", color: "#A0A0A0", lib: "MaterialCommunityIcons" };
    }
    // 6) Security / Alerts
    if (lowerTitle.includes("security") || lowerTitle.includes("logged") || lowerTitle.includes("device") || lowerTitle.includes("failed")) {
      return { icon: "shield-alert-outline", color: "#FF5C5C", lib: "MaterialCommunityIcons" };
    }

    return { icon: "bell-outline", color: "#A0A0A0", lib: "MaterialCommunityIcons" };
  };

  const RenderIcon = ({ name, color, lib }) => {
    if (lib === "MaterialCommunityIcons") {
      return <MaterialCommunityIcons name={name} size={22} color="#000" />;
    }
    return <Ionicons name={name} size={22} color="#000" />;
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification</Text>
        <TouchableOpacity onPress={load} style={styles.headerRefresh}>
          <Ionicons name="refresh" size={20} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
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
            <ActivityIndicator color="#F7E353" />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={60} color="rgba(255,255,255,0.1)" />
            <Text style={styles.emptyText}>Nothing here yet</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((n) => {
              const p = normalizePayload(n.payload);
              const { icon, color, lib } = getIconInfo(p.title, p.type);

              // Formatting time like "12:45 am"
              const date = new Date(n.created_at);
              const hours = date.getHours();
              const mins = date.getMinutes().toString().padStart(2, "0");
              const ampm = hours >= 12 ? "pm" : "am";
              const displayTime = `${hours % 12 || 12}:${mins} ${ampm}`;

              return (
                <TouchableOpacity
                  key={n.id}
                  activeOpacity={0.9}
                  onLongPress={() => openMenu(n.id)}
                  style={styles.card}
                >
                  <View style={styles.cardRow}>
                    {/* Circular Icon */}
                    <View style={[styles.iconContainer, { backgroundColor: color }]}>
                      <RenderIcon name={icon} color={color} lib={lib} />
                    </View>

                    {/* Content */}
                    <View style={styles.cardMain}>
                      <View style={styles.cardTopRow}>
                        <Text style={styles.cardTitle}>{p.title}</Text>
                        <Text style={styles.cardTime}>{displayTime}</Text>
                      </View>

                      <Text style={styles.cardBody} numberOfLines={2}>
                        {p.body || "System notification received."}
                      </Text>

                      {/* Status Dot */}
                      <View style={styles.cardBottomRow}>
                        <View style={styles.unreadDot} />
                      </View>
                    </View>

                    {/* Options Trigger (Mini) */}
                    <TouchableOpacity onPress={() => openMenu(n.id)} style={styles.miniMoreBtn}>
                      <Ionicons name="ellipsis-vertical" size={14} color="rgba(255,255,255,0.2)" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}

            {!isFullList && items.length === 10 && (
              <TouchableOpacity style={styles.seeAllBtn} onPress={handleSeeAll}>
                <Text style={styles.seeAllText}>See All Notifications</Text>
                <Ionicons name="chevron-forward" size={16} color="#F7E353" />
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Sheet Modal */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <TouchableOpacity style={styles.modalOption} onPress={() => handleDelete(selectedId)}>
                <Ionicons name="trash-outline" size={22} color="#FF5C5C" />
                <Text style={styles.modalOptionText}>Delete this notification</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalOption, { borderBottomWidth: 0 }]} onPress={() => setMenuVisible(false)}>
                <Ionicons name="close-circle-outline" size={22} color="#fff" />
                <Text style={styles.modalOptionText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <BottomNav navigation={navigation} active="Alerts" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#12100E" }, // Warm Dark
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 20,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "600", letterSpacing: 0.5 },
  headerRefresh: { width: 40, height: 40, alignItems: "flex-end", justifyContent: "center" },

  scrollContent: { paddingHorizontal: 20 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 },
  sectionTitle: { color: "rgba(255,255,255,0.4)", fontSize: 18, fontWeight: "500" },
  clearAllText: { color: "#FF5C5C", fontSize: 13, fontWeight: "600" },

  list: { gap: 12 },
  card: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  cardRow: { flexDirection: "row", gap: 14 },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  cardMain: { flex: 1 },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  cardTitle: { color: "#fff", fontSize: 16, fontWeight: "600" },
  cardTime: { color: "rgba(255,255,255,0.3)", fontSize: 11 },
  cardBody: { color: "rgba(255,255,255,0.5)", fontSize: 13, lineHeight: 18, paddingRight: 20 },
  cardBottomRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#F7E353" }, // Match image yellow

  miniMoreBtn: { position: "absolute", right: -5, top: 25 },

  center: { marginTop: 50, alignItems: "center" },
  emptyContainer: { marginTop: 100, alignItems: "center", opacity: 0.5 },
  emptyText: { color: "#fff", marginTop: 10, fontSize: 14 },

  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    marginTop: 10,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    gap: 8,
  },
  seeAllText: {
    color: "#F7E353",
    fontSize: 14,
    fontWeight: "700",
  },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "#1C1C1E",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    gap: 15,
  },
  modalOptionText: { color: "#fff", fontSize: 16, fontWeight: "500" },
});
