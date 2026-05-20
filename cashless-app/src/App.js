// App.js
import React, { useEffect, useContext, useRef, useState } from "react";
import Constants from "expo-constants";
import { AppState, DeviceEventEmitter, Alert, StatusBar as RNStatusBar, Platform, Text, View, Pressable, StyleSheet, Animated, Easing } from "react-native";
import { NavigationContainer, CommonActions, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, initialWindowMetrics, useSafeAreaInsets } from "react-native-safe-area-context";

import AppNavigator from "./navigation/AppNavigator";
import { AppLockProvider, AppLockContext } from "./context/AppLockContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { UserProvider } from "./context/UserContext";
import { supabase } from "./api/supabase";
import { hasMpin } from "./api/mpinLocal";
import { usePushNotifications } from "./hooks/usePushNotifications";
import { resolveNotificationDestination } from "./utils/notificationRouting";
// Preserve originals and only silence logs when explicitly disabled.
// Logs are enabled automatically in development (`__DEV__ === true`).
// You can also re-enable logs at runtime by setting `global.__ENABLE_LOGS__ = true` in the debugger.
const _origConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  table: console.table ? console.table.bind(console) : () => {},
  group: console.group ? console.group.bind(console) : () => {},
  groupCollapsed: console.groupCollapsed ? console.groupCollapsed.bind(console) : () => {},
  groupEnd: console.groupEnd ? console.groupEnd.bind(console) : () => {},
};

// By default logs are enabled during development, but for demoing on Android
// we silence console output to avoid showing the device console to users.
const logsEnabled = ((typeof __DEV__ !== "undefined" && __DEV__ && Platform.OS !== 'android') || global.__ENABLE_LOGS__ === true);
if (!logsEnabled) {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.debug = noop;
  console.warn = noop;
  console.error = noop;
  console.table = noop;
  console.group = noop;
  console.groupCollapsed = noop;
  console.groupEnd = noop;
} else {
  // Restore originals just in case other code replaced them earlier
  console.log = _origConsole.log;
  console.info = _origConsole.info;
  console.debug = _origConsole.debug;
  console.warn = _origConsole.warn;
  console.error = _origConsole.error;
  console.table = _origConsole.table;
  console.group = _origConsole.group;
  console.groupCollapsed = _origConsole.groupCollapsed;
  console.groupEnd = _origConsole.groupEnd;
}

// Disable text selection globally to avoid system selection overlays on Android
try {
  Text.defaultProps = Text.defaultProps || {};
  if (typeof Text.defaultProps.selectable === 'undefined') {
    Text.defaultProps.selectable = false;
  }
} catch (e) {
  // ignore
}

// Initialize Sentry (optional): reads DSN from app config or environment.
// To enable, set `expo.extra.sentryDsn` in app.json/eas.json or `process.env.SENTRY_DSN`.
try {
  const SENTRY_DSN =
    Constants?.expoConfig?.extra?.sentryDsn ||
    Constants?.manifest?.extra?.sentryDsn ||
    process.env?.SENTRY_DSN ||
    null;

  if (SENTRY_DSN) {
    // Require dynamically so bundlers don't fail when sentry isn't installed
    let SentryLib = null;
    try {
      // Prefer sentry-expo when available
      // eslint-disable-next-line global-require
      SentryLib = require('sentry-expo');
    } catch (e) {
      try {
        // Fallback to @sentry/react-native
        // eslint-disable-next-line global-require
        SentryLib = require('@sentry/react-native');
      } catch (e2) {
        SentryLib = null;
      }
    }

    if (SentryLib && typeof SentryLib.init === 'function') {
      SentryLib.init({
        dsn: SENTRY_DSN,
        enableInExpoDevelopment: false,
        debug: false,
        tracesSampleRate: 0.0,
      });
    } else if (SentryLib && SentryLib.Native && typeof SentryLib.Native.init === 'function') {
      // Edge-case: some packages expose Native.init
      SentryLib.Native.init({ dsn: SENTRY_DSN });
    }
  }
} catch (e) {
  // Do not crash the app if Sentry fails to initialize
}

function AppWithLock() {
  const { setLocked } = useContext(AppLockContext);
  const { isDarkMode, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const appState = useRef(AppState.currentState);
  const navigationRef = useRef(null);
  const bannerTimerRef = useRef(null);
  const bannerAnim = useRef(new Animated.Value(0)).current;
  const [notificationBanner, setNotificationBanner] = useState(null);
  // Track if we're just showing a system dialog (permission prompt, etc)
  // On iOS, system dialogs set state to 'inactive' but NOT 'background'.
  // We should ONLY lock when the app truly goes to background.
  const backgroundTimestampRef = useRef(null);

  // 📱 Register push notifications (safe, never blocks or crashes)
  usePushNotifications();

  const hideNotificationBanner = () => {
    Animated.timing(bannerAnim, {
      toValue: 0,
      duration: 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setNotificationBanner(null);
    });

    if (bannerTimerRef.current) {
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = null;
    }
  };

  const openNotificationBanner = (payload = {}) => {
    setNotificationBanner({
      title: String(payload.title || "Notification"),
      body: String(payload.body || "You have a new notification."),
      data: payload.data || {},
    });

    Animated.timing(bannerAnim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    if (bannerTimerRef.current) {
      clearTimeout(bannerTimerRef.current);
    }

    bannerTimerRef.current = setTimeout(() => {
      hideNotificationBanner();
    }, 6000);
  };

  const handleOpenNotification = () => {
    const payload = notificationBanner || {};
    const nav = navigationRef.current;
    const destination = resolveNotificationDestination(payload.data || payload, [], { fallbackRouteName: "Notifications" });

    hideNotificationBanner();

    if (nav?.navigate && destination?.routeName) {
      nav.navigate(destination.routeName, destination.params);
    }
  };

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

    const receivedSub = DeviceEventEmitter.addListener("PUSH_NOTIFICATION_RECEIVED", (payload = {}) => {
      openNotificationBanner(payload);
    });

    const isExpoGo =
      Constants?.appOwnership === "expo" ||
      Constants?.executionEnvironment === "storeClient" ||
      Constants?.executionEnvironment === "expoGo";

    let cancelled = false;
    let notificationModule = null;
    if (!isExpoGo) {
      try {
        notificationModule = require("expo-notifications");
      } catch {
        notificationModule = null;
      }
    }

    if (notificationModule?.getLastNotificationResponseAsync) {
      notificationModule.getLastNotificationResponseAsync().then((response) => {
        if (cancelled || !response) return;
        const data = response?.notification?.request?.content?.data || {};
        DeviceEventEmitter.emit("PUSH_NOTIFICATION_RESPONSE", data);
      }).catch(() => {});
    }

    return () => {
      cancelled = true;
      sub.remove();
      sessionSub.remove();
      pushSub.remove();
      receivedSub.remove();
      if (bannerTimerRef.current) {
        clearTimeout(bannerTimerRef.current);
      }
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
      {notificationBanner ? (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.bannerWrap,
            {
              top: insets.top + 8,
              opacity: bannerAnim,
              transform: [
                {
                  translateY: bannerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-14, 0],
                  }),
                },
                {
                  scale: bannerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.985, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Pressable
            onPress={handleOpenNotification}
            style={[
              styles.banner,
              {
                backgroundColor: isDarkMode ? "rgba(24, 27, 34, 0.92)" : "rgba(255,255,255,0.96)",
                borderColor: isDarkMode ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.80)",
              },
            ]}
          >
            <View style={[styles.bannerIcon, { backgroundColor: theme.accent }]}> 
              <Text style={styles.bannerIconText}>E</Text>
            </View>
            <View style={styles.bannerTextWrap}>
              <Text numberOfLines={1} style={[styles.bannerTitle, { color: theme.text }]}>
                {notificationBanner.title}
              </Text>
              <Text numberOfLines={2} style={[styles.bannerBody, { color: theme.textSecondary }]}>
                {notificationBanner.body}
              </Text>
            </View>
              <Pressable
                onPress={(event) => {
                  event?.stopPropagation?.();
                  hideNotificationBanner();
                }}
                hitSlop={10}
                style={styles.bannerClose}
              >
              <Text style={[styles.bannerCloseText, { color: theme.textMuted }]}>×</Text>
            </Pressable>
          </Pressable>
        </Animated.View>
      ) : null}
      <NavigationContainer ref={navigationRef} theme={navigationTheme}>
        <AppNavigator />
      </NavigationContainer>
    </>
  );
}

const styles = StyleSheet.create({
  bannerWrap: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 999,
    elevation: 999,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 28,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    elevation: 18,
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerIconText: {
    color: "#101114",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  bannerTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 2,
  },
  bannerBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  bannerClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    marginTop: -2,
  },
  bannerCloseText: {
    fontSize: 24,
    lineHeight: 24,
    marginTop: -2,
  },
});

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
