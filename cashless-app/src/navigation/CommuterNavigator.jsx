import React, { useRef, useState, useCallback } from "react";
import { View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import BottomNav from "../components/BottomNav";
import { InnerNavProvider, useInnerNav } from "../context/InnerNavContext";

import HomeScreen from "../screens/HomeScreen";
import BalanceScreen from "../screens/BalanceScreen";
import TransactionsScreen from "../screens/TransactionsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import MyQRScreen from "../screens/MyQRScreen";

import CommuterScanScreen from "../screens/CommuterScanScreen";
import PayConfirmScreen from "../screens/PayConfirmScreen";
import NFCTapPayScreen from "../screens/NFCTapPayScreen";
import RegisterRFIDScreen from "../screens/RegisterRFIDScreen";
import TopUpCheckoutScreen from "../screens/TopUpCheckoutScreen";
import TopUpScreen from "../screens/TopUpScreen";

import PassengerTypeScreen from "../screens/PassengerTypeScreen";
import DiscountInfoScreen from "../screens/DiscountInfoScreen";
import UploadFrontIDScreen from "../screens/UploadFrontIDScreen";
import UploadBackIDScreen from "../screens/UploadBackIDScreen";
import UploadVerificationScreen from "../screens/UploadVerificationScreen";
import VerificationSubmittedScreen from "../screens/VerificationSubmittedScreen";

import GuardianLinkScreen from "../screens/GuardianLinkScreen";
import FriendsMapScreen from "../screens/FriendsMapScreen";
import AddFriendScreen from "../screens/AddFriendScreen";
import PersonalInfoScreen from "../screens/PersonalInfoScreen";
import SendLoadScreen from "../screens/SendLoadScreen";
import NotificationsScreen from "../screens/NotificationsScreen";

const Stack = createNativeStackNavigator();

/**
 * Wraps a screen component so it captures its navigation object
 * into our InnerNavContext. This means the BottomNav always has
 * a reference to the correct (inner) navigation.
 */
function withNavCapture(ScreenComponent) {
    return function CapturedScreen(props) {
        const { navRef } = useInnerNav();
        // Always keep the ref updated with the latest screen's navigation
        navRef.current = props.navigation;
        return <ScreenComponent {...props} />;
    };
}

function CommuterBottomNav() {
    const { navRef, activeRoute } = useInnerNav();

    const handleNavigate = useCallback((route) => {
        const nav = navRef.current;
        if (!nav) return;
        nav.navigate(route);
    }, [navRef]);

    return <BottomNav active={activeRoute} onNavigate={handleNavigate} />;
}

export default function CommuterNavigator() {
    return (
        <InnerNavProvider>
            <CommuterContent />
        </InnerNavProvider>
    );
}

function CommuterContent() {
    const { setActiveRoute } = useInnerNav();

    return (
        <View style={{ flex: 1 }}>
            <Stack.Navigator
                screenOptions={{ headerShown: false, animation: "slide_from_right" }}
                initialRouteName="Home"
                screenListeners={{
                    state: (e) => {
                        // Track the active route name whenever navigation state changes
                        const routes = e.data?.state?.routes;
                        const index = e.data?.state?.index;
                        if (routes && index !== undefined) {
                            setActiveRoute(routes[index]?.name || "Home");
                        }
                    },
                }}
            >
                {/* Main Screens (formerly tabs) */}
                <Stack.Screen name="Home" component={withNavCapture(HomeScreen)} options={{ animation: "fade" }} />
                <Stack.Screen name="Balance" component={withNavCapture(BalanceScreen)} options={{ animation: "fade" }} />
                <Stack.Screen name="Transactions" component={withNavCapture(TransactionsScreen)} options={{ animation: "fade" }} />
                <Stack.Screen name="Profile" component={withNavCapture(ProfileScreen)} options={{ animation: "fade" }} />
                <Stack.Screen name="MyQR" component={withNavCapture(MyQRScreen)} options={{ animation: "slide_from_bottom" }} />

                {/* Wallet (Non-tab) */}
                <Stack.Screen name="SendLoad" component={withNavCapture(SendLoadScreen)} />
                <Stack.Screen name="TopUp" component={withNavCapture(TopUpScreen)} />
                <Stack.Screen name="TopUpCheckout" component={withNavCapture(TopUpCheckoutScreen)} />

                {/* QR + Pay (Non-tab) */}
                <Stack.Screen name="CommuterScan" component={withNavCapture(CommuterScanScreen)} />
                <Stack.Screen name="PayConfirm" component={withNavCapture(PayConfirmScreen)} />
                <Stack.Screen name="NFCTapPay" component={withNavCapture(NFCTapPayScreen)} />
                <Stack.Screen name="RegisterRFID" component={withNavCapture(RegisterRFIDScreen)} />

                {/* Verification */}
                <Stack.Screen name="PassengerType" component={withNavCapture(PassengerTypeScreen)} />
                <Stack.Screen name="DiscountInfo" component={withNavCapture(DiscountInfoScreen)} />
                <Stack.Screen name="UploadFrontID" component={withNavCapture(UploadFrontIDScreen)} />
                <Stack.Screen name="UploadBackID" component={withNavCapture(UploadBackIDScreen)} />
                <Stack.Screen name="UploadVerification" component={withNavCapture(UploadVerificationScreen)} />
                <Stack.Screen name="VerificationSubmitted" component={withNavCapture(VerificationSubmittedScreen)} />

                {/* Guardian */}
                <Stack.Screen name="GuardianLink" component={withNavCapture(GuardianLinkScreen)} />

                {/* Friends Map */}
                <Stack.Screen name="FriendsMap" component={withNavCapture(FriendsMapScreen)} />
                <Stack.Screen name="AddFriend" component={withNavCapture(AddFriendScreen)} />

                {/* Profile */}
                <Stack.Screen name="PersonalInfo" component={withNavCapture(PersonalInfoScreen)} />
                <Stack.Screen name="Notifications" component={withNavCapture(NotificationsScreen)} />
            </Stack.Navigator>
            <CommuterBottomNav />
        </View>
    );
}
