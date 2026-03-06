import React, { useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  StatusBar,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { CheckmarkCircle01Icon } from "@hugeicons/core-free-icons";

export default function ActivatedScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDarkMode), [theme, isDarkMode]);

  useEffect(() => {
    const t = setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: "Home" }],
      });
    }, 2500);

    return () => clearTimeout(t);
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <View style={styles.container}>
        {/* Success Icon */}
        <View style={styles.iconCircle}>
          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={48} color={theme.success} />
        </View>

        <Text style={styles.title}>Account Activated ✅</Text>
        <Text style={styles.subtitle}>
          Your account is now active. You can start using cashless commuting.
        </Text>

        <TouchableOpacity
          style={styles.btn}
          onPress={() =>
            navigation.reset({
              index: 0,
              routes: [{ name: "Home" }],
            })
          }
          activeOpacity={0.9}
        >
          <Text style={styles.btnText}>Continue to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme, isDarkMode) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: theme.background,
    },
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 32,
    },
    iconCircle: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: isDarkMode
        ? "rgba(124,255,155,0.08)"
        : "rgba(76,175,80,0.08)",
      borderWidth: 2,
      borderColor: isDarkMode
        ? "rgba(124,255,155,0.2)"
        : "rgba(76,175,80,0.2)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 28,
    },
    title: {
      color: theme.text,
      fontSize: 26,
      fontWeight: "900",
      marginBottom: 12,
      textAlign: "center",
    },
    subtitle: {
      color: theme.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      textAlign: "center",
      marginBottom: 36,
    },
    btn: {
      width: "100%",
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
    },
    btnText: {
      color: isDarkMode ? "#0B0E14" : "#FFFFFF",
      fontWeight: "900",
      fontSize: 16,
    },
  });
