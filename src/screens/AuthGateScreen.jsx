import React, { useEffect, useContext } from "react";
import { View, Text } from "react-native";
import { supabase } from "../api/supabase";
import { hasMpin } from "../api/mpinLocal";
import { AppLockContext } from "../context/AppLockContext";

export default function AuthGateScreen({ navigation }) {
  const { locked } = useContext(AppLockContext);

  useEffect(() => {
    // If app is locked, redirect to unlock screen
    if (locked) {
      // Use setTimeout to ensure navigator is ready
      const timer = setTimeout(() => {
        navigation.replace("MPINUnlock");
      }, 100);
      return () => clearTimeout(timer);
    }

    const boot = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;

      if (!session) {
        setTimeout(() => {
          navigation.replace("PhoneScreen");
        }, 100);
        return;
      }

      const mpinSet = await hasMpin();
      if (!mpinSet) {
        setTimeout(() => {
          navigation.replace("MPINSetup");
        }, 100);
        return;
      }

      setTimeout(() => {
        navigation.replace("Home");
      }, 100);
    };

    boot();
  }, [navigation, locked]);

  return (
    <View style={{ padding: 20, marginTop: 80 }}>
      <Text style={{ fontSize: 18 }}>Loading...</Text>
    </View>
  );
}
