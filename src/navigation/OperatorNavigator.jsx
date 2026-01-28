import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import OperatorScanScreen from "../screens/OperatorScanScreen";
import OperatorSetupScreen from "../screens/OperatorSetupScreen";
import OperatorEarningsScreen from "../screens/OperatorEarningsScreen";
import OperatorMyQRScreen from "../screens/OperatorMyQRScreen";

import NotificationsScreen from "../screens/NotificationsScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Stack = createNativeStackNavigator();

export default function OperatorNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="OperatorScan">
            {/* Main Operator Flow */}
            <Stack.Screen name="OperatorScan" component={OperatorScanScreen} />
            <Stack.Screen name="OperatorSetup" component={OperatorSetupScreen} />
            <Stack.Screen name="OperatorEarnings" component={OperatorEarningsScreen} />
            <Stack.Screen name="OperatorMyQR" component={OperatorMyQRScreen} />

            {/* Shared */}
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
        </Stack.Navigator>
    );
}
