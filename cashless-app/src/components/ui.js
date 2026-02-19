import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function Screen({ title, subtitle, rightSlot, onBack, children }) {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color="#F4EEE6" />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {rightSlot ? <View>{rightSlot}</View> : null}
      </View>

      <View style={styles.content}>{children}</View>
    </View>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function PrimaryButton({ label, onPress, disabled }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled}
      style={[styles.primaryBtn, disabled && { opacity: 0.6 }]}
    >
      <Text style={styles.primaryBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function GhostButton({ label, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.ghostBtn}>
      <Text style={styles.ghostBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Pill({ text }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#1b140f", // deep coffee
    paddingTop: Platform.OS === "ios" ? 58 : 42,
    paddingHorizontal: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#F4EEE6",
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13.5,
    color: "rgba(244,238,230,0.65)",
    lineHeight: 18,
  },
  content: {
    flex: 1,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: "#F2E94E", // yellow accent
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#1b140f",
    fontWeight: "900",
    fontSize: 15,
    letterSpacing: 0.2,
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
