import React, { useEffect, useRef } from "react";
import { View, Text, ActivityIndicator, StyleSheet, Dimensions, Animated } from "react-native";
import { supabase } from "../../api/supabase";
import { API_BASE_URL } from "../../config/api";
import { TapGlowOverlay, useTapGlow } from "../../components/TapGlow";
import logger from '../../utils/logger';
import { useTheme } from "../../context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");
const GRID_SIZE = 30;

// Timeout helper — 30s is enough for a warm Render instance; 60s for cold start
async function fetchWithTimeout(url, options = {}, ms = 30000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(id);
    }
}

const useFloat = (duration = 3000, offset = 10) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }),
            ])
        ).start();
    }, []);
    return anim.interpolate({ inputRange: [0, 1], outputRange: [0, offset] });
};

export default function RoleGateScreen({ navigation }) {
    const { taps, onTap } = useTapGlow();
    const { isDarkMode, theme } = useTheme();
    const floatAnim = useFloat(3500, -15);

    useEffect(() => {
        let alive = true;

        async function go({ canRetry = true } = {}) {
            try {
                const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
                if (sessionErr) throw sessionErr;

                const token = sessionData?.session?.access_token;
                if (!token) throw new Error("No session.");

                // /me/roles is 2 DB queries vs /me/status which does 6 — much faster
                const res = await fetchWithTimeout(
                    `${API_BASE_URL}/me/roles`,
                    { headers: { Authorization: `Bearer ${token}` } },
                    30000
                );

                const text = await res.text();
                let json = null;
                if (text) {
                    try { json = JSON.parse(text); }
                    catch { throw new Error(`Non-JSON response (HTTP ${res.status})`); }
                }
                if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

                const isAdmin    = !!json?.is_admin;
                const isOperator = !!json?.is_operator;
                const target = isAdmin ? "AdminApp" : isOperator ? "OperatorApp" : "CommuterApp";

                if (alive) navigation.reset({ index: 0, routes: [{ name: target }] });

            } catch (e) {
                logger.error("RoleGate error:", e);

                // Silent retry once on timeout — gives a cold Render server time to wake
                if ((e?.name === "AbortError") && canRetry) {
                    setTimeout(() => { if (alive) go({ canRetry: false }); }, 3000);
                    return;
                }

                // Persistent failure → fall through to Commuter silently
                if (alive) navigation.reset({ index: 0, routes: [{ name: "CommuterApp" }] });
            }
        }

        go();
        return () => { alive = false; };
    }, [navigation]);

    const bgColor         = isDarkMode ? theme.background : "#F9F6EE";
    const gridColor       = isDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
    const spinnerColor    = isDarkMode ? theme.accent : "#121417";
    const cardShadowColor = isDarkMode ? "#F9F6EE" : "#000000";
    const cardShadowOpacity = isDarkMode ? 0.35 : 0.2;

    const renderGrid = () => {
        const columns = Math.ceil(width / GRID_SIZE);
        const rows    = Math.ceil(height / GRID_SIZE);
        return (
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
                {[...Array(columns)].map((_, i) => (
                    <View key={`v-${i}`} style={[styles.gridLineV, { left: i * GRID_SIZE, backgroundColor: gridColor }]} />
                ))}
                {[...Array(rows)].map((_, i) => (
                    <View key={`h-${i}`} style={[styles.gridLineH, { top: i * GRID_SIZE, backgroundColor: gridColor }]} />
                ))}
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]} onTouchStart={onTap}>
            {/* Background Grid */}
            <View style={styles.bgContainer}>
                {renderGrid()}
            </View>

            {/* Floating Commuter Card */}
            <View style={styles.illustrationWrap}>
                <Animated.View
                    style={[
                        styles.cardFront,
                        {
                            transform: [{ translateY: floatAnim }, { rotate: "3deg" }],
                            shadowColor: cardShadowColor,
                            shadowOpacity: cardShadowOpacity,
                            shadowRadius: 25,
                            elevation: 20,
                        }
                    ]}
                >
                    <LinearGradient colors={["#2C2C2C", "#121417"]} style={styles.cardGrade}>
                        <View style={styles.cardHeader}>
                            <View style={styles.chipSilverGold} />
                            <View style={styles.masterCircle} />
                        </View>
                        <Text style={styles.cardPassText}>COMMUTER PASS</Text>
                        <View style={styles.cardBottomRow}>
                            <Text style={styles.cardNumber}>••••  ••••  ••••  8829</Text>
                        </View>
                    </LinearGradient>
                </Animated.View>
            </View>

            {/* Spinner only — no text message shown */}
            <View style={styles.loadingFooter}>
                <ActivityIndicator size="large" color={spinnerColor} />
            </View>

            <TapGlowOverlay taps={taps} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    bgContainer: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.4,
    },
    gridLineV: {
        position: "absolute",
        width: 1,
        height: "100%",
    },
    gridLineH: {
        position: "absolute",
        height: 1,
        width: "100%",
    },
    illustrationWrap: {
        width: "100%",
        height: 220,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 40,
        zIndex: 10,
    },
    cardFront: {
        width: 250,
        height: 150,
        borderRadius: 18,
    },
    cardGrade:     { flex: 1, borderRadius: 18, padding: 18, justifyContent: "space-between" },
    cardHeader:    { flexDirection: "row", justifyContent: "space-between" },
    chipSilverGold:{ width: 36, height: 28, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 4 },
    masterCircle:  { width: 32, height: 22, flexDirection: "row" },
    cardPassText:  { color: "#FFFFFF", fontSize: 13, fontWeight: "900", letterSpacing: 2, opacity: 0.8 },
    cardBottomRow: {},
    cardNumber:    { color: "#FFFFFF", fontSize: 15, fontWeight: "500", letterSpacing: 1.5, opacity: 0.6 },
    loadingFooter: {
        alignItems: "center",
        justifyContent: "center",
    },
});
