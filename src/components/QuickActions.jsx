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
        {items.map((it) => (
          <TouchableOpacity
            key={it.key}
            activeOpacity={0.9}
            onPress={it.onPress}
            style={styles.card}
          >
            <View style={styles.iconBox}>
              <Text style={styles.icon}>{it.icon}</Text>
            </View>

            <Text
              style={styles.label}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {it.title}
            </Text>

            {!!it.sub && (
              <Text
                style={styles.sub}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
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
  title: { color: "#fff", fontSize: 16, fontWeight: "800", marginBottom: 12 },

  row: {
    gap: 12,
    paddingRight: 10,
  },

  // ✅ fixed size to stop text breaking vertically
  card: {
    width: 92,
    height: 118,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "flex-start",
  },

  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 18 },

  // ✅ small + 1 line = reference look
  label: {
    marginTop: 10,
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
    paddingHorizontal: 10,
  },
  sub: {
    marginTop: 4,
    color: "rgba(255,255,255,0.55)",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 10,
  },
});
