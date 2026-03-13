import React, { useRef, useState, useCallback } from "react";
import { View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import BottomNav from "../components/BottomNav";
import { InnerNavProvider, useInnerNav } from "../context/InnerNavContext";

import HomeScreen from "../screens/common/HomeScreen";
import BalanceScreen from "../screens/commuter/BalanceScreen";
import TransactionsScreen from "../screens/commuter/TransactionsScreen";
import TransactionDetailsScreen from "../screens/commuter/TransactionDetailsScreen";
import ProfileScreen from "../screens/common/ProfileScreen";
import MyQRScreen from "../screens/commuter/MyQRScreen";
import OperatorApplyScreen from "../screens/operator/OperatorApplyScreen";

import CommuterScanScreen from "../screens/commuter/CommuterScanScreen";
import PayConfirmScreen from "../screens/commuter/PayConfirmScreen";
import NFCTapPayScreen from "../screens/commuter/NFCTapPayScreen";
import RegisterRFIDScreen from "../screens/commuter/RegisterRFIDScreen";
import TopUpCheckoutScreen from "../screens/commuter/TopUpCheckoutScreen";
import TopUpScreen from "../screens/commuter/TopUpScreen";

import PassengerTypeScreen from "../screens/commuter/PassengerTypeScreen";
import DiscountInfoScreen from "../screens/commuter/DiscountInfoScreen";
import UploadFrontIDScreen from "../screens/commuter/UploadFrontIDScreen";
import UploadBackIDScreen from "../screens/commuter/UploadBackIDScreen";
import UploadVerificationScreen from "../screens/commuter/UploadVerificationScreen";
import VerificationSubmittedScreen from "../screens/commuter/VerificationSubmittedScreen";

import GuardianLinkScreen from "../screens/commuter/GuardianLinkScreen";
import FriendsMapScreen from "../screens/commuter/FriendsMapScreen";
import AddFriendScreen from "../screens/commuter/AddFriendScreen";
import PersonalInfoScreen from "../screens/common/PersonalInfoScreen";
import SendLoadScreen from "../screens/commuter/SendLoadScreen";
import NotificationsScreen from "../screens/common/NotificationsScreen";

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
                <Stack.Screen name="TransactionDetails" component={withNavCapture(TransactionDetailsScreen)} options={{ animation: "slide_from_right" }} />
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
                <Stack.Screen name="OperatorApply" component={withNavCapture(OperatorApplyScreen)} />

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
