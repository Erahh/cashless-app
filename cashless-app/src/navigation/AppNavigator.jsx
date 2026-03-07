import React, { useContext } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AppLockContext } from "../context/AppLockContext";

import AuthGateScreen from "../screens/auth/AuthGateScreen";
import PhoneScreen from "../screens/auth/PhoneScreen";
import OTPScreen from "../screens/auth/OTPScreen";
import PersonalInfoScreen from "../screens/common/PersonalInfoScreen";
import ReviewInfoScreen from "../screens/auth/ReviewInfoScreen";
import MPINSetupScreen from "../screens/auth/MPINSetupScreen";
import ActivatedScreen from "../screens/auth/ActivatedScreen";
import MPINUnlockScreen from "../screens/auth/MPINUnlockScreen";

import RoleGateScreen from "../screens/auth/RoleGateScreen";
import CommuterNavigator from "./CommuterNavigator";
import OperatorNavigator from "./OperatorNavigator";
import AdminNavigator from "./AdminNavigator";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { locked } = useContext(AppLockContext);

  return (
    <Stack.Navigator
      key={locked ? "locked" : "unlocked"}
      screenOptions={{ headerShown: false, animation: "slide_from_right" }}
      initialRouteName={locked ? "MPINUnlock" : "AuthGate"}
    >
      {locked ? (
        /* LOCK FLOW - Only show unlock screen when locked */
        <Stack.Screen name="MPINUnlock" component={MPINUnlockScreen} />
      ) : (
        <>
          {/* AUTH FLOW */}
          <Stack.Screen name="AuthGate" component={AuthGateScreen} />
          <Stack.Screen name="PhoneScreen" component={PhoneScreen} />
          <Stack.Screen name="OTPScreen" component={OTPScreen} />

          {/* REGISTRATION */}
          <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
          <Stack.Screen name="ReviewInfo" component={ReviewInfoScreen} />
          <Stack.Screen name="MPINSetup" component={MPINSetupScreen} />
          <Stack.Screen name="Activated" component={ActivatedScreen} />

          {/* ROLE ROUTER */}
          <Stack.Screen name="RoleGate" component={RoleGateScreen} />

          {/* ROLE APPS */}
          <Stack.Screen name="CommuterApp" component={CommuterNavigator} />
          <Stack.Screen name="OperatorApp" component={OperatorNavigator} />
          <Stack.Screen name="AdminApp" component={AdminNavigator} />
        </>
      )}
    </Stack.Navigator>
  );
}
