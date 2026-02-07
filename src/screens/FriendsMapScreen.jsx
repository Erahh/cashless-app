import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { api } from '../api/apiHelper';
import { Ionicons } from '@expo/vector-icons';

export default function FriendsMapScreen({ navigation }) {
    const [myLocation, setMyLocation] = useState(null);
    const [friends, setFriends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [shareLocation, setShareLocation] = useState(true);
    const [isBroadcasting, setIsBroadcasting] = useState(false);

    useEffect(() => {
        initializeMap();

        // Refresh friends' locations every 5 seconds
        const friendsInterval = setInterval(refreshFriendsLocations, 5000);

        return () => {
            clearInterval(friendsInterval);
            stopBroadcasting();
        };
    }, []);

    const initializeMap = async () => {
        try {
            // Request location permission
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required to use this feature.');
                return;
            }

            // Get my current location
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            setMyLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });

            // Load friends' locations
            await refreshFriendsLocations();

            // Auto-start broadcasting if sharing is enabled
            if (shareLocation) {
                startBroadcasting();
            }
        } catch (error) {
            console.error('Error initializing map:', error);
            Alert.alert('Error', 'Failed to load map');
        } finally {
            setLoading(false);
        }
    };

    const startBroadcasting = async () => {
        if (isBroadcasting) return;

        setIsBroadcasting(true);

        // Send location updates every 15 seconds
        const broadcastInterval = setInterval(async () => {
            try {
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });

                // Update my location on map
                setMyLocation({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                });

                // Send to backend
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

        // Store interval ID to clear later
        global.locationBroadcastInterval = broadcastInterval;
    };

    const stopBroadcasting = () => {
        if (global.locationBroadcastInterval) {
            clearInterval(global.locationBroadcastInterval);
            global.locationBroadcastInterval = null;
        }
        setIsBroadcasting(false);
    };

    const refreshFriendsLocations = async () => {
        try {
            // Use real-time endpoint for online status
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
            <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={{
                    latitude: myLocation.latitude,
                    longitude: myLocation.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
                showsUserLocation={true}
                showsMyLocationButton={true}
            >
                {/* Friend markers */}
                {friends.map((friend) => (
                    <Marker
                        key={friend.friend_id}
                        coordinate={{
                            latitude: friend.latitude,
                            longitude: friend.longitude,
                        }}
                        title={friend.friend_name}
                        description={
                            friend.is_online
                                ? `🟢 Online • ${getTimeSince(friend.last_seen)}`
                                : `⚪ Offline • ${getTimeSince(friend.location_updated)}`
                        }
                        pinColor={friend.is_online ? "#4CAF50" : "#FFD36A"}
                    />
                ))}
            </MapView>

            {/* Top controls */}
            <View style={styles.topControls}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>

                <View style={styles.friendCount}>
                    <Ionicons name="people" size={20} color="#FFF" />
                    <Text style={styles.friendCountText}>{friends.length} friends</Text>
                </View>
            </View>

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
                        {shareLocation ? 'Visible to friends' : 'Hidden from friends'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.addFriendButton}
                    onPress={() => navigation.navigate('AddFriend')}
                >
                    <Ionicons name="person-add" size={24} color="#FFF" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={refreshFriendsLocations}
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
    loadingContainer: {
        flex: 1,
        backgroundColor: '#000',
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
        backgroundColor: '#000',
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
        paddingHorizontal: 20,
    },
    backButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    friendCount: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 8,
    },
    friendCountText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    bottomControls: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
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
        backgroundColor: '#888',
    },
    shareButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    addFriendButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FFD36A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    refreshButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
