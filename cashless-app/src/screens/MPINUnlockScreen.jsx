import React, { useContext, useEffect, useRef, useState, useMemo } from "react";
import {
  View, Text, TextInput, Alert, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator, Animated, Platform,
} from "react-native";
import { AppLockContext } from "../context/AppLockContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../api/supabase";
import * as Crypto from "expo-crypto";
import { verifyMpin } from "../api/mpinLocal";

export default function MPINUnlockScreen({ navigation }) {
  const { setLocked } = useContext(AppLockContext);
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

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
      navigation.reset({ index: 0, routes: [{ name: "PhoneScreen" }] });
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
        navigation.reset({ index: 0, routes: [{ name: "PhoneScreen" }] });
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
                navigation.reset({ index: 0, routes: [{ name: "PhoneScreen" }] });
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

  // Numeric keypad digit press
  const handleDigit = (d) => {
    if (loading) return;
    setMpin((prev) => (prev.length < 6 ? prev + d : prev));
  };

  // Backspace
  const handleBackspace = () => {
    if (loading) return;
    setErrorMsg("");
    setMpin((prev) => prev.slice(0, -1));
  };

  // Clear all
  const handleClear = () => {
    if (loading) return;
    setErrorMsg("");
    setMpin("");
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

  // Keypad layout
  const keypad = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["clear", "0", "back"],
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        <View style={styles.cardContainer}>
          {/* Lock Icon */}
          <View style={styles.iconWrapper}>
            <View style={styles.lockIconOuter}>
              <View style={styles.lockIconInner}>
                <Text style={styles.lockEmoji}>🔒</Text>
              </View>
            </View>
          </View>

          <View style={styles.textWrapper}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              {phone ? `Logged in as ${phone}` : "Enter your 6-digit MPIN to unlock."}
            </Text>
          </View>

          {/* MPIN Dots */}
          <View style={styles.dotsContainer}>
            <View style={styles.dotsRow}>{dots}</View>
          </View>

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
          {errorMsg ? (
            <Text style={styles.errorText}>{errorMsg}</Text>
          ) : null}

          {/* Loading indicator */}
          {loading && (
            <ActivityIndicator
              color={theme.accent}
              style={{ marginTop: 8 }}
            />
          )}
        </View>

        {/* ── Numeric Keypad ─────────────────────────────────── */}
        <View style={styles.keypad}>
          {keypad.map((row, ri) => (
            <View key={ri} style={styles.keypadRow}>
              {row.map((key) => {
                if (key === "back") {
                  return (
                    <TouchableOpacity
                      key="back"
                      style={styles.keypadKey}
                      onPress={handleBackspace}
                      onLongPress={handleClear}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.keypadBackspace}>⌫</Text>
                    </TouchableOpacity>
                  );
                }
                if (key === "clear") {
                  return (
                    <TouchableOpacity
                      key="clear"
                      style={styles.keypadKey}
                      onPress={handleClear}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.keypadClear}>C</Text>
                    </TouchableOpacity>
                  );
                }
                return (
                  <TouchableOpacity
                    key={key}
                    style={styles.keypadKey}
                    onPress={() => handleDigit(key)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.keypadKeyText}>{key}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Switch account */}
        <View style={styles.bottomSection}>
          <TouchableOpacity onPress={handleSwitchNumber} style={styles.switchBtn} activeOpacity={0.7}>
            <Text style={styles.switchText}>Login with a different account</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.background,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  cardContainer: {
    backgroundColor: theme.cardAlt,
    borderRadius: 36,
    padding: 28,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: theme.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: theme.isDark ? 0.4 : 0.1,
    shadowRadius: 24,
    elevation: 8,
    marginBottom: 24,
  },
  iconWrapper: {
    marginBottom: 20,
  },
  lockIconOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.isDark ? "rgba(247, 227, 83, 0.08)" : "rgba(247, 227, 83, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  lockIconInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.isDark ? "rgba(247, 227, 83, 0.15)" : theme.accentWarm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: theme.isDark ? "rgba(247, 227, 83, 0.4)" : "rgba(255,255,255,0.5)",
    shadowColor: theme.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  lockEmoji: {
    fontSize: 26,
  },
  textWrapper: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    color: theme.text,
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: theme.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  dotsContainer: {
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: theme.isDark ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.03)",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 18,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
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
    borderColor: theme.isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
  },
  hiddenInput: {
    position: "absolute",
    top: -9999,
    opacity: 0,
  },
  errorText: {
    color: theme.danger,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
  },
  // ── Keypad ────────────────────────────────────────────────
  keypad: {
    marginTop: 4,
    gap: 10,
  },
  keypadRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  keypadKey: {
    width: 76,
    height: 56,
    borderRadius: 18,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.isDark ? 0.25 : 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  keypadKeyText: {
    color: theme.text,
    fontSize: 22,
    fontWeight: "700",
  },
  keypadBackspace: {
    color: theme.textSecondary,
    fontSize: 20,
    fontWeight: "600",
  },
  keypadClear: {
    color: theme.danger,
    fontSize: 18,
    fontWeight: "700",
  },
  // ── Bottom ────────────────────────────────────────────────
  bottomSection: {
    marginTop: 24,
    alignItems: "center",
  },
  switchBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: theme.card,
  },
  switchText: {
    color: theme.textSecondary,
    fontWeight: "600",
    fontSize: 14,
    textAlign: "center",
  },
});
