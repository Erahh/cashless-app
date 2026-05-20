import { useEffect, useRef } from "react";
import { Alert, DeviceEventEmitter, Platform } from "react-native";
import Constants from "expo-constants";
import { supabase } from "../api/supabase";
import { fetchNotifications } from "../api/notificationsApi";
import { registerPushToken } from "../api/notificationsApi";

// Configure foreground notification handler immediately at the module level (required by Expo to show pop-ups in foreground)
let NotificationsModule;
try {
    NotificationsModule = require("expo-notifications");
} catch (err) {
    // Ignore if not in React Native / Expo environment
}

if (NotificationsModule && typeof NotificationsModule.setNotificationHandler === "function") {
    NotificationsModule.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowBanner: true,  // SDK 53+
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
        }),
    });
}

/**
 * Hook to handle push notifications.
 * For Expo Go Android: uses polling fallback (no remote push support in SDK 53+)
 * For other platforms: uses real push token registration
 *
 * This hook is safe - all errors are caught and logged, never thrown.
 */
export function usePushNotifications() {
    const tokenRef = useRef(null);
    const hasRegisteredRef = useRef(false);
    const notificationsRef = useRef(null);
    const pollIntervalRef = useRef(null);
    const seenNotificationIdsRef = useRef(new Set());
    const isExpoGoAndroidRef = useRef(false);

    useEffect(() => {
        let isMounted = true;
        const isExpoGo =
            Constants?.appOwnership === "expo" ||
            Constants?.executionEnvironment === "storeClient" ||
            Constants?.executionEnvironment === "expoGo";
        isExpoGoAndroidRef.current = isExpoGo; // Enable local polling fallback for both iOS and Android in Expo Go

        function getNotificationsModule() {
            if (!notificationsRef.current) {
                try {
                    notificationsRef.current = require("expo-notifications");
                } catch (err) {
                    notificationsRef.current = null;
                }
            }
            return notificationsRef.current;
        }

        async function setupPush() {
            // Skip remote push in Expo Go - will use polling instead
            if (isExpoGoAndroidRef.current) return;
            if (hasRegisteredRef.current) return;

            try {
                const Notifications = getNotificationsModule();

                // Ensure Android notification channel is configured for native push path
                await ensureAndroidNotificationChannel(Notifications);

                const { data } = await supabase.auth.getSession();
                if (!data?.session) return;

                // Request notification permission
                const { status: existingStatus } = await Notifications.getPermissionsAsync();
                let finalStatus = existingStatus;
                if (existingStatus !== "granted") {
                    const { status } = await Notifications.requestPermissionsAsync();
                    finalStatus = status;
                }
                if (finalStatus !== "granted") return;

                // Get Expo push token
                const configuredProjectId =
                    Constants?.expoConfig?.extra?.eas?.projectId ||
                    Constants?.easConfig?.projectId;
                const tokenOptions = configuredProjectId ? { projectId: configuredProjectId } : undefined;
                const pushToken = await Notifications.getExpoPushTokenAsync(tokenOptions);

                if (!isMounted || !pushToken) return;

                hasRegisteredRef.current = true;
                tokenRef.current = pushToken.data;

                if (__DEV__) {
                    console.log("Push token:", pushToken.data);
                }

                // Register token with backend
                registerPushToken(pushToken.data).catch((err) => {
                    console.warn("Failed to register push token:", err.message);
                });
            } catch (err) {
                console.warn("Push setup error:", err.message);
            }
        }

        function normalizeNotificationId(item) {
            return String(item?.id || item?.notification_id || item?.created_at || item?.sent_at || "");
        }

        async function ensureLocalNotificationPermission(Notifications) {
            try {
                const { status: existingStatus } = await Notifications.getPermissionsAsync();
                let finalStatus = existingStatus;

                if (existingStatus !== "granted") {
                    const { status } = await Notifications.requestPermissionsAsync();
                    finalStatus = status;
                }

                return finalStatus === "granted";
            } catch (error) {
                console.warn("Local notification permission error:", error?.message || error);
                return false;
            }
        }

        async function ensureAndroidNotificationChannel(Notifications) {
            if (Platform.OS !== "android") return;

            try {
                // Delete existing default channel first to reset any low importance or misconfigured properties on Android
                await Notifications.deleteNotificationChannelAsync("default");
            } catch (err) {
                // ignore if it doesn't exist
            }

            await Notifications.setNotificationChannelAsync("default", {
                name: "Default",
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: "#FF9500",
                sound: "default",
            });
        }

        async function seedSeenNotifications() {
            try {
                const items = await fetchNotifications(20);
                (items || []).forEach((item) => {
                    const id = normalizeNotificationId(item);
                    if (id) seenNotificationIdsRef.current.add(id);
                });
            } catch {
                // Ignore seed errors; polling can retry.
            }
        }

        async function startExpoGoFallback() {
            if (!isExpoGoAndroidRef.current || pollIntervalRef.current) return;

            const Notifications = getNotificationsModule();
            try {
                await ensureAndroidNotificationChannel(Notifications);
            } catch (err) {
                console.warn("Android channel setup failed:", err?.message || err);
            }

            const canShowLocalNotifications = await ensureLocalNotificationPermission(Notifications);
            if (!canShowLocalNotifications) {
                console.warn("Cannot show local notifications - permission denied");
                return;
            }

            await seedSeenNotifications();

            const pollOnce = async () => {
                try {
                    const { data } = await supabase.auth.getSession();
                    if (!data?.session) return;

                    const items = await fetchNotifications(20);
                    if (!items || items.length === 0) return;

                    for (const item of items) {
                        const id = normalizeNotificationId(item);
                        if (!id || seenNotificationIdsRef.current.has(id)) continue;

                        seenNotificationIdsRef.current.add(id);

                        // Backend stores notification content inside item.payload
                        const rawPayload = item.payload && typeof item.payload === "object"
                            ? item.payload
                            : {};
                        const title = String(
                            rawPayload.title || item.title || item.type || "Notification"
                        );
                        const body = String(
                            rawPayload.body || rawPayload.message ||
                            item.body || item.message || "You have a new notification."
                        );
                        // data for navigation on tap
                        const data = rawPayload;

                        try {
                            if (isExpoGoAndroidRef.current) {
                                DeviceEventEmitter.emit("PUSH_NOTIFICATION_RECEIVED", data);
                                Alert.alert(title, body);
                                continue;
                            }

                            await Notifications.scheduleNotificationAsync({
                                content: {
                                    title,
                                    body,
                                    data,
                                    sound: "default",
                                    badge: 1,
                                    // Note: vibrate & priority belong in the channel, not content
                                    channelId: "default",
                                },
                                trigger: null,
                            });

                            DeviceEventEmitter.emit("PUSH_NOTIFICATION_RECEIVED", data);
                        } catch (scheduleErr) {
                            console.warn("Failed to schedule notification:", scheduleErr?.message || scheduleErr);
                        }
                    }
                } catch (error) {
                    console.warn("Polling error:", error?.message || error);
                }
            };

            // Poll immediately, then every 2 seconds (reduced for instant feedback)
            await pollOnce();
            pollIntervalRef.current = setInterval(pollOnce, 2000);
            console.log("Started notification polling fallback every 2s");
        }

        // Set up notification handler first
        getNotificationsModule();

        // Run on mount
        setupPush();
        startExpoGoFallback();

        const Notifications = getNotificationsModule();
        const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
            const data = response?.notification?.request?.content?.data || {};
            DeviceEventEmitter.emit("PUSH_NOTIFICATION_RESPONSE", data);
        });

        const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
            const data = notification?.request?.content?.data || {};
            DeviceEventEmitter.emit("PUSH_NOTIFICATION_RECEIVED", data);
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

        // Android channel is set up via ensureAndroidNotificationChannel in both paths

        return () => {
            isMounted = false;
            hasRegisteredRef.current = false;
            subscription?.unsubscribe();
            responseSub?.remove?.();
            receivedSub?.remove?.();
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
            seenNotificationIdsRef.current.clear();
        };
    }, []);

    return tokenRef;
}
