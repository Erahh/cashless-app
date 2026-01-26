import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function GlassInput({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType,
    secureTextEntry,
    autoCapitalize = "none",
    maxLength,
}) {
    const [hide, setHide] = useState(!!secureTextEntry);

    return (
        <View style={{ marginTop: 14 }}>
            {!!label && <Text style={styles.label}>{label}</Text>}

            <View style={styles.inputWrap}>
                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor="rgba(255,255,255,0.40)"
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    secureTextEntry={hide}
                    maxLength={maxLength}
                    style={styles.input}
                />

                {secureTextEntry ? (
                    <TouchableOpacity onPress={() => setHide(!hide)} style={styles.eyeBtn} activeOpacity={0.8}>
                        <Ionicons name={hide ? "eye-off" : "eye"} size={20} color="rgba(255,255,255,0.7)" />
                    </TouchableOpacity>
                ) : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    label: {
        color: "rgba(255,255,255,0.65)",
        fontSize: 12,
        fontWeight: "800",
        marginBottom: 8,
    },
    inputWrap: {
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.14)",
        backgroundColor: "rgba(255,255,255,0.08)",
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
    },
    input: {
        flex: 1,
        color: "#FFFFFF",        // ✅ THIS is the main fix (typing is visible)
        fontSize: 16,
        fontWeight: "900",
        paddingVertical: 2,
    },
    eyeBtn: { paddingLeft: 10, paddingVertical: 6 },
});
