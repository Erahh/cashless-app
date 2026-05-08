import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Alert, TouchableOpacity, ScrollView, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Screen, PrimaryButton, Pill } from "../../components/ui";
import { supabase } from "../../api/supabase";
import { API_BASE_URL } from "../../config/api";
import { useTheme } from "../../context/ThemeContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from "expo-linking";
import * as Haptics from "expo-haptics";
import Animated, { FadeInUp, useSharedValue, useAnimatedStyle, withSequence, withTiming, withSpring } from "react-native-reanimated";

const PRESETS = [50, 100, 200, 500, 1000, 5000];

const formatAmount = (value) => {
    if (!value) return "";
    const numericValue = Number(String(value).replace(/,/g, ""));
    if (Number.isNaN(numericValue)) return "";
    return numericValue.toLocaleString("en-US");
};

const sanitizeAmountInput = (text) => text.replace(/[^\d]/g, "").slice(0, 4);

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
    const [currentBalance, setCurrentBalance] = useState(0);
    const [loading, setLoading] = useState(true);

    // Fetch current balance on mount
    useEffect(() => {
        const fetchBalance = async () => {
            try {
                const { data: s } = await supabase.auth.getSession();
                const token = s?.session?.access_token;
                if (!token) return;

                const res = await fetch(`${API_BASE_URL}/wallet`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (res.ok) {
                    const json = await res.json();
                    setCurrentBalance(Number(json.balance || 0));
                }
            } catch (e) {
                console.warn("Failed to fetch balance:", e.message);
            } finally {
                setLoading(false);
            }
        };

        fetchBalance();
    }, []);

    const startTopup = async () => {
        try {
            const amt = Number(amount);
            if (!amt || amt < 20) return Alert.alert("Top Up", "Minimum is ₱20");
            if (amt > 5000) return Alert.alert("Top Up", "Maximum top-up is ₱5,000");

            const MAX_BALANCE = 100000;
            const projectedBalance = currentBalance + amt;

            // Pre-check: warn if approaching limit
            if (projectedBalance > MAX_BALANCE) {
                const exceedAmount = projectedBalance - MAX_BALANCE;
                return Alert.alert(
                    "Balance Limit Exceeded",
                    `Your projected balance (₱${projectedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) would exceed the maximum limit of ₱100,000.\n\nYour current balance: ₱${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\nTo top up amounts beyond ₱100,000 total balance, you'll need business verification. Contact support for details.`,
                    [{ text: "OK" }]
                );
            }

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
            if (!res.ok) {
                // Handle business verification requirement
                if (json.code === "BUSINESS_VERIFICATION_REQUIRED") {
                    return Alert.alert(
                        "Business Verification Required",
                        `Your wallet has a maximum limit of ₱100,000.\n\nCurrent balance: ₱${json.currentBalance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nProjected balance: ₱${json.projectedBalance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\nTo increase this limit, please contact support or submit a business verification form.`,
                        [{ text: "OK" }]
                    );
                }
                throw new Error(json.error || "Failed to create checkout");
            }

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
                        {loading ? (
                            <View style={style.loadingContainer}>
                                <ActivityIndicator size="large" color={theme.warning} />
                                <Text style={[style.loadingText, { color: theme.text }]}>Loading balance...</Text>
                            </View>
                        ) : (
                            <>
                                {/* Balance Info Card */}
                                <LinearGradient
                                    colors={isDarkMode ? ['#1e3a1f', '#0f1f11'] : ['#e8f5e9', '#c8e6c9']}
                                    style={style.balanceCard}
                                >
                                    <View style={style.balanceCardContent}>
                                        <Text style={[style.balanceLabel, { color: theme.text }]}>Current Balance</Text>
                                        <Text style={[style.balanceAmount, { color: '#2e7d32' }]}>
                                            ₱{currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </Text>
                                        <Text style={[style.balanceLimitInfo, { color: theme.textMuted }]}>
                                            Maximum: ₱100,000 • Remaining: ₱{(100000 - currentBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </Text>
                                    </View>
                                </LinearGradient>

                                <LinearGradient
                                    colors={isDarkMode ? ['#1e1e1e', '#121212'] : ['#ffffff', '#f6f6f6']}
                                    style={style.mainCard}
                                >
                                    <Pill text="Amount" theme={theme} />
                                    <View style={style.amountContainer}>
                                        <Text style={style.currencyLabel}>₱</Text>
                                        <TextInput
                                            value={formatAmount(amount)}
                                            selectTextOnFocus
                                            onChangeText={(text) => {
                                                const cleanText = sanitizeAmountInput(text);
                                                if (cleanText === "") {
                                                    setAmount("");
                                                    return;
                                                }

                                                const numVal = Number(cleanText);
                                                if (numVal <= 5000) {
                                                    setAmount(cleanText);
                                                }
                                            }}
                                            keyboardType="numeric"
                                            placeholder="0.00"
                                            placeholderTextColor={theme.textMuted}
                                            style={style.mainAmountInput}
                                            maxLength={5}
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
                            </>
                        )}
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 80,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 14,
    },
    balanceCard: {
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: isDarkMode ? 'rgba(46, 125, 50, 0.3)' : 'rgba(46, 125, 50, 0.2)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDarkMode ? 0.2 : 0.08,
        shadowRadius: 12,
        elevation: 6,
    },
    balanceCardContent: {
        alignItems: 'flex-start',
    },
    balanceLabel: {
        fontSize: 12,
        fontWeight: '600',
        opacity: 0.8,
        letterSpacing: 0.5,
    },
    balanceAmount: {
        fontSize: 32,
        fontWeight: '900',
        marginTop: 8,
        marginBottom: 12,
    },
    balanceLimitInfo: {
        fontSize: 11,
        fontWeight: '500',
        letterSpacing: 0.3,
    },
    mainCard: {
        borderRadius: 24,
        padding: 18,
        marginBottom: 20,
        marginHorizontal: 4,
        borderWidth: 1.2,
        borderColor: isDarkMode ? 'rgba(255, 171, 0, 0.15)' : 'rgba(255, 171, 0, 0.1)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDarkMode ? 0.4 : 0.15,
        shadowRadius: 20,
        elevation: 12,
    },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 14,
        marginBottom: 18,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: theme.accent,
        shadowColor: 'rgba(247, 227, 83, 0.2)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.6,
        shadowRadius: 4,
        elevation: 3,
    },
    currencyLabel: {
        fontSize: 30,
        fontWeight: '900',
        color: theme.accent,
        marginRight: 10,
        opacity: 1,
    },
    mainAmountInput: {
        fontSize: 30,
        fontWeight: '900',
        color: isDarkMode ? theme.text : '#111827',
        flex: 1,
    },
    quickAmountTitle: {
        fontSize: 11,
        fontWeight: "800",
        color: theme.textMuted,
        letterSpacing: 1.8,
        marginBottom: 10,
        marginLeft: 4,
    },
    presetsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    presetWrapper: {
        width: '31.5%',
        marginBottom: 6,
    },
    presetBtn: {
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "#f9fafb",
        borderWidth: 1.5,
        borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "#e5e7eb",
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDarkMode ? 0.1 : 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    presetBtnActive: {
        borderColor: theme.accent,
        shadowColor: 'rgba(247, 227, 83, 0.3)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.8,
        shadowRadius: 12,
        elevation: 6,
    },
    presetText: {
        color: isDarkMode ? theme.textSecondary : "#6b7280",
        fontWeight: "800",
        fontSize: 13,
        letterSpacing: 0.6,
    },
    presetTextActive: {
        color: "#000000",
        fontWeight: "900",
        fontSize: 13,
        textShadowColor: "transparent",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 0,
    },
    footer: {
        paddingTop: 12,
        paddingBottom: 110,
        backgroundColor: 'transparent',
    }
});
