import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/ScreenLayout';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { SUBSCRIPTION_PLANS, formatPrice } from '../config/subscriptionPlans';

export default function SubscriptionScreen({ navigation }) {
  const { themeColors, accentPreset } = useSettings();
  const { userProfile, updateUserProfile } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState(userProfile?.subscriptionPlan || 'basic');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSelectPlan = async (planId) => {
    if (planId === userProfile?.subscriptionPlan) {
      Alert.alert('Already Subscribed', 'You are already on this plan.');
      return;
    }

    setSelectedPlan(planId);
    const plan = SUBSCRIPTION_PLANS[planId.toUpperCase()];

    if (plan.price === 0) {
      // Free plan - immediate activation
      try {
        setIsProcessing(true);
        await updateUserProfile({
          subscriptionPlan: planId,
          premiumUnlocked: false,
        });
        Alert.alert('Success', 'You are now on the Basic plan.');
        navigation.goBack();
      } catch (error) {
        Alert.alert('Error', 'Failed to update plan. Please try again.');
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
        {plans.map((plan, index) => {
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
                <Text style={[styles.price, { color: themeColors.textPrimary }]}>
                  {formatPrice(plan)}
                </Text>
                {plan.savings && (
                  <Text style={[styles.savings, { color: primaryColor }]}>
                    {plan.savings}
                  </Text>
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
        <View style={styles.footerInfo}>
          <Ionicons name="information-circle-outline" size={16} color={themeColors.textSecondary} />
          <Text style={[styles.footerText, { color: themeColors.textSecondary }]}>
            You can upgrade, downgrade, or cancel your subscription at any time from your profile settings.
          </Text>
        </View>
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
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 16,
  },
  price: {
    fontSize: 32,
    fontWeight: '700',
  },
  savings: {
    fontSize: 14,
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
