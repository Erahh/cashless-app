import React, { useCallback } from "react";
import { View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import BottomNav from "../components/BottomNav";
import { InnerNavProvider, useInnerNav } from "../context/InnerNavContext";
import { QrCodeIcon, Notification01Icon, UserIcon, ScanIcon, InvoiceIcon } from "@hugeicons/core-free-icons";

import OperatorScanScreen from "../screens/operator/OperatorScanScreen";
import OperatorSetupScreen from "../screens/operator/OperatorSetupScreen";
import OperatorEarningsScreen from "../screens/operator/OperatorEarningsScreen";
import OperatorMyQRScreen from "../screens/operator/OperatorMyQRScreen";
import OperatorApplyScreen from "../screens/operator/OperatorApplyScreen";
import NotificationsScreen from "../screens/common/NotificationsScreen";
import ProfileScreen from "../screens/common/ProfileScreen";

// Verification flow
import PassengerTypeScreen from "../screens/commuter/PassengerTypeScreen";
import DiscountInfoScreen from "../screens/commuter/DiscountInfoScreen";
import UploadFrontIDScreen from "../screens/commuter/UploadFrontIDScreen";
import UploadBackIDScreen from "../screens/commuter/UploadBackIDScreen";
import UploadVerificationScreen from "../screens/commuter/UploadVerificationScreen";
import VerificationSubmittedScreen from "../screens/commuter/VerificationSubmittedScreen";

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
                <Stack.Screen name="OperatorScan" component={withNavCapture(OperatorScanScreen)} options={{ animation: "fade" }} />
                <Stack.Screen name="OperatorSetup" component={withNavCapture(OperatorSetupScreen)} options={{ animation: "fade" }} />
                <Stack.Screen name="OperatorEarnings" component={withNavCapture(OperatorEarningsScreen)} options={{ animation: "fade" }} />
                <Stack.Screen name="OperatorMyQR" component={withNavCapture(OperatorMyQRScreen)} options={{ animation: "fade" }} />

                {/* Shared */}
                <Stack.Screen name="Profile" component={withNavCapture(ProfileScreen)} />
                <Stack.Screen name="Notifications" component={withNavCapture(NotificationsScreen)} />

                {/* Verification (Shared for all roles) */}
                <Stack.Screen name="PassengerType" component={withNavCapture(PassengerTypeScreen)} />
                <Stack.Screen name="DiscountInfo" component={withNavCapture(DiscountInfoScreen)} />
                <Stack.Screen name="UploadFrontID" component={withNavCapture(UploadFrontIDScreen)} />
                <Stack.Screen name="UploadBackID" component={withNavCapture(UploadBackIDScreen)} />
                <Stack.Screen name="UploadVerification" component={withNavCapture(UploadVerificationScreen)} />
                <Stack.Screen name="VerificationSubmitted" component={withNavCapture(VerificationSubmittedScreen)} />
                <Stack.Screen name="OperatorApply" component={withNavCapture(OperatorApplyScreen)} />
            </Stack.Navigator>
            <OperatorBottomNav />
        </View>
    );
}
