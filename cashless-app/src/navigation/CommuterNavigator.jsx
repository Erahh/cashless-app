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
import CardApplicationScreen from "../screens/common/CardApplicationScreen";
import PasswordSecurityScreen from "../screens/common/PasswordSecurityScreen";
import BusinessVerificationScreen from "../screens/commuter/BusinessVerificationScreen";

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

// Keep wrapped components stable to avoid remount/jump on navigator re-renders.
const CapturedHomeScreen = withNavCapture(HomeScreen);
const CapturedBalanceScreen = withNavCapture(BalanceScreen);
const CapturedTransactionsScreen = withNavCapture(TransactionsScreen);
const CapturedTransactionDetailsScreen = withNavCapture(TransactionDetailsScreen);
const CapturedProfileScreen = withNavCapture(ProfileScreen);
const CapturedMyQRScreen = withNavCapture(MyQRScreen);
const CapturedSendLoadScreen = withNavCapture(SendLoadScreen);
const CapturedTopUpScreen = withNavCapture(TopUpScreen);
const CapturedTopUpCheckoutScreen = withNavCapture(TopUpCheckoutScreen);
const CapturedCommuterScanScreen = withNavCapture(CommuterScanScreen);
const CapturedPayConfirmScreen = withNavCapture(PayConfirmScreen);
const CapturedNFCTapPayScreen = withNavCapture(NFCTapPayScreen);
const CapturedRegisterRFIDScreen = withNavCapture(RegisterRFIDScreen);
const CapturedPassengerTypeScreen = withNavCapture(PassengerTypeScreen);
const CapturedDiscountInfoScreen = withNavCapture(DiscountInfoScreen);
const CapturedUploadFrontIDScreen = withNavCapture(UploadFrontIDScreen);
const CapturedUploadBackIDScreen = withNavCapture(UploadBackIDScreen);
const CapturedUploadVerificationScreen = withNavCapture(UploadVerificationScreen);
const CapturedVerificationSubmittedScreen = withNavCapture(VerificationSubmittedScreen);
const CapturedOperatorApplyScreen = withNavCapture(OperatorApplyScreen);
const CapturedGuardianLinkScreen = withNavCapture(GuardianLinkScreen);
const CapturedFriendsMapScreen = withNavCapture(FriendsMapScreen);
const CapturedAddFriendScreen = withNavCapture(AddFriendScreen);
const CapturedPersonalInfoScreen = withNavCapture(PersonalInfoScreen);
const CapturedNotificationsScreen = withNavCapture(NotificationsScreen);
const CapturedCardApplicationScreen = withNavCapture(CardApplicationScreen);
const CapturedPasswordSecurityScreen = withNavCapture(PasswordSecurityScreen);
const CapturedBusinessVerificationScreen = withNavCapture(BusinessVerificationScreen);

function CommuterBottomNav() {
    const { navRef, activeRoute } = useInnerNav();

    const handleNavigate = useCallback((route) => {
        const nav = navRef.current;
        if (!nav) return;
        if (activeRoute === route) return;
        nav.navigate(route);
    }, [navRef, activeRoute]);

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
                <Stack.Screen
                    name="Home"
                    component={CapturedHomeScreen}
                    options={{ animation: "none", gestureEnabled: false }}
                />
                <Stack.Screen
                    name="Balance"
                    component={CapturedBalanceScreen}
                    options={{ animation: "none", gestureEnabled: false }}
                />
                <Stack.Screen
                    name="Transactions"
                    component={CapturedTransactionsScreen}
                    options={{ animation: "none", gestureEnabled: false }}
                />
                <Stack.Screen name="TransactionDetails" component={CapturedTransactionDetailsScreen} options={{ animation: "slide_from_right" }} />
                <Stack.Screen
                    name="Profile"
                    component={CapturedProfileScreen}
                    options={{ animation: "none", gestureEnabled: false }}
                />
                <Stack.Screen
                    name="MyQR"
                    component={CapturedMyQRScreen}
                    options={{ animation: "none", gestureEnabled: false }}
                />

                {/* Wallet (Non-tab) */}
                <Stack.Screen name="SendLoad" component={CapturedSendLoadScreen} options={{ animation: "fade" }} />
                <Stack.Screen name="TopUp" component={CapturedTopUpScreen} options={{ animation: "fade" }} />
                <Stack.Screen name="TopUpCheckout" component={CapturedTopUpCheckoutScreen} options={{ animation: "fade" }} />

                {/* QR + Pay (Non-tab) */}
                <Stack.Screen name="CommuterScan" component={CapturedCommuterScanScreen} options={{ animation: "fade" }} />
                <Stack.Screen name="PayConfirm" component={CapturedPayConfirmScreen} options={{ animation: "fade" }} />
                <Stack.Screen name="NFCTapPay" component={CapturedNFCTapPayScreen} options={{ animation: "fade" }} />
                <Stack.Screen name="RegisterRFID" component={CapturedRegisterRFIDScreen} />

                {/* Verification */}
                <Stack.Screen name="PassengerType" component={CapturedPassengerTypeScreen} />
                <Stack.Screen name="DiscountInfo" component={CapturedDiscountInfoScreen} />
                <Stack.Screen name="UploadFrontID" component={CapturedUploadFrontIDScreen} />
                <Stack.Screen name="UploadBackID" component={CapturedUploadBackIDScreen} />
                <Stack.Screen name="UploadVerification" component={CapturedUploadVerificationScreen} />
                <Stack.Screen name="VerificationSubmitted" component={CapturedVerificationSubmittedScreen} />
                <Stack.Screen name="OperatorApply" component={CapturedOperatorApplyScreen} />

                {/* Guardian */}
                <Stack.Screen name="GuardianLink" component={CapturedGuardianLinkScreen} />

                {/* Friends Map */}
                <Stack.Screen name="FriendsMap" component={CapturedFriendsMapScreen} />
                <Stack.Screen name="AddFriend" component={CapturedAddFriendScreen} />

                {/* Profile */}
                <Stack.Screen name="PersonalInfo" component={CapturedPersonalInfoScreen} />
                <Stack.Screen name="Notifications" component={CapturedNotificationsScreen} />
                <Stack.Screen name="CardApplication" component={CapturedCardApplicationScreen} />
                <Stack.Screen name="PasswordSecurity" component={CapturedPasswordSecurityScreen} />
                <Stack.Screen name="BusinessVerification" component={CapturedBusinessVerificationScreen} />
            </Stack.Navigator>
            <CommuterBottomNav />
        </View>
    );
}
