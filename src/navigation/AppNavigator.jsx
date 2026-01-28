import React, { useContext } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AppLockContext } from "../context/AppLockContext";

import AuthGateScreen from "../screens/AuthGateScreen";
import PhoneScreen from "../screens/PhoneScreen";
import OTPScreen from "../screens/OTPScreen";
import PersonalInfoScreen from "../screens/PersonalInfoScreen";
import ReviewInfoScreen from "../screens/ReviewInfoScreen";
import MPINSetupScreen from "../screens/MPINSetupScreen";
import ActivatedScreen from "../screens/ActivatedScreen";
import MPINUnlockScreen from "../screens/MPINUnlockScreen";

import RoleGateScreen from "../screens/RoleGateScreen";
import CommuterNavigator from "./CommuterNavigator";
import OperatorNavigator from "./OperatorNavigator";
import AdminNavigator from "./AdminNavigator";

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
