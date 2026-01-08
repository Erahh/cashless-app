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
      return navigation.reset({ index: 0, routes: [{ name: "MPINUnlock" }] });
    }

    const boot = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;

      if (!session) {
        return navigation.reset({ index: 0, routes: [{ name: "PhoneScreen" }] });
      }

      const mpinSet = await hasMpin();
      if (!mpinSet) {
        return navigation.reset({ index: 0, routes: [{ name: "MPINSetup" }] });
      }

      return navigation.reset({ index: 0, routes: [{ name: "Home" }] });
    };

    boot();
  }, [navigation, locked]);

  return (
    <View style={{ padding: 20, marginTop: 80 }}>
      <Text style={{ fontSize: 18 }}>Loading...</Text>
    </View>
  );
}
