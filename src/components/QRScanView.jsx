import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
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

    // Debounce so same QR doesn’t fire repeatedly
    const lastValueRef = useRef("");
    const lastAtRef = useRef(0);

    useEffect(() => {
        if (!managedPermission) return;
        if (!permission) requestPermission();
    }, [permission, requestPermission, managedPermission]);

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
            onScanned?.({ data: value }); // ✅ IMPORTANT: match expo callback signature
        } finally {
            setTimeout(() => setBusy(false), 800);
        }
    };

    // If parent handles permission UI, just render camera
    if (!managedPermission) {
        return (
            <View style={[styles.wrap, style]}>
                <CameraView
                    style={StyleSheet.absoluteFillObject}
                    facing="back"
                    barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                    onBarcodeScanned={handleBarcodeScanned}
                />
                {children}
            </View>
        );
    }

    // Managed permission mode (for other screens)
    if (!permission) {
        return (
            <View style={[styles.center, style]}>
                <ActivityIndicator />
                <Text style={styles.dim}>Checking camera permission…</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={[styles.center, style]}>
                <Text style={styles.title}>{label}</Text>
                <Text style={styles.dim}>Camera permission is required.</Text>
                <TouchableOpacity style={styles.btn} onPress={requestPermission} activeOpacity={0.9}>
                    <Text style={styles.btnText}>Allow Camera</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.wrap, style]}>
            <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={handleBarcodeScanned}
            />

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
        backgroundColor: "rgba(255,255,255,0.06)",
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

    center: { alignItems: "center", justifyContent: "center", padding: 18 },
    title: { color: "#fff", fontWeight: "900", fontSize: 18 },
    dim: { color: "rgba(255,255,255,0.65)", marginTop: 10, textAlign: "center" },
    btn: {
        marginTop: 14,
        backgroundColor: "#FFD36A",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 14,
    },
    btnText: { color: "#0B0E14", fontWeight: "900" },
});
