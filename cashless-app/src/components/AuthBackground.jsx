import React from "react";
import { StyleSheet, View, StatusBar, Platform, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { TapGlowOverlay, useTapGlow } from "./TapGlow";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Sun01Icon, Moon02Icon, ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import CEraLogo from "./CEraLogo";

export default function AuthBackground({ children, onBack }) {
    const { theme, isDarkMode, toggleTheme } = useTheme();
    const { taps, onTap } = useTapGlow();

    return (
        <View style={[styles.root, { backgroundColor: theme.background }]} onTouchStart={onTap}>
            <StatusBar
                barStyle={isDarkMode ? "light-content" : "dark-content"}
                backgroundColor={theme.background}
                translucent={true}
            />
            {/* Unified Top Navigation */}
            <View style={styles.topNav}>
                {onBack ? (
                    <TouchableOpacity 
                        style={[styles.navBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]} 
                        onPress={onBack}
                        activeOpacity={0.7}
                    >
                        <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color={theme.text} />
                    </TouchableOpacity>
                ) : <View style={styles.navBtnPlaceholder} />}

                <View style={styles.navLogo}>
                    <CEraLogo size="small" />
                </View>

                <TouchableOpacity 
                    style={[styles.navBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]} 
                    onPress={toggleTheme}
                    activeOpacity={0.7}
                >
                    <HugeiconsIcon 
                        icon={isDarkMode ? Sun01Icon : Moon02Icon} 
                        size={20} 
                        color={theme.text} 
                    />
                </TouchableOpacity>
            </View>

            {/* Subtle decorative glow */}
            <View style={[styles.glowCircle, {
                backgroundColor: isDarkMode
                    ? "rgba(247, 227, 83, 0.04)"
                    : "rgba(247, 227, 83, 0.08)",
            }]} />
            <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
                <View style={styles.wrap}>{children}</View>
            </SafeAreaView>
            
            {/* Full-Screen Modern Tap Glow Layer */}
            <TapGlowOverlay taps={taps} />
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    safe: { flex: 1 },
    wrap: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
    glowCircle: {
        position: "absolute",
        top: -120,
        right: -80,
        width: 300,
        height: 300,
        borderRadius: 150,
    },
    topNav: {
        position: "absolute",
        top: Platform.OS === 'ios' ? 60 : 40,
        left: 0,
        right: 0,
        paddingHorizontal: 24,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 100,
    },
    navBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    navBtnPlaceholder: {
        width: 44,
    },
    navLogo: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
});
