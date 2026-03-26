import React, { useState } from "react";
import { View, Text, TextInput, Alert, TouchableOpacity, ScrollView, StyleSheet, Pressable } from "react-native";
import { Screen, PrimaryButton, Pill } from "../../components/ui";
import { supabase } from "../../api/supabase";
import { API_BASE_URL } from "../../config/api";
import { useTheme } from "../../context/ThemeContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from "expo-linking";
import * as Haptics from "expo-haptics";
import Animated, { FadeInUp, useSharedValue, useAnimatedStyle, withSequence, withTiming, withSpring } from "react-native-reanimated";

const PRESETS = [50, 100, 200, 500, 1000, 2000];

function PresetButton({ val, idx, amount, setAmount, style }) {
    const scale = useSharedValue(1);
    const rotation = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { rotate: `${rotation.value}deg` }
        ]
    }));

    const isActive = Number(amount) === val;

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        scale.value = withSequence(
            withSpring(0.92, { damping: 10, stiffness: 200 }),
            withSpring(1, { damping: 10, stiffness: 200 })
        );
        
        rotation.value = withSequence(
            withTiming(-5, { duration: 40 }),
            withTiming(5, { duration: 40 }),
            withTiming(-5, { duration: 40 }),
            withTiming(0, { duration: 40 })
        );
        
        // Small delay so the animation smoothly plays before updating UI state
        setTimeout(() => setAmount(String(val)), 100);
    };

    return (
        <Animated.View 
            entering={FadeInUp.delay(idx * 70).springify().damping(15)}
            style={style.presetWrapper}
        >
            <Animated.View style={[{ flex: 1 }, animatedStyle]}>
                <Pressable
                    onPress={handlePress}
                    style={({ pressed }) => [
                        style.presetBtn,
                        isActive && style.presetBtnActive,
                        pressed && { opacity: 0.85 }
                    ]}
                >
                    <Text style={[style.presetText, isActive && style.presetTextActive]}>
                        ₱{val.toLocaleString()}
                    </Text>
                </Pressable>
            </Animated.View>
        </Animated.View>
    );
}

export default function TopUpScreen({ navigation }) {
    const { theme, isDarkMode } = useTheme();
    const style = React.useMemo(() => createDynamicStyles(theme, isDarkMode), [theme, isDarkMode]);
    const [amount, setAmount] = useState("");

    const startTopup = async () => {
        try {
            const amt = Number(amount);
            if (!amt || amt < 20) return Alert.alert("Top Up", "Minimum is ₱20");

            const { data: s } = await supabase.auth.getSession();
            const token = s?.session?.access_token;
            if (!token) return Alert.alert("Session", "Please login again.");

            const callbackUrl = Linking.createURL("/");

            const res = await fetch(`${API_BASE_URL}/wallet/topup/checkout`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    amount: amt,
                    callbackUrl: callbackUrl,
                }),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed to create checkout");

            navigation.navigate("TopUpCheckout", { ref: json.ref, url: json.checkout_url });
        } catch (e) {
            Alert.alert("Error", e.message);
        }
    };

    return (
        <Screen
            title="Top Up"
            subtitle="Add funds to your wallet instantly."
            theme={theme}
            onBack={() => navigation.goBack()}
        >
            <View style={{ flex: 1 }}>
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={style.container}>
                        <LinearGradient
                            colors={isDarkMode ? ['#1e1e1e', '#121212'] : ['#ffffff', '#f6f6f6']}
                            style={style.mainCard}
                        >
                            <Pill text="Amount" theme={theme} />
                            <View style={style.amountContainer}>
                                <Text style={style.currencyLabel}>₱</Text>
                                <TextInput
                                    value={amount}
                                    onChangeText={setAmount}
                                    keyboardType="numeric"
                                    placeholder="0.00"
                                    placeholderTextColor={theme.textMuted}
                                    style={style.mainAmountInput}
                                />
                            </View>

                            <Text style={style.quickAmountTitle}>QUICK AMOUNT</Text>
                            <View style={style.presetsRow}>
                                {PRESETS.map((val, idx) => (
                                    <PresetButton 
                                        key={val} 
                                        val={val} 
                                        idx={idx} 
                                        amount={amount} 
                                        setAmount={setAmount} 
                                        style={style} 
                                    />
                                ))}
                            </View>
                        </LinearGradient>

                    </View>
                </ScrollView>

                <View style={style.footer}>
                    <PrimaryButton
                        label="Continue"
                        onPress={startTopup}
                        theme={theme}
                    />
                </View>
            </View>
        </Screen>
    );
}

const createDynamicStyles = (theme, isDarkMode) => StyleSheet.create({
    container: {
        paddingTop: 10,
        paddingBottom: 20,
    },
    mainCard: {
        borderRadius: 24,
        padding: 24,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: theme.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: isDarkMode ? 0.3 : 0.12,
        shadowRadius: 24,
        elevation: 10,
    },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 20,
    },
    currencyLabel: {
        fontSize: 38,
        fontWeight: '900',
        color: theme.warning,
        marginRight: 8,
    },
    mainAmountInput: {
        fontSize: 38,
        fontWeight: '900',
        color: theme.text,
        flex: 1,
    },
    quickAmountTitle: {
        fontSize: 11,
        fontWeight: "800",
        color: theme.textMuted,
        letterSpacing: 1.5,
        marginBottom: 12,
        marginLeft: 4,
    },
    presetsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    presetWrapper: {
        width: '31.5%',
        marginBottom: 12,
    },
    presetBtn: {
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: isDarkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
        borderWidth: 1.5,
        borderColor: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
        alignItems: 'center',
        justifyContent: 'center',
    },
    presetBtnActive: {
        backgroundColor: isDarkMode ? "rgba(255, 171, 0, 0.12)" : "rgba(255, 171, 0, 0.15)",
        borderColor: theme.warning,
        shadowColor: theme.warning,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDarkMode ? 0.4 : 0.2,
        shadowRadius: 12,
        elevation: 6,
    },
    presetText: {
        color: theme.textSecondary,
        fontWeight: "800",
        fontSize: 16,
        letterSpacing: 0.5,
    },
    presetTextActive: {
        color: theme.warning,
        fontWeight: "900",
        textShadowColor: isDarkMode ? "rgba(255, 171, 0, 0.4)" : "transparent",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
    },
    footer: {
        paddingTop: 12,
        paddingBottom: 110,
        backgroundColor: 'transparent',
    }
});
