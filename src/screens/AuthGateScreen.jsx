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
        const { data: sessionRes } = await supabase.auth.getSession();
        const session = sessionRes?.session;

        // 1) No session => OTP login
        if (!session?.user?.id) {
          if (mounted) navigation.reset({ index: 0, routes: [{ name: "OTPScreen" }] });
          return;
        }

        const userId = session.user.id;

        // 2) Check activation state
        const { data: account, error } = await supabase
          .from("commuter_accounts")
          .select("account_active, pin_set")
          .eq("commuter_id", userId)
          .single();

        // If table not ready or row missing, check if profile exists
        if (error || !account) {
          // Check if profile exists to decide between PersonalInfo or SetMPIN
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", userId)
            .single();

          if (!profile) {
            // No profile → start registration flow
            if (mounted) navigation.reset({ index: 0, routes: [{ name: "PersonalInfo" }] });
          } else {
            // Profile exists but account not set up → go to SetMPIN
            if (mounted) navigation.reset({ index: 0, routes: [{ name: "SetMPIN" }] });
          }
          return;
        }

        // Check if account is active and pin is set
        if (!account.account_active || !account.pin_set) {
          // Check if profile exists
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", userId)
            .single();

          if (!profile) {
            // No profile → start registration flow
            if (mounted) navigation.reset({ index: 0, routes: [{ name: "PersonalInfo" }] });
          } else {
            // Profile exists but pin not set → go to SetMPIN
            if (mounted) navigation.reset({ index: 0, routes: [{ name: "SetMPIN" }] });
          }
          return;
        }

        // 3) Active => Home
        if (mounted) navigation.reset({ index: 0, routes: [{ name: "Home" }] });
      } catch (e) {
        console.error("AuthGate error:", e);
        // fallback to OTP
        if (mounted) navigation.reset({ index: 0, routes: [{ name: "OTPScreen" }] });
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
