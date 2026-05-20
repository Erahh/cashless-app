import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Dimensions,
    ScrollView,
    Modal,
    Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
    ArrowLeft01Icon,
    Cancel01Icon,
    EyeIcon,
    Layers02Icon,
    LocationUser01Icon,
    Navigation01Icon,
    RefreshIcon,
    UserAdd01Icon,
    UserGroupIcon,
    WalkingIcon,
    ViewOffIcon,
} from '@hugeicons/core-free-icons';
import { api } from '../../api/apiHelper';
import logger from '../../utils/logger';
import { API_BASE_URL } from '../../config/api';

const { width, height } = Dimensions.get('window');

export default function FriendsMapScreen({ navigation, route }) {
    const [myLocation, setMyLocation] = useState(null);
    const [friends, setFriends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [shareLocation, setShareLocation] = useState(true);
    const [mapMode, setMapMode] = useState('street'); // 'street' | 'satellite'
    const [walkingMode, setWalkingMode] = useState(false);
    const [followMode, setFollowMode] = useState(false); // auto-center on selected friend
    const [showFriendsList, setShowFriendsList] = useState(false);
    const [onlineToast, setOnlineToast] = useState(null); // {name, visible}
    const [refreshing, setRefreshing] = useState(false);
    const [streetViewVisible, setStreetViewVisible] = useState(false);
    const [streetViewUrl, setStreetViewUrl] = useState('');
    const [selectedFriendId, setSelectedFriendId] = useState(null);
    const [friendTrails, setFriendTrails] = useState({});
    const [backendStatus, setBackendStatus] = useState('online'); // online | offline
    const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true); // Toggle auto-refresh
    const webViewRef = useRef(null);
    const broadcastIntervalRef = useRef(null);
    const walkWatchRef = useRef(null);
    const lastWalkSyncRef = useRef(0);
    const previousMapModeRef = useRef('street');
    const prevOnlineRef = useRef({}); // Track previous online states
    const toastTimeoutRef = useRef(null);
    const followIntervalRef = useRef(null);
    const fallbackLocationRef = useRef({ latitude: 14.5995, longitude: 120.9842 });
    const refreshPauseUntilRef = useRef(0);
    const broadcastPauseUntilRef = useRef(0);
    const failureNoticeTimeoutRef = useRef(null);
    const mapReadyRef = useRef(false);
    const pendingMapDataRef = useRef(null);

    const handleBackendFailure = (scope, error) => {
        const now = Date.now();
        if (scope === 'refresh') {
            refreshPauseUntilRef.current = now + 30000;
        }
        if (scope === 'broadcast') {
            broadcastPauseUntilRef.current = now + 30000;
        }

        if (now - (failureNoticeTimeoutRef.current || 0) > 30000) {
            failureNoticeTimeoutRef.current = now;
            setBackendStatus('offline');
        }

        if (__DEV__) {
            console.warn(`Friends map ${scope} failed:`, error?.message || error);
        }
    };

    const getBestAvailableLocation = async () => {
        try {
            const current = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            return current;
        } catch (currentError) {
            try {
                const lastKnown = await Location.getLastKnownPositionAsync();
                return lastKnown;
            } catch (lastKnownError) {
                console.warn('No usable location fix available:', currentError, lastKnownError);
                return null;
            }
        }
    };

    useEffect(() => {
        initializeMap();

        // Refresh friends' locations every 10 seconds (only if auto-refresh is enabled)
        let friendsInterval;
        if (isAutoRefreshEnabled) {
            friendsInterval = setInterval(refreshFriendsLocations, 10000);
        }

        return () => {
            if (friendsInterval) clearInterval(friendsInterval);
            if (broadcastIntervalRef.current) {
                clearInterval(broadcastIntervalRef.current);
            }
            if (walkWatchRef.current) {
                walkWatchRef.current.remove();
                walkWatchRef.current = null;
            }
            if (toastTimeoutRef.current) {
                clearTimeout(toastTimeoutRef.current);
            }
            if (followIntervalRef.current) {
                clearInterval(followIntervalRef.current);
                followIntervalRef.current = null;
            }
        };
    }, [isAutoRefreshEnabled]);

    useEffect(() => {
        if (route?.params?.friendId) {
            setSelectedFriendId(String(route.params.friendId));
        }
    }, [route?.params?.friendId]);

    const initializeMap = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required to use this feature.');
                setLoading(false);
                return;
            }

            const location = await getBestAvailableLocation();
            const initialLocation = location
                ? {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                }
                : fallbackLocationRef.current;

            setMyLocation(initialLocation);

            await refreshFriendsLocations();

            // Start broadcasting location
            if (shareLocation) {
                startBroadcasting();
            }
        } catch (error) {
            logger.error('Error initializing map:', error);
            Alert.alert('Error', 'Failed to get your location');
        } finally {
            setLoading(false);
        }
    };

    const startBroadcasting = () => {
        if (broadcastIntervalRef.current) return;

        broadcastIntervalRef.current = setInterval(async () => {
            if (Date.now() < broadcastPauseUntilRef.current) return;
            try {
                const location = await getBestAvailableLocation();
                if (!location) return;

                setMyLocation({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                });

                await api('/friends/update-location', {
                    method: 'POST',
                    body: JSON.stringify({
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        accuracy: location.coords.accuracy,
                        speed: location.coords.speed,
                        heading: location.coords.heading,
                    })
                });
                setBackendStatus('online');
            } catch (error) {
                handleBackendFailure('broadcast', error);
            }
        }, 15000);
    };

    const refreshFriendsLocations = async () => {
        if (Date.now() < refreshPauseUntilRef.current) return;

        try {
            const response = await api('/friends/locations-realtime');

            if (response.ok) {
                const newFriends = normalizeFriendRows(response.friends || []);

                // Detect friends who just came online
                newFriends.forEach(f => {
                    const wasOnline = prevOnlineRef.current[f.friend_id];
                    if (f.is_online && wasOnline === false) {
                        // Friend transitioned from offline to online
                        showOnlineToast(f.friend_name || 'A friend');
                    }
                });

                // Update previous online states
                const onlineMap = {};
                newFriends.forEach(f => { onlineMap[f.friend_id] = f.is_online; });
                prevOnlineRef.current = onlineMap;

                setFriends(newFriends);
                setBackendStatus('online');
                setFriendTrails((prev) => {
                    const next = { ...prev };
                    const now = Date.now();

                    newFriends.forEach((f) => {
                        if (typeof f.latitude !== "number" || typeof f.longitude !== "number") return;
                        const key = String(f.friend_id);
                        const point = { lat: f.latitude, lng: f.longitude, ts: now };
                        const current = next[key] || [];
                        const last = current[current.length - 1];

                        const samePoint =
                            !!last &&
                            Math.abs(last.lat - point.lat) < 0.00001 &&
                            Math.abs(last.lng - point.lng) < 0.00001;

                        const updated = samePoint ? current : [...current, point];
                        // Keep recent movement window only.
                        next[key] = updated.filter((p) => now - p.ts <= 20 * 60 * 1000).slice(-25);
                    });

                    return next;
                });
            } else {
                handleBackendFailure('refresh', new Error(response?.error || 'Failed to load friends locations'));
            }
        } catch (error) {
            handleBackendFailure('refresh', error);
        }
    };

    const showOnlineToast = (friendName) => {
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        setOnlineToast({ name: friendName });
        toastTimeoutRef.current = setTimeout(() => {
            setOnlineToast(null);
            toastTimeoutRef.current = null;
        }, 4000);
    };

    const toggleLocationSharing = async () => {
        try {
            const newValue = !shareLocation;
            const response = await api('/friends/share-location', {
                method: 'PUT',
                body: JSON.stringify({ enabled: newValue })
            });

            if (response.ok) {
                setShareLocation(newValue);
                if (newValue) {
                    if (!walkingMode) {
                        startBroadcasting();
                    }
                } else if (broadcastIntervalRef.current) {
                    clearInterval(broadcastIntervalRef.current);
                    broadcastIntervalRef.current = null;
                }
                Alert.alert(
                    'Location Sharing',
                    `You are now ${newValue ? 'visible' : 'hidden'} to your friends`
                );
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update location sharing');
        }
    };

    const startWalkingTracking = async () => {
        if (walkWatchRef.current) return;

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Location permission is required for walking mode.');
            return;
        }

        // Disable interval-based updates while using live walking tracking.
        if (broadcastIntervalRef.current) {
            clearInterval(broadcastIntervalRef.current);
            broadcastIntervalRef.current = null;
        }

        walkWatchRef.current = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.High,
                distanceInterval: 3,
                timeInterval: 2000,
            },
            async (location) => {
                const nextLocation = {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                };

                setMyLocation(nextLocation);

                // Throttle backend sync to avoid excessive API calls while walking.
                if (shareLocation) {
                    const now = Date.now();
                    if (now - lastWalkSyncRef.current >= 8000) {
                        lastWalkSyncRef.current = now;
                        try {
                            await api('/friends/update-location', {
                                method: 'POST',
                                body: JSON.stringify({
                                    latitude: location.coords.latitude,
                                    longitude: location.coords.longitude,
                                    accuracy: location.coords.accuracy,
                                    speed: location.coords.speed,
                                    heading: location.coords.heading,
                                })
                            });
                        } catch (syncErr) {
                            logger.error('Walking mode sync error:', syncErr);
                        }
                    }
                }
            }
        );
    };

    const stopWalkingTracking = () => {
        if (walkWatchRef.current) {
            walkWatchRef.current.remove();
            walkWatchRef.current = null;
        }

        // Restore interval broadcasting if sharing is enabled.
        if (shareLocation) {
            startBroadcasting();
        }
    };

    const toggleWalkingMode = async () => {
        try {
            if (walkingMode) {
                stopWalkingTracking();
                setWalkingMode(false);
                setMapMode(previousMapModeRef.current || 'street');
                return;
            }

            previousMapModeRef.current = mapMode;
            setMapMode('satellite');
            await startWalkingTracking();
            setWalkingMode(true);
        } catch (error) {
            logger.error('Walking mode error:', error);
            Alert.alert('Error', 'Failed to enable walking mode');
        }
    };

    const openStreetView = async () => {
        if (!myLocation) {
            Alert.alert('Location unavailable', 'Cannot open Street View without your current location.');
            return;
        }

        const { latitude, longitude } = myLocation;
        const panoUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${latitude},${longitude}`;

        setStreetViewUrl(panoUrl);
        setStreetViewVisible(true);
    };

    const handleStreetViewError = async () => {
        if (!streetViewUrl) return;

        try {
            const canOpen = await Linking.canOpenURL(streetViewUrl);
            if (!canOpen) {
                Alert.alert('Unavailable', 'Street View is not available on this device right now.');
                return;
            }

            await Linking.openURL(streetViewUrl);
        } catch (error) {
            logger.error('Street View open error:', error);
            Alert.alert('Error', 'Failed to open Street View.');
        }
    };

    const getTimeSince = (timestamp) => {
        if (!timestamp) return 'Unknown';
        const diff = Date.now() - new Date(timestamp).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    const toRad = (deg) => (deg * Math.PI) / 180;
    const haversineDistanceMeters = (lat1, lon1, lat2, lon2) => {
        if ([lat1, lon1, lat2, lon2].some((v) => typeof v !== 'number')) return null;
        const R = 6371000; // metres
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const formatDistance = (meters) => {
        if (meters == null) return '—';
        if (meters < 1000) return `${Math.round(meters)}m`;
        return `${(meters / 1000).toFixed(2)}km`;
    };

    const formatSpeed = (speed) => {
        if (speed == null || isNaN(speed)) return '—';
        // API may return m/s — show km/h if > 0
        const kmh = speed * 3.6;
        if (kmh < 1) return `${Math.round(speed)} m/s`;
        return `${Math.round(kmh)} km/h`;
    };

    // Follow mode: keep WebView map centered on selected friend
    useEffect(() => {
        if (followIntervalRef.current) {
            clearInterval(followIntervalRef.current);
            followIntervalRef.current = null;
        }

        if (!followMode) return;

        followIntervalRef.current = setInterval(() => {
            try {
                if (!selectedFriendId || !webViewRef.current) return;
                const f = friends.find((x) => String(x.friend_id) === String(selectedFriendId));
                if (!f || typeof f.latitude !== 'number' || typeof f.longitude !== 'number') return;
                const js = `try{ if(window.map){ window.map.setView([${f.latitude}, ${f.longitude}], 16);} }catch(e){}; true;`;
                webViewRef.current.injectJavaScript(js);
            } catch (err) {
                // ignore
            }
        }, 1000);

        return () => {
            if (followIntervalRef.current) {
                clearInterval(followIntervalRef.current);
                followIntervalRef.current = null;
            }
        };
    }, [followMode, selectedFriendId, friends]);

    useEffect(() => {
        syncMapToWebView();
    }, [myLocation, friends, mapMode, selectedFriendId, friendTrails]);

    const escapeHtml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const resolveAvatarUrl = (value) => {
        const raw = String(value || '').trim();
        if (!raw) return '';
        if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) return raw;
        return `${API_BASE_URL}${raw.startsWith('/') ? '' : '/'}${raw}`;
    };

    const normalizeFriendRows = (rows = []) => {
        const byFriendId = new Map();

        rows.forEach((row) => {
            const friendId = row?.friend_id;
            if (friendId == null) return;

            const key = String(friendId);
            const existing = byFriendId.get(key);
            const rowUpdatedAt = new Date(row.location_updated || row.last_seen || 0).getTime() || 0;
            const existingUpdatedAt = existing
                ? new Date(existing.location_updated || existing.last_seen || 0).getTime() || 0
                : 0;

            const merged = existing
                ? {
                    ...existing,
                    ...row,
                    friend_id: key,
                    can_show_on_map: Boolean(existing.can_show_on_map || row.can_show_on_map),
                    is_online: Boolean(existing.is_online || row.is_online),
                    location_updated: rowUpdatedAt >= existingUpdatedAt
                        ? (row.location_updated || existing.location_updated || null)
                        : (existing.location_updated || row.location_updated || null),
                    last_seen: rowUpdatedAt >= existingUpdatedAt
                        ? (row.last_seen || existing.last_seen || null)
                        : (existing.last_seen || row.last_seen || null),
                    avatar_url: existing.avatar_url || row.avatar_url || row.profile_picture || row.friend_avatar_url || null,
                }
                : {
                    ...row,
                    friend_id: key,
                    can_show_on_map: Boolean(row.can_show_on_map),
                    is_online: Boolean(row.is_online),
                    avatar_url: row.avatar_url || row.profile_picture || row.friend_avatar_url || null,
                };

            byFriendId.set(key, merged);
        });

        return Array.from(byFriendId.values())
            .map((friend) => {
                const updatedAt = new Date(friend.location_updated || friend.last_seen || 0).getTime() || 0;
                const inferredOnline = updatedAt > 0 && Date.now() - updatedAt <= 5 * 60 * 1000;

                return {
                    ...friend,
                    is_online: Boolean(friend.is_online || inferredOnline),
                    status_label: friend.status_label || ((friend.is_online || inferredOnline) ? 'Online' : 'Offline'),
                };
            })
            .sort((a, b) => String(a.friend_name || '').localeCompare(String(b.friend_name || '')));
    };

    const buildMapPayload = () => {
        const friendsForMap = friends.filter(
            (f) => f.can_show_on_map && typeof f.latitude === 'number' && typeof f.longitude === 'number'
        );

        return {
            myLocation: myLocation || { latitude: 14.5995, longitude: 120.9842 },
            mapMode,
            selectedFriendId: selectedFriendId ? String(selectedFriendId) : null,
            friends: friendsForMap.map((f) => ({
                friend_id: String(f.friend_id),
                friend_name: f.friend_name || 'Friend',
                latitude: f.latitude,
                longitude: f.longitude,
                is_online: !!f.is_online,
                status_label: f.status_label || (f.is_online ? 'Online' : 'Offline'),
                location_updated: f.location_updated || null,
                last_seen: f.last_seen || null,
                avatar_url: resolveAvatarUrl(
                    f.avatar_url || f.friend_avatar_url || f.profile_picture || f.profile_image_url || ''
                ),
                trail: (friendTrails[String(f.friend_id)] || []).slice(-25),
            })),
        };
    };

    const syncMapToWebView = () => {
        if (!webViewRef.current) return;
        const payload = JSON.stringify(buildMapPayload());
        pendingMapDataRef.current = payload;
        if (!mapReadyRef.current) return;
        webViewRef.current.injectJavaScript(`window.renderMapData(${payload}); true;`);
    };

    // Generate HTML for the map
    const generateMapHtml = () => {
        const lat = myLocation?.latitude || 14.5995;
        const lng = myLocation?.longitude || 120.9842;
        const isSatelliteMode = mapMode === 'satellite';
        const tileUrl = isSatelliteMode
            ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        const tileAttribution = isSatelliteMode
            ? 'Tiles © Esri'
            : '© OpenStreetMap';

        return `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        * { margin: 0; padding: 0; }
        html, body { height: 100%; width: 100%; }
        #map { height: 100%; width: 100%; }
        .my-marker {
            background: #2196F3;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 4px solid white;
            box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.4), 0 2px 6px rgba(0,0,0,0.3);
        }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        var map = L.map('map').setView([${lat}, ${lng}], 15);
        var currentMode = ${JSON.stringify(mapMode)};
        var myMarker = null;
        var friendLayer = L.layerGroup().addTo(map);
        var trailLayer = L.layerGroup().addTo(map);
        var tileLayer = L.tileLayer(${JSON.stringify(tileUrl)}, {
            attribution: ${JSON.stringify(tileAttribution)}
        }).addTo(map);

        function escapeHtml(value) {
            return String(value || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function getTimeSince(timestamp) {
            if (!timestamp) return 'Unknown';
            var diff = Date.now() - new Date(timestamp).getTime();
            var minutes = Math.floor(diff / 60000);
            if (minutes < 1) return 'Just now';
            if (minutes < 60) return minutes + 'm ago';
            var hours = Math.floor(minutes / 60);
            if (hours < 24) return hours + 'h ago';
            return Math.floor(hours / 24) + 'd ago';
        }

        function buildMarkerHtml(friend, selectedId) {
            var displayName = friend.friend_name || 'Friend';
            var markerInitial = escapeHtml((displayName || '?').charAt(0).toUpperCase() || '?');
            var isSelected = String(selectedId || '') === String(friend.friend_id || '');
            var avatarUrl = String(friend.avatar_url || '').trim();
            if (avatarUrl) {
                return '<div style="width: 36px; height: 36px; border-radius: 50%; border: 3px solid ' + (isSelected ? '#FFD36A' : 'white') + '; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.3); background-color: ' + (friend.is_online ? '#4CAF50' : '#8A8A8A') + ';"><img src="' + escapeHtml(avatarUrl) + '" alt="' + escapeHtml(displayName) + '" style="width: 100%; height: 100%; object-fit: cover; display: block;" /></div>';
            }
            return '<div style="background: ' + (friend.is_online ? '#4CAF50' : '#8A8A8A') + '; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; border: 3px solid ' + (isSelected ? '#FFD36A' : 'white') + '; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">' + markerInitial + '</div>';
        }

        function updateMyLocationMarker(payload) {
            var loc = payload.myLocation || { latitude: 14.5995, longitude: 120.9842 };
            if (!myMarker) {
                myMarker = L.marker([loc.latitude, loc.longitude], {
                    icon: L.divIcon({
                        className: 'my-marker-container',
                        html: '<div class="my-marker"></div>',
                        iconSize: [28, 28],
                        iconAnchor: [14, 14]
                    })
                }).addTo(map).bindPopup('<b>You are here</b>');
            } else {
                myMarker.setLatLng([loc.latitude, loc.longitude]);
            }
        }

        function renderFriendData(payload) {
            friendLayer.clearLayers();
            trailLayer.clearLayers();

            var selectedId = payload.selectedFriendId || null;
            var focus = null;

            (payload.friends || []).forEach(function(friend) {
                var popupHtml = '<b>' + escapeHtml(friend.friend_name || 'Friend') + '</b><br>' + escapeHtml(friend.status_label || (friend.is_online ? 'Online' : 'Offline')) + '<br>' + escapeHtml(friend.is_online ? getTimeSince(friend.location_updated) : ('Last seen ' + getTimeSince(friend.last_seen || friend.location_updated)));
                var marker = L.marker([friend.latitude, friend.longitude], {
                    icon: L.divIcon({
                        className: 'friend-marker',
                        html: buildMarkerHtml(friend, selectedId),
                        iconSize: [36, 36],
                        iconAnchor: [18, 18]
                    })
                }).bindPopup(popupHtml);

                marker.addTo(friendLayer);

                if (String(selectedId || '') === String(friend.friend_id || '')) {
                    focus = [friend.latitude, friend.longitude];
                }

                var trail = friend.trail || [];
                if (trail.length >= 2) {
                    var latLngs = trail.map(function(point) { return [point.lat, point.lng]; });
                    var color = String(selectedId || '') === String(friend.friend_id || '') ? '#FFD36A' : (friend.is_online ? '#63D66A' : '#9A9A9A');
                    L.polyline(latLngs, { color: color, weight: String(selectedId || '') === String(friend.friend_id || '') ? 5 : 3, opacity: String(selectedId || '') === String(friend.friend_id || '') ? 0.95 : 0.65 }).addTo(trailLayer);
                }
            });

            updateMyLocationMarker(payload);

            if (focus) {
                map.setView(focus, 16);
            }
        }

        window.renderMapData = function(payload) {
            try {
                if (typeof payload === 'string') payload = JSON.parse(payload);
                payload = payload || {};

                if (payload.mapMode && payload.mapMode !== currentMode) {
                    currentMode = payload.mapMode;
                    tileLayer.remove();
                    tileLayer = L.tileLayer(
                        payload.mapMode === 'satellite'
                            ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                        { attribution: payload.mapMode === 'satellite' ? 'Tiles © Esri' : '© OpenStreetMap' }
                    ).addTo(map);
                }

                renderFriendData(payload);
            } catch (e) {}
            return true;
        };

        window.renderMapData(${JSON.stringify({
            myLocation: { latitude: lat, longitude: lng },
            mapMode,
            selectedFriendId: selectedFriendId ? String(selectedFriendId) : null,
            friends: [],
        })});
    </script>
</body>
</html>
        `;
    };

    const mapHtml = useMemo(
        () => generateMapHtml(),
        [myLocation?.latitude, myLocation?.longitude, mapMode, selectedFriendId]
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FFD36A" />
                <Text style={styles.loadingText}>Loading map...</Text>
            </View>
        );
    }

    if (!myLocation) {
        return (
            <View style={styles.errorContainer}>
                <HugeiconsIcon icon={LocationUser01Icon} size={64} color="#888" />
                <Text style={styles.errorText}>Location permission denied</Text>
                <TouchableOpacity style={styles.retryButton} onPress={initializeMap}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const onlineFriends = friends.filter((f) => f.is_online);
    const offlineFriends = friends.filter((f) => !f.is_online);

    return (
        <View style={styles.container}>
            {backendStatus === 'offline' && (
                <View style={styles.offlineBanner}>
                    <Text style={styles.offlineBannerText}>
                        Live updates are temporarily unavailable. Showing cached map data.
                    </Text>
                </View>
            )}

            {/* Map WebView */}
            <WebView
                ref={webViewRef}
                source={{ html: mapHtml }}
                style={styles.map}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                originWhitelist={['*']}
                cacheEnabled={true}
                setSupportMultipleWindows={false}
                startInLoadingState={true}
                renderLoading={() => (
                    <View style={styles.mapLoading}>
                        <ActivityIndicator size="large" color="#FFD36A" />
                    </View>
                )}
                onLoadEnd={() => {
                    mapReadyRef.current = true;
                    if (pendingMapDataRef.current && webViewRef.current) {
                        webViewRef.current.injectJavaScript(`window.renderMapData(${pendingMapDataRef.current}); true;`);
                    }
                }}
            />

            {/* Top controls */}
            <View style={styles.topControls}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={24} color="#FFF" />
                </TouchableOpacity>

                <View style={styles.topRightControls}>
                    <TouchableOpacity
                        style={styles.layerButton}
                        onPress={() => setMapMode((prev) => (prev === 'street' ? 'satellite' : 'street'))}
                    >
                        <HugeiconsIcon icon={Layers02Icon} size={18} color="#FFF" />
                        <Text style={styles.layerButtonText}>
                            {mapMode === 'satellite' ? 'Satellite' : 'Street'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.layerButton, followMode && styles.followButtonActive]}
                        onPress={() => setFollowMode((v) => !v)}
                    >
                        <HugeiconsIcon icon={LocationUser01Icon} size={18} color="#FFF" />
                        <Text style={styles.layerButtonText}>{followMode ? 'Following' : 'Follow'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.friendCount}
                        onPress={() => setShowFriendsList(!showFriendsList)}
                    >
                        <HugeiconsIcon icon={UserGroupIcon} size={20} color="#FFF" />
                        <Text style={styles.friendCountText}>
                            {onlineFriends.length} online / {offlineFriends.length} offline
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Friends List Dropdown */}
            {showFriendsList && (
                <View style={styles.friendsListContainer}>
                    <ScrollView style={styles.friendsList}>
                        <Text style={styles.friendSectionTitle}>Online ({onlineFriends.length})</Text>
                        {onlineFriends.length === 0 && (
                            <Text style={styles.emptySectionText}>No friends online</Text>
                        )}
                        {onlineFriends.map((friend) => {
                            const dist = myLocation && typeof friend.latitude === 'number' && typeof friend.longitude === 'number'
                                ? haversineDistanceMeters(myLocation.latitude, myLocation.longitude, friend.latitude, friend.longitude)
                                : null;
                            const speed = friend.speed; // assume m/s if provided by API
                            return (
                                <TouchableOpacity
                                    key={friend.friend_id}
                                    style={[
                                        styles.friendItem,
                                        String(selectedFriendId || "") === String(friend.friend_id || "") && styles.friendItemSelected
                                    ]}
                                    onPress={() => setSelectedFriendId(String(friend.friend_id))}
                                    activeOpacity={0.8}
                                >
                                    <View style={[styles.friendDot, friend.is_online && styles.friendDotOnline]} />
                                    <View style={[styles.friendInfo, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.friendName}>{friend.friend_name}</Text>
                                            <Text style={[styles.friendStatus, friend.is_online ? styles.friendStatusOnline : styles.friendStatusOffline]}>
                                                {friend.status_label || (friend.is_online ? 'Online' : 'Offline')}
                                            </Text>
                                        </View>

                                        <View style={styles.badgeContainer}>
                                            <Text style={styles.badgeText}>{formatDistance(dist)}</Text>
                                            <Text style={[styles.badgeText, { marginTop: 2 }]}>{formatSpeed(speed)}</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}

                        <Text style={styles.friendSectionTitle}>Offline ({offlineFriends.length})</Text>
                        {offlineFriends.length === 0 && (
                            <Text style={styles.emptySectionText}>No friends offline</Text>
                        )}
                        {offlineFriends.map((friend) => (
                            <TouchableOpacity
                                key={friend.friend_id}
                                style={[
                                    styles.friendItem,
                                    String(selectedFriendId || "") === String(friend.friend_id || "") && styles.friendItemSelected
                                ]}
                                onPress={() => setSelectedFriendId(String(friend.friend_id))}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.friendDot, friend.is_online && styles.friendDotOnline]} />
                                <View style={styles.friendInfo}>
                                    <Text style={styles.friendName}>{friend.friend_name}</Text>
                                    <Text style={[styles.friendStatus, friend.is_online ? styles.friendStatusOnline : styles.friendStatusOffline]}>
                                        {friend.status_label || (friend.is_online ? 'Online' : 'Offline')}
                                    </Text>
                                    <Text style={styles.friendLastSeen}>
                                        Last seen {getTimeSince(friend.last_seen || friend.location_updated)}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Bottom controls */}
            <View style={styles.bottomControls}>
                <TouchableOpacity
                    style={[styles.shareButton, !shareLocation && styles.shareButtonOff]}
                    onPress={toggleLocationSharing}
                >
                    <HugeiconsIcon icon={shareLocation ? EyeIcon : ViewOffIcon} size={20} color="#FFF" />
                    <Text style={styles.shareButtonText}>
                        {shareLocation ? 'Visible' : 'Hidden'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.addFriendButton}
                    onPress={() => navigation.navigate('AddFriend')}
                >
                    <HugeiconsIcon icon={UserAdd01Icon} size={24} color="#000" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.walkButton, walkingMode && styles.walkButtonActive]}
                    onPress={toggleWalkingMode}
                >
                    <HugeiconsIcon icon={WalkingIcon} size={22} color="#FFF" />
                </TouchableOpacity>

                {walkingMode && (
                    <TouchableOpacity
                        style={styles.streetViewButton}
                        onPress={openStreetView}
                    >
                        <HugeiconsIcon icon={Navigation01Icon} size={20} color="#FFF" />
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[styles.autoRefreshButton, !isAutoRefreshEnabled && styles.autoRefreshButtonOff]}
                    onPress={() => setIsAutoRefreshEnabled(!isAutoRefreshEnabled)}
                >
                    <HugeiconsIcon
                        icon={RefreshIcon}
                        size={24}
                        color="#FFF"
                    />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.refreshButton, refreshing && styles.refreshButtonDisabled]}
                    disabled={refreshing}
                    onPress={async () => {
                        try {
                            setRefreshing(true);
                            await refreshFriendsLocations();
                        } finally {
                            setRefreshing(false);
                        }
                    }}
                >
                    {refreshing ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <HugeiconsIcon icon={RefreshIcon} size={24} color="#FFF" />
                    )}
                </TouchableOpacity>
            </View>

            {/* Online Toast Notification */}
            {onlineToast && (
                <View style={styles.toastContainer}>
                    <View style={styles.toast}>
                        <Text style={styles.toastEmoji}>📍</Text>
                        <Text style={styles.toastText}>
                            {onlineToast.name} is now online
                        </Text>
                    </View>
                </View>
            )}

            {/* In-app Street View Modal */}
            <Modal
                visible={streetViewVisible}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => setStreetViewVisible(false)}
            >
                <View style={styles.streetViewContainer}>
                    <WebView
                        source={{ uri: streetViewUrl }}
                        style={styles.streetViewWebView}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        startInLoadingState={true}
                        renderLoading={() => (
                            <View style={styles.streetViewLoading}>
                                <ActivityIndicator size="large" color="#FFD36A" />
                                <Text style={styles.streetViewLoadingText}>Loading Street View...</Text>
                            </View>
                        )}
                        onError={handleStreetViewError}
                    />

                    <TouchableOpacity
                        style={styles.streetViewCloseButton}
                        onPress={() => setStreetViewVisible(false)}
                    >
                        <HugeiconsIcon icon={Cancel01Icon} size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    map: {
        flex: 1,
    },
    mapLoading: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0B0E14',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#FFF',
        marginTop: 16,
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        backgroundColor: '#0B0E14',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        color: '#FFF',
        fontSize: 18,
        marginTop: 16,
        marginBottom: 24,
    },
    retryButton: {
        backgroundColor: '#FFD36A',
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 25,
    },
    retryButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
    topControls: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    topRightControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    backButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    layerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 6,
    },
    layerButtonText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
    },
    followButtonActive: {
        backgroundColor: '#FFD36A',
    },
    friendCount: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 8,
    },
    friendCountText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '600',
    },
    friendsListContainer: {
        position: 'absolute',
        top: 110,
        right: 16,
        maxHeight: 200,
        width: 200,
        backgroundColor: 'rgba(0,0,0,0.9)',
        borderRadius: 12,
        overflow: 'hidden',
    },
    friendsList: {
        padding: 8,
    },
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    friendItemSelected: {
        backgroundColor: 'rgba(255, 211, 106, 0.15)',
        borderRadius: 10,
    },
    friendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#888',
        marginRight: 10,
    },
    friendDotOnline: {
        backgroundColor: '#4CAF50',
    },
    friendInfo: {
        flex: 1,
    },
    friendName: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    friendStatus: {
        color: '#888',
        fontSize: 11,
        marginTop: 2,
    },
    friendSectionTitle: {
        color: '#FFD36A',
        fontSize: 12,
        fontWeight: '700',
        marginTop: 8,
        marginBottom: 6,
        paddingHorizontal: 8,
    },
    emptySectionText: {
        color: '#888',
        fontSize: 11,
        paddingHorizontal: 8,
        paddingBottom: 8,
    },
    friendStatusOnline: {
        color: '#4CAF50',
    },
    friendStatusOffline: {
        color: '#FF6B6B',
    },
    friendLastSeen: {
        color: '#A8A8A8',
        fontSize: 10,
        marginTop: 2,
    },
    badgeContainer: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
        minWidth: 56,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '700',
    },
    bottomControls: {
        position: 'absolute',
        bottom: 120,
        left: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    shareButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4CAF50',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 25,
        gap: 8,
    },
    shareButtonOff: {
        backgroundColor: '#666',
    },
    shareButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    addFriendButton: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: '#FFD36A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    walkButton: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: '#2D6CDF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    walkButtonActive: {
        backgroundColor: '#2BB673',
    },
    streetViewButton: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: '#5B3DF5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    autoRefreshButton: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: '#4CAF50',
        justifyContent: 'center',
        alignItems: 'center',
    },
    autoRefreshButtonOff: {
        backgroundColor: '#888888',
    },
    refreshButton: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    refreshButtonDisabled: {
        opacity: 0.65,
    },
    toastContainer: {
        position: 'absolute',
        top: 110,
        left: 16,
        right: 16,
        alignItems: 'center',
        zIndex: 999,
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(76, 175, 80, 0.95)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    toastEmoji: {
        fontSize: 18,
    },
    toastText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
    },
    streetViewContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    streetViewWebView: {
        flex: 1,
    },
    streetViewLoading: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    streetViewLoadingText: {
        color: '#FFF',
        marginTop: 10,
        fontSize: 14,
    },
    streetViewCloseButton: {
        position: 'absolute',
        top: 48,
        right: 16,
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
});
