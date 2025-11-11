/**
 * Subscription Upgrade Ad Component
 * Shows users an ad for the next subscription tier
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { useSettings } from '../contexts/SettingsContext';

export default function SubscriptionUpgradeAd({ onPress }) {
  const { themeColors, userProfile } = useSettings();
  const [slideAnim] = useState(new Animated.Value(0));
  const [currentBenefitIndex, setCurrentBenefitIndex] = useState(0);

  // Determine next plan and benefits based on current plan
  const getUpgradeInfo = () => {
    const currentPlan = userProfile?.subscriptionPlan || 'basic';

    switch (currentPlan) {
      case 'basic':
        return {
          nextPlan: 'Go',
          nextPlanId: 'premium',
          icon: 'rocket',
          gradient: ['#10b981', '#059669'],
          benefits: [
            '✨ Unlimited posts & statuses',
            '🎨 15+ premium themes',
            '🤖 AI-powered features',
            '🚫 Ad-free experience',
          ],
          price: 'R79.99/month',
        };

      case 'premium': // GO plan
        return {
          nextPlan: 'Premium',
          nextPlanId: 'gold',
          icon: 'diamond',
          gradient: ['#8b5cf6', '#7c3aed'],
          benefits: [
            '🤖 GPT-4o AI Post Composer',
            '🎨 Vision-Personalized Cartoons',
            '🖼️ Upload Custom Images',
            '📝 4 AI Summary Styles',
          ],
          price: 'R149.99/month',
        };

      case 'gold': // PREMIUM plan
        return {
          nextPlan: 'Gold',
          nextPlanId: 'ultimate',
          icon: 'trophy',
          gradient: ['#f59e0b', '#d97706'],
          benefits: [
            '🚀 3x All AI Limits',
            '⚡ 60 Vision Cartoons/month',
            '🎯 150 GPT-4o Summaries/day',
            '💎 Exclusive Gold Crown',
          ],
          price: 'R249.99/month',
        };

      default:
        return null; // Already on highest plan
    }
  };

  // Memoize upgrade info to prevent unnecessary re-renders
  const upgradeInfo = useMemo(() => getUpgradeInfo(), [userProfile?.subscriptionPlan]);

  // Sliding text animation
  useEffect(() => {
    if (!upgradeInfo) return;

    const animate = () => {
      // Slide out
      Animated.timing(slideAnim, {
        toValue: -20,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Change text
        setCurrentBenefitIndex((prev) => (prev + 1) % upgradeInfo.benefits.length);

        // Reset position
        slideAnim.setValue(20);

        // Slide in
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    };

    const interval = setInterval(animate, 2500);
    return () => clearInterval(interval);
  }, [upgradeInfo, slideAnim]);

  // Don't show ad if user is already on highest plan
  if (!upgradeInfo) return null;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: themeColors.card, borderColor: themeColors.divider }]}
      activeOpacity={0.85}
      onPress={() => onPress(upgradeInfo.nextPlanId)}
    >
      <View style={styles.animationBackground}>
        {/* Lottie Background Animation */}
        <LottieView
          source={require('../assets/Premium Gold.json')}
          autoPlay
          loop
          style={styles.lottieBackground}
        />
        {/* Subtle overlay to blend with gradient */}
        <View style={styles.animationOverlay} />
      </View>

      <LinearGradient
        colors={[
          `${upgradeInfo.gradient[0]}E6`, // 90% opacity
          `${upgradeInfo.gradient[1]}E6`, // 90% opacity
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Sponsored Badge */}
        <View style={styles.sponsoredBadge}>
          <Ionicons name="megaphone" size={12} color="#fff" />
          <Text style={styles.sponsoredText}>UPGRADE</Text>
        </View>

        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name={upgradeInfo.icon} size={48} color="#fff" />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>
            Upgrade to {upgradeInfo.nextPlan}
          </Text>

          {/* Sliding Benefits */}
          <View style={styles.benefitContainer}>
            <Animated.Text
              style={[
                styles.benefit,
                {
                  transform: [{ translateY: slideAnim }],
                  opacity: slideAnim.interpolate({
                    inputRange: [-20, 0, 20],
                    outputRange: [0, 1, 0],
                  }),
                },
              ]}
              numberOfLines={1}
            >
              {upgradeInfo.benefits[currentBenefitIndex]}
            </Animated.Text>
          </View>

          <Text style={styles.price}>{upgradeInfo.price}</Text>
        </View>

        {/* Subscribe Button */}
        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.8}
          onPress={() => onPress(upgradeInfo.nextPlanId)}
        >
          <Text style={styles.buttonText}>Subscribe Now</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    position: 'relative',
  },
  animationBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.7,
    zIndex: 0,
  },
  lottieBackground: {
    width: '100%',
    height: '100%',
  },
  animationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  gradient: {
    padding: 20,
    minHeight: 200,
    position: 'relative',
    zIndex: 1,
  },
  sponsoredBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sponsoredText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  content: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
  },
  benefitContainer: {
    height: 24,
    overflow: 'hidden',
    marginBottom: 8,
  },
  benefit: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    opacity: 0.9,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
});
