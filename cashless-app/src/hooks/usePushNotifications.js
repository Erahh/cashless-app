import { useEffect, useRef } from "react";
import { DeviceEventEmitter, Platform } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from "expo-constants";
import { supabase } from "../api/supabase";
import { fetchNotifications, deleteNotification } from "../api/notificationsApi";
import { registerPushToken } from "../api/notificationsApi";

function isExpoGoEnvironment() {
    return (
        Constants?.appOwnership === "expo" ||
        Constants?.executionEnvironment === "storeClient" ||
        Constants?.executionEnvironment === "expoGo"
    );
}

// Register notification handler at module scope, but only when NOT running
// inside Expo Go / store client. This ensures system banners appear quickly
// on real/dev clients while avoiding the Expo Go remote-push warning.
try {
    if (!isExpoGoEnvironment()) {
        // eslint-disable-next-line global-require
        const _Notifications = require('expo-notifications');
        if (_Notifications && typeof _Notifications.setNotificationHandler === 'function') {
            _Notifications.setNotificationHandler({
                handleNotification: async () => ({
                    shouldShowBanner: true,
                    shouldShowList: true,
                    shouldPlaySound: true,
                    shouldSetBadge: true,
                }),
            });
        }
    }
} catch (e) {
    // ignore: avoiding hard dependency at module load in Expo Go
}

/**
 * Hook to handle push notifications.
 * For Expo Go Android: uses polling fallback (no remote push support in SDK 53+)
 * For Expo Go / store client: uses polling fallback so the app still feels live in demo mode.
 * For standalone/dev builds: uses real push token registration.
 *
 * This hook is safe - all errors are caught and logged, never thrown.
 */
export function usePushNotifications() {
    const tokenRef = useRef(null);
    const hasRegisteredRef = useRef(false);
    const notificationsRef = useRef(null);
    const pollIntervalRef = useRef(null);
    const seenNotificationKeysRef = useRef(new Set());
    const isExpoGoFallbackRef = useRef(false);

    useEffect(() => {
        let isMounted = true;
        const isExpoGo = isExpoGoEnvironment();
        isExpoGoFallbackRef.current = isExpoGo;

        function extractNotificationPayload(source = {}) {
            const content = source?.notification?.request?.content || source?.request?.content || source?.content || {};
            const data = content?.data && typeof content.data === "object" ? content.data : {};

            return {
                title: String(content?.title || data?.title || data?.type || "Notification"),
                body: String(content?.body || data?.body || data?.message || "You have a new notification."),
                data,
                notificationId: String(source?.notification?.request?.identifier || source?.request?.identifier || content?.data?.id || ""),
            };
        }

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
            if (isExpoGoFallbackRef.current) return;
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

        const SEEN_KEY = 'seen_notifications_v1';

        function notificationKey(item, title, body, data) {
            // Prefer stable server id fields; fall back to content-based key
            const id = normalizeNotificationId(item);
            if (id) return `id:${id}`;
            try {
                const payload = JSON.stringify({ title, body, data });
                return `hash:${payload}`;
            } catch (e) {
                return `hash:${title}::${body}`;
            }
        }

        async function loadSeenKeysFromStorage() {
            try {
                const raw = await AsyncStorage.getItem(SEEN_KEY);
                if (!raw) return;
                const arr = JSON.parse(raw);
                if (Array.isArray(arr)) {
                    seenNotificationKeysRef.current = new Set(arr);
                }
            } catch (e) {
                // ignore
            }
        }

        async function saveSeenKeysToStorage() {
            try {
                const arr = Array.from(seenNotificationKeysRef.current || []);
                await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(arr));
            } catch (e) {
                // ignore
            }
        }

        async function addSeenKeyAndSave(key) {
            try {
                if (!key) return;
                seenNotificationKeysRef.current.add(key);
                await saveSeenKeysToStorage();
            } catch (e) {
                // ignore
            }
        }

        async function seedSeenNotifications() {
            try {
                const items = await fetchNotifications(50);
                (items || []).forEach((item) => {
                    const title = String((item.payload && item.payload.title) || item.title || item.type || '');
                    const body = String((item.payload && item.payload.body) || item.body || '');
                    const data = (item.payload && typeof item.payload === 'object') ? item.payload : {};
                    const key = notificationKey(item, title, body, data);
                    if (key) seenNotificationKeysRef.current.add(key);
                });
                await saveSeenKeysToStorage();
            } catch (err) {
                // Ignore seed errors; polling can retry.
            }
        }

        async function startExpoGoFallback() {
            if (!isExpoGoFallbackRef.current || pollIntervalRef.current) return;

            const Notifications = getNotificationsModule();
            if (!Notifications) return;
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

            await loadSeenKeysFromStorage();
            await seedSeenNotifications();

            const pollOnce = async () => {
                try {
                    const { data } = await supabase.auth.getSession();
                    if (!data?.session) return;

                    const items = await fetchNotifications(20);
                    if (!items || items.length === 0) return;

                    for (const item of items) {
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

                        const key = notificationKey(item, title, body, data);
                        if (!key || seenNotificationKeysRef.current.has(key)) continue;

                        seenNotificationKeysRef.current.add(key);

                        try {
                            if (isExpoGoFallbackRef.current) {
                                // In Expo Go fallback we previously showed a blocking Alert for every polled notification.
                                // That is noisy when opening the app — schedule a local notification instead so the user
                                // receives a system notification rather than a modal alert. Emit the in-app event only
                                // after scheduling to avoid duplicates in the UI.
                                try {
                                    if (Notifications && typeof Notifications.scheduleNotificationAsync === 'function') {
                                        await Notifications.scheduleNotificationAsync({
                                            content: {
                                                title,
                                                body,
                                                data,
                                                sound: 'default',
                                                badge: 1,
                                                interruptionLevel: 'time-sensitive',
                                                priority: 'max',
                                                channelId: 'default',
                                            },
                                            trigger: null,
                                        });
                                        // persist seen key so we don't reshow
                                        try { await saveSeenKeysToStorage(); } catch (e) {}
                                        DeviceEventEmitter.emit("PUSH_NOTIFICATION_RECEIVED", {
                                            title,
                                            body,
                                            data,
                                        });
                                    } else {
                                        // Fallback: emit the event; UI can listen to the event.
                                        DeviceEventEmitter.emit("PUSH_NOTIFICATION_RECEIVED", {
                                            title,
                                            body,
                                            data,
                                        });
                                    }
                                } catch (notifErr) {
                                    console.warn('Failed to schedule local notification fallback:', notifErr?.message || notifErr);
                                }
                                continue;
                            }

                            await Notifications.scheduleNotificationAsync({
                                content: {
                                    title,
                                    body,
                                    data,
                                    sound: "default",
                                    badge: 1,
                                    interruptionLevel: 'time-sensitive',  // iOS 15+: show as banner immediately
                                    priority: 'max',  // Android: highest priority
                                    channelId: "default",
                                },
                                trigger: null,
                            });
                            try { await saveSeenKeysToStorage(); } catch (e) {}
                            // Auto-acknowledge (delete) server notification when we've shown a local notification
                            try {
                                const serverId = normalizeNotificationId(item);
                                if (serverId) {
                                    // serverId may be a timestamp or id; attempt delete and ignore failures
                                    deleteNotification(serverId).catch(() => {});
                                }
                            } catch (e) {
                                // ignore
                            }

                            DeviceEventEmitter.emit("PUSH_NOTIFICATION_RECEIVED", {
                                title,
                                body,
                                data,
                            });
                        } catch (scheduleErr) {
                            console.warn("Failed to schedule notification:", scheduleErr?.message || scheduleErr);
                        }
                    }
                } catch (error) {
                    console.warn("Polling error:", error?.message || error);
                }
            };

            // Poll immediately, then every 5 seconds for snappier Expo Go demos.
            // NOTE: shorter intervals increase network/battery usage; revert for production.
            await pollOnce();
            pollIntervalRef.current = setInterval(pollOnce, 5000);
        }

        // Supabase Realtime subscription to receive immediate in-app events
        let realtimeChannel = null;
        function setupRealtimeSubscription(userId) {
            try {
                // Subscribe to inserts where commuter_id or guardian_id equals current user
                realtimeChannel = supabase.channel(`notification_outbox_user_${userId}`);

                realtimeChannel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notification_outbox', filter: `commuter_id=eq.${userId}` }, (payload) => {
                    try {
                        const item = payload?.new || {};
                        const title = String((item.payload && item.payload.title) || item.payload?.title || item.title || 'Notification');
                        const body = String((item.payload && item.payload.body) || item.payload?.body || item.body || 'You have a new notification.');
                        const data = (item.payload && typeof item.payload === 'object') ? item.payload : {};
                        const key = notificationKey(item, title, body, data);
                        if (!key || seenNotificationKeysRef.current.has(key)) return; // ignore old/seen
                        // persist seen key before emitting to avoid duplicates
                        addSeenKeyAndSave(key).catch(() => {});
                        DeviceEventEmitter.emit('PUSH_NOTIFICATION_RECEIVED', { title, body, data });
                    } catch (e) {
                        // ignore
                    }
                });

                realtimeChannel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notification_outbox', filter: `guardian_id=eq.${userId}` }, (payload) => {
                    try {
                        const item = payload?.new || {};
                        const title = String((item.payload && item.payload.title) || item.payload?.title || item.title || 'Notification');
                        const body = String((item.payload && item.payload.body) || item.payload?.body || item.body || 'You have a new notification.');
                        const data = (item.payload && typeof item.payload === 'object') ? item.payload : {};
                        const key = notificationKey(item, title, body, data);
                        if (!key || seenNotificationKeysRef.current.has(key)) return; // ignore old/seen
                        addSeenKeyAndSave(key).catch(() => {});
                        DeviceEventEmitter.emit('PUSH_NOTIFICATION_RECEIVED', { title, body, data });
                    } catch (e) {}
                });

                // Activate subscription
                realtimeChannel.subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        if (__DEV__) console.log('Realtime notifications subscribed for', userId);
                    }
                });
            } catch (err) {
                console.warn('Realtime subscription error:', err?.message || err);
            }
        }

        // Set up notification handler first, but only outside Expo Go on Android.
        const Notifications = getNotificationsModule();
        if (Notifications && typeof Notifications.setNotificationHandler === "function") {
            Notifications.setNotificationHandler({
                handleNotification: async () => ({
                    shouldShowBanner: true,
                    shouldShowList: true,
                    shouldPlaySound: true,
                    shouldSetBadge: true,
                }),
            });
        }

        // Run on mount
        setupPush();
        startExpoGoFallback();

        // Also set up realtime subscription for immediate in-app popups
        (async () => {
            try {
                const { data } = await supabase.auth.getSession();
                const userId = data?.session?.user?.id;
                if (userId) setupRealtimeSubscription(userId);
            } catch (e) {
                // ignore
            }
        })();

        if (Notifications == null) {
            return () => {
                isMounted = false;
                hasRegisteredRef.current = false;
                try { if (realtimeChannel) realtimeChannel.unsubscribe(); } catch (e) {}
            };
        }

        const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
            DeviceEventEmitter.emit("PUSH_NOTIFICATION_RESPONSE", extractNotificationPayload(response));
        });

        const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
            DeviceEventEmitter.emit("PUSH_NOTIFICATION_RECEIVED", extractNotificationPayload(notification));
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
            if (seenNotificationKeysRef.current) seenNotificationKeysRef.current.clear();
            try { if (realtimeChannel) realtimeChannel.unsubscribe(); } catch (e) {}
        };
    }, []);

    return tokenRef;
}
