import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";

export default function QuickActions({ items = [] }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Quick Actions</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {items.map((it, idx) => (
          <TouchableOpacity
            key={it.key ?? String(idx)}
            activeOpacity={0.9}
            onPress={it.onPress}
            style={[styles.card, idx === 0 && styles.firstCard]}
          >
            <View style={styles.iconBox}>
              <Text style={styles.icon}>{it.icon}</Text>
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

const styles = StyleSheet.create({
  wrap: { marginTop: 18 },
  title: { color: "#fff", fontSize: 16, fontWeight: "900", marginBottom: 12 },

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
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    paddingTop: 12,
    paddingHorizontal: 10,
    marginRight: 12, // ✅ spacing instead of gap
    alignItems: "center",
  },
  firstCard: { marginLeft: 0 },

  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 18 },

  // ✅ 2 lines = looks like reference + prevents ugly wrap
  label: {
    marginTop: 10,
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 14,
    height: 28, // ✅ reserve 2 lines space
  },

  sub: {
    marginTop: 4,
    color: "rgba(255,255,255,0.55)",
    fontSize: 10.5,
    fontWeight: "800",
    textAlign: "center",
  },
});
