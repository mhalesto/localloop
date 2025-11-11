import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/ScreenLayout';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { SUBSCRIPTION_PLANS, formatPrice, getPlanById } from '../config/subscriptionPlans';
import { getUserProfile, updateUserProfile } from '../services/userProfileService';
import { useAlert } from '../contexts/AlertContext';

export default function SubscriptionScreen({ navigation }) {
  const { themeColors, accentPreset } = useSettings();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [userProfile, setUserProfile] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('basic');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load user profile with subscription data
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user?.uid) {
        setIsLoading(false);
        return;
      }

      try {
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
        setSelectedPlan(profile?.subscriptionPlan || 'basic');
      } catch (error) {
        console.error('[SubscriptionScreen] Error loading profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserProfile();
  }, [user]);

  const handleSelectPlan = async (planId) => {
    // Handle ultimate/gold equivalence
    const currentPlanId = userProfile?.subscriptionPlan;
    const normalizedCurrentPlan = (currentPlanId === 'ultimate' || currentPlanId === 'gold') ? 'gold' : currentPlanId;
    const normalizedSelectedPlan = (planId === 'ultimate' || planId === 'gold') ? 'gold' : planId;

    if (normalizedSelectedPlan === normalizedCurrentPlan) {
      showAlert('Already Subscribed', 'You are already on this plan.', [{ text: 'OK' }]);
      return;
    }

    // Define plan hierarchy (higher index = higher tier)
    const planHierarchy = ['basic', 'go', 'premium', 'gold'];
    const currentPlanIndex = planHierarchy.indexOf(normalizedCurrentPlan || 'basic');
    const selectedPlanIndex = planHierarchy.indexOf(normalizedSelectedPlan);

    // Check if trying to downgrade
    if (currentPlanIndex > selectedPlanIndex) {
      showAlert(
        'Already on Higher Tier',
        `You're currently on the ${getPlanById(currentPlanId)?.name} plan, which includes all features of ${getPlanById(planId)?.name}.`,
        [{ text: 'OK' }],
        { icon: 'information-circle', iconColor: accentPreset?.buttonBackground || themeColors.primary }
      );
      return;
    }

    setSelectedPlan(planId);
    const plan = getPlanById(planId);

    if (plan.price === 0) {
      // Free plan - immediate activation
      try {
        setIsProcessing(true);
        await updateUserProfile(user.uid, {
          subscriptionPlan: planId,
          premiumUnlocked: false,
        });

        // Reload profile
        const updatedProfile = await getUserProfile(user.uid);
        setUserProfile(updatedProfile);

        showAlert(
          'Success',
          'You are now on the Basic plan.',
          [{ text: 'OK', onPress: () => navigation.goBack() }],
          { icon: 'checkmark-circle', iconColor: '#34C759' }
        );
      } catch (error) {
        console.error('[SubscriptionScreen] Error updating plan:', error);
        showAlert(
          'Error',
          'Failed to update plan. Please try again.',
          [{ text: 'OK' }],
          { icon: 'alert-circle', iconColor: '#FF3B30' }
        );
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Paid plan - navigate to payment
      navigation.navigate('Payment', {
        planId,
        planName: plan.name,
        price: plan.price,
        currency: plan.currency,
        interval: plan.interval,
      });
    }
  };

  const plans = [
    SUBSCRIPTION_PLANS.BASIC,
    SUBSCRIPTION_PLANS.GO,
    SUBSCRIPTION_PLANS.PREMIUM,
    SUBSCRIPTION_PLANS.GOLD,
  ];

  const currentPlanName = userProfile?.subscriptionPlan || 'basic';
  const currentPlan = getPlanById(currentPlanName);
  const isSubscribed = userProfile?.premiumUnlocked && (currentPlanName === 'premium' || currentPlanName === 'gold' || currentPlanName === 'ultimate');
  const subscriptionEndDate = userProfile?.subscriptionEndDate;

  return (
    <ScreenLayout
      title="Choose Your Plan"
      subtitle="Select the plan that works for you"
      navigation={navigation}
      onBack={() => navigation.goBack()}
      showFooter={false}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Subscription Status */}
        {!isLoading && isSubscribed && (
          <View style={[styles.statusBanner, { backgroundColor: `${accentPreset?.buttonBackground || themeColors.primary}15` }]}>
            <View style={styles.statusHeader}>
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={accentPreset?.buttonBackground || themeColors.primary}
              />
              <Text style={[styles.statusTitle, { color: themeColors.textPrimary }]}>
                Active Subscription
              </Text>
            </View>
            <Text style={[styles.statusText, { color: themeColors.textSecondary }]}>
              You're on the <Text style={{ fontWeight: '700' }}>{currentPlan?.name}</Text> plan
              {subscriptionEndDate && (
                <Text> • Renews {new Date(subscriptionEndDate).toLocaleDateString()}</Text>
              )}
            </Text>
          </View>
        )}

        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={accentPreset?.buttonBackground || themeColors.primary} />
          </View>
        )}

        {/* Plan Cards */}
        {!isLoading && plans.map((plan, index) => {
          // Handle ultimate/gold equivalence
          const currentPlanId = userProfile?.subscriptionPlan;
          const normalizedCurrentPlan = (currentPlanId === 'ultimate' || currentPlanId === 'gold') ? 'gold' : currentPlanId;
          const normalizedPlanId = (plan.id === 'ultimate' || plan.id === 'gold') ? 'gold' : plan.id;

          const isCurrentPlan = normalizedPlanId === normalizedCurrentPlan;
          const isSelected = selectedPlan === plan.id;
          const primaryColor = accentPreset?.buttonBackground || themeColors.primary;

          // Check if this is a downgrade
          const planHierarchy = ['basic', 'go', 'premium', 'gold'];
          const currentPlanIndex = planHierarchy.indexOf(normalizedCurrentPlan || 'basic');
          const thisPlanIndex = planHierarchy.indexOf(normalizedPlanId);
          const isDowngrade = currentPlanIndex > thisPlanIndex;

          return (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                {
                  backgroundColor: themeColors.card,
                  borderColor: isSelected ? primaryColor : themeColors.divider,
                  borderWidth: isSelected ? 2 : 1,
                  opacity: isDowngrade ? 0.6 : 1,
                },
                plan.popular && styles.popularCard,
              ]}
              onPress={() => handleSelectPlan(plan.id)}
              activeOpacity={0.7}
              disabled={isProcessing || isDowngrade}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <View style={[styles.popularBadge, { backgroundColor: primaryColor }]}>
                  <Text style={styles.popularText}>MOST POPULAR</Text>
                </View>
              )}

              {/* Plan Header */}
              <View style={styles.planHeader}>
                <View style={styles.planTitleRow}>
                  <Text style={[styles.planName, { color: themeColors.textPrimary }]}>
                    {plan.name}
                  </Text>
                  {isCurrentPlan && (
                    <View style={[styles.currentBadge, { backgroundColor: `${primaryColor}20` }]}>
                      <Text style={[styles.currentText, { color: primaryColor }]}>Current</Text>
                    </View>
                  )}
                  {isDowngrade && !isCurrentPlan && (
                    <View style={[styles.currentBadge, { backgroundColor: `${themeColors.textTertiary}20` }]}>
                      <Text style={[styles.currentText, { color: themeColors.textTertiary }]}>Included</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.planDescription, { color: themeColors.textSecondary }]}>
                  {plan.description}
                </Text>
              </View>

              {/* Price */}
              <View style={styles.priceContainer}>
                <View style={styles.priceRow}>
                  <Text style={[styles.price, { color: themeColors.textPrimary }]}>
                    {formatPrice(plan)}
                  </Text>
                </View>
                {plan.yearlyPrice && (
                  <View style={styles.yearlyPriceRow}>
                    <Text style={[styles.yearlyPrice, { color: themeColors.textSecondary }]}>
                      R{plan.yearlyPrice}/year{' '}
                    </Text>
                    {plan.yearlySavings && (
                      <View style={[styles.savingsBadge, { backgroundColor: `${primaryColor}20` }]}>
                        <Text style={[styles.savings, { color: primaryColor }]}>
                          {plan.yearlySavings}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* Features */}
              <View style={styles.featuresContainer}>
                {plan.features.map((feature, idx) => {
                  // Support both string features and object features with badges
                  const featureText = typeof feature === 'string' ? feature : feature.text;
                  const featureBadge = typeof feature === 'object' ? feature.badge : null;
                  const badgeColor = typeof feature === 'object' ? feature.badgeColor : '#FF9500';

                  return (
                    <View key={idx} style={styles.featureRow}>
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={primaryColor}
                        style={styles.featureIcon}
                      />
                      <View style={styles.featureTextContainer}>
                        <Text style={[styles.featureText, { color: themeColors.textPrimary }]}>
                          {featureText}
                        </Text>
                        {featureBadge && (
                          <View style={[styles.featureBadge, { backgroundColor: `${badgeColor}15` }]}>
                            <Text style={[styles.featureBadgeText, { color: badgeColor }]}>
                              {featureBadge}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Select Button */}
              {!isCurrentPlan && (
                <TouchableOpacity
                  style={[
                    styles.selectButton,
                    {
                      backgroundColor: isSelected ? primaryColor : isDowngrade ? themeColors.divider : 'transparent',
                      borderColor: isDowngrade ? themeColors.divider : primaryColor,
                      borderWidth: isSelected || isDowngrade ? 0 : 1,
                    },
                  ]}
                  onPress={() => handleSelectPlan(plan.id)}
                  disabled={isProcessing || isDowngrade}
                >
                  {isProcessing && isSelected ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text
                      style={[
                        styles.selectButtonText,
                        { color: isSelected ? '#fff' : isDowngrade ? themeColors.textTertiary : primaryColor },
                      ]}
                    >
                      {isCurrentPlan ? 'Current Plan' : isDowngrade ? 'Included in Your Plan' : plan.price === 0 ? 'Select Plan' : 'Subscribe Now'}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Footer Info */}
        {!isLoading && (
        <View style={styles.footerInfo}>
          <Ionicons name="information-circle-outline" size={16} color={themeColors.textSecondary} />
          <Text style={[styles.footerText, { color: themeColors.textSecondary }]}>
            You can upgrade, downgrade, or cancel your subscription at any time from your profile settings.
          </Text>
        </View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  statusBanner: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusText: {
    fontSize: 15,
    lineHeight: 22,
    marginLeft: 36,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    position: 'relative',
  },
  popularCard: {
    marginTop: 8,
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    left: 20,
    right: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  popularText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  planHeader: {
    marginBottom: 16,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  planName: {
    fontSize: 24,
    fontWeight: '700',
  },
  currentBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  currentText: {
    fontSize: 11,
    fontWeight: '600',
  },
  planDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  priceContainer: {
    marginBottom: 16,
    gap: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 32,
    fontWeight: '700',
  },
  yearlyPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  yearlyPrice: {
    fontSize: 14,
    fontWeight: '500',
  },
  savingsBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  savings: {
    fontSize: 13,
    fontWeight: '600',
  },
  featuresContainer: {
    gap: 12,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  featureIcon: {
    marginTop: 2,
  },
  featureTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureText: {
    fontSize: 15,
    lineHeight: 22,
    flexShrink: 1,
  },
  featureBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  featureBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  selectButton: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  footerText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
});
