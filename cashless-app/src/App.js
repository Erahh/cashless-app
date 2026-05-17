// App.js
import React, { useEffect, useContext, useRef } from "react";
import { AppState, DeviceEventEmitter, Alert, StatusBar as RNStatusBar, Platform } from "react-native";
import { NavigationContainer, CommonActions, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";

import AppNavigator from "./navigation/AppNavigator";
import { AppLockProvider, AppLockContext } from "./context/AppLockContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { UserProvider } from "./context/UserContext";
import { supabase } from "./api/supabase";
import { hasMpin } from "./api/mpinLocal";
import { usePushNotifications } from "./hooks/usePushNotifications";
import { resolveNotificationDestination } from "./utils/notificationRouting";

function AppWithLock() {
  const { setLocked } = useContext(AppLockContext);
  const { isDarkMode, theme } = useTheme();
  const appState = useRef(AppState.currentState);
  const navigationRef = useRef(null);
  // Track if we're just showing a system dialog (permission prompt, etc)
  // On iOS, system dialogs set state to 'inactive' but NOT 'background'.
  // We should ONLY lock when the app truly goes to background.
  const backgroundTimestampRef = useRef(null);

  // 📱 Register push notifications (safe, never blocks or crashes)
  usePushNotifications();

  const triggerLock = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if (!session?.user?.id) return;

      const isPinSet = await hasMpin();
      if (isPinSet) {
        setLocked(true);
      }
    } catch (error) {
      console.log("Error checking lock status:", error);
    }
  };

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      appState.current = nextState;

      // ✅ Record timestamp when fully going to background.
      if (nextState === "background") {
        backgroundTimestampRef.current = Date.now();
      }

      // ✅ Check elapsed time when coming back to active
      if (nextState === "active") {
        if (backgroundTimestampRef.current) {
          const elapsed = Date.now() - backgroundTimestampRef.current;
          // Trigger lock if it's been more than 10 seconds
          if (elapsed >= 10000) {
            triggerLock();
          }
        }
        // Always reset so active state doesn't keep triggering
        backgroundTimestampRef.current = null;
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

    const pushSub = DeviceEventEmitter.addListener("PUSH_NOTIFICATION_RESPONSE", (data = {}) => {
      try {
        const nav = navigationRef.current;
        if (!nav?.navigate) return;

        const destination = resolveNotificationDestination(data, [], { fallbackRouteName: "Notifications" });
        if (!destination?.routeName) return;
        nav.navigate(destination.routeName, destination.params);
      } catch (err) {
        // Ignore navigation errors from background responses
      }
    });

    return () => {
      sub.remove();
      sessionSub.remove();
      pushSub.remove();
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
    if (Platform.OS === "android") {
      RNStatusBar.setTranslucent(false);
      RNStatusBar.setBackgroundColor(theme.background, true);
    }
  }, [isDarkMode, theme.background]);

  return (
    <>
      <StatusBar
        style={isDarkMode ? "light" : "dark"}
        translucent={false}
        backgroundColor={theme.background}
      />
      <NavigationContainer ref={navigationRef} theme={navigationTheme}>
        <AppNavigator />
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ThemeProvider>
        <UserProvider>
          <AppLockProvider>
            <AppWithLock />
          </AppLockProvider>
        </UserProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
