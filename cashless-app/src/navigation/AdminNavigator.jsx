import React, { useCallback } from "react";
import { View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import BottomNav from "../components/BottomNav";
import { InnerNavProvider, useInnerNav } from "../context/InnerNavContext";
import { Home01Icon, CheckmarkCircle01Icon, MoneySend01Icon, UserIcon, Bus01Icon } from "@hugeicons/core-free-icons";

import AdminDashboardScreen from "../screens/AdminDashboardScreen";
import AdminVerificationScreen from "../screens/AdminVerificationScreen";
import AdminVerificationDetailScreen from "../screens/AdminVerificationDetailScreen";
import AdminSettlementsScreen from "../screens/AdminSettlementsScreen";
import AdminCreateOperatorScreen from "../screens/AdminCreateOperatorScreen";
import AdminPayoutScreen from "../screens/AdminPayoutScreen";

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
                <Stack.Screen name="AdminVerification" component={withNavCapture(AdminVerificationScreen)} />
                <Stack.Screen name="AdminVerificationDetail" component={withNavCapture(AdminVerificationDetailScreen)} />
                <Stack.Screen name="AdminSettlements" component={withNavCapture(AdminSettlementsScreen)} />
                <Stack.Screen name="AdminCreateOperator" component={withNavCapture(AdminCreateOperatorScreen)} />
                <Stack.Screen name="AdminPayout" component={withNavCapture(AdminPayoutScreen)} />

                {/* Shared */}
                <Stack.Screen name="Profile" component={withNavCapture(ProfileScreen)} />
                <Stack.Screen name="Notifications" component={withNavCapture(NotificationsScreen)} />
            </Stack.Navigator>
            <AdminBottomNav />
        </View>
    );
}
