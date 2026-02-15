// App.js
import React, { useEffect, useContext, useRef } from "react";
import { AppState, DeviceEventEmitter, Alert } from "react-native";
import { NavigationContainer, CommonActions } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";

import AppNavigator from "./navigation/AppNavigator";
import { AppLockProvider, AppLockContext } from "./context/AppLockContext";
import { supabase } from "./api/supabase";
import { usePushNotifications } from "./hooks/usePushNotifications";

function AppWithLock() {
  const { setLocked } = useContext(AppLockContext);
  const appState = useRef(AppState.currentState);
  const navigationRef = useRef(null);

  // 📱 Register push notifications (safe, never blocks or crashes)
  usePushNotifications();

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

    // ✅ Listen for session_expired (logged in on another device)
    const sessionSub = DeviceEventEmitter.addListener("SESSION_EXPIRED", async (message) => {
      Alert.alert(
        "Session Expired",
        message || "Your account was logged in on another device. Please login again.",
        [{
          text: "OK",
          onPress: async () => {
            await supabase.auth.signOut();
            setLocked(false);
          }
        }]
      );
    });

    return () => {
      sub.remove();
      sessionSub.remove();
    };
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
