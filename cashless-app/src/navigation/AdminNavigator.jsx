import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AdminDashboardScreen from "../screens/AdminDashboardScreen";
import AdminVerificationScreen from "../screens/AdminVerificationScreen";
import AdminVerificationDetailScreen from "../screens/AdminVerificationDetailScreen";
import AdminSettlementsScreen from "../screens/AdminSettlementsScreen";
import AdminCreateOperatorScreen from "../screens/AdminCreateOperatorScreen";
import AdminPayoutScreen from "../screens/AdminPayoutScreen";

import NotificationsScreen from "../screens/NotificationsScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Stack = createNativeStackNavigator();

export default function AdminNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="AdminDashboard">
            {/* Admin Home */}
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />

            {/* Admin Ops */}
            <Stack.Screen name="AdminVerification" component={AdminVerificationScreen} />
            <Stack.Screen name="AdminVerificationDetail" component={AdminVerificationDetailScreen} />
            <Stack.Screen name="AdminSettlements" component={AdminSettlementsScreen} />
            <Stack.Screen name="AdminCreateOperator" component={AdminCreateOperatorScreen} />
            <Stack.Screen name="AdminPayout" component={AdminPayoutScreen} />

            {/* Shared */}
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
        </Stack.Navigator>
    );
}
