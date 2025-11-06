import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getFunctions, httpsCallable } from 'firebase/functions';
import ScreenLayout from '../components/ScreenLayout';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { updateUserProfile } from '../services/userProfileService';
import { useAlert } from '../contexts/AlertContext';

export default function PaymentScreen({ route, navigation }) {
  const { planId, planName, price, currency, interval } = route.params;
  const { themeColors, accentPreset } = useSettings();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [isProcessing, setIsProcessing] = useState(false);

  const primaryColor = accentPreset?.buttonBackground || themeColors.primary;

  const handlePayment = async () => {
    if (!user?.uid) {
      showAlert('Sign In Required', 'Please sign in to subscribe.', [{ text: 'OK' }]);
      return;
    }

    setIsProcessing(true);

    try {
      // PAYFAST INTEGRATION METHOD
      // Call Firebase Function to generate PayFast payment URL
      const functions = getFunctions();
      const createPayFastPayment = httpsCallable(functions, 'createPayFastPayment');

      const { data } = await createPayFastPayment({
        planId,
        planName,
        amount: price,
        interval, // 'month' or 'year'
        userId: user.uid,
        userEmail: user.email,
      });

      if (data.error) {
        throw new Error(data.error);
      }

      // Open PayFast payment page
      const paymentUrl = data.paymentUrl;
      const canOpen = await Linking.canOpenURL(paymentUrl);

      if (canOpen) {
        await Linking.openURL(paymentUrl);

        // Show instructions
        showAlert(
          'Complete Payment',
          'You will be redirected to PayFast to complete your payment. Once done, your subscription will be activated automatically.',
          [
            {
              text: 'OK',
              onPress: () => {
                setIsProcessing(false);
                // Optionally navigate back or to a pending screen
                navigation.navigate('Subscription');
              },
            },
          ],
          { icon: 'card', iconColor: primaryColor }
        );
      } else {
        throw new Error('Cannot open payment URL');
      }
    } catch (error) {
      setIsProcessing(false);
      console.error('[PaymentScreen] Payment error:', error);
      showAlert(
        'Payment Error',
        error.message || 'Unable to process payment. Please try again.',
        [{ text: 'OK' }],
        { icon: 'alert-circle', iconColor: '#FF3B30' }
      );
    }
  };

  const handleSimulatedPayment = async () => {
    // Simulated payment for testing (when PayFast Functions not deployed)
    setIsProcessing(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      await updateUserProfile(user.uid, {
        subscriptionPlan: planId,
        premiumUnlocked: true,
        subscriptionStartDate: Date.now(),
        subscriptionEndDate:
          interval === 'year'
            ? Date.now() + 365 * 24 * 60 * 60 * 1000
            : Date.now() + 30 * 24 * 60 * 60 * 1000,
      });

      setIsProcessing(false);

      showAlert(
        'Payment Successful!',
        `You are now subscribed to ${planName}. Enjoy your premium features!`,
        [
          {
            text: 'Great!',
            onPress: () => navigation.navigate('Settings'),
          },
        ],
        { icon: 'checkmark-circle', iconColor: '#34C759' }
      );
    } catch (error) {
      setIsProcessing(false);
      console.error('[PaymentScreen] Test payment error:', error);
      showAlert(
        'Payment Failed',
        error.message || 'Something went wrong. Please try again.',
        [{ text: 'OK' }],
        { icon: 'alert-circle', iconColor: '#FF3B30' }
      );
    }
  };

  return (
    <ScreenLayout
      title="Payment"
      subtitle={`Subscribe to ${planName}`}
      navigation={navigation}
      onBack={() => navigation.goBack()}
      showFooter={false}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Summary */}
        <View style={[styles.summaryCard, { backgroundColor: themeColors.card }]}>
          <Text style={[styles.summaryTitle, { color: themeColors.textPrimary }]}>
            Order Summary
          </Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: themeColors.textSecondary }]}>
              Plan
            </Text>
            <Text style={[styles.summaryValue, { color: themeColors.textPrimary }]}>
              {planName}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: themeColors.textSecondary }]}>
              Billing
            </Text>
            <Text style={[styles.summaryValue, { color: themeColors.textPrimary }]}>
              {interval === 'year' ? 'Yearly' : 'Monthly'}
            </Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: themeColors.divider }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.totalLabel, { color: themeColors.textPrimary }]}>Total</Text>
            <Text style={[styles.totalValue, { color: primaryColor }]}>
              R{price.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Payment Method */}
        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
          Payment Method
        </Text>

        {/* PayFast Info Card */}
        <View style={[styles.paymentMethodCard, { backgroundColor: themeColors.card }]}>
          <View style={styles.paymentMethodHeader}>
            <Ionicons name="card" size={32} color={primaryColor} />
            <View style={styles.paymentMethodInfo}>
              <Text style={[styles.paymentMethodTitle, { color: themeColors.textPrimary }]}>
                PayFast Payment Gateway
              </Text>
              <Text style={[styles.paymentMethodDescription, { color: themeColors.textSecondary }]}>
                Secure South African payment processing
              </Text>
            </View>
          </View>

          <View style={styles.paymentMethodFeatures}>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={16} color={primaryColor} />
              <Text style={[styles.featureText, { color: themeColors.textSecondary }]}>
                Credit & Debit Cards
              </Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={16} color={primaryColor} />
              <Text style={[styles.featureText, { color: themeColors.textSecondary }]}>
                Instant EFT (Bank Transfer)
              </Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={16} color={primaryColor} />
              <Text style={[styles.featureText, { color: themeColors.textSecondary }]}>
                SnapScan, Zapper & more
              </Text>
            </View>
          </View>
        </View>

        {/* Subscribe Button - Real PayFast */}
        <TouchableOpacity
          style={[styles.subscribeButton, { backgroundColor: primaryColor }]}
          onPress={handlePayment}
          disabled={isProcessing}
          activeOpacity={0.8}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="lock-closed" size={20} color="#fff" />
              <Text style={styles.subscribeButtonText}>
                Pay with PayFast - R{price.toFixed(2)}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Subscribe Button - Simulated Payment (for testing) - COMMENTED OUT FOR PRODUCTION */}
        {/* <TouchableOpacity
          style={[styles.testButton, { backgroundColor: themeColors.textSecondary, opacity: 0.7 }]}
          onPress={handleSimulatedPayment}
          disabled={isProcessing}
          activeOpacity={0.8}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="flask" size={20} color="#fff" />
              <Text style={styles.subscribeButtonText}>
                Test Mode - Instant Activation
              </Text>
            </>
          )}
        </TouchableOpacity> */}

        {/* Security Info */}
        <View style={styles.securityInfo}>
          <Ionicons name="shield-checkmark" size={16} color={themeColors.textSecondary} />
          <Text style={[styles.securityText, { color: themeColors.textSecondary }]}>
            Payments processed securely by PayFast. Your payment information is encrypted and never stored on our servers.
          </Text>
        </View>

        {/* Terms & Conditions link */}
        <View style={[styles.noteCard, { backgroundColor: `${primaryColor}10` }]}>
          <Ionicons name="information-circle" size={20} color={primaryColor} />
          <Text style={[styles.noteText, { color: primaryColor }]}>
            By completing this payment, you agree to our{' '}
            <Text
              style={{ textDecorationLine: 'underline', fontWeight: '600' }}
              onPress={() => Linking.openURL('https://mhalesto.github.io/toilet/policy.html')}
            >
              Terms & Conditions
            </Text>
            .
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
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 15,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  paymentMethodCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentMethodInfo: {
    marginLeft: 12,
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  paymentMethodDescription: {
    fontSize: 13,
  },
  paymentMethodFeatures: {
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
  },
  subscribeButton: {
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  testButton: {
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  securityText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 12,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
});
