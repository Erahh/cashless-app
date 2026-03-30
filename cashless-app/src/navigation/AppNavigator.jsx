import React, { useContext, useState, useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AppLockContext } from "../context/AppLockContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View } from "react-native";

import LandingScreen from "../screens/auth/LandingScreen";
import AuthGateScreen from "../screens/auth/AuthGateScreen";
import PhoneScreen from "../screens/auth/PhoneScreen";
import OTPScreen from "../screens/auth/OTPScreen";
import PersonalInfoScreen from "../screens/common/PersonalInfoScreen";
import ReviewInfoScreen from "../screens/auth/ReviewInfoScreen";
import MPINSetupScreen from "../screens/auth/MPINSetupScreen";
import ActivatedScreen from "../screens/auth/ActivatedScreen";
import MPINUnlockScreen from "../screens/auth/MPINUnlockScreen";

import RoleGateScreen from "../screens/auth/RoleGateScreen";
import RoleSelectionScreen from "../screens/auth/RoleSelectionScreen";
import OperatorCodeScreen from "../screens/auth/OperatorCodeScreen";
import CommuterNavigator from "./CommuterNavigator";
import OperatorNavigator from "./OperatorNavigator";
import AdminNavigator from "./AdminNavigator";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { locked } = useContext(AppLockContext);
  const [initialRoute, setInitialRoute] = useState(null); // null = loading

  useEffect(() => {
    let isMounted = true;

    if (locked) {
      setInitialRoute("MPINUnlock");
      return;
    }

    AsyncStorage.getItem("@era_onboarding_done")
      .then((val) => {
        if (!isMounted) return;
        setInitialRoute(val === "true" ? "AuthGate" : "Landing");
      })
      .catch(() => {
        if (!isMounted) return;
        setInitialRoute("AuthGate");
      });

    return () => {
      isMounted = false;
    };
  }, [locked]);

  // Derive initial route dynamically to avoid race conditions when switching auth contexts
  const safeRoute = locked
    ? "MPINUnlock"
    : (initialRoute === "MPINUnlock" || initialRoute === null ? null : initialRoute);

  // Render nothing until we know the initial route (avoids flicker)
  if (!safeRoute) {
    return <View style={{ flex: 1, backgroundColor: "#030614" }} />;
  }

  return (
    <Stack.Navigator
      key={locked ? "locked" : "unlocked"}
      screenOptions={{ headerShown: false, animation: "fade" }}
      initialRouteName={safeRoute}
    >
      {locked ? (
        /* LOCK FLOW */
        <Stack.Screen name="MPINUnlock" component={MPINUnlockScreen} />
      ) : (
        <>
          {/* ONBOARDING (shown only once) */}
          <Stack.Screen name="Landing" component={LandingScreen} />

          {/* AUTH FLOW */}
          <Stack.Screen name="AuthGate" component={AuthGateScreen} />
          <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
          <Stack.Screen name="PhoneScreen" component={PhoneScreen} />
          <Stack.Screen name="OperatorCode" component={OperatorCodeScreen} />
          <Stack.Screen name="OTPScreen" component={OTPScreen} />

          {/* REGISTRATION */}
          <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
          <Stack.Screen name="ReviewInfo" component={ReviewInfoScreen} />
          <Stack.Screen name="MPINSetup" component={MPINSetupScreen} />
          <Stack.Screen name="Activated" component={ActivatedScreen} />

          {/* ROLE ROUTER */}
          <Stack.Screen name="RoleGate" component={RoleGateScreen} />

          {/* ROLE APPS */}
          <Stack.Screen name="CommuterApp" component={CommuterNavigator} options={{ animation: "fade" }} />
          <Stack.Screen name="OperatorApp" component={OperatorNavigator} options={{ animation: "fade" }} />
          <Stack.Screen name="AdminApp" component={AdminNavigator} options={{ animation: "fade" }} />
        </>
      )}
    </Stack.Navigator>
  );
}
