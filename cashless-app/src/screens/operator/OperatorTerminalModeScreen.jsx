import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Vibration,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// react-native-nfc-manager requires a native build (not supported in Expo Go).
// We lazy-load it so the app doesn't crash when the native module is missing.
let NfcManager;
let NfcTech;
try {
    const nfc = require("react-native-nfc-manager");
    NfcManager = nfc.default;
    NfcTech = nfc.NfcTech;
} catch (_) {
    // Running in Expo Go or a build without NFC support – use a safe stub.
    NfcTech = { MifareClassic: "MifareClassic" };
    NfcManager = {
        start: async () => { throw new Error("NFC is not supported in Expo Go. Please use a development build."); },
        requestTechnology: async () => { throw new Error("NFC unavailable"); },
        getTag: async () => null,
        cancelTechnologyRequest: () => ({ catch: () => 0 }),
    };
}
import { 
    CreditCardIcon, 
    CheckmarkCircle02Icon, 
    CancelCircleIcon, 
    ArrowLeft02Icon,
    WirelessIcon
} from "@hugeicons/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../api/supabase";
import { API_BASE_URL } from "../../config/api";

const KEY = "operator_selected_vehicle";

export default function OperatorTerminalModeScreen({ navigation }) {
    const [status, setStatus] = useState("idle"); // idle, processing, success, error
    const [message, setMessage] = useState("Tap IC Card to Pay");
    const [balance, setBalance] = useState(null);
    const [fare, setFare] = useState(null);
    const [vehicle, setVehicle] = useState(null);
    const [errorReason, setErrorReason] = useState("");

    const pulseAnim = useRef(new Animated.Value(1)).current;

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
                console.error("Error loading vehicle:", e);
                navigation.navigate("OperatorSetup");
            }
        };
        loadVehicle();
    }, []);

    // ── NFC Initialization & Listening ────────────────────────
    useEffect(() => {
        async function startNfc() {
            try {
                await NfcManager.start();
                listenForTag();
            } catch (ex) {
                console.warn("NFC not supported", ex);
                setStatus("error");
                setMessage("NFC Hardware Error");
            }
        }

        startNfc();

        return () => {
            NfcManager.cancelTechnologyRequest().catch(() => 0);
        };
    }, []);

    const listenForTag = async () => {
        if (status === "processing") return;

        try {
            // Wait for a tag
            await NfcManager.requestTechnology(NfcTech.MifareClassic);
            const tag = await NfcManager.getTag();
            
            if (tag && tag.id) {
                processPayment(tag.id);
            }
        } catch (ex) {
            console.warn("NFC Read error", ex);
            // Restart listener if error or timeout
            if (status === "idle") setTimeout(listenForTag, 1000);
        } finally {
            NfcManager.cancelTechnologyRequest().catch(() => 0);
        }
    };

    const processPayment = async (uid) => {
        setStatus("processing");
        setMessage("Verifying...");

        try {
            const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
            if (sessionErr) throw sessionErr;

            const token = sessionData?.session?.access_token;
            if (!token) throw new Error("Session expired");

            const res = await fetch(`${API_BASE_URL}/transactions/scan`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    credential_value: uid,
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
                
                // Return to idle after 3.5 seconds
                setTimeout(() => {
                    setStatus("idle");
                    setMessage("Tap IC Card to Pay");
                    listenForTag();
                }, 3500);
            } else {
                throw new Error(result.reason || "Declined");
            }
        } catch (err) {
            setErrorReason(err.message);
            setStatus("error");
            Vibration.vibrate(500);
            
            setTimeout(() => {
                setStatus("idle");
                setMessage("Tap IC Card to Pay");
                listenForTag();
            }, 4000);
        }
    };

    // ── Pulse Animation ───────────────────────────────────────
    useEffect(() => {
        if (status === "idle") {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.15, duration: 1500, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        }
    }, [status]);

    const handleExit = () => {
        NfcManager.cancelTechnologyRequest().catch(() => 0);
        navigation.goBack();
    };

    return (
        <View style={[styles.container, styles[status + "Bg"]]}>
            <SafeAreaView style={{ flex: 1 }}>
                
                {/* ── Top Bar ── */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleExit} style={styles.exitBtn}>
                        <ArrowLeft02Icon color="#fff" size={24} />
                        <Text style={styles.exitText}>Exit Terminal</Text>
                    </TouchableOpacity>
                    <View style={styles.vBadge}>
                        <Text style={styles.vCode}>{vehicle?.plate_number || "MOTORELA"}</Text>
                    </View>
                </View>

                {/* ── Main Content ── */}
                <View style={styles.content}>
                    
                    {/* IDLE STATE */}
                    {status === "idle" && (
                        <View style={styles.stateWrap}>
                            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                                <View style={styles.ring}>
                                    <WirelessIcon color="#4ade80" size={140} variant="outline" />
                                </View>
                            </Animated.View>
                            <Text style={styles.mainTitle}>READY TO PAY</Text>
                            <Text style={styles.subTitle}>Please tap your card on the reader</Text>
                        </View>
                    )}

                    {/* PROCESSING STATE */}
                    {status === "processing" && (
                        <View style={styles.stateWrap}>
                            <ActivityIndicator size="large" color="#fff" />
                            <Text style={styles.mainTitle}>{message}</Text>
                        </View>
                    )}

                    {/* SUCCESS STATE */}
                    {status === "success" && (
                        <View style={styles.stateWrap}>
                            <CheckmarkCircle02Icon color="#fff" size={180} variant="solid" />
                            <Text style={styles.successTitle}>APPROVED!</Text>
                            <Text style={styles.fareAmt}>Fare Deducted: ₱{Number(fare).toFixed(2)}</Text>
                            
                            <View style={styles.balanceBox}>
                                <Text style={styles.balLabel}>New Wallet Balance:</Text>
                                <Text style={styles.balValue}>₱{Number(balance).toFixed(2)}</Text>
                            </View>
                        </View>
                    )}

                    {/* ERROR STATE */}
                    {status === "error" && (
                        <View style={styles.stateWrap}>
                            <CancelCircleIcon color="#fff" size={180} variant="solid" />
                            <Text style={styles.errorTitle}>DECLINED</Text>
                            <Text style={styles.errorText}>{errorReason}</Text>
                            <Text style={styles.retryText}>Ask Driver for Assistance</Text>
                        </View>
                    )}

                </View>

                {/* ── Bottom Decorative ── */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Secure NFC Payment Node v1.0</Text>
                </View>

            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    
    // Backgrounds
    idleBg: { backgroundColor: "#0F172A" },
    processingBg: { backgroundColor: "#1D4ED8" },
    successBg: { backgroundColor: "#059669" },
    errorBg: { backgroundColor: "#DC2626" },

    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 24,
        paddingTop: 10,
    },
    exitBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.1)",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 100,
        gap: 8,
    },
    exitText: { color: "#fff", fontWeight: "700", fontSize: 13 },
    vBadge: {
        backgroundColor: "rgba(255,255,255,0.15)",
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 6,
    },
    vCode: { color: "#fff", fontWeight: "900", fontSize: 14 },

    content: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
    stateWrap: { alignItems: "center" },

    ring: {
        width: 260,
        height: 260,
        borderRadius: 130,
        borderWidth: 2,
        borderColor: "rgba(74, 222, 128, 0.3)",
        backgroundColor: "rgba(74, 222, 128, 0.05)",
        justifyContent: "center",
        alignItems: "center",
    },

    mainTitle: { color: "#fff", fontSize: 42, fontWeight: "900", marginTop: 40, textAlign: "center" },
    subTitle: { color: "rgba(255,255,255,0.5)", fontSize: 20, marginTop: 12, textAlign: "center" },

    successTitle: { color: "#fff", fontSize: 56, fontWeight: "900", marginTop: 20 },
    fareAmt: { color: "rgba(255,255,255,0.9)", fontSize: 24, fontWeight: "600", marginTop: 10 },
    
    balanceBox: {
        marginTop: 40,
        backgroundColor: "rgba(0,0,0,0.2)",
        padding: 30,
        borderRadius: 24,
        alignItems: "center",
        width: 300,
    },
    balLabel: { color: "rgba(255,255,255,0.7)", fontSize: 16, fontWeight: "700" },
    balValue: { color: "#fff", fontSize: 42, fontWeight: "900", marginTop: 8 },

    errorTitle: { color: "#fff", fontSize: 56, fontWeight: "900", marginTop: 20 },
    errorText: { color: "rgba(255,255,255,1)", fontSize: 24, fontWeight: "700", marginTop: 10, textAlign: "center" },
    retryText: { color: "rgba(255,255,255,0.7)", fontSize: 18, marginTop: 20 },

    footer: { paddingBottom: 20, alignItems: "center" },
    footerText: { color: "rgba(255,255,255,0.3)", fontSize: 10, textTransform: "uppercase", letterSpacing: 1 },
});
