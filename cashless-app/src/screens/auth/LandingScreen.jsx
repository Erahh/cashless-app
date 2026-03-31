import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Animated,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";

const { width, height } = Dimensions.get("window");
const GRID_SIZE = 36;

// ─── Slide data ────────────────────────────────────────────────────
const SLIDES = [
  {
    id: "1",
    tag: "ERA CASHLESS CARD",
    title: "Commute Smarter,\nPay Faster",
    subtitle: "Tap your ERA RFID card at any terminal and ride instantly — no cash, no queues, no hassle.",
    topGradient: ["#7C4A00", "#D97706", "#F59E0B"],
  },
  {
    id: "2",
    tag: "RFID TAP & RIDE",
    title: "One Tap,\nInstant Ride",
    subtitle: "Hold your ERA RFID card near any jeep or motorela terminal. Fare is deducted automatically — ride in seconds.",
    topGradient: ["#1E3A5F", "#1D4ED8", "#3B82F6"],
  },
  {
    id: "3",
    tag: "FAMILY CONNECT",
    title: "Know When\nThey Ride",
    subtitle: "Get notified the moment your loved ones tap and board. See their route in real time — always connected.",
    topGradient: ["#7C3AED", "#6D28D9", "#A78BFA"],
  },
];

// ─── Float animation hook ──────────────────────────────────────────
function useFloat(duration = 3000, offset = 12, delay = 0) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }),
        ])
      ).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, []);
  return anim.interpolate({ inputRange: [0, 1], outputRange: [0, offset] });
}

// ─── Sparkle component ──────────────────────────────────────────────
function Sparkle({ style, color = "#FCD34D", size = 14 }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 1, 0.3] });
  const scale = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.7, 1.2, 0.7] });
  return (
    <Animated.Text style={[{ fontSize: size, color, opacity, transform: [{ scale }] }, style]}>
      ✦
    </Animated.Text>
  );
}

// ─── Card Illustration (matches reference image exactly) ───────────
// ─── Card Illustration ───────────────────────────────────────────────
function CardIllustration({ slide, float1, float2 }) {
  return (
    <View style={il.wrap}>
      <Sparkle style={il.sparkle1} color="#FCD34D" size={18} />
      <Sparkle style={il.sparkle2} color="#FAB005" size={13} />
      <Sparkle style={{ position: "absolute", bottom: "22%", right: "10%" }} color="#FCD34D" size={10} />

      {/* BACK CARD — ERA golden gradient card */}
      <Animated.View style={[il.cardBack, { transform: [{ translateY: float1 }, { rotate: "-12deg" }] }]}>
        <LinearGradient
          colors={["#B45309", "#D97706", "#F59E0B"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={il.cardGrad}
        >
          {/* Gloss shine on back card */}
          <LinearGradient
            colors={["rgba(255,255,255,0.35)", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.7 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={il.backHeader}>
            <Text style={il.backLabel}>{slide.tag}</Text>
            <View style={il.wifiWrap}>
              <View style={[il.arc, { width: 6, height: 6, borderRadius: 3 }]} />
              <View style={[il.arc, { width: 14, height: 14, borderRadius: 8, borderTopWidth: 2.5 }]} />
              <View style={[il.arc, { width: 22, height: 22, borderRadius: 12, borderTopWidth: 2.5 }]} />
            </View>
          </View>
          <View style={il.backSparkleRow}>
            <Text style={il.backSparkle}>✦</Text>
          </View>
          <View style={il.backFooter}>
            <Text style={il.backBrand}>ERA</Text>
            <Text style={il.backExpiry}>12/28</Text>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* FRONT CARD — premium glossy golden ERA card */}
      <Animated.View style={[il.cardFront, { transform: [{ translateY: float2 }, { rotate: "6deg" }] }]}>
        {/* Layer 1: Rich golden base gradient */}
        <LinearGradient
          colors={["#1C1C22", "#2A2418", "#1A1008"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
        />
        {/* Layer 2: Amber inner spotlight (center-right warm glow) */}
        <LinearGradient
          colors={["transparent", "rgba(215, 100, 0, 0.60)", "transparent"]}
          start={{ x: 0.1, y: 0.2 }}
          end={{ x: 0.9, y: 0.8 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Layer 3: Glossy top-left corner burst (the KEY gloss effect) */}
        <LinearGradient
          colors={["rgba(255,255,255,0.42)", "rgba(255,255,255,0.08)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.65, y: 0.65 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Layer 4: Diagonal shimmer streak */}
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.10)", "transparent"]}
          start={{ x: 0, y: 0.4 }}
          end={{ x: 1, y: 0.6 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Glass top edge */}
        <View style={il.glassEdge} />
        <View style={il.glassLeft} />
        <View style={il.glassBottom} />

        {/* Card content */}
        <View style={il.frontContent}>
          <View style={il.frontTop}>
            <Text style={il.frontBrand}>C Era</Text>
            <View style={il.masterWrap}>
              <View style={[il.mcCircle, { backgroundColor: "#E8231A", marginRight: -9 }]} />
              <View style={[il.mcCircle, { backgroundColor: "#F59B00" }]} />
            </View>
          </View>

          {/* Premium metallic chip */}
          <LinearGradient
            colors={["#A07840", "#C8A95A", "#A07840"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={il.chip}
          >
            <LinearGradient
              colors={["rgba(255,255,255,0.5)", "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={il.chipInner}>
              <View style={il.chipLineH} />
              <View style={il.chipLineV} />
            </View>
          </LinearGradient>

          <Text style={il.cardNum}>1234  5678  9012</Text>
          <Text style={il.cardNum245}>245</Text>
          <Text style={il.cardExpiry}>12/28</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const il = StyleSheet.create({
  wrap: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  cardBack: {
    width: width * 0.62,
    height: 155,
    borderRadius: 22,
    position: "absolute",
    top: "10%",
    right: "6%",
    shadowColor: "#92400E",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 22,
    overflow: "hidden",
  },
  cardGrad: { flex: 1, borderRadius: 22, padding: 18, justifyContent: "space-between" },
  backHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  backLabel: { color: "rgba(255,255,255,0.9)", fontSize: 9, fontWeight: "900", letterSpacing: 1.5 },
  wifiWrap: { width: 28, height: 28, alignItems: "center", justifyContent: "flex-end" },
  arc: { position: "absolute", borderColor: "rgba(255,255,255,0.8)", borderWidth: 2, borderBottomWidth: 0, borderLeftWidth: 0, borderRightWidth: 0 },
  backSparkleRow: { alignItems: "flex-end" },
  backSparkle: { color: "#FCD34D", fontSize: 18 },
  backFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  backBrand: { color: "#fff", fontSize: 16, fontWeight: "900", letterSpacing: 1 },
  backExpiry: { color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: "600" },

  cardFront: {
    width: width * 0.60,
    height: 162,
    borderRadius: 22,
    position: "absolute",
    bottom: "8%",
    left: "5%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
    elevation: 32,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  glassEdge: {
    position: "absolute", top: 0, left: 0, right: 0, height: 2,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  glassLeft: {
    position: "absolute", top: 0, left: 0, bottom: 0, width: 1.5,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  glassBottom: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  frontContent: { flex: 1, padding: 16, justifyContent: "space-between" },
  frontTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  frontBrand: { color: "#FFFFFF", fontSize: 18, fontWeight: "900", letterSpacing: 0.3,
    textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  masterWrap: { flexDirection: "row", alignItems: "center" },
  mcCircle: { width: 24, height: 24, borderRadius: 12, opacity: 0.95 },
  chip: {
    width: 40, height: 32, borderRadius: 7,
    justifyContent: "center", alignItems: "center",
    overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 4, elevation: 4,
  },
  chipInner: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 2,
    marginTop: 1,
  },
  cardExpiry: { color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: "500" },

  sparkle1: { position: "absolute", top: "15%", left: "10%" },
  sparkle2: { position: "absolute", top: "12%", right: "22%" },
});

// ─── Slide 2: RFID Card Tap illustration ──────────────────────────
function RFIDIllustration({ float1, float2 }) {
  return (
    <View style={rf.wrap}>
      <Sparkle style={{ position: "absolute", top: "14%", left: "10%" }} color="#BAE6FD" size={16} />
      <Sparkle style={{ position: "absolute", top: "10%", right: "16%" }} color="#FDE68A" size={12} />

      {/* RFID Terminal / Reader */}
      <View style={rf.terminal}>
        <LinearGradient colors={["rgba(255,255,255,0.22)", "rgba(255,255,255,0.07)"]} style={rf.termGrad}>
          <View style={rf.termEdge} />
          <Text style={rf.termIcon}>📟</Text>
          <Text style={rf.termLabel}>RFID READER</Text>
          {/* Scan lines */}
          <View style={rf.scanLine} />
          <View style={[rf.scanLine, { marginTop: 4, opacity: 0.5 }]} />
          <Text style={rf.termStatus}>● READY</Text>
        </LinearGradient>
      </View>

      {/* Floating ERA RFID Card */}
      <Animated.View style={[rf.rfidCard, { transform: [{ translateY: float1 }, { rotate: "-8deg" }] }]}>
        <LinearGradient colors={["rgba(15,15,30,0.88)", "rgba(30,15,60,0.78)"]} style={rf.rfidGrad}>
          <View style={rf.rfidEdge} />
          {/* RFID Chip antenna rings */}
          <View style={rf.antennaWrap}>
            <View style={rf.antRing1} />
            <View style={rf.antRing2} />
            <View style={rf.antChip} />
          </View>
          <View style={rf.rfidBottom}>
            <Text style={rf.rfidBrand}>C Era</Text>
            <Text style={rf.rfidType}>RFID</Text>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* NFC wave rings expanding from terminal */}
      <Animated.View style={[rf.waveWrap, { transform: [{ translateY: float2 }] }]}>
        <View style={[rf.wave, { width: 50, height: 50, borderRadius: 25, opacity: 0.5 }]} />
        <View style={[rf.wave, { width: 80, height: 80, borderRadius: 40, opacity: 0.35 }]} />
        <View style={[rf.wave, { width: 110, height: 110, borderRadius: 55, opacity: 0.2 }]} />
      </Animated.View>

      {/* Fare deducted badge */}
      <View style={rf.fareBadge}>
        <LinearGradient colors={["rgba(255,255,255,0.25)", "rgba(255,255,255,0.1)"]} style={rf.fareBadgeGrad}>
          <Text style={rf.fareIcon}>✓</Text>
          <View>
            <Text style={rf.fareLabel}>Fare Deducted</Text>
            <Text style={rf.fareAmount}>₱ 15.00</Text>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

const rf = StyleSheet.create({
  wrap: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  terminal: {
    position: "absolute",
    right: "10%",
    top: "20%",
    width: 88,
    height: 120,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 16,
  },
  termGrad: {
    flex: 1, borderRadius: 16, padding: 12,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.22)",
  },
  termEdge: {
    position: "absolute", top: 0, left: 0, right: 0, height: 1,
    backgroundColor: "rgba(255,255,255,0.4)",
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
  },
  termIcon: { fontSize: 26, marginBottom: 4 },
  termLabel: { color: "rgba(255,255,255,0.75)", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  scanLine: { width: 44, height: 2, backgroundColor: "rgba(14,165,233,0.7)", borderRadius: 1, marginTop: 8 },
  termStatus: { color: "#86EFAC", fontSize: 8, fontWeight: "800", marginTop: 8, letterSpacing: 0.5 },

  rfidCard: {
    width: width * 0.55,
    height: 130,
    borderRadius: 18,
    position: "absolute",
    left: "5%",
    top: "16%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 24,
  },
  rfidGrad: { flex: 1, borderRadius: 18, padding: 14, justifyContent: "space-between" },
  rfidEdge: {
    position: "absolute", top: 0, left: 0, right: 0, height: 1,
    backgroundColor: "rgba(255,255,255,0.3)", borderTopLeftRadius: 18, borderTopRightRadius: 18,
  },
  antennaWrap: { width: 60, height: 60, alignItems: "center", justifyContent: "center" },
  antRing1: {
    position: "absolute",
    width: 50, height: 50, borderRadius: 25,
    borderWidth: 1.5, borderColor: "rgba(14,165,233,0.5)",
  },
  antRing2: {
    position: "absolute",
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1.5, borderColor: "rgba(14,165,233,0.35)",
  },
  antChip: {
    width: 22, height: 18, borderRadius: 4,
    backgroundColor: "rgba(180,160,100,0.6)",
    borderWidth: 0.5, borderColor: "rgba(255,255,255,0.35)",
  },
  rfidBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  rfidBrand: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  rfidType: { color: "rgba(14,165,233,0.9)", fontSize: 11, fontWeight: "800", letterSpacing: 1 },

  waveWrap: {
    position: "absolute",
    right: "14%",
    top: "35%",
    alignItems: "center",
    justifyContent: "center",
    width: 110,
    height: 110,
  },
  wave: {
    position: "absolute",
    borderWidth: 1.5,
    borderColor: "rgba(14,165,233,0.7)",
  },

  fareBadge: {
    position: "absolute",
    bottom: "14%",
    left: "8%",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  fareBadgeGrad: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.3)",
    gap: 10,
  },
  fareIcon: { color: "#86EFAC", fontSize: 18, fontWeight: "900" },
  fareLabel: { color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: "700" },
  fareAmount: { color: "#fff", fontSize: 16, fontWeight: "900" },
});

// ─── Slide 3: Family Map / Notify illustration ─────────────────────
function MapIllustration({ float1, float2 }) {
  return (
    <View style={mp.wrap}>
      <Sparkle style={{ position: "absolute", top: "12%", left: "12%" }} color="#F9A8D4" size={16} />
      <Sparkle style={{ position: "absolute", top: "10%", right: "14%" }} color="#FDE68A" size={13} />

      {/* Frosted Map Card */}
      <Animated.View style={[mp.mapCard, { transform: [{ translateY: float1 }] }]}>
        <LinearGradient colors={["rgba(255,255,255,0.22)", "rgba(255,255,255,0.08)"]} style={mp.mapGrad}>
          <View style={mp.mapEdge} />
          {/* Simplified map grid */}
          <View style={mp.mapGrid}>
            {[0,1,2].map(r => (
              <View key={r} style={mp.mapRow}>
                {[0,1,2,3].map(c => (
                  <View key={c} style={[
                    mp.mapCell,
                    (r===1 && c===1) || (r===0 && c===2) ? { backgroundColor: "rgba(255,255,255,0.18)" } : {}
                  ]} />
                ))}
              </View>
            ))}
            {/* Roads */}
            <View style={mp.roadH} />
            <View style={mp.roadV} />
          </View>

          {/* Pin markers */}
          <View style={[mp.pinWrap, { top: "20%", left: "25%" }]}>
            <Text style={mp.pinEmoji}>📍</Text>
            <View style={mp.pinLabel}><Text style={mp.pinName}>Mom</Text></View>
          </View>
          <View style={[mp.pinWrap, { top: "45%", right: "20%" }]}>
            <Text style={mp.pinEmoji}>📍</Text>
            <View style={[mp.pinLabel, { backgroundColor: "rgba(249,168,212,0.3)" }]}>
              <Text style={mp.pinName}>You</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Notification bubble — Mom tapped! */}
      <Animated.View style={[mp.notif, mp.notif1, { transform: [{ translateY: float2 }] }]}>
        <LinearGradient colors={["rgba(255,255,255,0.28)", "rgba(255,255,255,0.12)"]} style={mp.notifGrad}>
          <View style={mp.notifEdge} />
          <Text style={mp.notifIcon}>🚌</Text>
          <View>
            <Text style={mp.notifTitle}>Mom just boarded!</Text>
            <Text style={mp.notifSub}>Route 5 · 2 min ago</Text>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Notification bubble 2 */}
      <View style={[mp.notif, mp.notif2]}>
        <LinearGradient colors={["rgba(255,255,255,0.22)", "rgba(255,255,255,0.08)"]} style={mp.notifGrad}>
          <View style={mp.notifEdge} />
          <Text style={mp.notifIcon}>💸</Text>
          <View>
            <Text style={mp.notifTitle}>Fare deducted</Text>
            <Text style={mp.notifSub}>₱ 15.00 · Motorela</Text>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

const mp = StyleSheet.create({
  wrap: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },

  mapCard: {
    width: width * 0.68,
    height: 180,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.4,
    shadowRadius: 28,
    elevation: 22,
    position: "absolute",
    top: "12%",
  },
  mapGrad: {
    flex: 1, borderRadius: 20, padding: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.28)",
  },
  mapEdge: {
    position: "absolute", top: 0, left: 0, right: 0, height: 1,
    backgroundColor: "rgba(255,255,255,0.55)", borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  mapGrid: { flex: 1, position: "relative" },
  mapRow: { flexDirection: "row", flex: 1 },
  mapCell: {
    flex: 1, margin: 1, borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  roadH: {
    position: "absolute", left: 0, right: 0,
    top: "50%", height: 3,
    backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 2,
  },
  roadV: {
    position: "absolute", top: 0, bottom: 0,
    left: "50%", width: 3,
    backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 2,
  },
  pinWrap: { position: "absolute", alignItems: "center" },
  pinEmoji: { fontSize: 22 },
  pinLabel: {
    backgroundColor: "rgba(14,165,233,0.3)",
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, marginTop: 2,
  },
  pinName: { color: "#fff", fontSize: 9, fontWeight: "900" },

  notif: {
    position: "absolute",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 14,
  },
  notif1: { bottom: "16%", left: "4%" },
  notif2: { bottom: "4%", right: "4%" },
  notifGrad: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.3)",
    gap: 10,
  },
  notifEdge: {
    position: "absolute", top: 0, left: 0, right: 0, height: 1,
    backgroundColor: "rgba(255,255,255,0.5)", borderTopLeftRadius: 16, borderTopRightRadius: 16,
  },
  notifIcon: { fontSize: 22 },
  notifTitle: { color: "#fff", fontSize: 12, fontWeight: "900" },
  notifSub: { color: "rgba(255,255,255,0.65)", fontSize: 10, fontWeight: "600" },
});

// ─── Main LandingScreen ────────────────────────────────────────────
export default function LandingScreen({ navigation }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const { isDarkMode, theme } = useTheme();

  const float1 = useFloat(3800, 16, 0);
  const float2 = useFloat(3200, -12, 400);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index);
  }).current;

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  };

  const handleGetStarted = async () => {
    try {
      await AsyncStorage.setItem("hasLaunched", "true");
      navigation.replace("AuthGate");
    } catch (e) {
      navigation.replace("AuthGate");
    }
  };

  const current = SLIDES[currentIndex];
  const isLast = currentIndex === SLIDES.length - 1;

  // Light BG matching dashboard light theme
  const bgColor = "#F8F9FA";
  const gridColor = "rgba(0,0,0,0.04)";

  const renderGrid = () => {
    const cols = Math.ceil(width / GRID_SIZE);
    const rows = Math.ceil(height / GRID_SIZE);
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {[...Array(cols)].map((_, i) => (
          <View key={`v${i}`} style={[s.gridV, { left: i * GRID_SIZE, backgroundColor: gridColor }]} />
        ))}
        {[...Array(rows)].map((_, i) => (
          <View key={`h${i}`} style={[s.gridH, { top: i * GRID_SIZE, backgroundColor: gridColor }]} />
        ))}
      </View>
    );
  };

  const renderSlide = ({ item, index }) => {
    let illustration;
    if (index === 0) {
      illustration = <CardIllustration slide={item} float1={float1} float2={float2} />;
    } else if (index === 1) {
      illustration = <RFIDIllustration float1={float1} float2={float2} />;
    } else {
      illustration = <MapIllustration float1={float1} float2={float2} />;
    }
    return (
      <View style={{ width }}>
        <LinearGradient
          colors={item.topGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.topHalf}
        >
          <View style={s.polyBg1} />
          <View style={s.polyBg2} />
          {illustration}
        </LinearGradient>
        <View style={s.curveConnector} />
      </View>
    );
  };

  return (
    <View style={[s.root, { backgroundColor: bgColor }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* Background grid — only on bottom half */}
      <View style={[StyleSheet.absoluteFill, { top: height * 0.52 }]}>
        {renderGrid()}
      </View>

      {/* Slide list */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        scrollEventThrottle={16}
        style={s.flatList}
      />

      {/* ── Frosted glass bottom panel ── */}
      <View style={s.glassPanel}>
        {/* Top frosted border highlight */}
        <View style={s.glassBorderTop} />

        {/* Text content */}
        <Text style={s.slideTag}>{current.tag}</Text>
        <Text style={s.slideTitle}>{current.title}</Text>
        <Text style={s.slideSubtitle}>{current.subtitle}</Text>

        {/* Dot indicators */}
        <View style={s.dotsRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                s.dot,
                i === currentIndex
                  ? s.dotActive
                  : s.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Buttons */}
        <SafeAreaView edges={["bottom"]} style={s.btnArea}>
          {isLast ? (
            <TouchableOpacity onPress={handleGetStarted} activeOpacity={0.82} style={s.getStartedBtn}>
              {/* Glossy yellow button with top shine */}
              <View style={s.getStartedSolid}>
                <View style={s.btnShineTop} />
                <Text style={s.getStartedText}>Get Started  →</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={s.navRow}>
              <TouchableOpacity onPress={handleGetStarted} style={s.skipBtn} activeOpacity={0.6}>
                <Text style={s.skipText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNext} activeOpacity={0.82} style={s.nextBtn}>
                <View style={s.nextSolid}>
                  <View style={s.btnShineTop} />
                  <Text style={s.nextText}>Next  →</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </View>

    </View>
  );
}


const TOP_H = height * 0.50;
const PANEL_H = height * 0.52;

const s = StyleSheet.create({
  root: { flex: 1 },
  gridV: { position: "absolute", width: 0.8, height: "100%" },
  gridH: { position: "absolute", height: 0.8, width: "100%" },

  flatList: { flex: 0, height: TOP_H },
  topHalf: {
    width,
    height: TOP_H,
    overflow: "hidden",
  },
  polyBg1: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.08)",
    top: -60,
    left: -60,
    transform: [{ rotate: "30deg" }],
  },
  polyBg2: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.06)",
    bottom: -40,
    right: -40,
    transform: [{ rotate: "15deg" }],
  },

  // Connector that bridges gradient top to light cream bottom
  curveConnector: {
    position: "absolute",
    bottom: -32, left: -40, right: -40,
    height: 64,
    backgroundColor: "#F8F9FA",
    borderRadius: 60,
  },

  // Light frosted glass bottom panel
  glassPanel: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    height: PANEL_H,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingTop: 28,
    paddingHorizontal: 28,
    borderTopWidth: 1.5,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: "rgba(250,191,0,0.22)",
    shadowColor: "#FAB005",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 14,
  },
  glassBorderTop: {
    position: "absolute",
    top: 0, left: 36, right: 36,
    height: 3, borderRadius: 4,
    backgroundColor: "rgba(250,191,0,0.45)",
  },

  slideTag: {
    fontSize: 11, fontWeight: "800", letterSpacing: 2,
    color: "#D97706", textTransform: "uppercase", marginBottom: 8,
  },
  slideTitle: {
    fontSize: 30, fontWeight: "900", color: "#121417",
    lineHeight: 36, marginBottom: 10, letterSpacing: -0.5,
  },
  slideSubtitle: {
    fontSize: 15, color: "#495057", lineHeight: 22, marginBottom: 24,
  },
  dotsRow: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  dot: { borderRadius: 4, marginRight: 7, height: 7 },
  dotActive: { width: 28, backgroundColor: "#FAB005" },
  dotInactive: { width: 7, backgroundColor: "rgba(0,0,0,0.15)" },

  btnArea: { width: "100%" },
  getStartedBtn: {
    width: "100%",
    height: 58,
    borderRadius: 18,
    overflow: "hidden",
    // deep amber shadow
    shadowColor: "#92400E",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
  getStartedSolid: {
    flex: 1,
    backgroundColor: "#F7E353",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    overflow: "hidden",
  },
  btnShineTop: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: "50%",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  getStartedText: {
    color: "#0B0E14",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skipBtn: { padding: 12 },
  skipText: { color: "rgba(0,0,0,0.35)", fontWeight: "700", fontSize: 16 },
  nextBtn: {
    width: 140,
    height: 54,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#92400E",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  nextSolid: {
    flex: 1,
    backgroundColor: "#F7E353",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    overflow: "hidden",
  },
  nextText: { color: "#0B0E14", fontWeight: "900", fontSize: 16 },
});
