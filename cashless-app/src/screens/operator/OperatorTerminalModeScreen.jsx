import React, { useState, useEffect, useRef, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Vibration,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    Dimensions,
    Pressable,
    Keyboard
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HugeiconsIcon } from "@hugeicons/react-native";
import {
    ArrowLeft02Icon,
    CheckmarkCircle02Icon,
    CancelCircleIcon,
    WirelessIcon,
    Alert01Icon,
} from "@hugeicons/core-free-icons";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../api/supabase";
import { API_BASE_URL } from "../../config/api";
import { useTheme } from "../../context/ThemeContext";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const IS_TABLET = SCREEN_WIDTH > 600 || SCREEN_HEIGHT > 800;

const KEY = "operator_selected_vehicle";

export default function OperatorTerminalModeScreen({ navigation }) {
    const { theme } = useTheme();
    const [status, setStatus] = useState("idle"); // idle, processing, success, error
    const [message, setMessage] = useState("Tap Card to Pay");
    const [balance, setBalance] = useState(null);
    const [fare, setFare] = useState(null);
    const [vehicle, setVehicle] = useState(null);
    const [errorReason, setErrorReason] = useState("");
    const [inputValue, setInputValue] = useState("");

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const inputRef = useRef(null);
    
    // Auto-focus protection timer
    const focusTimerRef = useRef(null);

    // ── Pre-load Vehicle ──────────────────────────────────────
    useEffect(() => {
        const loadVehicle = async () => {
            try {
                const saved = await AsyncStorage.getItem(KEY);
                const v = saved ? JSON.parse(saved) : null;
                setVehicle(v);
                if (!v?.id) {
                    navigation.navigate("OperatorSetup");
                }
            } catch (e) {
                    logger.error("Error loading vehicle:", e);
                navigation.navigate("OperatorSetup");
            }
        };
        loadVehicle();
    }, []);

    // ── Keep Scanner Focused ──────────────────────────────────
    useEffect(() => {
        // Enforce focus so the external RFID keyboard emulator can type anytime
        const enforceFocus = () => {
            if (status === "idle" && inputRef.current) {
                inputRef.current.focus();
            }
        };
        
        // Hide soft keyboard immediately if it ever pops up
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
            Keyboard.dismiss();
        });

        focusTimerRef.current = setInterval(enforceFocus, 2000);
        enforceFocus();

        return () => {
            clearInterval(focusTimerRef.current);
            keyboardDidShowListener.remove();
        };
    }, [status]);

    // ── Pulse Animation ───────────────────────────────────────
    useEffect(() => {
        if (status === "idle") {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.1, duration: 1500, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        }
    }, [status]);

    const handleTapScreen = () => {
        if (status === "idle" && inputRef.current) {
            inputRef.current.focus();
            Keyboard.dismiss();
        }
    };

    // ── Process Scan ──────────────────────────────────────────
    const handleTagScanned = async () => {
        const uid = inputValue.trim().replace(/[\s:]/g, "").toUpperCase();
        setInputValue(""); // Clear immediately for next scan
        
        if (!uid) return;
        
        setStatus("processing");
        setMessage("Verifying...");
        Keyboard.dismiss();

        try {
            const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
            if (sessionErr) throw sessionErr;

            const token = sessionData?.session?.access_token;
            if (!token) throw new Error("Session expired");

            // Detect payment method based on credential format
            // IC Cards typically have shorter, hex-based UIDs (8-16 chars)
            // QR codes are typically longer and may contain alphanumeric patterns
            let paymentMethod = "ic_card"; // Default to IC card
            if (uid.length > 20 || uid.includes("-") || uid.startsWith("HTTP")) {
              paymentMethod = "qr_code";
            }

            const res = await fetch(`${API_BASE_URL}/transactions/scan`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    credential_value: uid,
                    payment_method: paymentMethod,
                    vehicle_id: vehicle?.id,
                    route_name: vehicle?.route_name,
                    device_id: "vehicle-terminal",
                }),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Payment failed");

            const result = json.result;

            if (result.ok && result.status === "approved") {
                setBalance(result.balance);
                setFare(result.fare_amount);
                setStatus("success");
                Vibration.vibrate([0, 100, 50, 100]);
                
                setTimeout(() => {
                    setStatus("idle");
                    setMessage("Tap Card to Pay");
                }, 3500); // 3.5 seconds to show success before resetting
            } else {
                throw new Error(result.reason || "Declined");
            }
        } catch (err) {
            setErrorReason(err.message);
            setStatus("error");
            Vibration.vibrate([0, 300, 100, 300]); // Error vibration pattern
            
            setTimeout(() => {
                setStatus("idle");
                setMessage("Tap Card to Pay");
            }, 4000);
        }
    };

    const styles = useMemo(() => createStyles(theme), [theme]);

    return (
        <Pressable onPress={handleTapScreen} style={[styles.container, status !== "idle" && styles[status + "Bg"]]}>
            <SafeAreaView style={{ flex: 1 }}>
                
                {/* ── Hidden Input for RFID Emulator ── */}
                <TextInput
                    ref={inputRef}
                    style={styles.hiddenInput}
                    value={inputValue}
                    onChangeText={setInputValue}
                    onSubmitEditing={handleTagScanned}
                    showSoftInputOnFocus={false}
                    autoCapitalize="none"
                    autoCorrect={false}
                    blurOnSubmit={false}
                />

                {/* ── Top Bar ── */}
                <View style={[styles.header, IS_TABLET && styles.headerTablet]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.exitBtn}>
                        <HugeiconsIcon icon={ArrowLeft02Icon} color={theme.text} size={IS_TABLET ? 32 : 24} />
                        <Text style={[styles.exitText, IS_TABLET && styles.exitTextTablet]}>
                            Exit Terminal
                        </Text>
                    </TouchableOpacity>
                    <View style={styles.vBadge}>
                        <Text style={[styles.vCode, IS_TABLET && styles.vCodeTablet]}>
                            {vehicle?.plate_number || "MOTORELA"}
                        </Text>
                    </View>
                </View>

                {/* ── Main Content ── */}
                <View style={styles.content}>
                    
                    {/* IDLE STATE */}
                    {status === "idle" && (
                        <View style={styles.stateWrap}>
                            <Animated.View style={{ transform: [{ scale: pulseAnim }], marginBottom: 20 }}>
                                <View style={[styles.ring, IS_TABLET && styles.ringTablet]}>
                                    <HugeiconsIcon 
                                        icon={WirelessIcon} 
                                        color={theme.success} 
                                        size={IS_TABLET ? 200 : 140} 
                                    />
                                </View>
                            </Animated.View>
                            <Text style={[styles.mainTitle, IS_TABLET && styles.mainTitleTablet]}>
                                READY TO PAY
                            </Text>
                            <Text style={[styles.subTitle, IS_TABLET && styles.subTitleTablet]}>
                                Tap your IC Card or Phone on the reader
                            </Text>
                        </View>
                    )}

                    {/* PROCESSING STATE */}
                    {status === "processing" && (
                        <View style={styles.stateWrap}>
                            <ActivityIndicator size={IS_TABLET ? "large" : 60} color="#fff" style={{ transform: [{scale: IS_TABLET ? 2 : 1}] }}/>
                            <Text style={[styles.mainTitle, IS_TABLET && styles.mainTitleTablet, { marginTop: 60 }]}>
                                {message}
                            </Text>
                        </View>
                    )}

                    {/* SUCCESS STATE */}
                    {status === "success" && (
                        <View style={styles.stateWrap}>
                            <HugeiconsIcon icon={CheckmarkCircle02Icon} color="#fff" size={IS_TABLET ? 220 : 180} />
                            <Text style={[styles.successTitle, IS_TABLET && styles.successTitleTablet]}>APPROVED</Text>
                            
                            <View style={[styles.receiptCard, IS_TABLET && styles.receiptCardTablet]}>
                                <Text style={[styles.fareLabel, IS_TABLET && styles.fareLabelTablet]}>Fare Deducted</Text>
                                <Text style={[styles.fareAmt, IS_TABLET && styles.fareAmtTablet]}>₱{Number(fare).toFixed(2)}</Text>
                                
                                <View style={styles.divider} />
                                
                                <Text style={[styles.balLabel, IS_TABLET && styles.balLabelTablet]}>New Balance</Text>
                                <Text style={[styles.balValue, IS_TABLET && styles.balValueTablet]}>₱{Number(balance).toFixed(2)}</Text>
                            </View>
                        </View>
                    )}

                    {/* ERROR STATE */}
                    {status === "error" && (
                        <View style={styles.stateWrap}>
                            <HugeiconsIcon icon={CancelCircleIcon} color="#fff" size={IS_TABLET ? 220 : 180} />
                            <Text style={[styles.errorTitle, IS_TABLET && styles.errorTitleTablet]}>DECLINED</Text>
                            
                            <View style={[styles.errorCard, IS_TABLET && styles.errorCardTablet]}>
                                <HugeiconsIcon icon={Alert01Icon} color="#fca5a5" size={IS_TABLET ? 40 : 28} />
                                <Text style={[styles.errorText, IS_TABLET && styles.errorTextTablet]}>{errorReason}</Text>
                            </View>
                            <Text style={[styles.retryText, IS_TABLET && styles.retryTextTablet]}>Ask Operator for Assistance</Text>
                        </View>
                    )}

                </View>

                {/* ── Bottom Decorative ── */}
                <View style={styles.footer}>
                    <Text style={[styles.footerText, IS_TABLET && styles.footerTextTablet]}>
                        Cashless Terminal Node v2.0 • Keyboard Emulator Ready
                    </Text>
                </View>

            </SafeAreaView>
        </Pressable>
    );
}

const createStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    hiddenInput: {
        position: 'absolute',
        width: 1,
        height: 1,
        opacity: 0,
        backgroundColor: 'transparent'
    },
    
    // Backgrounds (Deep vivid colors for high contrast on tablets)
    processingBg: { backgroundColor: "#1e3a8a" }, // Blue 900
    successBg: { backgroundColor: "#065f46" }, // Emerald 800
    errorBg: { backgroundColor: "#7f1d1d" }, // Red 900

    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 24,
        paddingTop: 16,
    },
    headerTablet: { paddingHorizontal: 40, paddingTop: 30 },
    
    exitBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: theme.border,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 14, // modernized button radius like commuter
        gap: 10,
    },
    exitText: { color: theme.text, fontWeight: "700", fontSize: 14 },
    exitTextTablet: { fontSize: 20, paddingHorizontal: 10 },
    
    vBadge: {
        backgroundColor: theme.cardAlt,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.border
    },
    vCode: { color: theme.text, fontWeight: "900", fontSize: 16, letterSpacing: 1 },
    vCodeTablet: { fontSize: 24, paddingHorizontal: 10, paddingVertical: 4 },

    content: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
    stateWrap: { alignItems: "center", width: "100%" },

    ring: {
        width: 280,
        height: 280,
        borderRadius: 140,
        borderWidth: 3,
        borderColor: "rgba(74, 222, 128, 0.4)",
        backgroundColor: "rgba(74, 222, 128, 0.08)",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: theme.success,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 30,
        elevation: 10,
    },
    ringTablet: {
        width: 400,
        height: 400,
        borderRadius: 200,
        borderWidth: 4,
    },

    mainTitle: { color: theme.text, fontSize: 48, fontWeight: "900", letterSpacing: 1 },
    mainTitleTablet: { fontSize: 72 },
    
    subTitle: { color: theme.textSecondary, fontSize: 18, marginTop: 12 },
    subTitleTablet: { fontSize: 28, marginTop: 24 },

    // Success Screen remains mostly distinct
    successTitle: { color: "#fff", fontSize: 64, fontWeight: "900", marginTop: 20, letterSpacing: 2 },
    successTitleTablet: { fontSize: 80, marginTop: 40 },
    
    receiptCard: {
        backgroundColor: "rgba(255,255,255,0.1)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.2)",
        padding: 30,
        borderRadius: 24, // modern card
        alignItems: "center",
        width: "90%",
        maxWidth: 400,
        marginTop: 30,
    },
    receiptCardTablet: { maxWidth: 600, padding: 50, borderRadius: 32 },
    
    fareLabel: { color: "rgba(255,255,255,0.7)", fontSize: 16, fontWeight: "600", textTransform: "uppercase" },
    fareLabelTablet: { fontSize: 24 },
    fareAmt: { color: "#fff", fontSize: 36, fontWeight: "700", marginTop: 4 },
    fareAmtTablet: { fontSize: 56, marginTop: 8 },
    
    divider: { height: 1, width: "100%", backgroundColor: "rgba(255,255,255,0.2)", marginVertical: 20 },
    
    balLabel: { color: "rgba(255,255,255,0.7)", fontSize: 16, fontWeight: "600", textTransform: "uppercase" },
    balLabelTablet: { fontSize: 24 },
    balValue: { color: "#4ade80", fontSize: 48, fontWeight: "900", marginTop: 4 },
    balValueTablet: { fontSize: 72, marginTop: 8 },

    // Error Screen
    errorTitle: { color: "#fff", fontSize: 64, fontWeight: "900", marginTop: 20, letterSpacing: 2 },
    errorTitleTablet: { fontSize: 80, marginTop: 40 },
    
    errorCard: {
        backgroundColor: "rgba(0,0,0,0.3)",
        borderColor: "rgba(239, 68, 68, 0.5)",
        borderWidth: 2,
        padding: 24,
        borderRadius: 20, // modern error card
        alignItems: "center",
        width: "90%",
        maxWidth: 400,
        marginTop: 30,
        gap: 12
    },
    errorCardTablet: { maxWidth: 600, padding: 40, borderRadius: 28, gap: 20 },
    
    errorText: { color: "#fca5a5", fontSize: 20, fontWeight: "700", textAlign: "center", lineHeight: 28 },
    errorTextTablet: { fontSize: 32, lineHeight: 40 },
    
    retryText: { color: "rgba(255,255,255,0.5)", fontSize: 18, marginTop: 30 },
    retryTextTablet: { fontSize: 26, marginTop: 50 },

    footer: { paddingBottom: 30, alignItems: "center" },
    footerText: { color: theme.textSecondary, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 2 },
    footerTextTablet: { fontSize: 16 },
});
