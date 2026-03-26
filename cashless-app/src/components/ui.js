import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";

import { HugeiconsIcon } from "@hugeicons/react-native";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";

export function Screen({ title, subtitle, rightSlot, onBack, children, theme }) {
  const isDark = theme?.isDark ?? true;
  return (
    <SafeAreaView style={[styles.root, theme && { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        {onBack && (
          <View style={styles.leftSlot}>
            <TouchableOpacity onPress={onBack} style={[styles.backBtn, theme && { backgroundColor: theme.card }]} activeOpacity={0.7}>
              <HugeiconsIcon icon={ArrowLeft01Icon} size={20} color={theme ? theme.text : "#F4EEE6"} />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.centerSlot}>
          {title ? <Text style={[styles.title, theme && { color: theme.text }]} numberOfLines={1}>{title}</Text> : null}
          {subtitle ? <Text style={[styles.subtitle, theme && { color: theme.textSecondary }]} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        <View style={styles.rightSlot}>
          {rightSlot ? rightSlot : null}
        </View>
      </View>

      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

export function Card({ children, style, theme }) {
  return <View style={[styles.card, theme && { backgroundColor: theme.card, borderColor: theme.border }, style]}>{children}</View>;
}

export function PrimaryButton({ label, onPress, disabled, theme }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled}
      style={[styles.primaryBtn, theme && { backgroundColor: theme.accent }, disabled && { opacity: 0.6 }]}
    >
      <Text style={[styles.primaryBtnText, theme && { color: theme.primary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function GhostButton({ label, onPress, theme }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.ghostBtn, theme && { borderColor: theme.border, backgroundColor: theme.card }]}>
      <Text style={[styles.ghostBtnText, theme && { color: theme.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Pill({ text, theme }) {
  return (
    <View style={[styles.pill, theme && { backgroundColor: theme.warningBg, borderColor: theme.warning }]}>
      <Text style={[styles.pillText, theme && { color: "#0B0E14" }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#1b140f", // deep coffee
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
    marginBottom: 6,
  },
  leftSlot: {
    width: 44, // reserve static width
    alignItems: "flex-start",
  },
  rightSlot: {
    width: 44, // mirror left slot exactly for perfect centering
    alignItems: "flex-end",
  },
  centerSlot: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F4EEE6",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "rgba(244,238,230,0.65)",
    lineHeight: 16,
    textAlign: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    elevation: 6,
  },
  primaryBtn: {
    backgroundColor: "#F2E94E", // yellow accent
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#F2E94E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: "#0B0E14",
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  ghostBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  ghostBtnText: {
    color: "#F4EEE6",
    fontWeight: "800",
    fontSize: 14,
  },
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(242,233,78,0.14)",
    borderWidth: 1,
    borderColor: "rgba(242,233,78,0.25)",
  },
  pillText: {
    color: "#F2E94E",
    fontWeight: "800",
    fontSize: 12,
  },
});
