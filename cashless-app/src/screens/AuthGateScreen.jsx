import React, { useEffect, useContext } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { supabase } from "../api/supabase";
import { AppLockContext } from "../context/AppLockContext";

export default function AuthGateScreen({ navigation }) {
  const { locked } = useContext(AppLockContext);

  useEffect(() => {
    // If app is locked, redirect to unlock screen
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

        // 1) No session => Phone login
        if (!session?.user?.id) {
          if (mounted) navigation.reset({ index: 0, routes: [{ name: "PhoneScreen" }] });
          return;
        }

        const userId = session.user.id;

        // 2) Read commuter account (may not exist yet)
        const { data: account, error: aErr } = await supabase
          .from("commuter_accounts")
          .select("account_active, pin_set")
          .eq("commuter_id", userId)
          .maybeSingle();

        // 3) Read profile (may not exist yet)
        const { data: profile, error: pErr } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", userId)
          .maybeSingle();

        // If DB errors happen, treat as fallback (send to PersonalInfo)
        // (safe for demo + avoids hard crash)
        if (aErr) console.warn("commuter_accounts read:", aErr.message);
        if (pErr) console.warn("profiles read:", pErr.message);

        // A) Profile missing => PersonalInfo
        if (!profile?.id) {
          if (mounted) navigation.reset({ index: 0, routes: [{ name: "PersonalInfo" }] });
          return;
        }

        // B) Profile exists but account row missing OR pin not set OR inactive => MPINSetup
        const active = !!account?.account_active;
        const pinSet = !!account?.pin_set;

        if (!active || !pinSet) {
          if (mounted) navigation.reset({ index: 0, routes: [{ name: "MPINSetup" }] });
          return;
        }

        // C) Ready => RoleGate
        if (mounted) navigation.reset({ index: 0, routes: [{ name: "RoleGate" }] });
      } catch (e) {
        console.error("AuthGate error:", e);
        // fallback to Phone login
        if (mounted) navigation.reset({ index: 0, routes: [{ name: "PhoneScreen" }] });
      }
    }

    go();
    return () => {
      mounted = false;
    };
  }, [navigation, locked]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#FFD36A" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0E14",
    alignItems: "center",
    justifyContent: "center",
  },
});
