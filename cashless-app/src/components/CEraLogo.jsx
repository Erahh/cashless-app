import React, { useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Easing,
} from "react-native";
import { useTheme } from "../context/ThemeContext";

/**
 * CEraLogo — Morphing brand mark.
 * Loops between "Cashless Era" (wordmark) ↔ "C | ERA" (lockup).
 */
export default function CEraLogo({ size = "large" }) {
    const { theme, isDarkMode } = useTheme();
    const isSmall = size === "small";

    // ─── Morph: 0 = "Cashless Era", 1 = "C | ERA" ───
    const morph = useRef(new Animated.Value(0)).current;

    // Entrance
    const enterOp = useRef(new Animated.Value(0)).current;
    const enterScale = useRef(new Animated.Value(0.92)).current;

    // Underline
    const ulScale = useRef(new Animated.Value(0)).current;

    // Dots
    const d1 = useRef(new Animated.Value(1)).current;
    const d2 = useRef(new Animated.Value(1)).current;
    const d3 = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // ── Entrance ──
        Animated.parallel([
            Animated.timing(enterOp, { toValue: 1, duration: 700, useNativeDriver: true }),
            Animated.spring(enterScale, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
        ]).start();

        // ── Underline entrance (large only) ──
        if (!isSmall) {
            Animated.sequence([
                Animated.delay(500),
                Animated.spring(ulScale, { toValue: 1, tension: 80, friction: 10, useNativeDriver: true }),
            ]).start();
        }

        // ── Morph loop ──
        const runMorph = () => {
            Animated.sequence([
                // Hold "Cashless Era" for 3s
                Animated.delay(3000),
                // Morph → "C | ERA"
                Animated.timing(morph, {
                    toValue: 1, duration: 600,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
                // Hold "C | ERA" for 5s
                Animated.delay(5000),
                // Morph → "Cashless Era"
                Animated.timing(morph, {
                    toValue: 0, duration: 600,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
            ]).start(() => runMorph());
        };
        runMorph();

        // ── Dot blinks ──
        const blink = (d, del) =>
            Animated.loop(Animated.sequence([
                Animated.delay(del),
                Animated.timing(d, { toValue: 0.15, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(d, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ]));
        blink(d1, 0).start();
        blink(d2, 350).start();
        blink(d3, 700).start();
    }, []);

    // ─── Interpolations ──────────────────────────────────────
    // State A: "Cashless Era" (morph=0 → visible, morph=1 → hidden)
    const aOp = morph.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0, 0] });
    const aY = morph.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });
    const aScale = morph.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] });

    // State B: "C | ERA" (morph=0 → hidden, morph=1 → visible)
    const bOp = morph.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });
    const bY = morph.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });
    const bScale = morph.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });

    // ─── Colors ──────────────────────────────────────────────
    const txt = theme.text;
    const txtSub = theme.textSecondary;
    const txtMut = theme.textMuted;
    const accent = theme.accent;
    const divCol = isDarkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)";
    const dotCol = isDarkMode ? "rgba(247,227,83,0.65)" : "rgba(0,0,0,0.2)";
    const dots = [d1, d2, d3];

    // ═══════════════════ SMALL VARIANT ═══════════════════════
    if (isSmall) {
        return (
            <Animated.View
                style={[
                    st.sWrap,
                    { opacity: enterOp, transform: [{ scale: enterScale }] },
                ]}
            >
                {/* State A: "Cashless Era" */}
                <Animated.View
                    style={[
                        st.sLayer,
                        { opacity: aOp, transform: [{ translateY: aY }] },
                    ]}
                >
                    <Text style={[st.sCashless, { color: txt }]}>
                        Cashless <Text style={st.sCashlessEra}>Era</Text>
                    </Text>
                </Animated.View>

                {/* State B: "C | ERA" */}
                <Animated.View
                    style={[
                        st.sLayer,
                        { opacity: bOp, transform: [{ translateY: bY }] },
                    ]}
                >
                    <Text style={[st.sBigC, { color: txt }]}>C</Text>
                    <View style={[st.sDivider, { backgroundColor: divCol }]} />
                    <Text style={[st.sEra, { color: txt }]}>ERA</Text>
                    <View style={st.sDotsRow}>
                        {dots.map((d, i) => (
                            <Animated.View key={i} style={[st.sDot, { backgroundColor: dotCol, opacity: d }]} />
                        ))}
                    </View>
                </Animated.View>
            </Animated.View>
        );
    }

    // ═══════════════════ LARGE VARIANT ═══════════════════════
    return (
        <Animated.View
            style={[st.root, { opacity: enterOp, transform: [{ scale: enterScale }] }]}
        >
            {/* ── Morph container (fixed height, both states overlap) ── */}
            <View style={st.morphBox}>
                {/* State A: "Cashless Era" wordmark */}
                <Animated.View
                    style={[
                        st.layer,
                        {
                            opacity: aOp,
                            transform: [{ translateY: aY }, { scale: aScale }],
                        },
                    ]}
                >
                    <Text style={[st.cashlessBig, { color: txt }]}>CASHLESS</Text>
                    <View style={st.eraRow}>
                        <View style={[st.eraLine, { backgroundColor: accent }]} />
                        <Text style={[st.eraHuge, { color: accent }]}>Era</Text>
                        <View style={[st.eraLine, { backgroundColor: accent }]} />
                    </View>
                    <View style={st.aDotsRow}>
                        {dots.map((d, i) => (
                            <Animated.View key={i} style={[st.aDot, { backgroundColor: accent, opacity: d }]} />
                        ))}
                    </View>
                </Animated.View>

                {/* State B: "C | ERA" lockup */}
                <Animated.View
                    style={[
                        st.layer,
                        {
                            opacity: bOp,
                            transform: [{ translateY: bY }, { scale: bScale }],
                        },
                    ]}
                >
                    <View style={st.lockup}>
                        <Text style={[st.bigC, { color: txt }]}>C</Text>
                        <View style={[st.divider, { backgroundColor: divCol }]} />
                        <View>
                            <Text style={[st.era, { color: txt }]}>ERA</Text>
                            <View style={st.tagRow}>
                                <View style={st.dotsRow}>
                                    {dots.map((d, i) => (
                                        <Animated.View
                                            key={i}
                                            style={[st.dot, { backgroundColor: dotCol, opacity: d }]}
                                        />
                                    ))}
                                </View>
                                <Text style={[st.tagTxt, { color: txtMut }]}>
                                    Cashless Era
                                </Text>
                            </View>
                        </View>
                    </View>
                </Animated.View>
            </View>

            {/* ── Accent underline ── */}
            <Animated.View
                style={[
                    st.underline,
                    { backgroundColor: accent, transform: [{ scaleX: ulScale }] },
                ]}
            />

            {/* ── Subtitle ── */}
            <Text style={[st.subtitle, { color: txtSub }]}>
                COMMUTING REDEFINED
            </Text>
        </Animated.View>
    );
}

// ═════════════════════════ STYLES ═════════════════════════════
const st = StyleSheet.create({
    // ────── LARGE ──────
    root: {
        alignItems: "center",
    },
    morphBox: {
        height: 140,
        justifyContent: "center",
        alignItems: "center",
    },
    layer: {
        position: "absolute",
        alignItems: "center",
        justifyContent: "center",
    },

    // State A: "Cashless Era"
    cashlessBig: {
        fontSize: 32,
        fontWeight: "900",
        letterSpacing: 12,
        textTransform: "uppercase",
    },
    eraRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginTop: -2,
    },
    eraLine: {
        width: 24,
        height: 2,
        borderRadius: 1,
    },
    eraHuge: {
        fontSize: 72,
        fontWeight: "900",
        letterSpacing: 4,
        lineHeight: 78,
    },
    aDotsRow: {
        flexDirection: "row",
        gap: 5,
        marginTop: 6,
    },
    aDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
    },

    // State B: "C | ERA" lockup
    lockup: {
        flexDirection: "row",
        alignItems: "center",
    },
    bigC: {
        fontSize: 88,
        fontWeight: "900",
        lineHeight: 92,
    },
    divider: {
        width: 1.5,
        height: 60,
        marginHorizontal: 18,
        borderRadius: 1,
    },
    era: {
        fontSize: 34,
        fontWeight: "700",
        letterSpacing: 14,
        lineHeight: 38,
    },
    tagRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 6,
        gap: 8,
    },
    dotsRow: {
        flexDirection: "row",
        gap: 4,
    },
    dot: {
        width: 3.5,
        height: 3.5,
        borderRadius: 2,
    },
    tagTxt: {
        fontSize: 8,
        fontWeight: "600",
        letterSpacing: 4,
        textTransform: "uppercase",
    },

    // Bottom elements
    underline: {
        width: 120,
        height: 3,
        borderRadius: 2,
        marginTop: 16,
    },
    subtitle: {
        fontSize: 9,
        fontWeight: "700",
        letterSpacing: 5,
        marginTop: 14,
        textTransform: "uppercase",
    },

    // ────── SMALL ──────
    sWrap: {
        height: 32,
        justifyContent: "center",
        alignItems: "center",
    },
    sLayer: {
        position: "absolute",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },

    // State A small
    sCashless: {
        fontSize: 18,
        fontWeight: "800",
        letterSpacing: 2,
    },
    sCashlessEra: {
        fontWeight: "900",
        letterSpacing: 0,
    },

    // State B small
    sBigC: {
        fontSize: 24,
        fontWeight: "900",
        lineHeight: 28,
    },
    sDivider: {
        width: 1,
        height: 18,
        marginHorizontal: 8,
        borderRadius: 1,
    },
    sEra: {
        fontSize: 14,
        fontWeight: "700",
        letterSpacing: 5,
        lineHeight: 16,
    },
    sDotsRow: {
        flexDirection: "row",
        gap: 3,
        marginLeft: 8,
        alignItems: "center",
    },
    sDot: {
        width: 2.5,
        height: 2.5,
        borderRadius: 1.5,
    },
});
