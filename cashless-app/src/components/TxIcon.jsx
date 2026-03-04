import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from '../context/ThemeContext';

// Convert static export to custom hook for theme awareness
export const useIconInfo = (title = "", type = "", source = "") => {
    const { theme } = useTheme();
    const isDark = theme?.isDark ?? true;

    // Use darker gold/yellow for light mode to maintain contrast
    const yellowColor = isDark ? "#F7E353" : "#C69C00";

    const lowerTitle = String(title || "").toLowerCase();
    const lowerType = String(type || "").toLowerCase();
    const lowerSource = String(source || "").toLowerCase();

    // 1) Top-Up / Cash-in
    if (lowerTitle.includes("top-up") || lowerTitle.includes("top up") || lowerType === "topup" || lowerSource === "topup") {
        return { icon: "wallet-plus-outline", color: yellowColor };
    }
    // 2) IC Card / RFID / Tap Payments
    if (lowerTitle.includes("rfid") || lowerTitle.includes("ic card") || lowerTitle.includes("card") || lowerTitle.includes("nfc") || lowerTitle.includes("tap")) {
        return { icon: "credit-card-wireless-outline", color: "#a259ff" };
    }
    // 3) Ride / Travel Related
    if (lowerTitle.includes("ride") || lowerTitle.includes("scanned") || lowerType === "fare" || lowerTitle.includes("fare")) {
        return { icon: "bus-clock", color: "#FF9F43" };
    }
    // 4) Transfers / Send Load
    if (lowerTitle.includes("transfer") || lowerTitle.includes("send") || lowerTitle.includes("load") || lowerTitle.includes("received") || lowerType === "transfer") {
        return { icon: "swap-horizontal-circle-outline", color: "#3B99FF" };
    }
    // 5) Wallet / General Payments
    if (lowerTitle.includes("payment") || lowerTitle.includes("pay") || lowerType === "payment" || lowerTitle.includes("wallet")) {
        return { icon: "wallet-outline", color: yellowColor };
    }

    return { icon: "swap-horizontal", color: "#A0A0A0" };
};

export default function TxIcon({ title, type, source }) {
    const { icon, color } = useIconInfo(title, type, source);

    return (
        <View style={[styles.iconWrapper, { borderColor: color + '50' }]}>
            <View style={[styles.iconInner, { backgroundColor: color + '15' }]}>
                <MaterialCommunityIcons name={icon} size={20} color={color} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    iconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 1.5,
        alignItems: "center",
        justifyContent: "center",
    },
    iconInner: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: "center",
        justifyContent: "center",
    },
});
