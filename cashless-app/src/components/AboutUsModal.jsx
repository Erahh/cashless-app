import React, { useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Linking,
  ScrollView,
  Platform,
} from "react-native";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { 
  Cancel01Icon, 
  InformationCircleIcon, 
  Shield01Icon, 
  UserIcon,
  GlobalIcon,
  Mail01Icon,
  CodeIcon,
  Link02Icon
} from "@hugeicons/core-free-icons";
import { LinearGradient } from "expo-linear-gradient";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function AboutUsModal({ visible, onClose, theme, isDarkMode }) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 9,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  if (!visible && slideAnim._value === SCREEN_HEIGHT) return null;

  const handleLink = (url) => {
    Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
  };

  return (
    <Modal visible={visible} transparent={true} animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.backdrop, 
            { 
              opacity: fadeAnim, 
              backgroundColor: isDarkMode ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.4)" 
            }
          ]} 
        />
        <TouchableOpacity style={styles.backdropTouchable} activeOpacity={1} onPress={onClose} />
        
        <Animated.View
          style={[
            styles.modalContent,
            { 
              backgroundColor: theme.background, 
              transform: [{ translateY: slideAnim }],
              borderColor: theme.border,
              borderWidth: 1,
            }
          ]}
        >
          {/* Decorative Gradient Header */}
          <LinearGradient
            colors={[theme.accent, theme.background]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.gradientHeader}
          />

          <View style={styles.dragHandleContainer}>
            <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />
          </View>

          <TouchableOpacity 
            style={[styles.closeButton, { backgroundColor: theme.card, borderColor: theme.border }]} 
            onPress={onClose}
          >
            <HugeiconsIcon icon={Cancel01Icon} size={20} color={theme.text} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            
            {/* Branding */}
            <View style={styles.brandSection}>
              <LinearGradient
                colors={[theme.accent, "#F7E353"]}
                style={styles.logoContainer}
              >
                <Text style={styles.logoText}>ERA</Text>
              </LinearGradient>
              <Text style={[styles.appName, { color: theme.text }]}>ERA WALLET</Text>
              <View style={[styles.versionBadge, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.versionText, { color: theme.textSecondary }]}>v1.0.0 Alpha</Text>
              </View>
            </View>

            {/* Mission Statement */}
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.cardHeader}>
                <HugeiconsIcon icon={InformationCircleIcon} size={20} color={theme.accent} />
                <Text style={[styles.cardTitle, { color: theme.text }]}>Our Mission</Text>
              </View>
              <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
                To revolutionize the commuting experience through a seamless, secure, and smart cashless payment ecosystem. ERA Wallet is dedicated to bridging the gap between technology and traditional transportation.
              </Text>
            </View>

            {/* Links / Socials */}
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Connect With Us</Text>
            
            <View style={styles.linksGrid}>
                <LinkButton 
                    icon={GlobalIcon} 
                    label="Website" 
                    theme={theme} 
                    onPress={() => handleLink("https://erawallet.ph")} 
                />
                <LinkButton 
                    icon={Mail01Icon} 
                    label="Support" 
                    theme={theme} 
                    onPress={() => handleLink("mailto:support@erawallet.ph")} 
                />
                <LinkButton 
                    icon={Shield01Icon} 
                    label="Privacy" 
                    theme={theme} 
                    onPress={() => handleLink("https://erawallet.ph/privacy")} 
                />
                <LinkButton 
                    icon={Link02Icon} 
                    label="Terms" 
                    theme={theme} 
                    onPress={() => handleLink("https://erawallet.ph/terms")} 
                />
            </View>

            {/* Developers */}
            <View style={[styles.footer, { borderTopColor: theme.border }]}>
              <View style={styles.devRow}>
                <HugeiconsIcon icon={CodeIcon} size={14} color={theme.textMuted} />
                <Text style={[styles.footerText, { color: theme.textMuted }]}>Developed by ERA Team</Text>
              </View>
              <Text style={[styles.copyText, { color: theme.textMuted }]}>© 2024 ERA Digital Solutions. All rights reserved.</Text>
            </View>

          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function LinkButton({ icon, label, theme, onPress }) {
  return (
    <TouchableOpacity 
        style={[styles.linkBtn, { backgroundColor: theme.card, borderColor: theme.border }]} 
        onPress={onPress}
    >
      <View style={[styles.linkIconWrap, { backgroundColor: theme.background }]}>
        <HugeiconsIcon icon={icon} size={20} color={theme.accent} />
      </View>
      <Text style={[styles.linkLabel, { color: theme.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropTouchable: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    minHeight: SCREEN_HEIGHT * 0.7,
    maxHeight: SCREEN_HEIGHT * 0.9,
    paddingTop: 8,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 25,
      }
    })
  },
  gradientHeader: {
    height: 120,
    width: '100%',
    position: 'absolute',
    top: 0,
    opacity: 0.1,
  },
  dragHandleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.5,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderWidth: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  brandSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#F7E353",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      }
    })
  },
  logoText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0B0E14',
    letterSpacing: 1,
  },
  appName: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  versionBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  card: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    marginLeft: 4,
  },
  linksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 40,
  },
  linkBtn: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  linkIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    paddingTop: 24,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  devRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  copyText: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
});
