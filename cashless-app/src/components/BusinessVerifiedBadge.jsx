import React, { useEffect, useRef } from "react";
import { Image, View, Animated } from "react-native";

const BUSINESS_VERIFIED_BADGE = require("../assets/business-badge.png");

export default function BusinessVerifiedBadge({ size = 36, style, withEffect = true, effect = "large" }) {
  // effect: "large" | "small"
  const isSmall = effect === "small";
  const scaledSize = isSmall ? Math.round(size * 1.25) : Math.round(size * 1.8);
  const innerSize = isSmall ? Math.round(size * 1.05) : Math.round(size * 1.4);

  const auraScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!withEffect || !isSmall) return;

    let loop;
    // start slightly smaller so the mount feels natural
    auraScale.setValue(0.95);
    Animated.timing(auraScale, { toValue: 1, duration: 300, useNativeDriver: true }).start(() => {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(auraScale, { toValue: 1.04, duration: 900, useNativeDriver: true }),
          Animated.timing(auraScale, { toValue: 0.98, duration: 900, useNativeDriver: true }),
        ])
      );
      loop.start();
    });

    return () => {
      if (loop && typeof loop.stop === "function") loop.stop();
      auraScale.setValue(1);
    };
  }, [withEffect, isSmall, auraScale]);

  if (!withEffect) {
    return (
      <Image
        source={BUSINESS_VERIFIED_BADGE}
        style={[{ width: size, height: size, resizeMode: "contain" }, style]}
      />
    );
  }

  return (
    <Animated.View
      style={[
        {
          zIndex: 18,
          overflow: 'visible',
          width: scaledSize,
          height: scaledSize,
          borderRadius: scaledSize / 2,
          backgroundColor: isSmall ? "rgba(124,58,237,0.08)" : "rgba(124,58,237,0.12)",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: isSmall ? 0.5 : 1,
          borderColor: isSmall ? "rgba(124,58,237,0.20)" : "rgba(124,58,237,0.28)",
          shadowColor: "#7C3AED",
          shadowOpacity: isSmall ? 0.18 : 0.4,
          shadowRadius: isSmall ? 6 : 12,
          shadowOffset: { width: 0, height: isSmall ? 2 : 4 },
          elevation: isSmall ? 3 : 6,
          transform: [{ scale: isSmall ? auraScale : 1 }],
          opacity: 1,
        },
        style,
      ]}
    >
      <View
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius: innerSize / 2,
          backgroundColor: isSmall ? "rgba(124,58,237,0.06)" : "rgba(124,58,237,0.08)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Image
          source={BUSINESS_VERIFIED_BADGE}
          style={{ width: size, height: size, resizeMode: "contain" }}
        />
      </View>
    </Animated.View>
  );
}