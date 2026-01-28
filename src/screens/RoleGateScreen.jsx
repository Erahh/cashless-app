import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet, Alert } from "react-native";
import { supabase } from "../api/supabase";
import { API_BASE_URL } from "../config/api";

// ✅ Helper for timeout logic (increased for Render cold starts)
async function fetchWithTimeout(url, options = {}, ms = 60000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(id);
    }
}

export default function RoleGateScreen({ navigation }) {
    const [message, setMessage] = useState("Checking your account...");

    useEffect(() => {
        let alive = true;

        async function go({ canRetry = true } = {}) {
            try {
                const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
                if (sessionErr) throw sessionErr;

                const token = sessionData?.session?.access_token;
                if (!token) throw new Error("No session. Please login again.");

                const res = await fetchWithTimeout(`${API_BASE_URL}/me/status`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                // ✅ SAFE PARSE (handles empty body)
                const text = await res.text();
                let json = null;

                if (text) {
                    try {
                        json = JSON.parse(text);
                    } catch (e) {
                        throw new Error(`Server returned non-JSON (HTTP ${res.status})`);
                    }
                }

                if (!res.ok) {
                    throw new Error(json?.error || `Request failed (HTTP ${res.status})`);
                }

                const roles = json?.roles || {};
                const isAdmin = !!roles.is_admin;
                const isOperator = !!roles.is_operator;

                // Priority: Admin > Operator > Commuter
                const target = isAdmin ? "AdminApp" : isOperator ? "OperatorApp" : "CommuterApp";

                if (alive) {
                    navigation.reset({ index: 0, routes: [{ name: target }] });
                }
            } catch (e) {
                const isTimeout = e?.name === "AbortError";
                const msg = isTimeout
                    ? "Server waking up (Render sleep). Retrying..."
                    : e.message;

                console.error("RoleGate error:", e);
                setMessage(msg);

                // ✅ one retry after delay (only on timeout)
                if (isTimeout && canRetry) {
                    setTimeout(() => {
                        if (alive) go({ canRetry: false });
                    }, 5000); // Give server more time to wake up
                    return;
                }

                // ✅ Show error but still navigate (fallback to commuter)
                Alert.alert("Connection Issue", msg + "\n\nContinuing as Commuter...");
                if (alive) navigation.reset({ index: 0, routes: [{ name: "CommuterApp" }] });
            }
        }

        go();
        return () => {
            alive = false;
        };
    }, [navigation]);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#FFD36A" />
            <Text style={styles.message}>{message}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0B0E14",
        alignItems: "center",
        justifyContent: "center",
    },
    message: {
        color: "rgba(255,255,255,0.7)",
        marginTop: 16,
        fontSize: 14,
        textAlign: "center",
        paddingHorizontal: 40,
    },
});
