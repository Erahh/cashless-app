import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { Screen, Card, PrimaryButton, Pill } from "../../components/ui";

export default function VerificationSubmittedScreen({ navigation, route }) {
  const { theme } = useTheme();
  const flow = route?.params?.flow || "id";

  const content = useMemo(() => {
    if (flow === "business") {
      return {
        title: "Business Submitted ✅",
        subtitle: "Your business verification is pending admin review. Your wallet limit will update once it is approved.",
        pill: "Status: PENDING",
        nextTitle: "What happens next?",
        nextItems: [
          "Admin checks your business documents",
          "Approved accounts can hold up to ₱500,000",
          "Your status will update on Wallet and Profile",
        ],
        primaryLabel: "Back to Wallet",
        primaryAction: () => navigation.navigate("Balance"),
      };
    }

    return {
      title: "Submitted ✅",
      subtitle: "Your verification is pending admin approval. You can still ride using casual fare while we review.",
      pill: "Status: PENDING",
      nextTitle: "What happens next?",
      nextItems: [
        "Admin checks your ID photos",
        "If approved, discounted fare activates automatically",
        "You’ll see the status on Home",
      ],
      primaryLabel: "Go to Home",
      primaryAction: () => navigation.navigate("Home"),
    };
  }, [flow, navigation]);

  return (
    <Screen
      title={content.title}
      subtitle={content.subtitle}
      theme={theme}
    >
      <Card theme={theme} style={styles.heroCard}>
        <View style={[styles.iconWrap, { backgroundColor: theme.warningBg, borderColor: theme.warning }]}>
          <Text style={[styles.iconText, { color: theme.warning }]}>✓</Text>
        </View>
        <Pill text={content.pill} theme={theme} />
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{content.nextTitle}</Text>
        <View style={styles.bulletList}>
          {content.nextItems.map((item) => (
            <View key={item} style={styles.bulletRow}>
              <Text style={[styles.bulletDot, { color: theme.warning }]}>•</Text>
              <Text style={[styles.bulletText, { color: theme.textSecondary }]}>{item}</Text>
            </View>
          ))}
        </View>
      </Card>

      <View style={{ marginTop: "auto", gap: 10, paddingBottom: 110 }}>
        <PrimaryButton label={content.primaryLabel} onPress={content.primaryAction} theme={theme} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    marginTop: 6,
    alignItems: "flex-start",
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  iconText: {
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 30,
  },
  sectionTitle: {
    marginTop: 12,
    fontWeight: "800",
    fontSize: 16,
  },
  bulletList: {
    marginTop: 10,
    width: "100%",
    gap: 8,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  bulletDot: {
    width: 16,
    fontSize: 22,
    lineHeight: 20,
    marginTop: -1,
  },
  bulletText: {
    flex: 1,
    lineHeight: 19,
  },
});
