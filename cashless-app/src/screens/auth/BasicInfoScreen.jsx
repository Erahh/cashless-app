import React, { useState, useMemo } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from "react-native";
import { submitBasicInfo } from "../../api/apiHelper";
import AuthBackground from "../../components/AuthBackground";
import { useTheme } from "../../context/ThemeContext";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { UserIcon, Mail01Icon } from "@hugeicons/core-free-icons";

export default function BasicInfoScreen({ navigation }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { theme, isDarkMode } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDarkMode), [theme, isDarkMode]);

  const handleNext = async () => {
    try {
      if (!fullName.trim()) {
        return Alert.alert("Required", "Full name is required.");
      }
      setLoading(true);
      await submitBasicInfo(fullName.trim(), email.trim() || "");
      navigation.navigate("MPINSetup");
    } catch (err) {
      Alert.alert("Error", err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground onBack={navigation?.canGoBack() ? () => navigation.goBack() : null}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={[styles.header, { marginTop: Platform.OS === 'ios' ? 120 : 100 }]}>
            <Text style={styles.title}>Basic Information</Text>
            <Text style={styles.subtitle}>Let's get to know you better</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <HugeiconsIcon icon={UserIcon} size={20} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Juan Dela Cruz"
                  placeholderTextColor={theme.textMuted}
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address (Optional)</Text>
              <View style={styles.inputWrapper}>
                <HugeiconsIcon icon={Mail01Icon} size={20} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="juan@example.com"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.nextBtn, !fullName.trim() && styles.nextBtnDisabled]}
              onPress={handleNext}
              disabled={loading || !fullName.trim()}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.nextBtnText}>Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthBackground>
  );
}

const createStyles = (theme, isDarkMode) => StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: 40 },
  header: { marginBottom: 32 },
  title: { fontSize: 32, fontWeight: "900", color: theme.text, marginBottom: 8 },
  subtitle: { fontSize: 16, color: theme.textSecondary, fontWeight: "500" },
  form: { gap: 24 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: "700", color: theme.textSecondary, marginLeft: 4 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 16,
    height: 60,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: theme.text, fontSize: 16, fontWeight: "600" },
  nextBtn: {
    backgroundColor: isDarkMode ? theme.accent : "#0f172a",
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnText: { color: isDarkMode ? "#000" : "#fff", fontSize: 18, fontWeight: "800" },
});
