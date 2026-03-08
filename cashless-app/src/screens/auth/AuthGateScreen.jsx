import React, { useEffect, useContext } from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { supabase } from "../../api/supabase";
import { AppLockContext } from "../../context/AppLockContext";
import { useTheme } from "../../context/ThemeContext";

export default function AuthGateScreen({ navigation }) {
  const { locked } = useContext(AppLockContext);
  const { theme } = useTheme();

  useEffect(() => {
    if (locked) {
      const timer = setTimeout(() => {
        navigation.replace("MPINUnlock");
      }, 100);
      return () => clearTimeout(timer);
    }

    let mounted = true;

    async function go() {
      try {
        const { data: sessionRes, error: sErr } = await supabase.auth.getSession();
        if (sErr) throw sErr;

        const session = sessionRes?.session;

        if (!session?.user?.id) {
          if (mounted) navigation.reset({ index: 0, routes: [{ name: "RoleSelection" }] });
          return;
        }

        const userId = session.user.id;

        const [
          { data: account, error: aErr },
          { data: profile, error: pErr }
        ] = await Promise.all([
          supabase
            .from("commuter_accounts")
            .select("account_active, pin_set")
            .eq("commuter_id", userId)
            .maybeSingle(),
          supabase
            .from("profiles")
            .select("id")
            .eq("id", userId)
            .maybeSingle()
        ]);

        if (aErr) console.warn("commuter_accounts read:", aErr.message);
        if (pErr) console.warn("profiles read:", pErr.message);

        if (!profile?.id) {
          if (mounted) navigation.reset({ index: 0, routes: [{ name: "PersonalInfo" }] });
          return;
        }

        const active = !!account?.account_active;
        const pinSet = !!account?.pin_set;

        if (!active || !pinSet) {
          if (mounted) navigation.reset({ index: 0, routes: [{ name: "MPINSetup" }] });
          return;
        }

        if (mounted) navigation.reset({ index: 0, routes: [{ name: "RoleGate" }] });
      } catch (e) {
        console.error("AuthGate error:", e);
        if (mounted) navigation.reset({ index: 0, routes: [{ name: "RoleSelection" }] });
      }
    }

    go();
    return () => { mounted = false; };
  }, [navigation, locked]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={theme.accent} />
      <Text style={[styles.text, { color: theme.textSecondary }]}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: "600",
  },
});
