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
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/apiHelper';

const { width, height } = Dimensions.get('window');

export default function FriendsMapScreen({ navigation }) {
    const [myLocation, setMyLocation] = useState(null);
    const [friends, setFriends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [shareLocation, setShareLocation] = useState(true);
    const [showFriendsList, setShowFriendsList] = useState(false);
    const webViewRef = useRef(null);
    const broadcastIntervalRef = useRef(null);

    useEffect(() => {
        initializeMap();

        // Refresh friends' locations every 10 seconds
        const friendsInterval = setInterval(refreshFriendsLocations, 10000);

        return () => {
            clearInterval(friendsInterval);
            if (broadcastIntervalRef.current) {
                clearInterval(broadcastIntervalRef.current);
            }
        };
    }, []);

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
                setFriends(response.friends || []);
            }
        } catch (error) {
            console.error('Error fetching friends locations:', error);
        }
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
                    startBroadcasting();
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

    // Generate HTML for the map
    const generateMapHtml = () => {
        const lat = myLocation?.latitude || 14.5995;
        const lng = myLocation?.longitude || 120.9842;

        const friendMarkers = friends.map(f => `
            L.marker([${f.latitude}, ${f.longitude}], {
                icon: L.divIcon({
                    className: 'friend-marker',
                    html: '<div style="background: ${f.is_online ? '#4CAF50' : '#FFD36A'}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">${f.friend_name?.charAt(0) || '?'}</div>',
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                })
            }).addTo(map).bindPopup('<b>${f.friend_name || 'Friend'}</b><br>${f.is_online ? '🟢 Online' : '⚪ Offline'}<br>${getTimeSince(f.location_updated)}');
        `).join('\n');

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
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
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

                <TouchableOpacity
                    style={styles.friendCount}
                    onPress={() => setShowFriendsList(!showFriendsList)}
                >
                    <Ionicons name="people" size={20} color="#FFF" />
                    <Text style={styles.friendCountText}>
                        {friends.filter(f => f.is_online).length} online / {friends.length} friends
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Friends List Dropdown */}
            {showFriendsList && friends.length > 0 && (
                <View style={styles.friendsListContainer}>
                    <ScrollView style={styles.friendsList}>
                        {friends.map((friend) => (
                            <View key={friend.friend_id} style={styles.friendItem}>
                                <View style={[styles.friendDot, friend.is_online && styles.friendDotOnline]} />
                                <View style={styles.friendInfo}>
                                    <Text style={styles.friendName}>{friend.friend_name}</Text>
                                    <Text style={styles.friendStatus}>
                                        {friend.is_online ? 'Online' : getTimeSince(friend.location_updated)}
                                    </Text>
                                </View>
                            </View>
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
                    style={styles.refreshButton}
                    onPress={async () => {
                        await refreshFriendsLocations();
                        // Force WebView refresh
                        if (webViewRef.current) {
                            webViewRef.current.reload();
                        }
                    }}
                >
                    <Ionicons name="refresh" size={24} color="#FFF" />
                </TouchableOpacity>
            </View>
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
    backButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
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
    bottomControls: {
        position: 'absolute',
        bottom: 30,
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
    refreshButton: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
