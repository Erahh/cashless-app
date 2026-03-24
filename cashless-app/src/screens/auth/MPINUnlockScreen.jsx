import React, { useContext, useEffect, useRef, useState, useMemo } from "react";
import {
  View, Text, TextInput, Alert, TouchableOpacity,
  StyleSheet, ActivityIndicator, Animated, Platform,
  KeyboardAvoidingView, ScrollView, Keyboard
} from "react-native";
import { AppLockContext } from "../../context/AppLockContext";
import { useTheme } from "../../context/ThemeContext";
import { supabase } from "../../api/supabase";
import * as Crypto from "expo-crypto";
import { verifyMpin } from "../../api/mpinLocal";
import AuthBackground from "../../components/AuthBackground";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { LockIcon } from "@hugeicons/core-free-icons";

export default function MPINUnlockScreen({ navigation }) {
  const { setLocked } = useContext(AppLockContext);
  const { theme, isDarkMode } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDarkMode), [theme, isDarkMode]);

  const [mpin, setMpin] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const MAX = 5;

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const textInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const userId = u?.user?.id;
        if (!userId) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("phone")
          .eq("id", userId)
          .maybeSingle();

        if (profile?.phone) setPhone(profile.phone);
      } catch {
        // ignore
      }
    })();

    // Auto-focus native keyboard after a brief delay for UI smoothness
    const t = setTimeout(() => {
      textInputRef.current?.focus();
    }, 150);
    return () => clearTimeout(t);
  }, []);

  // ── Auto-submit when 6 digits are entered ──────────────────────────────────
  useEffect(() => {
    if (mpin.length === 6 && !loading) {
      handleUnlock(mpin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mpin]);

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleSwitchNumber = async () => {
    try {
      await supabase.auth.signOut();
      setLocked(false);
      navigation.reset({ index: 0, routes: [{ name: "RoleSelection" }] });
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to switch account");
    }
  };

  const handleUnlock = async (pin) => {
    if (!/^\d{6}$/.test(pin)) return;

    setLoading(true);
    setErrorMsg("");
    try {
      // ✅ Fast local check first
      const isCorrectLocal = await verifyMpin(pin);
      if (isCorrectLocal) {
        setAttempts(0);
        setMpin("");
        setLocked(false);
        return;
      }

      // Fallback: check Supabase
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        Alert.alert("Session Expired", "Please login again.");
        navigation.reset({ index: 0, routes: [{ name: "RoleSelection" }] });
        return;
      }

      const enteredHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        pin
      );

      const { data: pinData, error: pinErr } = await supabase
        .from("user_pins")
        .select("pin_hash")
        .eq("commuter_id", userId)
        .single();

      const recordFail = () => {
        const next = attempts + 1;
        setAttempts(next);
        setMpin("");
        triggerShake();
        if (next >= MAX) {
          Alert.alert("Locked out", "Too many attempts. Please login again.", [
            { text: "Use different number", onPress: handleSwitchNumber },
            {
              text: "OK",
              onPress: async () => {
                await supabase.auth.signOut();
                navigation.reset({ index: 0, routes: [{ name: "RoleSelection" }] });
              },
            },
          ]);
        } else {
          setErrorMsg(`Incorrect MPIN — ${MAX - next} attempt${MAX - next !== 1 ? "s" : ""} left`);
        }
      };

      if (pinErr || !pinData?.pin_hash) { recordFail(); return; }
      if (enteredHash !== pinData.pin_hash) { recordFail(); return; }

      // ✅ Success
      setAttempts(0);
      setMpin("");
      setLocked(false);
    } catch (err) {
      Alert.alert("Error", err.message || "Unlock failed");
      setMpin("");
    } finally {
      setLoading(false);
    }
  };

  // Render dots
  const dots = [0, 1, 2, 3, 4, 5].map((i) => (
    <Animated.View
      key={i}
      style={[
        styles.dot,
        i < mpin.length ? styles.dotFilled : styles.dotEmpty,
        { transform: [{ translateX: shakeAnim }] },
      ]}
    />
  ));

  return (
    <AuthBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topSection}>
            {/* Lock Icon */}
            <View style={styles.iconWrapper}>
              <View style={styles.iconCircle}>
                <HugeiconsIcon icon={LockIcon} size={32} color={isDarkMode ? theme.accent : theme.primary} />
              </View>
            </View>

            <View style={styles.textWrapper}>
              <Text style={styles.title}>Enter Your PIN</Text>
              <Text style={styles.subtitle}>
                {phone ? `Logged in as ${phone}` : "Enter your 6-digit PIN to unlock."}
              </Text>
            </View>

            {/* MPIN Dots */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => textInputRef.current?.focus()}
              style={styles.dotsContainer}
            >
              <View style={styles.dotsRow}>{dots}</View>
            </TouchableOpacity>

            {/* Hidden input for hardware keyboard support */}
            <TextInput
              ref={textInputRef}
              value={mpin}
              onChangeText={(t) => {
                if (!loading) setMpin(t.replace(/[^\d]/g, "").slice(0, 6));
              }}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              style={styles.hiddenInput}
            />

            {/* Error / attempts */}
            <View style={styles.statusContainer}>
              {loading ? (
                <ActivityIndicator color={theme.accent} size="small" />
              ) : errorMsg ? (
                <Text style={styles.errorText}>{errorMsg}</Text>
              ) : null}
            </View>
          </View>

          {/* Switch account */}
          <View style={styles.bottomSection}>
            <TouchableOpacity onPress={handleSwitchNumber} style={styles.switchBtn} activeOpacity={0.7}>
              <Text style={styles.switchText}>Login with a different account</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </AuthBackground>
  );
}

const createStyles = (theme, isDarkMode) => StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 120,
    paddingBottom: 24,
  },
  topSection: {
    alignItems: "center",
    marginTop: 20,
  },
  iconWrapper: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: isDarkMode ? "rgba(247, 227, 83, 0.12)" : "rgba(11, 14, 20, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  textWrapper: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    color: theme.text,
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: theme.textSecondary,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  dotsContainer: {
    marginBottom: 16,
    height: 44,
    justifyContent: "center",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 16,
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
    width: 0,
    height: 0,
    opacity: 0,
    position: "absolute",
  },
  statusContainer: {
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  errorText: {
    color: theme.danger,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  // ── Bottom ────────────────────────────────────────────────
  bottomSection: {
    marginTop: 24,
    alignItems: "center",
  },
  switchBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  switchText: {
    color: theme.textSecondary,
    fontWeight: "700",
    fontSize: 14,
    textAlign: "center",
  },
});
