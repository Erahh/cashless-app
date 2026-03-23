// LandingScreen.jsx
// Onboarding carousel — ERA Wallet landing screen
// Shown only once (first launch), then skipped via AsyncStorage.
// Features: 3 animated slides, tap glow BG (mirrors web CursorGlow tapWave),
//           dot indicators, and a "Get Started" button.

import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  FlatList,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

// ─── Slide Data ────────────────────────────────────────────────────────────────
const SLIDES = [
  {
    id: "1",
    // Dark gradient inspired by the web landing page (#030614 deep space)
    bgColors: ["#030614", "#0d1340", "#1a1a2e"],
    accentColor: "#6366f1",
    glowColor: "rgba(99, 102, 241, 0.35)",
    headline: "Zero Friction,",
    headlineAccent: "Limitless Motion.",
    subtitle: "Your all-in-one cashless commuting wallet. Tap, ride, and go.",
    tag: "Next-Gen Fare System",
    // Abstract card illustration (drawn with pure Views)
    IllustrationComponent: CardIllustration,
  },
  {
    id: "2",
    bgColors: ["#030614", "#0b1628", "#001d3d"],
    accentColor: "#22d3ee",
    glowColor: "rgba(34, 211, 238, 0.3)",
    headline: "Instant",
    headlineAccent: "Settlements.",
    subtitle: "Real-time balance updates and lightning-fast transaction clearing.",
    tag: "ERA Wallet",
    IllustrationComponent: WalletIllustration,
  },
  {
    id: "3",
    bgColors: ["#030614", "#0f1a0a", "#0a1f0a"],
    accentColor: "#34d399",
    glowColor: "rgba(52, 211, 153, 0.3)",
    headline: "Unbreakable",
    headlineAccent: "Security.",
    subtitle: "Military-grade encryption for every peso that moves through the system.",
    tag: "Secured Platform",
    IllustrationComponent: ShieldIllustration,
  },
];

// ─── Slide Illustrations ────────────────────────────────────────────────────────

function CardIllustration({ accentColor }) {
  const float1 = useRef(new Animated.Value(0)).current;
  const float2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float1, { toValue: -12, duration: 2200, useNativeDriver: true }),
        Animated.timing(float1, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(float2, { toValue: 10, duration: 2800, useNativeDriver: true }),
        Animated.timing(float2, { toValue: 0, duration: 2800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={illStyles.container}>
      {/* Back card */}
      <Animated.View style={[illStyles.cardBack, { transform: [{ translateY: float2 }] }]}>
        <LinearGradient colors={["#fbbf24", "#d97706", "#ec4899"]} style={illStyles.cardGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={illStyles.cardChip} />
          <Text style={illStyles.cardNumber}>**** **** **** 9012</Text>
          <Text style={illStyles.cardLabel}>Cashless Card</Text>
        </LinearGradient>
      </Animated.View>

      {/* Front card — frosted glass */}
      <Animated.View style={[illStyles.cardFront, { transform: [{ translateY: float1 }] }]}>
        <View style={illStyles.cardGlassInner}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={illStyles.cardFrontLabel}>C Era</Text>
            <View style={{ flexDirection: "row" }}>
              <View style={[illStyles.mcCircle, { backgroundColor: "#f97316", marginRight: -8 }]} />
              <View style={[illStyles.mcCircle, { backgroundColor: "#ec4899" }]} />
            </View>
          </View>
          <View>
            <View style={illStyles.cardChipLight} />
            <Text style={illStyles.cardFrontNumber}>1234 5678 9012 245</Text>
            <Text style={illStyles.cardFrontExpiry}>12/28</Text>
          </View>
        </View>
      </Animated.View>

      {/* Sparkle star */}
      <Animated.Text style={[illStyles.star, { top: 10, right: 20, transform: [{ translateY: float1 }] }]}>✦</Animated.Text>
      <Animated.Text style={[illStyles.star, { bottom: 20, left: 10, fontSize: 14, opacity: 0.6, transform: [{ translateY: float2 }] }]}>✦</Animated.Text>
    </View>
  );
}

function WalletIllustration({ accentColor }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const coin1 = useRef(new Animated.Value(0)).current;
  const coin2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(coin1, { toValue: -15, duration: 1500, useNativeDriver: true }),
        Animated.timing(coin1, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(coin2, { toValue: -20, duration: 1700, useNativeDriver: true }),
          Animated.timing(coin2, { toValue: 0, duration: 1700, useNativeDriver: true }),
        ])
      ).start();
    }, 400);
  }, []);

  return (
    <View style={illStyles.container}>
      {/* Wallet body */}
      <Animated.View style={[illStyles.walletBody, { transform: [{ scale: pulse }] }]}>
        <LinearGradient colors={["#1e3a5f", "#153354"]} style={illStyles.walletGrad}>
          <View style={illStyles.walletStripe} />
          <Text style={illStyles.walletTag}>ERA</Text>
          <View style={illStyles.balanceRow}>
            <Text style={illStyles.balanceLbl}>Balance</Text>
            <Text style={illStyles.balanceAmt}>₱ 1,250.00</Text>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Floating coins */}
      <Animated.View style={[illStyles.coin, { top: 30, right: 30, transform: [{ translateY: coin1 }] }]}>
        <LinearGradient colors={["#22d3ee", "#0ea5e9"]} style={illStyles.coinGrad}>
          <Text style={illStyles.coinSymbol}>₱</Text>
        </LinearGradient>
      </Animated.View>
      <Animated.View style={[illStyles.coin, { top: 60, left: 20, width: 44, height: 44, borderRadius: 22, transform: [{ translateY: coin2 }] }]}>
        <LinearGradient colors={["#6366f1", "#4f46e5"]} style={illStyles.coinGrad}>
          <Text style={illStyles.coinSymbol}>₱</Text>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

function ShieldIllustration({ accentColor }) {
  const glow = useRef(new Animated.Value(0.5)).current;
  const checkScale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.5, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(checkScale, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(checkScale, { toValue: 0.9, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={illStyles.container}>
      {/* Outer glow ring */}
      <Animated.View style={[illStyles.shieldGlow, { opacity: glow }]} />

      {/* Shield shape */}
      <View style={illStyles.shieldOuter}>
        <LinearGradient colors={["#34d399", "#059669"]} style={illStyles.shieldGrad}>
          {/* Lock icon approximation */}
          <Animated.View style={{ transform: [{ scale: checkScale }] }}>
            <View style={illStyles.lockBody}>
              <View style={illStyles.lockArc} />
              <Text style={illStyles.lockCheck}>✓</Text>
            </View>
          </Animated.View>
        </LinearGradient>
      </View>

      {/* Orbiting dots */}
      <View style={[illStyles.orbitDot, { top: 30, right: 50, backgroundColor: "#34d399" }]} />
      <View style={[illStyles.orbitDot, { bottom: 40, left: 50, backgroundColor: "#22d3ee", width: 10, height: 10, borderRadius: 5 }]} />
      <View style={[illStyles.orbitDot, { top: 60, left: 30, backgroundColor: "#6366f1", width: 8, height: 8, borderRadius: 4 }]} />
    </View>
  );
}

const illStyles = StyleSheet.create({
  container: { width: 280, height: 240, position: "relative", alignItems: "center", justifyContent: "center" },
  // Card
  cardBack: {
    position: "absolute", width: 220, height: 136, borderRadius: 16,
    top: 10, right: 0,
    shadowColor: "#000", shadowOffset: { width: -8, height: 12 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12,
    transform: [{ rotateZ: "8deg" }],
  },
  cardGrad: { flex: 1, borderRadius: 16, padding: 18, justifyContent: "space-between" },
  cardChip: { width: 36, height: 28, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.4)" },
  cardNumber: { color: "rgba(255,255,255,0.9)", fontWeight: "600", fontSize: 13, letterSpacing: 2 },
  cardLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 },
  cardFront: {
    position: "absolute", width: 230, height: 142, borderRadius: 16,
    bottom: 10, left: 0,
    shadowColor: "#6366f1", shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.6, shadowRadius: 24, elevation: 16,
    transform: [{ rotateZ: "-4deg" }],
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.35)",
    overflow: "hidden",
  },
  cardGlassInner: { flex: 1, padding: 20, justifyContent: "space-between" },
  cardFrontLabel: { color: "#fff", fontWeight: "800", fontSize: 18, letterSpacing: 0.5 },
  mcCircle: { width: 22, height: 22, borderRadius: 11 },
  cardChipLight: { width: 38, height: 28, backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.5)", marginBottom: 12 },
  cardFrontNumber: { color: "#fff", fontWeight: "500", fontSize: 16, letterSpacing: 3, fontVariant: ["tabular-nums"] },
  cardFrontExpiry: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 4 },
  star: { position: "absolute", color: "#facc15", fontSize: 20, opacity: 0.8 },
  // Wallet
  walletBody: {
    width: 220, height: 140, borderRadius: 20,
    shadowColor: "#22d3ee", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12,
  },
  walletGrad: { flex: 1, borderRadius: 20, padding: 20, justifyContent: "space-between" },
  walletStripe: { height: 3, backgroundColor: "rgba(34,211,238,0.4)", borderRadius: 2, marginBottom: 8 },
  walletTag: { color: "#22d3ee", fontWeight: "900", fontSize: 18, letterSpacing: 1 },
  balanceRow: { },
  balanceLbl: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  balanceAmt: { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 2 },
  coin: {
    position: "absolute", width: 50, height: 50, borderRadius: 25,
    shadowColor: "#22d3ee", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.6, shadowRadius: 12, elevation: 8,
  },
  coinGrad: { flex: 1, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  coinSymbol: { color: "#fff", fontWeight: "800", fontSize: 20 },
  // Shield
  shieldGlow: {
    position: "absolute", width: 180, height: 180, borderRadius: 90,
    backgroundColor: "rgba(52,211,153,0.18)",
  },
  shieldOuter: {
    width: 130, height: 150, borderRadius: 18,
    borderTopLeftRadius: 18, borderTopRightRadius: 18,
    shadowColor: "#34d399", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.7, shadowRadius: 24, elevation: 14,
    overflow: "hidden",
  },
  shieldGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
  lockBody: { alignItems: "center" },
  lockArc: { width: 44, height: 24, borderRadius: 22, borderWidth: 5, borderColor: "rgba(255,255,255,0.7)", borderBottomWidth: 0, marginBottom: -4 },
  lockCheck: { color: "#fff", fontSize: 36, fontWeight: "900", lineHeight: 48 },
  orbitDot: { position: "absolute", width: 12, height: 12, borderRadius: 6 },
});

// ─── Tap Glow Layer ─────────────────────────────────────────────────────────────
// Mimics the web CursorGlow tapWave animation in React Native
function TapGlowLayer({ taps }) {
  return (
    <>
      {taps.map((tap) => (
        <TapGlowBurst key={tap.id} x={tap.x} y={tap.y} color={tap.color} />
      ))}
    </>
  );
}

function TapGlowBurst({ x, y, color }) {
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 3.5, duration: 650, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 650, useNativeDriver: true }),
    ]).start();
  }, []);

  const size = 120;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

// ─── Slide Component ─────────────────────────────────────────────────────────────
function Slide({ item }) {
  const { IllustrationComponent, bgColors, accentColor, glowColor, headline, headlineAccent, subtitle, tag } = item;

  // Entry animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[slideStyles.slide]}>
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} />

      {/* Background glow blobs */}
      <View style={[slideStyles.glowBlob, { backgroundColor: glowColor, top: height * 0.05, right: -60 }]} />
      <View style={[slideStyles.glowBlob, { backgroundColor: glowColor, bottom: height * 0.2, left: -80, width: 220, height: 220, borderRadius: 110, opacity: 0.5 }]} />

      {/* Top section: tag + illustration */}
      <Animated.View style={[slideStyles.topSection, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
        {/* Tag pill */}
        <View style={[slideStyles.tagPill, { borderColor: accentColor + "55" }]}>
          <View style={[slideStyles.tagDot, { backgroundColor: accentColor }]} />
          <Text style={[slideStyles.tagText, { color: accentColor }]}>{tag}</Text>
        </View>

        {/* Illustration */}
        <View style={slideStyles.illustrationWrap}>
          <IllustrationComponent accentColor={accentColor} />
        </View>
      </Animated.View>

      {/* Bottom white arc + text */}
      <View style={slideStyles.bottomArc}>
        <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>
          <Text style={slideStyles.headline}>{headline}</Text>
          <Text style={[slideStyles.headlineAccent, { color: accentColor }]}>{headlineAccent}</Text>
          <Text style={slideStyles.subtitle}>{subtitle}</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const slideStyles = StyleSheet.create({
  slide: { width, flex: 1, overflow: "hidden" },
  glowBlob: { position: "absolute", width: 260, height: 260, borderRadius: 130, opacity: 0.35 },
  topSection: { flex: 1, alignItems: "center", justifyContent: "flex-start", paddingTop: 60, paddingHorizontal: 24 },
  tagPill: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 30,
    borderWidth: 1, backgroundColor: "rgba(255,255,255,0.05)",
    marginBottom: 32,
  },
  tagDot: { width: 7, height: 7, borderRadius: 4 },
  tagText: { fontSize: 12, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" },
  illustrationWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  bottomArc: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 40, borderTopRightRadius: 40,
    paddingHorizontal: 32, paddingTop: 36, paddingBottom: 24,
    minHeight: height * 0.26,
  },
  headline: { fontSize: 28, fontWeight: "900", color: "#0f172a", lineHeight: 34, letterSpacing: -0.5 },
  headlineAccent: { fontSize: 28, fontWeight: "900", lineHeight: 34, letterSpacing: -0.5, marginBottom: 12 },
  subtitle: { fontSize: 15, color: "#64748b", lineHeight: 22, fontWeight: "500" },
});

// ─── Main LandingScreen ──────────────────────────────────────────────────────────
export default function LandingScreen({ navigation }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [taps, setTaps] = useState([]);
  const flatListRef = useRef(null);
  const btnScale = useRef(new Animated.Value(1)).current;

  const onTap = useCallback((e) => {
    const { locationX, locationY } = e.nativeEvent;
    const accentColor = SLIDES[currentIndex]?.accentColor || "#6366f1";

    const newTap = {
      id: Date.now() + Math.random(),
      x: locationX,
      y: locationY,
      color: accentColor + "55", // semi-transparent
    };
    setTaps((prev) => [...prev, newTap]);
    setTimeout(() => {
      setTaps((prev) => prev.filter((t) => t.id !== newTap.id));
    }, 700);
  }, [currentIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const handleGetStarted = async () => {
    // Press animation
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.94, duration: 100, useNativeDriver: true }),
      Animated.timing(btnScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    try {
      await AsyncStorage.setItem("@era_onboarding_done", "true");
    } catch (_) {}
    navigation.replace("AuthGate");
  };

  const handleSkip = () => {
    AsyncStorage.setItem("@era_onboarding_done", "true").catch(() => {});
    navigation.replace("AuthGate");
  };

  const currentSlide = SLIDES[currentIndex];

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Carousel */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Slide item={item} />}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        style={{ flex: 1 }}
        scrollEnabled
      />

      {/* Tap glow overlay — pointerEvents="none" so it doesn't block FlatList scroll */}
      <View
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <TapGlowLayer taps={taps} />
      </View>

      {/* Invisible touch capture — only registers tap START coordinates */}
      <View
        style={[StyleSheet.absoluteFill, { bottom: 0 }]}
        pointerEvents="box-none"
        onStartShouldSetResponder={() => true}
        onResponderGrant={(e) => onTap(e)}
      />

      {/* Bottom overlay: dots + button */}
      <SafeAreaView edges={["bottom"]} style={styles.bottomOverlay}>
        {/* Dot indicators */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex
                  ? [styles.dotActive, { backgroundColor: currentSlide?.accentColor || "#6366f1" }]
                  : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Get Started / Skip */}
        <View style={styles.btnRow}>
          {currentIndex < SLIDES.length - 1 ? (
            <>
              <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} activeOpacity={0.7}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
              <Animated.View style={{ transform: [{ scale: btnScale }], flex: 1 }}>
                <TouchableOpacity
                  style={[styles.nextBtn, { backgroundColor: currentSlide?.accentColor || "#6366f1" }]}
                  activeOpacity={0.85}
                  onPress={() => {
                    flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
                  }}
                >
                  <Text style={styles.nextBtnText}>Next →</Text>
                </TouchableOpacity>
              </Animated.View>
            </>
          ) : (
            <Animated.View style={[{ transform: [{ scale: btnScale }] }, styles.getStartedWrap]}>
              <TouchableOpacity
                style={styles.getStartedBtn}
                activeOpacity={0.85}
                onPress={handleGetStarted}
              >
                <LinearGradient
                  colors={["#facc15", "#f59e0b"]}
                  style={styles.getStartedGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.getStartedText}>Get Started</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#030614" },
  bottomOverlay: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 0,
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 12,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    gap: 8,
  },
  dot: { height: 8, borderRadius: 4 },
  dotActive: { width: 24 },
  dotInactive: { width: 8, backgroundColor: "#cbd5e1" },
  btnRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  skipBtn: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  skipText: { fontSize: 15, fontWeight: "600", color: "#94a3b8" },
  nextBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  nextBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  getStartedWrap: { flex: 1 },
  getStartedBtn: {
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#facc15",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  getStartedGrad: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  getStartedText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#1a1a2e",
    letterSpacing: 0.5,
  },
});
