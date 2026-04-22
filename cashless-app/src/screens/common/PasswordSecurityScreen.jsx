import React, { useMemo, useState, useContext } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  Alert,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from "react-native";
import { HugeiconsIcon } from "@hugeicons/react-native";
import {
  ArrowLeft01Icon,
  LockIcon,
  ViewIcon,
  ViewOffIcon,
  Shield01Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { useTheme } from "../../context/ThemeContext";
import { verifyMpinOnRender, setMpinOnRender } from "../../api/apiHelper";
import { setMpin as setMpinLocal } from "../../api/mpinLocal";
import { supabase } from "../../api/supabase";
import { AppLockContext } from "../../context/AppLockContext";

function isWeakPin(pin) {
  const bad = new Set(["000000", "111111", "123456", "654321"]);
  return bad.has(pin) || /^(\d)\1{5}$/.test(pin);
}

export default function PasswordSecurityScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();
  const { setLocked } = useContext(AppLockContext);
  const styles = useMemo(() => createStyles(theme, isDarkMode), [theme, isDarkMode]);

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const pinStrength = useMemo(() => {
    if (newPin.length === 0) return null;
    if (newPin.length < 6) return { label: "Too short", color: theme.textMuted };
    if (isWeakPin(newPin)) return { label: "Weak PIN", color: theme.danger };
    return { label: "Strong PIN", color: theme.success };
  }, [newPin, theme]);

  async function onSave() {
    if (!/^\d{6}$/.test(currentPin)) {
      return Alert.alert("Current MPIN", "Enter your current 6-digit MPIN.");
    }
    if (!/^\d{6}$/.test(newPin)) {
      return Alert.alert("New MPIN", "New MPIN must be exactly 6 digits.");
    }
    if (isWeakPin(newPin)) {
      return Alert.alert("Weak MPIN", "Please use a stronger MPIN.");
    }
    if (newPin !== confirmPin) {
      return Alert.alert("Mismatch", "New MPIN and confirmation do not match.");
    }
    if (newPin === currentPin) {
      return Alert.alert("No Change", "New MPIN must be different from current MPIN.");
    }

    setSaving(true);
    try {
      await verifyMpinOnRender(currentPin);
      await setMpinOnRender(newPin, confirmPin);
      await setMpinLocal(newPin);
      setLocked(false);

      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");

      Alert.alert("Updated", "Your MPIN has been updated successfully.");
    } catch (e) {
      Alert.alert("Update Failed", e.message || "Could not update MPIN.");
    } finally {
      setSaving(false);
    }
  }

  async function onForgotPin() {
    Alert.alert(
      "Forgot MPIN?",
      "For security, you will be signed out and can log in again to reset your account access.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              navigation.reset({ index: 0, routes: [{ name: "RoleSelection" }] });
            } catch (e) {
              Alert.alert("Error", e.message || "Failed to sign out.");
            }
          },
        },
      ]
    );
  }

  function PinField({ label, value, onChangeText, visible, onToggleVisible }) {
    return (
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={value}
            onChangeText={(t) => onChangeText((t || "").replace(/[^\d]/g, "").slice(0, 6))}
            keyboardType="number-pad"
            secureTextEntry={!visible}
            style={styles.input}
            placeholder="* * * * * *"
            placeholderTextColor={theme.textMuted}
            maxLength={6}
          />
          <TouchableOpacity onPress={onToggleVisible} style={styles.eyeBtn} activeOpacity={0.75}>
            <HugeiconsIcon icon={visible ? ViewOffIcon : ViewIcon} size={20} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Password & Security</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <HugeiconsIcon icon={Shield01Icon || LockIcon} size={22} color={theme.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Protect Your Account</Text>
            <Text style={styles.heroSub}>
              Use a unique 6-digit MPIN and avoid sharing it with anyone.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Change MPIN</Text>
        <View style={styles.card}>
          <PinField
            label="Current MPIN"
            value={currentPin}
            onChangeText={setCurrentPin}
            visible={showCurrent}
            onToggleVisible={() => setShowCurrent((v) => !v)}
          />

          <View style={styles.divider} />

          <PinField
            label="New MPIN"
            value={newPin}
            onChangeText={setNewPin}
            visible={showNew}
            onToggleVisible={() => setShowNew((v) => !v)}
          />

          {!!pinStrength && (
            <Text style={[styles.strengthText, { color: pinStrength.color }]}>{pinStrength.label}</Text>
          )}

          <View style={styles.divider} />

          <PinField
            label="Confirm New MPIN"
            value={confirmPin}
            onChangeText={setConfirmPin}
            visible={showConfirm}
            onToggleVisible={() => setShowConfirm((v) => !v)}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={onSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color={isDarkMode ? "#0B0E14" : "#FFFFFF"} />
          ) : (
            <Text style={styles.saveBtnText}>Update MPIN</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Recovery</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.rowBtn} onPress={onForgotPin} activeOpacity={0.8}>
            <View style={styles.rowLeft}>
              <View style={styles.rowIcon}>
                <HugeiconsIcon icon={InformationCircleIcon} size={18} color={theme.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Forgot MPIN</Text>
                <Text style={styles.rowSub}>Sign out and log in again to recover access.</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme, isDarkMode) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
    },
    backBtn: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      color: theme.text,
      fontSize: 18,
      fontWeight: "900",
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 20,
    },
    heroCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: isDarkMode ? "rgba(247,227,83,0.08)" : "rgba(26,26,26,0.04)",
      borderWidth: 1,
      borderColor: isDarkMode ? "rgba(247,227,83,0.2)" : theme.border,
      borderRadius: 18,
      padding: 14,
      marginBottom: 22,
    },
    heroIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: isDarkMode ? "rgba(247,227,83,0.14)" : "rgba(26,26,26,0.08)",
      alignItems: "center",
      justifyContent: "center",
    },
    heroTitle: {
      color: theme.text,
      fontSize: 15,
      fontWeight: "900",
      marginBottom: 2,
    },
    heroSub: {
      color: theme.textSecondary,
      fontSize: 12,
      lineHeight: 18,
    },
    sectionLabel: {
      color: theme.textMuted,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.5,
      textTransform: "uppercase",
      marginBottom: 10,
      marginLeft: 2,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: "hidden",
      marginBottom: 14,
    },
    fieldGroup: {
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    fieldLabel: {
      color: theme.textSecondary,
      fontSize: 12,
      fontWeight: "700",
      marginBottom: 8,
      marginLeft: 2,
      letterSpacing: 0.3,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: 14,
      backgroundColor: theme.background,
      height: 54,
      paddingHorizontal: 14,
    },
    input: {
      flex: 1,
      color: theme.text,
      fontSize: 18,
      fontWeight: "700",
      letterSpacing: 6,
      textAlign: "center",
      paddingVertical: 0,
    },
    eyeBtn: {
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
    },
    divider: {
      height: 1,
      backgroundColor: theme.border,
      marginHorizontal: 14,
    },
    strengthText: {
      fontSize: 12,
      fontWeight: "700",
      marginTop: -4,
      marginBottom: 10,
      marginLeft: 16,
    },
    saveBtn: {
      height: 54,
      borderRadius: 16,
      backgroundColor: theme.success,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
    },
    saveBtnText: {
      color: isDarkMode ? "#0B0E14" : "#FFFFFF",
      fontWeight: "900",
      fontSize: 16,
    },
    rowBtn: {
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    rowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    rowIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
      alignItems: "center",
      justifyContent: "center",
    },
    rowTitle: {
      color: theme.text,
      fontSize: 14,
      fontWeight: "800",
      marginBottom: 2,
    },
    rowSub: {
      color: theme.textSecondary,
      fontSize: 12,
      lineHeight: 16,
    },
  });
