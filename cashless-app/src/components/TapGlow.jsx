// TapGlow.jsx
// Premium, modern Brutalist Grid effect inspired by the ERA Web landing page.
// Features: 
// - High-accuracy tap coordinates (no more screen offset drift)
// - Dynamic Light/Dark modes (Vivid Neon vs Soft High-Tech Gold)
// - Angled perspective 'Brutalist' grid reveal
// - Modern radial gradients with soft feathering

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { View, Animated, StyleSheet, Dimensions, Platform } from "react-native";
import Svg, {
  Defs,
  ClipPath,
  RadialGradient,
  Stop,
  Circle,
  Line,
  G,
} from "react-native-svg";
import { useTheme } from "../context/ThemeContext";

const { width: W, height: H } = Dimensions.get("window");

// Constants for fine-tuning
const GRID_SIZE = 45;
const MASK_RADIUS = 160;
const BURST_SIZE = 220;

// ── Grid lines helper ───────────────────────────────────────────────────────
function GridLines({ color }) {
  const lines = useMemo(() => {
    const cols = Math.ceil(W / GRID_SIZE) + 2;
    const rows = Math.ceil(H / GRID_SIZE) + 2;
    const items = [];

    for (let i = 0; i <= cols; i++) {
      items.push(
        <Line
          key={`v${i}`}
          x1={i * GRID_SIZE} y1={0}
          x2={i * GRID_SIZE} y2={H * 1.5}
          stroke={color}
          strokeWidth={1.2}
          opacity={0.35}
        />
      );
    }
    for (let j = 0; j <= rows; j++) {
      items.push(
        <Line
          key={`h${j}`}
          x1={0} y1={j * GRID_SIZE}
          x2={W * 1.5} y2={j * GRID_SIZE}
          stroke={color} strokeWidth={1.2}
          opacity={0.35}
        />
      );
    }
    return items;
  }, [color]);

  return <G>{lines}</G>;
}

// ── Single tap burst logic — Modern & Brutalist ─────────────────────────────
function TapGlowBurst({ x, y, id, isDarkMode }) {
  const scale = useRef(new Animated.Value(0.2)).current;
  const opacity = useRef(new Animated.Value(0.9)).current;
  const gridOpacity = useRef(new Animated.Value(0)).current;

  // Clean IDs for SVG
  const sId = id.toString().replace(/[^a-zA-Z0-9]/g, "");
  const clipId = `clip_${sId}`;
  const gradId = `grad_${sId}`;

  // Premium colors: Light mode uses a more "Golden Amber", Dark mode uses "Neon Brutal Yellow"
  const accentColor = isDarkMode ? "#facc15" : "#EAB308";
  const glowInner = isDarkMode ? "rgba(250, 204, 21, 0.4)" : "rgba(234, 179, 8, 0.4)";

  useEffect(() => {
    // 1. Burst animation (Scale up and fade out)
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 2.5,
        duration: 750,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 750,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Grid reveal animation: Pulse the perspective grid
    Animated.sequence([
      Animated.timing(gridOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(gridOpacity, {
        toValue: 0,
        duration: 550,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <>
      {/* ── Brutalist Angle Grid Reveal ── */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.burstContainer,
          {
            opacity: gridOpacity,
            transform: [
              { perspective: 1200 },
              { rotateX: "48deg" },
              { scale: 1.5 },
              { translateY: -60 },
            ],
          },
        ]}
      >
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <Defs>
            <ClipPath id={clipId}>
              <Circle cx={x} cy={y} r={MASK_RADIUS} />
            </ClipPath>
            <RadialGradient id={gradId} cx={x} cy={y} r={MASK_RADIUS} fx={x} fy={y} gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor={accentColor} stopOpacity="0.85" />
              <Stop offset="45%" stopColor={accentColor} stopOpacity="0.25" />
              <Stop offset="100%" stopColor={accentColor} stopOpacity="0" />
            </RadialGradient>
          </Defs>

          <G clipPath={`url(#${clipId})`}>
             <GridLines color={accentColor} />
             {/* Hotspot overlay */}
             <Circle cx={x} cy={y} r={MASK_RADIUS * 0.9} fill={`url(#${gradId})`} opacity={0.45} />
          </G>
        </Svg>
      </Animated.View>

      {/* ── Ambient Soft Glow Burst ── */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: x - BURST_SIZE / 2,
          top: y - BURST_SIZE / 2,
          width: BURST_SIZE, height: BURST_SIZE,
          borderRadius: BURST_SIZE / 2,
          backgroundColor: glowInner,
          opacity,
          transform: [{ scale }],
        }}
      />
    </>
  );
}

// ── Main Overlay Component ──────────────────────────────────────────────────
export function TapGlowOverlay({ taps }) {
  const { isDarkMode } = useTheme();
  const [containerOffset, setContainerOffset] = useState({ x: 0, y: 0 });

  return (
    <View 
      style={styles.overlay} 
      pointerEvents="none"
      onLayout={(e) => {
        // Find the offset of this view relative to the screen
        // This helps us adjust pageX/pageY back to local coordinates if needed.
        // But for absoluteFill on root container, offset is 0,0.
      }}
    >
      {taps.map((tap) => (
        <TapGlowBurst
          key={tap.id}
          id={tap.id}
          x={tap.x}
          y={tap.y}
          isDarkMode={isDarkMode}
        />
      ))}
    </View>
  );
}

// ── Custom Hook — Accuracy Fix ──────────────────────────────────────────────
export function useTapGlow() {
  const [taps, setTaps] = useState([]);
  const containerRef = useRef(null);

  const onTap = useCallback((e) => {
    if (!e || !e.nativeEvent) return;
    const { pageX, pageY } = e.nativeEvent;

    const newTap = {
      id: Math.random().toString(36).substring(2, 11),
      x: pageX || 0,
      y: pageY || 0,
    };

    setTaps((prev) => [...prev, newTap]);
    setTimeout(() => {
      setTaps((prev) => prev.filter((t) => t.id !== newTap.id));
    }, 750);
  }, []);

  return { taps, onTap };
}

const styles = StyleSheet.create({
  overlay: {
    // This MUST be absoluteFill on a View that covers the whole screen
    // starting from the VERY TOP of the display to work with pageX / pageY.
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999,
  },
  burstContainer: {
    ...StyleSheet.absoluteFillObject,
  }
});
