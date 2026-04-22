import React from "react";
import { StyleSheet, View, StatusBar, Platform, TouchableOpacity, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Sun01Icon, Moon02Icon, ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import CEraLogo from "./CEraLogo";

const { width, height } = Dimensions.get("window");
const GRID_SIZE = 30;

export default function AuthBackground({ children, onBack }) {
    const { theme, isDarkMode, toggleTheme } = useTheme();

    const bgColor = isDarkMode ? theme.background : "#F9F6EE";
    const gridColor = isDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
    const btnBg = isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)";
    const btnBorder = isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";
    const iconColor = isDarkMode ? theme.text : "#121417";

    // Render a subtle grid
    const renderGrid = () => {
        const columns = Math.ceil(width / GRID_SIZE);
        const rows = Math.ceil(height / GRID_SIZE);
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
        <View style={[styles.root, { backgroundColor: bgColor }]}>
            <StatusBar
                barStyle={isDarkMode ? "light-content" : "dark-content"}
                backgroundColor={bgColor}
                translucent={false}
            />
            
            {/* Background Grid */}
            <View style={styles.bgContainer}>
                {renderGrid()}
            </View>

            {/* Unified Top Navigation */}
            <View style={styles.topNav}>
                {onBack ? (
                    <TouchableOpacity 
                        style={[styles.navBtn, { backgroundColor: btnBg, borderColor: btnBorder }]} 
                        onPress={onBack}
                        activeOpacity={0.7}
                    >
                        <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color={iconColor} />
                    </TouchableOpacity>
                ) : <View style={styles.navBtnPlaceholder} />}

                <View style={styles.navLogo}>
                    <CEraLogo size="small" />
                </View>

                <TouchableOpacity 
                    style={[styles.navBtn, { backgroundColor: btnBg, borderColor: btnBorder }]} 
                    onPress={toggleTheme}
                    activeOpacity={0.7}
                >
                    <HugeiconsIcon 
                        icon={isDarkMode ? Sun01Icon : Moon02Icon} 
                        size={20} 
                        color={iconColor} 
                    />
                </TouchableOpacity>
            </View>

            <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
                <View style={styles.wrap}>{children}</View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { 
        flex: 1, 
    },
    bgContainer: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.4,
    },
    gridLineV: {
        position: 'absolute',
        width: 1,
        height: '100%',
    },
    gridLineH: {
        position: 'absolute',
        height: 1,
        width: '100%',
    },
    safe: { flex: 1 },
    wrap: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
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
