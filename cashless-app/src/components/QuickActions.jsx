import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { HugeiconsIcon } from "@hugeicons/react-native";

export default function QuickActions({ items = [] }) {
  const { theme, isDarkMode } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDarkMode), [theme, isDarkMode]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Quick Actions</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {items.filter(it => it.show !== false).map((it, idx) => (
          <TouchableOpacity
            key={it.key ?? String(idx)}
            activeOpacity={0.9}
            onPress={it.onPress}
            style={[styles.card, idx === 0 && styles.firstCard]}
          >
            <View style={styles.iconBox}>
              {typeof it.icon === 'string' ? (
                <Text style={styles.icon}>{it.icon}</Text>
              ) : (
                <HugeiconsIcon icon={it.icon} size={24} color={theme.text} />
              )}
            </View>

            <Text style={styles.label} numberOfLines={2}>
              {it.title}
            </Text>

            {!!it.sub && (
              <Text style={styles.sub} numberOfLines={1}>
                {it.sub}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme, isDarkMode) => StyleSheet.create({
  wrap: { marginTop: 18 },
  title: { color: theme.text, fontSize: 16, fontWeight: "900", marginBottom: 12 },

  // ✅ no gap (android safe)
  row: {
    paddingLeft: 2,
    paddingRight: 10,
  },

  // ✅ slightly wider + consistent height
  card: {
    width: 108,
    height: 124,
    borderRadius: 22,
    backgroundColor: isDarkMode ? "rgba(255,255,255,0.06)" : theme.cardAlt || "#ffffff",
    borderWidth: 1,
    borderColor: isDarkMode ? "rgba(255,255,255,0.10)" : theme.border,
    paddingTop: 12,
    paddingHorizontal: 10,
    marginRight: 12, // ✅ spacing instead of gap
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0 : 0.05,
    shadowRadius: 4,
    elevation: isDarkMode ? 0 : 2,
  },
  firstCard: { marginLeft: 0 },

  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: isDarkMode ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 18 },

  // ✅ 2 lines = looks like reference + prevents ugly wrap
  label: {
    marginTop: 10,
    color: theme.text,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 14,
    height: 28, // ✅ reserve 2 lines space
  },

  sub: {
    marginTop: 4,
    color: theme.textMuted,
    fontSize: 10.5,
    fontWeight: "800",
    textAlign: "center",
  },
});
