import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { HugeiconsIcon } from "@hugeicons/react-native";
import Animated, {
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

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
          <ActionCard
            key={it.key ?? String(idx)}
            item={it}
            index={idx}
            styles={styles}
            theme={theme}
            isDarkMode={isDarkMode}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function ActionCard({ item, index, styles, theme, isDarkMode }) {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const pressLock = React.useRef(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` }
    ]
  }));

  const handlePress = () => {
    if (pressLock.current) return;
    pressLock.current = true;

    // Don't let haptics failures block navigation.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    scale.value = withSequence(
      withSpring(0.92, { damping: 10, stiffness: 200 }),
      withSpring(1, { damping: 10, stiffness: 200 }),
    );
    
    rotation.value = withSequence(
      withTiming(-5, { duration: 40 }),
      withTiming(5, { duration: 40 }),
      withTiming(-5, { duration: 40 }),
      withTiming(0, { duration: 40 })
    );
    
    // Run action immediately for reliable taps.
    try {
      item.onPress?.();
    } finally {
      setTimeout(() => {
        pressLock.current = false;
      }, 500);
    }
  };

  return (
    <Animated.View
      entering={FadeInRight.delay(index * 120).springify().damping(15)}
    >
      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={handlePress}
          style={({ pressed }) => [
            styles.card,
            index === 0 && styles.firstCard,
            pressed && { opacity: 0.85 }
          ]}
          hitSlop={10}
        >
          <View style={styles.iconBox}>
            {typeof item.icon === 'string' ? (
              <Text style={styles.icon}>{item.icon}</Text>
            ) : (
              <HugeiconsIcon icon={item.icon} size={24} color={isDarkMode ? "#fff" : theme.text} />
            )}
          </View>

          <Text style={styles.label} numberOfLines={2}>
            {item.title}
          </Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const createStyles = (theme, isDarkMode) => StyleSheet.create({
  wrap: { marginTop: 18 },
  title: { color: theme.text, fontSize: 16, fontWeight: "900", marginBottom: 16, marginLeft: 4 },

  row: {
    paddingLeft: 4,
    paddingRight: 20,
    paddingBottom: 10, // room for shadow
  },

  card: {
    width: 106,
    height: 110,
    borderRadius: 24,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 8,
    marginRight: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: isDarkMode ? 0.4 : 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  firstCard: { marginLeft: 0 },

  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 18 },

  label: {
    marginTop: 10,
    color: theme.text,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 14,
    height: 28,
    paddingHorizontal: 4,
  },
});
