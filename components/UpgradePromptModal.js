import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSettings } from '../contexts/SettingsContext';
import { SUBSCRIPTION_PLANS, getPlanInfo } from '../config/subscriptionPlans';

/**
 * UpgradePromptModal
 * Beautiful modal that prompts users to upgrade when they try to use premium features
 *
 * @param {boolean} visible - Whether modal is visible
 * @param {function} onClose - Called when user closes modal
 * @param {function} onUpgrade - Called when user clicks upgrade button
 * @param {string} featureName - Name of the feature being locked
 * @param {string} featureDescription - Description of the feature
 * @param {string} requiredPlan - 'premium' or 'gold'
 * @param {string} icon - Ionicons name for the feature
 */
export default function UpgradePromptModal({
  visible,
  onClose,
  onUpgrade,
  featureName = 'Premium Feature',
  featureDescription = 'This feature is available for Premium and Gold members',
  requiredPlan = 'premium',
  icon = 'star',
}) {
  const { themeColors, isDarkMode, accentPreset } = useSettings();
  const primaryColor = accentPreset?.buttonBackground || themeColors.primary;

  // Get plans to show
  const showGold = requiredPlan === 'gold';
  const premiumPlan = SUBSCRIPTION_PLANS.PREMIUM;
  const goldPlan = SUBSCRIPTION_PLANS.GOLD;

  const plans = showGold
    ? [goldPlan] // Gold-exclusive feature
    : [premiumPlan, goldPlan]; // Premium feature (show both options)

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={isDarkMode ? 40 : 20}
            tint={isDarkMode ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)' }]} />
        )}

        <View style={styles.modalContainer}>
          <View style={[styles.modal, { backgroundColor: themeColors.card }]}>
            {/* Close Button */}
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color={themeColors.textSecondary} />
            </TouchableOpacity>

            {/* Feature Icon */}
            <View style={[styles.iconContainer, { backgroundColor: `${primaryColor}20` }]}>
              <Ionicons name={icon} size={48} color={primaryColor} />
            </View>

            {/* Feature Info */}
            <Text style={[styles.featureName, { color: themeColors.textPrimary }]}>
              {featureName}
            </Text>
            <Text style={[styles.featureDescription, { color: themeColors.textSecondary }]}>
              {featureDescription}
            </Text>

            {/* Plans */}
            <ScrollView
              style={styles.plansContainer}
              contentContainerStyle={styles.plansContent}
              showsVerticalScrollIndicator={false}
            >
              {plans.map((plan) => {
                const isPopular = plan.popular;

                return (
                  <View
                    key={plan.id}
                    style={[
                      styles.planCard,
                      {
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                        borderColor: isPopular ? primaryColor : themeColors.divider,
                        borderWidth: isPopular ? 2 : 1,
                      },
                    ]}
                  >
                    {isPopular && (
                      <View style={[styles.popularBadge, { backgroundColor: primaryColor }]}>
                        <Text style={styles.popularText}>RECOMMENDED</Text>
                      </View>
                    )}

                    {/* Plan Header */}
                    <View style={styles.planHeader}>
                      <Text style={[styles.planBadge, { fontSize: 32 }]}>
                        {plan.id === 'gold' ? '👑' : '⭐'}
                      </Text>
                      <Text style={[styles.planName, { color: themeColors.textPrimary }]}>
                        {plan.name}
                      </Text>
                      <Text style={[styles.planPrice, { color: primaryColor }]}>
                        R{plan.price.toFixed(2)}
                        <Text style={[styles.planInterval, { color: themeColors.textSecondary }]}>
                          /{plan.interval}
                        </Text>
                      </Text>
                      {plan.savings && (
                        <View style={[styles.savingsBadge, { backgroundColor: `${primaryColor}20` }]}>
                          <Text style={[styles.savings, { color: primaryColor }]}>
                            {plan.savings}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Plan Features */}
                    <View style={styles.featuresContainer}>
                      {plan.features.slice(0, 5).map((feature, idx) => (
                        <View key={idx} style={styles.featureRow}>
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color={primaryColor}
                            style={styles.featureIcon}
                          />
                          <Text style={[styles.featureText, { color: themeColors.textPrimary }]}>
                            {feature}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* Action Buttons */}
            <TouchableOpacity
              style={[styles.upgradeButton, { backgroundColor: primaryColor }]}
              onPress={onUpgrade}
              activeOpacity={0.9}
            >
              <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.upgradeIcon} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.laterButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.laterButtonText, { color: themeColors.textSecondary }]}>
                Maybe Later
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  featureName: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  plansContainer: {
    maxHeight: 320,
  },
  plansContent: {
    paddingBottom: 8,
  },
  planCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    left: 16,
    right: 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  popularText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  planBadge: {
    marginBottom: 8,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 28,
    fontWeight: '700',
  },
  planInterval: {
    fontSize: 16,
    fontWeight: '400',
  },
  savingsBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  savings: {
    fontSize: 12,
    fontWeight: '600',
  },
  featuresContainer: {
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureIcon: {
    marginTop: 1,
  },
  featureText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  upgradeButton: {
    height: 54,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  upgradeButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  upgradeIcon: {
    marginLeft: 8,
  },
  laterButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  laterButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
