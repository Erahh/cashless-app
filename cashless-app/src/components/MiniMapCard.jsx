import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useTheme } from '../context/ThemeContext';

export default function MiniMapCard({ onPress }) {
    const { theme } = useTheme();
    const isDark = theme.isDark;
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setErrorMsg('Permission to access location was denied');
                    setLoading(false);
                    return;
                }

                let loc = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });
                setLocation({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                });
            } catch (error) {
                console.warn('MiniMap location error:', error);
                setErrorMsg('Could not fetch location');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const generateMapHtml = () => {
        // Default to Manila coordinates if location fails, else user's location
        const lat = location?.latitude || 14.5995;
        const lng = location?.longitude || 120.9842;

        // Map style based on theme
        const filterStyle = isDark ? `filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);` : '';
        const bgColor = isDark ? '#1a1a1a' : '#f0f0f0';

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <style>
                * { margin: 0; padding: 0; }
                html, body { height: 100%; width: 100%; background-color: ${bgColor}; overflow: hidden; }
                #map { height: 100vh; width: 100vw; ${filterStyle} }
                .my-marker {
                    background: #FFD36A; /* Accent color */
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    border: 3px solid #000;
                    box-shadow: 0 0 0 2px rgba(255, 211, 106, 0.4), 0 2px 4px rgba(0,0,0,0.5);
                    animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 211, 106, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(255, 211, 106, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 211, 106, 0); }
                }
                /* Hide Leaflet Controls to make it look like a clean UI component */
                .leaflet-control-container { display: none !important; }
            </style>
        </head>
        <body>
            <div id="map"></div>
            <script>
                // Initialize map, zoomed in closely, disabled interactions for a static card feel
                var map = L.map('map', {
                    zoomControl: false,
                    dragging: false,
                    scrollWheelZoom: false,
                    doubleClickZoom: false,
                    boxZoom: false,
                    keyboard: false,
                    touchZoom: false
                }).setView([${lat}, ${lng}], 16);
                
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: ''
                }).addTo(map);

                // Add pulsing marker at center
                L.marker([${lat}, ${lng}], {
                    icon: L.divIcon({
                        className: 'my-marker-container',
                        html: '<div class="my-marker"></div>',
                        iconSize: [22, 22],
                        iconAnchor: [11, 11]
                    })
                }).addTo(map);
            </script>
        </body>
        </html>
        `;
    };

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={onPress}
            activeOpacity={0.9}
        >
            {loading ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="small" color={theme.accent} />
                </View>
            ) : errorMsg && !location ? (
                <View style={styles.centerBox}>
                    <Text style={{ fontSize: 24 }}>🗺️</Text>
                    <Text style={[styles.errorText, { color: theme.textSecondary }]}>Location Off</Text>
                </View>
            ) : (
                <View style={styles.mapWrapper}>
                    <WebView
                        source={{ html: generateMapHtml() }}
                        style={styles.webview}
                        scrollEnabled={false}
                        pointerEvents="none" // Important so touches bubble up to TouchableOpacity
                        javaScriptEnabled={true}
                    />

                    {/* Overlay badges for UI aesthetics */}
                    <View style={styles.overlayTop}>
                        <View style={[styles.badge, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                            <View style={styles.pulseDot} />
                            <Text style={styles.badgeText}>Live Map</Text>
                        </View>
                    </View>
                    <View style={styles.overlayBottom}>
                        <Text style={[styles.hintText, { color: '#FFF' }]}>Tap to expand ›</Text>
                    </View>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: 140, // Nice landscape height
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        marginBottom: 16,
    },
    centerBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 12,
        marginTop: 8,
        fontWeight: '500',
    },
    mapWrapper: {
        flex: 1,
        position: 'relative', // for absolute overlays
    },
    webview: {
        flex: 1,
        width: '100%',
        height: '100%',
        backgroundColor: 'transparent',
    },
    overlayTop: {
        position: 'absolute',
        top: 10,
        left: 10,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 6,
    },
    pulseDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#4CAF50',
    },
    badgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    overlayBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 10,
        paddingTop: 20,
        // Gradient overlay to make text readable
        backgroundColor: 'transparent',
        backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
        alignItems: 'flex-end',
    },
    hintText: {
        fontSize: 11,
        fontWeight: '600',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    }
});
