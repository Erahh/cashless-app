import React, { useEffect, useState, useRef } from "react";
import { View, Text, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

export default function CommuterScanScreen({ navigation }) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [ready, setReady] = useState(false);
    const lastValueRef = useRef(null);

    useEffect(() => {
        (async () => {
            if (!permission) return;
            if (!permission.granted) await requestPermission();
            setReady(true);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [permission]);

    const onBarcodeScanned = ({ data }) => {
        if (scanned) return;
        if (!data) return;

        // prevent duplicate rapid scans
        if (lastValueRef.current === data) return;
        lastValueRef.current = data;

        setScanned(true);

        // ✅ Accept formats:
        // 1) plain token: OPQR_xxx
        // 2) payload: cashless:opqr:OPQR_xxx
        // 3) JSON: {"qr_token":"OPQR_xxx","operator_id":"..."}
        let qr_token = null;

        try {
            if (data.startsWith("{")) {
                const obj = JSON.parse(data);
                qr_token = obj.qr_token || obj.token || null;
            } else if (data.startsWith("cashless:opqr:")) {
                qr_token = data.replace("cashless:opqr:", "").trim();
            } else {
                qr_token = String(data).trim();
            }
        } catch {
            qr_token = String(data).trim();
        }

        if (!qr_token || qr_token.length < 6) {
            Alert.alert("Invalid QR", "This QR code is not recognized.", [
                { text: "Scan again", onPress: () => setScanned(false) },
            ]);
            return;
        }

        // go to confirm screen
        navigation.navigate("PayConfirm", { qr_token });
    };

    if (!permission || !ready) {
        return (
            <View style={styles.safe}>
                <ActivityIndicator />
                <Text style={styles.dim}>Preparing camera…</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.safe}>
                <Text style={styles.title}>Camera permission needed</Text>
                <Text style={styles.dim}>Enable camera access to scan operator QR.</Text>

                <TouchableOpacity style={styles.btn} onPress={requestPermission} activeOpacity={0.9}>
                    <Text style={styles.btnText}>Allow Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkBtn}>
                    <Text style={styles.link}>Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.wrap}>
            <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                }}
                onBarcodeScanned={scanned ? undefined : onBarcodeScanned}
            />

            {/* Overlay */}
            <View style={styles.overlay}>
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} activeOpacity={0.9}>
                        <Text style={styles.iconTxt}>‹</Text>
                    </TouchableOpacity>

                    <Text style={styles.header}>Scan Operator QR</Text>

                    <View style={{ width: 42 }} />
                </View>

                <View style={styles.center}>
                    <View style={styles.frame} />
                    <Text style={styles.hint}>Align the QR inside the frame</Text>
                    <Text style={styles.subHint}>We’ll show a confirmation before charging your wallet.</Text>
                </View>

                <View style={styles.bottomBar}>
                    {scanned ? (
                        <TouchableOpacity
                            style={[styles.btn, { backgroundColor: "rgba(255,255,255,0.12)" }]}
                            onPress={() => setScanned(false)}
                            activeOpacity={0.9}
                        >
                            <Text style={[styles.btnText, { color: "#fff" }]}>Scan Again</Text>
                        </TouchableOpacity>
                    ) : (
                        <Text style={styles.dimSmall}>Camera ready…</Text>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { flex: 1, backgroundColor: "#0B0E14" },
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.25)" },

    topBar: {
        paddingTop: 60,
        paddingHorizontal: 18,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    iconBtn: {
        width: 42,
        height: 42,
        borderRadius: 14,
        backgroundColor: "rgba(255,255,255,0.12)",
        alignItems: "center",
        justifyContent: "center",
    },
    iconTxt: { color: "#fff", fontSize: 20, fontWeight: "900" },
    header: { color: "#fff", fontSize: 16, fontWeight: "900" },

    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    frame: {
        width: 260,
        height: 260,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: "rgba(255,211,106,0.95)",
        backgroundColor: "rgba(0,0,0,0.15)",
    },
    hint: { marginTop: 16, color: "#FFD36A", fontWeight: "900" },
    subHint: { marginTop: 6, color: "rgba(255,255,255,0.7)", paddingHorizontal: 30, textAlign: "center" },

    bottomBar: { padding: 18, paddingBottom: 30, alignItems: "center" },
    dimSmall: { color: "rgba(255,255,255,0.55)" },

    safe: { flex: 1, backgroundColor: "#0B0E14", alignItems: "center", justifyContent: "center", padding: 18 },
    title: { color: "#fff", fontSize: 18, fontWeight: "900", marginBottom: 8 },
    dim: { color: "rgba(255,255,255,0.7)" },

    btn: {
        marginTop: 18,
        backgroundColor: "#FFD36A",
        paddingVertical: 14,
        paddingHorizontal: 18,
        borderRadius: 16,
        alignItems: "center",
        minWidth: 180,
    },
    btnText: { color: "#0B0E14", fontWeight: "900" },
    linkBtn: { marginTop: 14 },
    link: { color: "rgba(255,255,255,0.75)", textDecorationLine: "underline" },
});
