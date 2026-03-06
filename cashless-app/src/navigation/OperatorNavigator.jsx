import React, { useCallback } from "react";
import { View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import BottomNav from "../components/BottomNav";
import { InnerNavProvider, useInnerNav } from "../context/InnerNavContext";
import { QrCodeIcon, Notification01Icon, UserIcon, ScanIcon, InvoiceIcon } from "@hugeicons/core-free-icons";

import OperatorScanScreen from "../screens/OperatorScanScreen";
import OperatorSetupScreen from "../screens/OperatorSetupScreen";
import OperatorEarningsScreen from "../screens/OperatorEarningsScreen";
import OperatorMyQRScreen from "../screens/OperatorMyQRScreen";

import NotificationsScreen from "../screens/NotificationsScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Stack = createNativeStackNavigator();

function withNavCapture(ScreenComponent) {
    return function CapturedScreen(props) {
        const { navRef } = useInnerNav();
        navRef.current = props.navigation;
        return <ScreenComponent {...props} />;
    };
}

const OPERATOR_TABS = [
    { key: "OperatorMyQR", label: "My QR", icon: QrCodeIcon, route: "OperatorMyQR" },
    { key: "OperatorEarnings", label: "Earnings", icon: InvoiceIcon, route: "OperatorEarnings" },
    { key: "Notifications", label: "Alerts", icon: Notification01Icon, route: "Notifications" },
    { key: "Profile", label: "Profile", icon: UserIcon, route: "Profile" },
];

function OperatorBottomNav() {
    const { navRef, activeRoute } = useInnerNav();

    const handleNavigate = useCallback((route) => {
        const nav = navRef.current;
        if (!nav) return;
        nav.navigate(route);
    }, [navRef]);

    return (
        <BottomNav
            active={activeRoute}
            onNavigate={handleNavigate}
            tabs={OPERATOR_TABS}
            centerRoute="OperatorScan"
            centerIcon={ScanIcon}
        />
    );
}

export default function OperatorNavigator() {
    return (
        <InnerNavProvider>
            <OperatorContent />
        </InnerNavProvider>
    );
}

function OperatorContent() {
    const { setActiveRoute } = useInnerNav();

    return (
        <View style={{ flex: 1 }}>
            <Stack.Navigator
                screenOptions={{ headerShown: false, animation: "slide_from_right" }}
                initialRouteName="OperatorScan"
                screenListeners={{
                    state: (e) => {
                        const routes = e.data?.state?.routes;
                        const index = e.data?.state?.index;
                        if (routes && index !== undefined) {
                            setActiveRoute(routes[index]?.name || "OperatorScan");
                        }
                    },
                }}
            >
                {/* Main Operator Flow */}
                <Stack.Screen name="OperatorScan" component={withNavCapture(OperatorScanScreen)} />
                <Stack.Screen name="OperatorSetup" component={withNavCapture(OperatorSetupScreen)} />
                <Stack.Screen name="OperatorEarnings" component={withNavCapture(OperatorEarningsScreen)} />
                <Stack.Screen name="OperatorMyQR" component={withNavCapture(OperatorMyQRScreen)} />

                {/* Shared */}
                <Stack.Screen name="Profile" component={withNavCapture(ProfileScreen)} />
                <Stack.Screen name="Notifications" component={withNavCapture(NotificationsScreen)} />
            </Stack.Navigator>
            <OperatorBottomNav />
        </View>
    );
}
