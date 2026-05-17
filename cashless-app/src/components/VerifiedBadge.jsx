import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated } from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { CheckmarkBadge01Icon } from '@hugeicons/core-free-icons';

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
  if (glow) usePulse(pulse);

  // Prefer a local asset if present. Place your rosette image at
  // src/assets/verified-rosette.png and the component will use it.
  let localImage = null;
  try {
    // relative to this file: src/components -> ../assets
    // bundlers will inline this if file exists; if not, require will throw
    // and we will fall back to the icon.
    // eslint-disable-next-line global-require, import/no-dynamic-require
    localImage = require('../assets/verified-rosette.png');
  } catch (e) {
    localImage = null;
  }

  const imageSource = imageUri ? { uri: imageUri } : localImage ? localImage : null;

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
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  circle: { backgroundColor: '#2f80ed', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, elevation: 2 },
  label: { color: '#111', fontWeight: '700', marginLeft: 6 },
  image: { resizeMode: 'cover' },
  glow: {},
});

// start pulse animation when component mounts
function usePulse(pulseRef) {
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseRef, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseRef, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulseRef]);
}
