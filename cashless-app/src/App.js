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
        try {
          const { data } = await supabase.auth.getSession();
          const session = data?.session;

          if (session?.user?.id) {
            const userId = session.user.id;

            // Check if user has completed registration (profile exists)
            const { data: profile } = await supabase
              .from("profiles")
              .select("id")
              .eq("id", userId)
              .maybeSingle();

            if (profile?.id) {
              // Check if pin is set (only lock if pin is set)
              const { data: acc } = await supabase
                .from("commuter_accounts")
                .select("pin_set")
                .eq("commuter_id", userId)
                .maybeSingle();

              if (acc?.pin_set) {
                setLocked(true);
              }
            }
          }
        } catch (error) {
          console.log("Error checking lock status:", error);
        }
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
