// App.js
import React, { useEffect, useContext } from "react";
import { AppState } from "react-native";
import { NavigationContainer } from "@react-navigation/native";

import AppNavigator from "./navigation/AppNavigator";
import { AppLockProvider, AppLockContext } from "./context/AppLockContext";
import { supabase } from "./api/supabase";

import { StatusBar } from "expo-status-bar";

function AppWithLock() {
  const { setLocked } = useContext(AppLockContext);

  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      // Lock when leaving the app (inactive/background)
      if (state === "background" || state === "inactive") {
        const { data } = await supabase.auth.getSession();
        if (data?.session) setLocked(true);
      }
    });

    return () => sub.remove();
  }, [setLocked]);

  return (
    <>
      <StatusBar style="light" />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <AppLockProvider>
        <AppWithLock />
      </AppLockProvider>
    </NavigationContainer>
  );
}
