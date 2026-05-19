import React, { useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { Screen, Card, GhostButton, Pill } from "../../components/ui";
import VerifiedBadge from "../../components/VerifiedBadge";

export default function VerificationDetailsScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { profile, account, businessVerification, operatorApp } = route?.params || {};

  const verStatus = String(account?.verification_status || (account?.verified ? 'verified' : 'unverified'));

  const latest = useMemo(() => {
    // try several possible places for a submitted/verified record
    if (businessVerification?.application) return businessVerification.application;
    if (operatorApp) return operatorApp;
    return null;
  }, [businessVerification, operatorApp]);

  const items = [];
  if (account?.verified_at) items.push({ label: 'Verified At', value: new Date(account.verified_at).toLocaleString() });
  if (latest?.submitted_at) items.push({ label: 'Submitted At', value: new Date(latest.submitted_at).toLocaleString() });
  if (latest?.review_notes) items.push({ label: 'Review Notes', value: latest.review_notes });

  // documents could be an object of file URLs or base names
  const docs = latest?.documents || businessVerification?.documents || null;

  return (
    <Screen title="Verification Details" theme={theme} onBack={() => navigation.goBack()}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Card theme={theme} style={styles.headerCard}>
          <VerifiedBadge size={72} glowColor="rgba(47,128,237,0.32)" glowSize={16} />
          <View style={{ marginTop: 12 }}>
            <Text style={[styles.title, { color: theme.text }]}>{verStatus?.toUpperCase()}</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary, marginTop: 6 }]}>This screen shows the verification timeline and any review notes or documents on file.</Text>
          </View>
        </Card>

        <Card theme={theme}>
          <Pill text={`Status: ${verStatus?.toUpperCase()}`} theme={theme} />
          <View style={{ marginTop: 12 }}>
            {items.length === 0 ? (
              <Text style={{ color: theme.textSecondary }}>No timeline information is available.</Text>
            ) : (
              items.map((it) => (
                <View key={it.label} style={styles.row}>
                  <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>{it.label}</Text>
                  <Text style={[styles.rowValue, { color: theme.text }]}>{it.value}</Text>
                </View>
              ))
            )}
          </View>
        </Card>

        {docs && (
          <Card theme={theme}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Documents</Text>
            {Object.keys(docs).length === 0 && <Text style={{ color: theme.textSecondary }}>No documents attached.</Text>}
            {Object.entries(docs).map(([k, v]) => (
              <TouchableOpacity
                key={k}
                onPress={() => {
                  try {
                    const url = typeof v === 'string' && v.startsWith('http') ? v : String(v);
                    Linking.openURL(url);
                  } catch (e) {
                    // ignore
                  }
                }}
                style={styles.docRow}
              >
                <Text style={[styles.docLabel, { color: theme.text }]}>{k.replace(/_/g, ' ').toUpperCase()}</Text>
                <Text style={[styles.docHint, { color: theme.textSecondary }]} numberOfLines={1}>{String(v)}</Text>
              </TouchableOpacity>
            ))}
          </Card>
        )}

        <View style={{ paddingHorizontal: 18, marginTop: 16 }}>
          <GhostButton label="Close" onPress={() => navigation.goBack()} theme={theme} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerCard: { alignItems: 'center', paddingVertical: 24 },
  title: { fontSize: 18, fontWeight: '800' },
  subtitle: { fontSize: 13 },
  row: { marginTop: 12 },
  rowLabel: { fontSize: 12, fontWeight: '700' },
  rowValue: { marginTop: 4, fontSize: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '800', marginBottom: 10 },
  docRow: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.03)' },
  docLabel: { fontSize: 12, fontWeight: '800' },
  docHint: { fontSize: 12, marginTop: 4 },
});
