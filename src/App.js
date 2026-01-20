// App.js
import React, { useEffect, useContext, useRef } from "react";
import { AppState } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";

import AppNavigator from "./navigation/AppNavigator";
import { AppLockProvider, AppLockContext } from "./context/AppLockContext";
import { supabase } from "./api/supabase";

function AppWithLock() {
  const { setLocked } = useContext(AppLockContext);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener("change", async (nextState) => {
      // Only lock when moving from active -> background/inactive
      if (
        appState.current === "active" &&
        (nextState === "background" || nextState === "inactive")
      ) {
        const { data } = await supabase.auth.getSession();
        if (data?.session) setLocked(true);
      }

      appState.current = nextState;
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
    <AppLockProvider>
      <NavigationContainer>
        <AppWithLock />
      </NavigationContainer>
    </AppLockProvider>
  );
}
