import React, { useMemo, useState, useContext, useRef } from "react";
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
  KeyboardAvoidingView,
  Platform,
  Animated,
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
import AuthBackground from "../../components/AuthBackground";

function isWeakPin(pin) {
  const bad = new Set(["000000", "111111", "123456", "654321"]);
  return bad.has(pin) || /^(\d)\1{5}$/.test(pin);
}

function PinField({ label, value, onChangeText, theme, styles, isDarkMode, inputRef }) {
  const [show, setShow] = React.useState(false);

  const dots = [0, 1, 2, 3, 4, 5].map((i) => (
    <View
      key={i}
      style={[
        styles.dot,
        i < value.length ? styles.dotFilled : styles.dotEmpty,
      ]}
    />
  ));

  const digits = [0,1,2,3,4,5].map((i) => (
    <Text key={i} style={styles.digitText}>{value[i] || ''}</Text>
  ));

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => inputRef?.current?.focus()}
        style={[styles.dotsContainer, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
      >
        <View style={styles.dotsRow}>{show ? digits : dots}</View>
        <TouchableOpacity
          onPress={() => setShow(!show)}
          activeOpacity={0.8}
          style={styles.eyeBtn}
        >
          <HugeiconsIcon icon={show ? ViewOffIcon : ViewIcon} size={18} color={theme.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChangeText((t || "").replace(/[^\d]/g, "").slice(0, 6))}
        keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
        inputMode="numeric"
        secureTextEntry={!show}
        maxLength={6}
        autoCorrect={false}
        autoComplete="off"
        caretHidden={!show}
        style={styles.hiddenInput}
      />
    </View>
  );
}

export default function PasswordSecurityScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();
  const { setLocked } = useContext(AppLockContext);
  const styles = useMemo(() => createStyles(theme, isDarkMode), [theme, isDarkMode]);

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [saving, setSaving] = useState(false);

  const currentPinRef = useRef(null);
  const newPinRef = useRef(null);
  const confirmPinRef = useRef(null);

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

  return (
    <AuthBackground onBack={() => navigation.goBack()} showLogo={false}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconWrapper}>
            <View style={styles.iconCircle}>
              <HugeiconsIcon icon={Shield01Icon || LockIcon} size={32} color={isDarkMode ? theme.accent : theme.primary} />
            </View>
          </View>

          <Text style={styles.title}>Password & Security</Text>
          <Text style={styles.subtitle}>
            Update your 6-digit MPIN. Keep it private and avoid using easy-to-guess patterns.
          </Text>

          <Text style={styles.sectionLabel}>Change MPIN</Text>
          <View style={styles.card}>
            <PinField
              label="Current MPIN"
              value={currentPin}
              onChangeText={setCurrentPin}
              theme={theme}
              styles={styles}
              isDarkMode={isDarkMode}
              inputRef={currentPinRef}
            />

            <View style={styles.divider} />

            <PinField
              label="New MPIN"
              value={newPin}
              onChangeText={setNewPin}
              theme={theme}
              styles={styles}
              isDarkMode={isDarkMode}
              inputRef={newPinRef}
            />

            {!!pinStrength && (
              <Text style={[styles.strengthText, { color: pinStrength.color }]}>{pinStrength.label}</Text>
            )}

            <View style={styles.divider} />

            <PinField
              label="Confirm New MPIN"
              value={confirmPin}
              onChangeText={setConfirmPin}
              theme={theme}
              styles={styles}
              isDarkMode={isDarkMode}
              inputRef={confirmPinRef}
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, saving && { opacity: 0.7 }]}
            onPress={onSave}
            disabled={saving}
            activeOpacity={0.9}
          >
            {saving ? (
              <ActivityIndicator size="small" color={isDarkMode ? "#0B0E14" : "#FFFFFF"} />
            ) : (
              <Text style={styles.btnText}>Update MPIN</Text>
            )}
          </TouchableOpacity>

          <View style={styles.recoveryCard}>
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
      </KeyboardAvoidingView>
    </AuthBackground>
  );
}

const createStyles = (theme, isDarkMode) =>
  StyleSheet.create({
    scrollContent: {
      padding: 24,
      paddingTop: 8,
    },
    iconWrapper: {
      alignItems: "center",
      marginBottom: 12,
    },
    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: isDarkMode ? "rgba(247, 227, 83, 0.08)" : "rgba(26, 26, 26, 0.05)",
      borderWidth: 1.5,
      borderColor: isDarkMode ? "rgba(247, 227, 83, 0.2)" : "rgba(26, 26, 26, 0.1)",
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      color: theme.text,
      fontSize: 24,
      fontWeight: "900",
      marginBottom: 6,
      textAlign: "center",
      letterSpacing: -0.5,
    },
    subtitle: {
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 20,
      textAlign: "center",
      marginBottom: 24,
      paddingHorizontal: 12,
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
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: "hidden",
      marginBottom: 14,
    },
    recoveryCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: "hidden",
      marginTop: 4,
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
    dotsContainer: {
      marginBottom: 0,
      height: 44,
      justifyContent: "center",
      paddingVertical: 12,
    },
    digitText: {
      color: theme.text,
      fontSize: 18,
      fontWeight: '800',
      width: 18,
      textAlign: 'center',
    },
    eyeBtn: {
      marginLeft: 12,
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dotsRow: {
      flexDirection: "row",
      gap: 16,
      justifyContent: "center",
    },
    dot: {
      width: 14,
      height: 14,
      borderRadius: 7,
    },
    dotFilled: {
      backgroundColor: theme.accent,
      transform: [{ scale: 1.1 }],
      shadowColor: theme.accent,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.5,
      shadowRadius: 4,
    },
    dotEmpty: {
      backgroundColor: "transparent",
      borderWidth: 2,
      borderColor: isDarkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
    },
    hiddenInput: {
      width: 1,
      height: 1,
      opacity: 0.01,
      position: "absolute",
      top: 0,
      left: 0,
    },
    divider: {
      height: 1,
      backgroundColor: theme.border,
      marginHorizontal: 14,
    },
    strengthText: {
      fontSize: 12,
      fontWeight: "600",
      marginTop: 6,
      marginBottom: 4,
      marginLeft: 16,
    },
    btn: {
      height: 56,
      borderRadius: 16,
      backgroundColor: isDarkMode ? theme.accent : theme.primary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 4,
      marginBottom: 24,
    },
    btnText: {
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
