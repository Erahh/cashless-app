import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { supabase } from "../api/supabase";
import { registerPushToken } from "../api/notificationsApi";

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

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

    useEffect(() => {
        let isMounted = true;

        async function setupPush() {
            // Guard: only register once per mount cycle
            if (hasRegisteredRef.current) return;

            try {
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
                    console.log("📱 Push notification permission denied");
                    return;
                }

                // 3. Get Expo push token
                const pushToken = await Notifications.getExpoPushTokenAsync({
                    projectId: "0cd82e3a-c938-4064-bdc0-78e6dd13313c", // From app.json
                });

                if (!isMounted) return;

                // Mark as registered so we don't spam
                hasRegisteredRef.current = true;
                tokenRef.current = pushToken.data;

                console.log("📱 Push token:", pushToken.data);

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

        // Also re-register when auth state changes (login/logout)
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event) => {
            if (event === "SIGNED_IN") {
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
        };
    }, []);

    return tokenRef;
}

