import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated } from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { CheckmarkBadge01Icon } from '@hugeicons/core-free-icons';

let VERIFIED_ROSETTE_IMAGE = null;
try {
  // eslint-disable-next-line global-require, import/no-dynamic-require
  VERIFIED_ROSETTE_IMAGE = require('../assets/verified-rosette.png');
} catch (e) {
  VERIFIED_ROSETTE_IMAGE = null;
}

export default function VerifiedBadge({
  size = 20,
  label = null,
  imageUri = null,
  style,
  textStyle,
  // new props
  glow = true,
  glowColor = 'rgba(47,128,237,0.24)',
  glowSize = 10,
  labelColor = '#111',
  labelSize = 13,
}) {
  const iconSize = Math.max(12, Math.floor(size * 0.7));
  const pulse = useRef(new Animated.Value(0)).current;
  usePulse(pulse, glow);
  const imageSource = imageUri ? { uri: imageUri } : VERIFIED_ROSETTE_IMAGE;

  return (
    <View style={[styles.wrap, style]}>
      {imageSource ? (
        <Image source={imageSource} style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]} />
      ) : (
        <View style={{ position: 'relative' }}>
          {glow ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.glow,
                {
                  width: size + glowSize,
                  height: size + glowSize,
                  borderRadius: (size + glowSize) / 2,
                  backgroundColor: glowColor,
                  opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0.95] }),
                  transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1.06] }) }],
                  position: 'absolute',
                  top: -(glowSize / 2),
                  left: -(glowSize / 2),
                },
              ]}
            />
          ) : null}

          <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
            <HugeiconsIcon icon={CheckmarkBadge01Icon} size={iconSize} color="#fff" />
          </View>
        </View>
      )}
      {label ? (
        <Text style={[styles.label, { color: labelColor, fontSize: labelSize }, textStyle]}>{label}</Text>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 20 },
  circle: { backgroundColor: '#2f80ed', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, elevation: 4, zIndex: 22, overflow: 'visible' },
  label: { color: '#111', fontWeight: '700', marginLeft: 6 },
  image: { resizeMode: 'cover' },
  glow: {},
});

// start pulse animation when component mounts
function usePulse(pulseRef, enabled = true) {
  useEffect(() => {
    if (!enabled) {
      pulseRef.setValue(0);
      return undefined;
    }

    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseRef, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseRef, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [enabled, pulseRef]);
}
