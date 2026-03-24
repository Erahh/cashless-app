// LandingScreen.jsx
import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  FlatList,
  StatusBar,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { TapGlowOverlay, useTapGlow } from "../../components/TapGlow";
import { useTheme } from "../../context/ThemeContext";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Sun01Icon, Moon02Icon } from "@hugeicons/core-free-icons";

const { width, height } = Dimensions.get("window");

const SLIDES = [
  {
    id: "1",
    bgColors: ["#030614", "#0d1340", "#1a1a2e"],
    accentColor: "#facc15",
    glowColor: "rgba(250, 204, 21, 0.4)",
    headline: "Welcome to",
    headlineAccent: "ERA Wallet",
    subtitle: "The future of Cashless Public Transport in the Philippines.",
    tag: "Next-Gen",
    IllustrationComponent: ({ accentColor }) => (
       <View style={{ width: 200, height: 200, backgroundColor: 'rgba(250,204,21,0.1)', borderRadius: 100, borderWidth: 1, borderColor: accentColor }} />
    ),
  },
  {
    id: "2",
    bgColors: ["#060d26", "#1e1b4b", "#030614"],
    accentColor: "#38bdf8",
    glowColor: "rgba(56, 189, 248, 0.4)",
    headline: "Smart",
    headlineAccent: "Connectivity",
    subtitle: "Seamlessly pay for your commute with a single tap.",
    tag: "Seamless",
    IllustrationComponent: ({ accentColor }) => (
       <View style={{ width: 200, height: 200, backgroundColor: 'rgba(56,189,248,0.1)', borderRadius: 100, borderWidth: 1, borderColor: accentColor }} />
    ),
  },
  {
    id: "3",
    bgColors: ["#0f172a", "#334155", "#020617"],
    accentColor: "#4ade80",
    glowColor: "rgba(74, 222, 128, 0.4)",
    headline: "Secure &",
    headlineAccent: "Reliable",
    subtitle: "Your finances are protected with state-of-the-art encryption.",
    tag: "Secure",
    IllustrationComponent: ({ accentColor }) => (
       <View style={{ width: 200, height: 200, backgroundColor: 'rgba(74,222,128,0.1)', borderRadius: 100, borderWidth: 1, borderColor: accentColor }} />
    ),
  },
];

function Slide({ item }) {
  const { IllustrationComponent, bgColors, accentColor, glowColor, headline, headlineAccent, subtitle, tag } = item;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.slide}>
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} />
      <View style={[styles.glowBlob, { backgroundColor: glowColor, top: height * 0.05, right: -60 }]} />
      <Animated.View style={[styles.topSection, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
        <View style={[styles.tagPill, { borderColor: accentColor + "55" }]}>
          <View style={[styles.tagDot, { backgroundColor: accentColor }]} />
          <Text style={[styles.tagText, { color: accentColor }]}>{tag}</Text>
        </View>
        <View style={styles.illustrationWrap}>
           <IllustrationComponent accentColor={accentColor} />
        </View>
      </Animated.View>
      <View style={styles.bottomArc}>
        <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>
          <Text style={styles.headline}>{headline}</Text>
          <Text style={[styles.headlineAccent, { color: accentColor }]}>{headlineAccent}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </Animated.View>
      </View>
    </View>
  );
}

export default function LandingScreen({ navigation }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const { taps, onTap } = useTapGlow();
  const flatListRef = useRef(null);
  const btnScale = useRef(new Animated.Value(1)).current;

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index);
  }).current;

  const handleGetStarted = async () => {
    await AsyncStorage.setItem("hasLaunched", "true");
    navigation.replace("RoleSelection");
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem("hasLaunched", "true");
    navigation.replace("RoleSelection");
  };

  const currentSlide = SLIDES[currentIndex];

  return (
    <View style={styles.root} onTouchStart={onTap}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      {/* Theme Toggle Button */}
      <TouchableOpacity 
          style={[styles.themeToggle, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.15)' }]} 
          onPress={toggleTheme}
          activeOpacity={0.7}
      >
          <HugeiconsIcon 
              icon={isDarkMode ? Sun01Icon : Moon02Icon} 
              size={20} 
              color="#FFFFFF" 
          />
      </TouchableOpacity>
      
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
      />

      <TapGlowOverlay taps={taps} />

      <SafeAreaView edges={["bottom"]} style={styles.bottomOverlay}>
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
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
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
  bottomOverlay: {
    backgroundColor: "#ffffff",
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
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 24 },
  dotInactive: { width: 6, backgroundColor: "#e2e8f0" },
  btnRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  themeToggle: {
    position: "absolute",
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  skipBtn: { paddingHorizontal: 20, paddingVertical: 12 },
  skipText: { color: "#64748b", fontSize: 15, fontWeight: "600" },
  nextBtn: {
    height: 56, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 5,
  },
  nextBtnText: { color: "#ffffff", fontSize: 17, fontWeight: "700" },
  getStartedWrap: { flex: 1 },
  getStartedBtn: { height: 58, borderRadius: 18, overflow: "hidden" },
  getStartedGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
  getStartedText: { color: "#ffffff", fontSize: 18, fontWeight: "800", letterSpacing: 0.5 },
});
