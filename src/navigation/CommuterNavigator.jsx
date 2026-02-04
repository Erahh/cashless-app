import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "../screens/HomeScreen";
import BalanceScreen from "../screens/BalanceScreen";
import TransactionsScreen from "../screens/TransactionsScreen";
import SendLoadScreen from "../screens/SendLoadScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import ProfileScreen from "../screens/ProfileScreen";

import MyQRScreen from "../screens/MyQRScreen";
import CommuterScanScreen from "../screens/CommuterScanScreen";
import PayConfirmScreen from "../screens/PayConfirmScreen";
import NFCTapPayScreen from "../screens/NFCTapPayScreen";
import RegisterRFIDScreen from "../screens/RegisterRFIDScreen";
import TopUpCheckoutScreen from "../screens/TopUpCheckoutScreen";

import PassengerTypeScreen from "../screens/PassengerTypeScreen";
import DiscountInfoScreen from "../screens/DiscountInfoScreen";
import UploadFrontIDScreen from "../screens/UploadFrontIDScreen";
import UploadBackIDScreen from "../screens/UploadBackIDScreen";
import UploadVerificationScreen from "../screens/UploadVerificationScreen";
import VerificationSubmittedScreen from "../screens/VerificationSubmittedScreen";

import GuardianLinkScreen from "../screens/GuardianLinkScreen";

const Stack = createNativeStackNavigator();

export default function CommuterNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Home">
            {/* Main */}
            <Stack.Screen name="Home" component={HomeScreen} />

            {/* Wallet */}
            <Stack.Screen name="Balance" component={BalanceScreen} />
            <Stack.Screen name="Transactions" component={TransactionsScreen} />
            <Stack.Screen name="SendLoad" component={SendLoadScreen} />
            <Stack.Screen name="TopUpCheckout" component={TopUpCheckoutScreen} />

            {/* QR + Pay */}
            <Stack.Screen name="MyQR" component={MyQRScreen} />
            <Stack.Screen name="CommuterScan" component={CommuterScanScreen} />
            <Stack.Screen name="PayConfirm" component={PayConfirmScreen} />
            <Stack.Screen name="NFCTapPay" component={NFCTapPayScreen} />
            <Stack.Screen name="RegisterRFID" component={RegisterRFIDScreen} />

            {/* Verification */}
            <Stack.Screen name="PassengerType" component={PassengerTypeScreen} />
            <Stack.Screen name="DiscountInfo" component={DiscountInfoScreen} />
            <Stack.Screen name="UploadFrontID" component={UploadFrontIDScreen} />
            <Stack.Screen name="UploadBackID" component={UploadBackIDScreen} />
            <Stack.Screen name="UploadVerification" component={UploadVerificationScreen} />
            <Stack.Screen name="VerificationSubmitted" component={VerificationSubmittedScreen} />

            {/* Guardian */}
            <Stack.Screen name="GuardianLink" component={GuardianLinkScreen} />

            {/* Profile */}
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
        </Stack.Navigator>
    );
}
