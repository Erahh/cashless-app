import React, { useContext } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AppLockContext } from "../context/AppLockContext";

import AuthGateScreen from "../screens/AuthGateScreen";
import PhoneScreen from "../screens/PhoneScreen";
import OTPScreen from "../screens/OTPScreen";
import BasicInfoScreen from "../screens/BasicInfoScreen";
import MPINSetupScreen from "../screens/MPINSetupScreen";
import ActivatedScreen from "../screens/ActivatedScreen";
import PersonalInfoScreen from "../screens/PersonalInfoScreen";
import ReviewInfoScreen from "../screens/ReviewInfoScreen";
import HomeScreen from "../screens/HomeScreen";
import MPINUnlockScreen from "../screens/MPINUnlockScreen";

import PassengerTypeScreen from "../screens/PassengerTypeScreen";
import DiscountInfoScreen from "../screens/DiscountInfoScreen";
import UploadVerificationScreen from "../screens/UploadVerificationScreen";

// ✅ Add these screens (create files if they don’t exist yet)
import VerificationSubmittedScreen from "../screens/VerificationSubmittedScreen";
import SendLoadScreen from "../screens/SendLoadScreen";
import BalanceScreen from "../screens/BalanceScreen";
import OperatorScanScreen from "../screens/OperatorScanScreen";
import OperatorSetupScreen from "../screens/OperatorSetupScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import TransactionsScreen from "../screens/TransactionsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import GuardianLinkScreen from "../screens/GuardianLinkScreen";
import MyQRScreen from "../screens/MyQRScreen";
import TopUpCheckoutScreen from "../screens/TopUpCheckoutScreen";
import CommuterScanScreen from "../screens/CommuterScanScreen";
import PayConfirmScreen from "../screens/PayConfirmScreen";
import OperatorMyQRScreen from "../screens/OperatorMyQRScreen";

import AdminVerificationScreen from "../screens/AdminVerificationScreen";
import AdminVerificationDetailScreen from "../screens/AdminVerificationDetailScreen";
import OperatorEarningsScreen from "../screens/OperatorEarningsScreen";
import EarningsScreen from "../screens/EarningsScreen";
import AdminSettlementsScreen from "../screens/AdminSettlementsScreen";
import AdminCreateOperatorScreen from "../screens/AdminCreateOperatorScreen";




const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { locked } = useContext(AppLockContext);

  return (
    <Stack.Navigator
      key={locked ? "locked" : "unlocked"}
      screenOptions={{ headerShown: false }}
      initialRouteName={locked ? "MPINUnlock" : "AuthGate"}
    >
      {locked ? (
        <Stack.Screen name="MPINUnlock" component={MPINUnlockScreen} />
      ) : (
        <>
          {/* Auth Flow */}
          <Stack.Screen name="AuthGate" component={AuthGateScreen} />
          <Stack.Screen name="PhoneScreen" component={PhoneScreen} />
          <Stack.Screen name="OTPScreen" component={OTPScreen} />
          <Stack.Screen name="BasicInfo" component={BasicInfoScreen} />
          <Stack.Screen name="MPINSetup" component={MPINSetupScreen} />
          <Stack.Screen name="Activated" component={ActivatedScreen} />
          <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
          <Stack.Screen name="ReviewInfo" component={ReviewInfoScreen} />
          <Stack.Screen name="AdminVerification" component={AdminVerificationScreen} />
          <Stack.Screen name="AdminVerificationDetail" component={AdminVerificationDetailScreen} />
          <Stack.Screen name="Transactions" component={TransactionsScreen} />
          {/* Main */}
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="AdminSettlements" component={AdminSettlementsScreen} />
          <Stack.Screen name="AdminCreateOperator" component={AdminCreateOperatorScreen} />

          {/* Verification Flow */}
          <Stack.Screen name="PassengerType" component={PassengerTypeScreen} />
          <Stack.Screen name="DiscountInfo" component={DiscountInfoScreen} />
          <Stack.Screen name="UploadVerification" component={UploadVerificationScreen} />
          <Stack.Screen
            name="VerificationSubmitted"
            component={VerificationSubmittedScreen}
          />

          {/* Wallet / Load */}
          <Stack.Screen name="SendLoad" component={SendLoadScreen} />
          <Stack.Screen name="Balance" component={BalanceScreen} />
          <Stack.Screen name="Earnings" component={EarningsScreen} />

          {/* Profile & Settings */}
          <Stack.Screen name="Profile" component={ProfileScreen} />

          {/* Operator */}
          <Stack.Screen name="OperatorScan" component={OperatorScanScreen} />
          <Stack.Screen name="OperatorSetup" component={OperatorSetupScreen} />
          <Stack.Screen name="OperatorEarnings" component={OperatorEarningsScreen} />

          {/* Notifications */}
          <Stack.Screen name="Notifications" component={NotificationsScreen} />

          {/* Guardian */}
          <Stack.Screen name="GuardianLink" component={GuardianLinkScreen} />

          {/* QR */}
          <Stack.Screen name="MyQR" component={MyQRScreen} />
          <Stack.Screen name="CommuterScan" component={CommuterScanScreen} />
          <Stack.Screen name="PayConfirm" component={PayConfirmScreen} />
          <Stack.Screen name="OperatorMyQR" component={OperatorMyQRScreen} />

          {/* Checkout */}
          <Stack.Screen name="TopUpCheckout" component={TopUpCheckoutScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
