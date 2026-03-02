// App.js
import React, { useEffect, useContext, useRef } from "react";
import { AppState, DeviceEventEmitter, Alert, StatusBar as RNStatusBar } from "react-native";
import { NavigationContainer, CommonActions, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";

import AppNavigator from "./navigation/AppNavigator";
import { AppLockProvider, AppLockContext } from "./context/AppLockContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { UserProvider } from "./context/UserContext";
import { supabase } from "./api/supabase";
import { usePushNotifications } from "./hooks/usePushNotifications";

function AppWithLock() {
  const { setLocked } = useContext(AppLockContext);
  const { isDarkMode, theme } = useTheme();
  const appState = useRef(AppState.currentState);
  // Track if we're just showing a system dialog (permission prompt, etc)
  // On iOS, system dialogs set state to 'inactive' but NOT 'background'.
  // We should ONLY lock when the app truly goes to background.
  const lockTimerRef = useRef(null);

  // 📱 Register push notifications (safe, never blocks or crashes)
  usePushNotifications();

  const triggerLock = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if (!session?.user?.id) return;

      const userId = session.user.id;

      // Check if user has completed registration (profile exists)
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (profile?.id) {
        const { data: acc } = await supabase
          .from("commuter_accounts")
          .select("pin_set")
          .eq("commuter_id", userId)
          .maybeSingle();

        if (acc?.pin_set) {
          setLocked(true);
        }
      }
    } catch (error) {
      console.log("Error checking lock status:", error);
    }
  };

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      const prev = appState.current;
      appState.current = nextState;

      // ✅ ONLY lock when going fully to background (not inactive).
      // "inactive" happens when system dialogs (camera permission, calls, etc)
      // are shown — we must NOT lock in that case or the camera screen breaks.
      if (prev === "active" && nextState === "background") {
        // 10-second grace period for fast app-switches (e.g. copy-paste)
        lockTimerRef.current = setTimeout(() => {
          triggerLock();
        }, 10000);
      }

      // If user comes back before timer fires, cancel the lock
      if (nextState === "active" && lockTimerRef.current) {
        clearTimeout(lockTimerRef.current);
        lockTimerRef.current = null;
      }
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
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setLocked]);

  const navigationTheme = {
    ...(isDarkMode ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDarkMode ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.background,
    },
  };


  // Imperatively force the status bar style to fix Android cold-start timing issues
  useEffect(() => {
    RNStatusBar.setBarStyle(isDarkMode ? "light-content" : "dark-content", true);
  }, [isDarkMode]);

  return (
    <>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <NavigationContainer theme={navigationTheme}>
        <AppNavigator />
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <AppLockProvider>
          <AppWithLock />
        </AppLockProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
