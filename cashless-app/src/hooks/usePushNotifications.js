import { useEffect, useRef } from "react";
import { DeviceEventEmitter, Platform } from "react-native";
import Constants from "expo-constants";
import { supabase } from "../api/supabase";
import { registerPushToken } from "../api/notificationsApi";

/**
 * Hook to handle push notification registration.
 * Call this once in your App component.
 * It will:
 *  1. Request permission
 *  2. Get Expo push token
 *  3. Send it to the backend
 *  4. Re-register when user logs in (only once)
 *
 * This hook is safe - all errors are caught and logged, never thrown.
 */
export function usePushNotifications() {
    const tokenRef = useRef(null);
    const hasRegisteredRef = useRef(false);
    const notificationsRef = useRef(null);

    useEffect(() => {
        let isMounted = true;
        const isExpoGo =
            Constants?.appOwnership === "expo" ||
            Constants?.executionEnvironment === "storeClient";
        const shouldSkipPushSetup = isExpoGo && Platform.OS === "android";
        let isHandlerConfigured = false;

        if (shouldSkipPushSetup) {
            // Android remote push is unsupported in Expo Go (SDK 53+).
            // Keep iOS Expo Go registration path enabled.
            return () => {};
        }

        function getNotificationsModule() {
            if (!notificationsRef.current) {
                notificationsRef.current = require("expo-notifications");
            }

            if (!isHandlerConfigured) {
                notificationsRef.current.setNotificationHandler({
                    handleNotification: async () => ({
                        shouldShowAlert: true,
                        shouldPlaySound: true,
                        shouldSetBadge: true,
                    }),
                });
                isHandlerConfigured = true;
            }

            return notificationsRef.current;
        }

        async function setupPush() {
            // Guard: only register once per mount cycle
            if (hasRegisteredRef.current) return;

            try {
                const Notifications = getNotificationsModule();

                // 1. Check if logged in
                const { data } = await supabase.auth.getSession();
                if (!data?.session) return; // Not logged in, skip

                // 2. Request permission
                const { status: existingStatus } =
                    await Notifications.getPermissionsAsync();
                let finalStatus = existingStatus;

                if (existingStatus !== "granted") {
                    const { status } = await Notifications.requestPermissionsAsync();
                    finalStatus = status;
                }

                if (finalStatus !== "granted") {
                    console.log("Push notification permission denied");
                    return;
                }

                // 3. Get Expo push token
                const configuredProjectId =
                    Constants?.expoConfig?.extra?.eas?.projectId ||
                    Constants?.easConfig?.projectId;
                const tokenOptions = configuredProjectId ? { projectId: configuredProjectId } : undefined;
                const pushToken = await Notifications.getExpoPushTokenAsync(tokenOptions);

                if (!isMounted) return;

                // Mark as registered so we don't spam
                hasRegisteredRef.current = true;
                tokenRef.current = pushToken.data;

                if (__DEV__) {
                    console.log("Push token:", pushToken.data);
                }

                // 4. Register with backend (fire and forget - don't block app)
                registerPushToken(pushToken.data).catch((err) => {
                    console.warn("Failed to register push token:", err.message);
                });
            } catch (err) {
                console.warn("Push notification setup error:", err.message);
            }
        }

        // Run on mount
        setupPush();

        const Notifications = getNotificationsModule();
        const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
            const data = response?.notification?.request?.content?.data || {};
            DeviceEventEmitter.emit("PUSH_NOTIFICATION_RESPONSE", data);
        });

        // Also re-register when auth state changes (login/logout)
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event) => {
            if (event === "SIGNED_IN") {
                hasRegisteredRef.current = false;
                setupPush(); // Will be skipped if already registered
            }
            if (event === "SIGNED_OUT") {
                // Reset so we re-register on next sign in
                hasRegisteredRef.current = false;
                tokenRef.current = null;
            }
        });

        // Set up Android notification channel
        if (Platform.OS === "android") {
            const Notifications = getNotificationsModule();
            Notifications.setNotificationChannelAsync("default", {
                name: "Default",
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: "#FF9500",
            });
        }

        return () => {
            isMounted = false;
            hasRegisteredRef.current = false;
            subscription?.unsubscribe();
            responseSub?.remove?.();
        };
    }, []);

    return tokenRef;
}
