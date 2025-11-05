import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import LoadingOverlay from './LoadingOverlay';
import { useSettings } from '../contexts/SettingsContext';

const { width } = Dimensions.get('window');

const PREMIUM_FEATURES = [
  {
    icon: 'star',
    title: 'Unlimited Posts',
    description: 'Create unlimited posts without any daily restrictions',
  },
  {
    icon: 'color-palette',
    title: 'Exclusive Themes',
    description: 'Access premium color themes and customization options',
  },
  {
    icon: 'trophy',
    title: 'Premium Badge',
    description: 'Display your exclusive Gold Premium badge on your profile',
  },
  {
    icon: 'flash',
    title: 'Priority Support',
    description: 'Get faster response times and dedicated support',
  },
  {
    icon: 'gift',
    title: 'Early Access',
    description: 'Be the first to try new features before everyone else',
  },
  {
    icon: 'shield-checkmark',
    title: 'Ad-Free Experience',
    description: 'Enjoy the app without any advertisements',
  },
];

export default function PremiumSuccessModal({ visible, onClose }) {
  const { themeColors, isDarkMode } = useSettings();
  const [showGiftAnimation, setShowGiftAnimation] = useState(true);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    if (visible) {
      setShowGiftAnimation(true);
      setShowSummary(false);
    } else {
      // Reset states when modal is hidden
      setShowGiftAnimation(true);
      setShowSummary(false);
    }
  }, [visible]);

  const handleAnimationComplete = useCallback(() => {
    console.log('[PremiumSuccessModal] Animation complete, closing modal');
    // Close the entire modal immediately after gift animation
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  return (
    <>
      {/* Gift Animation */}
      <LoadingOverlay
        visible={visible && showGiftAnimation}
        onComplete={handleAnimationComplete}
        animationSource={require('../assets/premium-gift.json')}
        duration={4000}
      />

      {/* Premium Summary Modal */}
      <Modal
        visible={visible && showSummary}
        transparent
        animationType="slide"
        statusBarTranslucent
      >
        <View style={[styles.container, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <View style={[styles.content, { backgroundColor: themeColors.card }]}>
            {/* Premium Badge at Top */}
            <View style={styles.badgeContainer}>
              <LottieView
                source={require('../assets/premium-gold-badge.json')}
                autoPlay
                loop
                style={styles.badge}
              />
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: themeColors.textPrimary }]}>
              Welcome to Premium!
            </Text>
            <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
              You now have access to exclusive features
            </Text>

            {/* Features List */}
            <ScrollView style={styles.featuresContainer} showsVerticalScrollIndicator={false}>
              {PREMIUM_FEATURES.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <View style={[styles.featureIcon, { backgroundColor: `${themeColors.primary}20` }]}>
                    <Ionicons name={feature.icon} size={24} color={themeColors.primary} />
                  </View>
                  <View style={styles.featureText}>
                    <Text style={[styles.featureTitle, { color: themeColors.textPrimary }]}>
                      {feature.title}
                    </Text>
                    <Text style={[styles.featureDescription, { color: themeColors.textSecondary }]}>
                      {feature.description}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: themeColors.primary }]}
                onPress={onClose}
                activeOpacity={0.9}
              >
                <Text style={styles.primaryButtonText}>Get Started</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={[styles.secondaryButtonText, { color: themeColors.textSecondary }]}>
                  Maybe Later
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 15,
  },
  badgeContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: {
    width: 100,
    height: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  featuresContainer: {
    maxHeight: 300,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  buttonContainer: {
    gap: 12,
  },
  primaryButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});