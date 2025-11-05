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
import { SUBSCRIPTION_PLANS, formatPrice } from '../config/subscriptionPlans';
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
    if (planId === userProfile?.subscriptionPlan) {
      showAlert('Already Subscribed', 'You are already on this plan.', [{ text: 'OK' }]);
      return;
    }

    setSelectedPlan(planId);
    const plan = SUBSCRIPTION_PLANS[planId.toUpperCase()];

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
    SUBSCRIPTION_PLANS.PREMIUM,
    SUBSCRIPTION_PLANS.GOLD,
  ];

  const currentPlanName = userProfile?.subscriptionPlan || 'basic';
  const currentPlan = SUBSCRIPTION_PLANS[currentPlanName.toUpperCase()];
  const isSubscribed = userProfile?.premiumUnlocked && (currentPlanName === 'premium' || currentPlanName === 'gold');
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
          const isCurrentPlan = userProfile?.subscriptionPlan === plan.id;
          const isSelected = selectedPlan === plan.id;
          const primaryColor = accentPreset?.buttonBackground || themeColors.primary;

          return (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                {
                  backgroundColor: themeColors.card,
                  borderColor: isSelected ? primaryColor : themeColors.divider,
                  borderWidth: isSelected ? 2 : 1,
                },
                plan.popular && styles.popularCard,
              ]}
              onPress={() => handleSelectPlan(plan.id)}
              activeOpacity={0.7}
              disabled={isProcessing}
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
                {plan.savings && (
                  <View style={[styles.savingsBadge, { backgroundColor: `${primaryColor}20` }]}>
                    <Text style={[styles.savings, { color: primaryColor }]}>
                      {plan.savings}
                    </Text>
                  </View>
                )}
              </View>

              {/* Features */}
              <View style={styles.featuresContainer}>
                {plan.features.map((feature, idx) => (
                  <View key={idx} style={styles.featureRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={primaryColor}
                      style={styles.featureIcon}
                    />
                    <Text style={[styles.featureText, { color: themeColors.textPrimary }]}>
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Select Button */}
              {!isCurrentPlan && (
                <TouchableOpacity
                  style={[
                    styles.selectButton,
                    {
                      backgroundColor: isSelected ? primaryColor : 'transparent',
                      borderColor: primaryColor,
                      borderWidth: isSelected ? 0 : 1,
                    },
                  ]}
                  onPress={() => handleSelectPlan(plan.id)}
                  disabled={isProcessing}
                >
                  {isProcessing && isSelected ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text
                      style={[
                        styles.selectButtonText,
                        { color: isSelected ? '#fff' : primaryColor },
                      ]}
                    >
                      {plan.price === 0 ? 'Select Plan' : 'Subscribe Now'}
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
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    marginTop: 2,
  },
  featureText: {
    fontSize: 15,
    flex: 1,
    lineHeight: 22,
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
