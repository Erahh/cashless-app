import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Linking, Alert } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";

/**
 * Props:
 * - onScanned: function({ data })  ✅ matches expo-camera signature
 * - enabled?: boolean             ✅ allow parent to pause scanning
 * - style?: any                   ✅ allow wrapper styles
 * - children?: ReactNode          ✅ overlay UI from parent
 * - managedPermission?: boolean   ✅ if false, parent handles permission UI
 */
export default function QRScanView({
    onScanned,
    enabled = true,
    style,
    children,
    managedPermission = true,
    label = "Scan QR",
    hint = "Align the QR inside the frame",
}) {
    const [permission, requestPermission] = useCameraPermissions();
    const [busy, setBusy] = useState(false);
    const [requesting, setRequesting] = useState(false);
    const isFocused = useIsFocused();
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (isFocused) {
            const timer = setTimeout(() => setShouldRender(true), 300);
            return () => clearTimeout(timer);
        } else {
            setShouldRender(false);
        }
    }, [isFocused]);

    // Debounce so same QR doesn't fire repeatedly
    const lastValueRef = useRef("");
    const lastAtRef = useRef(0);

    // ✅ Auto-request permission on mount (so first-time users get the OS dialog immediately)
    useEffect(() => {
        if (!managedPermission) return;
        if (permission === null) {
            // permission is still loading
            return;
        }
        if (!permission.granted && permission.canAskAgain) {
            requestPermission();
        }
    }, [permission?.status, managedPermission]);

    const handleAllowCamera = async () => {
        if (!permission) return;

        if (permission.canAskAgain) {
            // OS dialog hasn't been permanently dismissed yet — ask normally
            setRequesting(true);
            await requestPermission();
            setRequesting(false);
        } else {
            // Permission is permanently denied — must open device Settings
            Alert.alert(
                "Camera Access Required",
                "Camera access was denied. Please enable it in your device Settings to scan QR codes.",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Open Settings",
                        onPress: () => Linking.openSettings(),
                    },
                ]
            );
        }
    };

    const handleBarcodeScanned = ({ data }) => {
        if (!enabled) return;
        if (busy) return;

        const value = String(data || "").trim();
        if (!value) return;

        const now = Date.now();
        if (value === lastValueRef.current && now - lastAtRef.current < 2000) return;

        lastValueRef.current = value;
        lastAtRef.current = now;

        setBusy(true);
        try {
            onScanned?.({ data: value });
        } finally {
            setTimeout(() => setBusy(false), 800);
        }
    };

    // If parent handles permission UI, just render camera
    if (!managedPermission) {
        return (
            <View style={[styles.wrap, style, { backgroundColor: "#000" }]}>
                {(isFocused && shouldRender) && (
                    <CameraView
                        key={isFocused ? "active" : "inactive"}
                        style={[StyleSheet.absoluteFillObject, { flex: 1 }]}
                        facing="back"
                        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                        onBarcodeScanned={handleBarcodeScanned}
                        onMountError={(e) => Alert.alert("Camera Error", e.message)}
                    />
                )}
                {children}
            </View>
        );
    }

    // Still loading permission info
    if (permission === null) {
        return (
            <View style={[styles.center, style]}>
                <ActivityIndicator color="#FFD36A" />
                <Text style={styles.dim}>Checking camera permission…</Text>
            </View>
        );
    }

    // Permission not granted yet
    if (!permission.granted) {
        const isPermanentlyDenied = !permission.canAskAgain;
        return (
            <View style={[styles.center, style]}>
                <Text style={styles.title}>{label}</Text>
                <Text style={styles.dim}>
                    {isPermanentlyDenied
                        ? "Camera access was denied. Open Settings to enable it."
                        : "Camera permission is required to scan QR codes."}
                </Text>
                <TouchableOpacity
                    style={styles.btn}
                    onPress={handleAllowCamera}
                    activeOpacity={0.9}
                    disabled={requesting}
                >
                    {requesting ? (
                        <ActivityIndicator size="small" color="#0B0E14" />
                    ) : (
                        <Text style={styles.btnText}>
                            {isPermanentlyDenied ? "Open Settings" : "Allow Camera"}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.wrap, style, { backgroundColor: "#000" }]}>
            {(isFocused && shouldRender) && (
                <CameraView
                    key={isFocused ? "active" : "inactive"}
                    style={[StyleSheet.absoluteFillObject, { flex: 1 }]}
                    facing="back"
                    barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                    onBarcodeScanned={handleBarcodeScanned}
                    onMountError={(e) => Alert.alert("Camera Error", e.message)}
                />
            )}

            {/* Default overlay if no children provided */}
            {children ? (
                children
            ) : (
                <View pointerEvents="none" style={styles.defaultOverlay}>
                    <Text style={styles.overlayTitle}>{label}</Text>
                    <Text style={styles.overlayHint}>{hint}</Text>
                    <View style={styles.frame} />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        height: 360,
        borderRadius: 22,
        overflow: "hidden",
        backgroundColor: "transparent",
    },
    defaultOverlay: {
        ...StyleSheet.absoluteFillObject,
        padding: 14,
        backgroundColor: "rgba(0,0,0,0.15)",
    },
    overlayTitle: { color: "#fff", fontWeight: "900", fontSize: 16 },
    overlayHint: { color: "rgba(255,255,255,0.7)", marginTop: 6, fontSize: 12 },
    frame: {
        marginTop: 18,
        alignSelf: "center",
        width: 240,
        height: 240,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: "rgba(255,211,106,0.9)",
        backgroundColor: "rgba(0,0,0,0.05)",
    },

    center: { alignItems: "center", justifyContent: "center", padding: 24, minHeight: 200 },
    title: { color: "#fff", fontWeight: "900", fontSize: 18, textAlign: "center" },
    dim: { color: "rgba(255,255,255,0.65)", marginTop: 10, textAlign: "center", lineHeight: 18 },
    btn: {
        marginTop: 18,
        backgroundColor: "#FFD36A",
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 14,
        minWidth: 160,
        alignItems: "center",
    },
    btnText: { color: "#0B0E14", fontWeight: "900", fontSize: 15 },
});
