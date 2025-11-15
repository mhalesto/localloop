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
import { LinearGradient } from 'expo-linear-gradient';
import ScreenLayout from '../components/ScreenLayout';
import BlackFridayCountdown from '../components/BlackFridayCountdown';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { SUBSCRIPTION_PLANS, formatPrice, getPlanById } from '../config/subscriptionPlans';
import { getUserProfile, updateUserProfile } from '../services/userProfileService';
import { useAlert } from '../contexts/AlertContext';

export default function SubscriptionScreen({ navigation, route }) {
  const { themeColors, accentPreset } = useSettings();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [userProfile, setUserProfile] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('basic');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const [upgradedPlan, setUpgradedPlan] = useState(null);

  // Black Friday promotion flag
  const isBlackFriday = route.params?.fromBlackFriday || false;
  const [showActiveSubscription, setShowActiveSubscription] = useState(!isBlackFriday);

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

  // Detect successful upgrade from route params
  useEffect(() => {
    if (route?.params?.upgradedPlan) {
      setUpgradedPlan(route.params.upgradedPlan);
      setShowWelcomeBanner(true);
      // Clear the route param
      navigation.setParams({ upgradedPlan: null });
    }
  }, [route?.params?.upgradedPlan]);

  const handleSelectPlan = async (planId) => {
    if (planId === userProfile?.subscriptionPlan) {
      showAlert('Already Subscribed', 'You are already on this plan.', [{ text: 'OK' }]);
      return;
    }

    // Prevent downgrades
    const currentPlanName = userProfile?.subscriptionPlan || 'basic';
    const planHierarchy = ['basic', 'premium', 'gold', 'ultimate'];
    const currentLevel = planHierarchy.indexOf(currentPlanName);
    const targetLevel = planHierarchy.indexOf(planId);

    if (targetLevel < currentLevel && targetLevel !== -1) {
      showAlert(
        'Cannot Downgrade',
        `You are currently on the ${currentPlan?.name} plan. To avoid losing your premium features, downgrades are not allowed. Contact support if you need assistance.`,
        [{ text: 'OK' }],
        { icon: 'alert-circle', iconColor: '#FF9500' }
      );
      return;
    }

    setSelectedPlan(planId);
    const plan = getPlanById(planId);

    if (plan.price === 0) {
      // Free plan - only allow if user is currently on Basic
      if (currentPlanName !== 'basic') {
        showAlert(
          'Cannot Downgrade',
          'You cannot switch to the Basic plan while you have an active subscription. Please contact support to cancel your subscription first.',
          [{ text: 'OK' }],
          { icon: 'alert-circle', iconColor: '#FF9500' }
        );
        return;
      }

      // User is already on Basic - this shouldn't happen, but handle it
      showAlert('Already on Basic', 'You are already on the Basic plan.', [{ text: 'OK' }]);
      return;
    } else {
      // Paid plan - navigate to payment
      const finalPrice = isBlackFriday ? plan.price / 2 : plan.price;
      navigation.navigate('Payment', {
        planId,
        planName: plan.name,
        price: finalPrice,
        currency: plan.currency,
        interval: plan.interval,
        isBlackFriday,
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

  // Plan hierarchy for comparison (higher index = higher tier)
  const planHierarchy = ['basic', 'premium', 'gold', 'ultimate'];
  const getCurrentPlanLevel = () => planHierarchy.indexOf(currentPlanName);
  const getPlanLevel = (planId) => planHierarchy.indexOf(planId);
  const isDowngrade = (planId) => getPlanLevel(planId) < getCurrentPlanLevel();

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
        {/* Black Friday Countdown Timer */}
        {isBlackFriday && (
          <BlackFridayCountdown style={{ marginBottom: 16 }} />
        )}

        {/* Welcome Banner for Newly Upgraded Plans */}
        {!isLoading && showWelcomeBanner && upgradedPlan && (() => {
          const plan = getPlanById(upgradedPlan);
          const gradientColors = upgradedPlan === 'premium'
            ? ['#10b981', '#059669']
            : upgradedPlan === 'gold'
            ? ['#f59e0b', '#d97706']
            : ['#8b5cf6', '#7c3aed'];

          return (
            <View style={styles.welcomeBannerContainer}>
              <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.welcomeBanner}
              >
                <TouchableOpacity
                  style={styles.dismissButton}
                  onPress={() => setShowWelcomeBanner(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={20} color="#fff" />
                </TouchableOpacity>

                <View style={styles.welcomeHeader}>
                  <Ionicons name="checkmark-circle" size={32} color="#fff" />
                  <Text style={styles.welcomeTitle}>Welcome to {plan?.name}!</Text>
                </View>

                <Text style={styles.welcomeSubtitle}>
                  You now have access to these premium features:
                </Text>

                <View style={styles.benefitsList}>
                  {plan?.features.slice(0, 4).map((feature, idx) => {
                    const featureText = typeof feature === 'string' ? feature : feature.text;
                    return (
                      <View key={idx} style={styles.benefitRow}>
                        <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                        <Text style={styles.benefitText}>{featureText}</Text>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.celebrationFooter}>
                  <Ionicons name="sparkles" size={16} color="#fff" />
                  <Text style={styles.celebrationText}>Enjoy your upgraded experience!</Text>
                  <Ionicons name="sparkles" size={16} color="#fff" />
                </View>
              </LinearGradient>
            </View>
          );
        })()}

        {/* Current Subscription Status */}
        {!isLoading && isSubscribed && !showWelcomeBanner && (
          <>
            {/* Toggle button when Black Friday is active and card is collapsed */}
            {isBlackFriday && !showActiveSubscription && (
              <TouchableOpacity
                style={[styles.toggleSubscriptionButton, {
                  backgroundColor: themeColors.card,
                  borderColor: themeColors.divider,
                }]}
                onPress={() => setShowActiveSubscription(true)}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={accentPreset?.buttonBackground || themeColors.primary}
                />
                <Text style={[styles.toggleButtonText, { color: themeColors.textPrimary }]}>
                  View Active Subscription
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={18}
                  color={themeColors.textSecondary}
                />
              </TouchableOpacity>
            )}

            {/* Active Subscription Card */}
            {showActiveSubscription && (
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
                  {isBlackFriday && (
                    <TouchableOpacity
                      onPress={() => setShowActiveSubscription(false)}
                      style={styles.collapseButton}
                    >
                      <Ionicons
                        name="chevron-up"
                        size={20}
                        color={themeColors.textSecondary}
                      />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={[styles.statusText, { color: themeColors.textSecondary }]}>
                  You're on the <Text style={{ fontWeight: '700' }}>{currentPlan?.name}</Text> plan
                  {subscriptionEndDate && (
                    <Text> • Renews {new Date(subscriptionEndDate).toLocaleDateString()}</Text>
                  )}
                </Text>
              </View>
            )}
          </>
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
          const isLowerTier = isDowngrade(plan.id);
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
                {isBlackFriday && plan.price > 0 ? (
                  <>
                    <View style={styles.blackFridayBanner}>
                      <Text style={styles.blackFridayText}>🔥 BLACK FRIDAY: 50% OFF</Text>
                    </View>
                    <View style={styles.priceRow}>
                      <Text style={[styles.originalPrice, { color: themeColors.textSecondary }]}>
                        R{plan.price.toFixed(2)}
                      </Text>
                      <Text style={[styles.price, { color: '#FFD700' }]}>
                        R{(plan.price / 2).toFixed(2)}/{plan.interval}
                      </Text>
                    </View>
                    {plan.yearlyPrice && (
                      <View style={styles.yearlyPriceRow}>
                        <Text style={[styles.originalPrice, { color: themeColors.textSecondary, fontSize: 12 }]}>
                          R{plan.yearlyPrice}
                        </Text>
                        <Text style={[styles.yearlyPrice, { color: themeColors.textSecondary }]}>
                          R{(plan.yearlyPrice / 2).toFixed(0)}/year{' '}
                        </Text>
                        <View style={[styles.savingsBadge, { backgroundColor: '#FFD70020' }]}>
                          <Text style={[styles.savings, { color: '#FFD700' }]}>
                            Extra 67% OFF!
                          </Text>
                        </View>
                      </View>
                    )}
                  </>
                ) : (
                  <>
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
                  </>
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
              {!isCurrentPlan && !isLowerTier && (
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

              {/* Current Plan Badge */}
              {isCurrentPlan && (
                <View style={[styles.currentPlanBadge, { backgroundColor: `${primaryColor}15` }]}>
                  <Ionicons name="checkmark-circle" size={18} color={primaryColor} />
                  <Text style={[styles.currentPlanText, { color: primaryColor }]}>
                    Current Plan
                  </Text>
                </View>
              )}

              {/* Lower Tier - Not Available */}
              {isLowerTier && !isCurrentPlan && (
                <View style={[styles.unavailableBadge, { backgroundColor: themeColors.divider }]}>
                  <Ionicons name="lock-closed" size={16} color={themeColors.textSecondary} />
                  <Text style={[styles.unavailableText, { color: themeColors.textSecondary }]}>
                    Downgrade Not Available
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Footer Info */}
        {!isLoading && (
        <View style={styles.footerInfo}>
          <Ionicons name="information-circle-outline" size={16} color={themeColors.textSecondary} />
          <Text style={[styles.footerText, { color: themeColors.textSecondary }]}>
            You can upgrade or cancel your subscription at any time. To protect your premium features, downgrades are not allowed. Contact support for assistance.
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
  toggleSubscriptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  collapseButton: {
    marginLeft: 'auto',
    padding: 4,
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
  blackFridayBanner: {
    backgroundColor: '#000',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  blackFridayText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  originalPrice: {
    fontSize: 18,
    fontWeight: '600',
    textDecorationLine: 'line-through',
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
  currentPlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  currentPlanText: {
    fontSize: 15,
    fontWeight: '600',
  },
  unavailableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  unavailableText: {
    fontSize: 14,
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
  welcomeBannerContainer: {
    marginBottom: 24,
  },
  welcomeBanner: {
    borderRadius: 20,
    padding: 24,
    position: 'relative',
  },
  dismissButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 16,
  },
  benefitsList: {
    gap: 10,
    marginBottom: 20,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitText: {
    fontSize: 15,
    color: '#fff',
    flex: 1,
    lineHeight: 20,
  },
  celebrationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  celebrationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
