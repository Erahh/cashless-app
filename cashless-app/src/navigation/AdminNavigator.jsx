import React, { useCallback } from "react";
import { View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import BottomNav from "../components/BottomNav";
import { InnerNavProvider, useInnerNav } from "../context/InnerNavContext";
import { Home01Icon, CheckmarkCircle01Icon, MoneySend01Icon, UserIcon, Bus01Icon } from "@hugeicons/core-free-icons";

import AdminDashboardScreen from "../screens/admin/AdminDashboardScreen";
import AdminVerificationScreen from "../screens/admin/AdminVerificationScreen";
import AdminVerificationDetailScreen from "../screens/admin/AdminVerificationDetailScreen";
import AdminSettlementsScreen from "../screens/admin/AdminSettlementsScreen";
import AdminCreateOperatorScreen from "../screens/admin/AdminCreateOperatorScreen";
import AdminRegistrationCodesScreen from "../screens/admin/AdminRegistrationCodesScreen";
import AdminPayoutScreen from "../screens/admin/AdminPayoutScreen";

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

const ADMIN_TABS = [
    { key: "AdminDashboard", label: "Home", icon: Home01Icon, route: "AdminDashboard" },
    { key: "AdminVerification", label: "Verify", icon: CheckmarkCircle01Icon, route: "AdminVerification" },
    { key: "AdminSettlements", label: "Settle", icon: MoneySend01Icon, route: "AdminSettlements" },
    { key: "Profile", label: "Profile", icon: UserIcon, route: "Profile" },
];

function AdminBottomNav() {
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
            tabs={ADMIN_TABS}
            centerRoute="AdminCreateOperator"
            centerIcon={Bus01Icon}
        />
    );
}

export default function AdminNavigator() {
    return (
        <InnerNavProvider>
            <AdminContent />
        </InnerNavProvider>
    );
}

function AdminContent() {
    const { setActiveRoute } = useInnerNav();

    return (
        <View style={{ flex: 1 }}>
            <Stack.Navigator
                screenOptions={{ headerShown: false, animation: "slide_from_right" }}
                initialRouteName="AdminDashboard"
                screenListeners={{
                    state: (e) => {
                        const routes = e.data?.state?.routes;
                        const index = e.data?.state?.index;
                        if (routes && index !== undefined) {
                            setActiveRoute(routes[index]?.name || "AdminDashboard");
                        }
                    },
                }}
            >
                {/* Admin Home */}
                <Stack.Screen name="AdminDashboard" component={withNavCapture(AdminDashboardScreen)} />

                {/* Admin Ops */}
                <Stack.Screen name="AdminVerification" component={withNavCapture(AdminVerificationScreen)} options={{ animation: "fade" }} />
                <Stack.Screen name="AdminVerificationDetail" component={withNavCapture(AdminVerificationDetailScreen)} options={{ animation: "fade" }} />
                <Stack.Screen name="AdminSettlements" component={withNavCapture(AdminSettlementsScreen)} options={{ animation: "fade" }} />
                <Stack.Screen name="AdminCreateOperator" component={withNavCapture(AdminCreateOperatorScreen)} options={{ animation: "fade" }} />
                <Stack.Screen name="AdminRegistrationCodes" component={withNavCapture(AdminRegistrationCodesScreen)} />
                <Stack.Screen name="AdminPayout" component={withNavCapture(AdminPayoutScreen)} />

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
            </Stack.Navigator>
            <AdminBottomNav />
        </View>
    );
}
