import React, { useState, useEffect, useRef } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/apiHelper';

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
    const webViewRef = useRef(null);
    const broadcastIntervalRef = useRef(null);
    const walkWatchRef = useRef(null);
    const lastWalkSyncRef = useRef(0);
    const previousMapModeRef = useRef('street');
    const prevOnlineRef = useRef({}); // Track previous online states
    const toastTimeoutRef = useRef(null);
    const followIntervalRef = useRef(null);

    useEffect(() => {
        initializeMap();

        // Refresh friends' locations every 10 seconds
        const friendsInterval = setInterval(refreshFriendsLocations, 10000);

        return () => {
            clearInterval(friendsInterval);
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
    }, []);

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

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            setMyLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });

            await refreshFriendsLocations();

            // Start broadcasting location
            if (shareLocation) {
                startBroadcasting();
            }
        } catch (error) {
            console.error('Error initializing map:', error);
            Alert.alert('Error', 'Failed to get your location');
        } finally {
            setLoading(false);
        }
    };

    const startBroadcasting = () => {
        if (broadcastIntervalRef.current) return;

        broadcastIntervalRef.current = setInterval(async () => {
            try {
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });

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
            } catch (error) {
                console.error('Error broadcasting location:', error);
            }
        }, 15000);
    };

    const refreshFriendsLocations = async () => {
        try {
            const response = await api('/friends/locations-realtime');
            if (response.ok) {
                const newFriends = response.friends || [];

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
            }
        } catch (error) {
            console.error('Error fetching friends locations:', error);
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
                            console.error('Walking mode sync error:', syncErr);
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
            console.error('Walking mode error:', error);
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
            console.error('Street View open error:', error);
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

    const escapeHtml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

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

        const friendsForMap = friends.filter(
            (f) => f.can_show_on_map && typeof f.latitude === 'number' && typeof f.longitude === 'number'
        );

        const friendMarkers = friendsForMap.map(f => {
            const displayName = f.friend_name || 'Friend';
            const markerInitial = escapeHtml((displayName || '?').charAt(0).toUpperCase() || '?');
            const statusText = escapeHtml(f.status_label || (f.is_online ? 'Online' : 'Offline'));
            const seenText = escapeHtml(
                f.is_online
                    ? getTimeSince(f.location_updated)
                    : `Last seen ${getTimeSince(f.last_seen || f.location_updated)}`
            );
            const popupHtml = `<b>${escapeHtml(displayName)}</b><br>${statusText}<br>${seenText}`;
            const isSelected = String(selectedFriendId || "") === String(f.friend_id || "");
            const markerHtml = `<div style="background: ${f.is_online ? '#4CAF50' : '#8A8A8A'}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; border: 3px solid ${isSelected ? '#FFD36A' : 'white'}; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">${markerInitial}</div>`;

            return `
            L.marker([${f.latitude}, ${f.longitude}], {
                icon: L.divIcon({
                    className: 'friend-marker',
                    html: ${JSON.stringify(markerHtml)},
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                })
            }).addTo(map).bindPopup(${JSON.stringify(popupHtml)});
        `;
        }).join('\n');

        const trailLines = friendsForMap
            .map((f) => {
                const trail = friendTrails[String(f.friend_id)] || [];
                if (trail.length < 2) return "";
                const latLngs = trail.map((p) => [p.lat, p.lng]);
                const isSelected = String(selectedFriendId || "") === String(f.friend_id || "");
                const color = isSelected ? "#FFD36A" : (f.is_online ? "#63D66A" : "#9A9A9A");
                return `L.polyline(${JSON.stringify(latLngs)}, { color: '${color}', weight: ${isSelected ? 5 : 3}, opacity: ${isSelected ? 0.95 : 0.65} }).addTo(map);`;
            })
            .join("\n");

        const selectedFriend = friendsForMap.find(
            (f) => String(selectedFriendId || "") === String(f.friend_id || "")
        );
        const focusScript = selectedFriend
            ? `map.setView([${selectedFriend.latitude}, ${selectedFriend.longitude}], 16);`
            : "";

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
        
        L.tileLayer(${JSON.stringify(tileUrl)}, {
            attribution: ${JSON.stringify(tileAttribution)}
        }).addTo(map);

        // My location marker
        L.marker([${lat}, ${lng}], {
            icon: L.divIcon({
                className: 'my-marker-container',
                html: '<div class="my-marker"></div>',
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            })
        }).addTo(map).bindPopup('<b>You are here</b>');

        // Friend markers
        ${friendMarkers}
        ${trailLines}
        ${focusScript}
    </script>
</body>
</html>
        `;
    };

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
                <Ionicons name="location-outline" size={64} color="#888" />
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
            {/* Map WebView */}
            <WebView
                ref={webViewRef}
                source={{ html: generateMapHtml() }}
                style={styles.map}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                renderLoading={() => (
                    <View style={styles.mapLoading}>
                        <ActivityIndicator size="large" color="#FFD36A" />
                    </View>
                )}
            />

            {/* Top controls */}
            <View style={styles.topControls}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>

                <View style={styles.topRightControls}>
                    <TouchableOpacity
                        style={styles.layerButton}
                        onPress={() => setMapMode((prev) => (prev === 'street' ? 'satellite' : 'street'))}
                    >
                        <Ionicons name="layers" size={18} color="#FFF" />
                        <Text style={styles.layerButtonText}>
                            {mapMode === 'satellite' ? 'Satellite' : 'Street'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.layerButton, followMode && styles.followButtonActive]}
                        onPress={() => setFollowMode((v) => !v)}
                    >
                        <Ionicons name="locate" size={18} color="#FFF" />
                        <Text style={styles.layerButtonText}>{followMode ? 'Following' : 'Follow'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.friendCount}
                        onPress={() => setShowFriendsList(!showFriendsList)}
                    >
                        <Ionicons name="people" size={20} color="#FFF" />
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
                    <Ionicons
                        name={shareLocation ? "eye" : "eye-off"}
                        size={20}
                        color="#FFF"
                    />
                    <Text style={styles.shareButtonText}>
                        {shareLocation ? 'Visible' : 'Hidden'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.addFriendButton}
                    onPress={() => navigation.navigate('AddFriend')}
                >
                    <Ionicons name="person-add" size={24} color="#000" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.walkButton, walkingMode && styles.walkButtonActive]}
                    onPress={toggleWalkingMode}
                >
                    <Ionicons name="walk" size={22} color="#FFF" />
                </TouchableOpacity>

                {walkingMode && (
                    <TouchableOpacity
                        style={styles.streetViewButton}
                        onPress={openStreetView}
                    >
                        <Ionicons name="navigate" size={20} color="#FFF" />
                    </TouchableOpacity>
                )}

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
                        <Ionicons name="refresh" size={24} color="#FFF" />
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
                        <Ionicons name="close" size={24} color="#FFF" />
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
