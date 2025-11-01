import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/ScreenLayout';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';

export default function PaymentScreen({ route, navigation }) {
  const { planId, planName, price, currency, interval } = route.params;
  const { themeColors, accentPreset } = useSettings();
  const { updateUserProfile } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');

  // Form states
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');

  const primaryColor = accentPreset?.buttonBackground || themeColors.primary;

  const handlePayment = async () => {
    // Validation
    if (paymentMethod === 'card') {
      if (!cardNumber || !expiryDate || !cvv || !cardName) {
        Alert.alert('Missing Information', 'Please fill in all payment details.');
        return;
      }

      // Basic card number validation (simplified)
      if (cardNumber.replace(/\s/g, '').length < 13) {
        Alert.alert('Invalid Card', 'Please enter a valid card number.');
        return;
      }
    }

    setIsProcessing(true);

    // Simulate payment processing
    setTimeout(async () => {
      try {
        // In a real app, this would:
        // 1. Process payment via payment gateway (Stripe, PayPal, Yoco, etc.)
        // 2. Create subscription in backend
        // 3. Update user profile with subscription details

        await updateUserProfile({
          subscriptionPlan: planId,
          premiumUnlocked: true,
          subscriptionStartDate: Date.now(),
          subscriptionEndDate: interval === 'year'
            ? Date.now() + 365 * 24 * 60 * 60 * 1000
            : Date.now() + 30 * 24 * 60 * 60 * 1000,
        });

        setIsProcessing(false);

        Alert.alert(
          'Payment Successful! 🎉',
          `You are now subscribed to ${planName}. Enjoy your premium features!`,
          [
            {
              text: 'Great!',
              onPress: () => {
                navigation.navigate('Settings');
              },
            },
          ]
        );
      } catch (error) {
        setIsProcessing(false);
        Alert.alert('Payment Failed', 'Something went wrong. Please try again.');
      }
    }, 2000);
  };

  const formatCardNumber = (text) => {
    const cleaned = text.replace(/\s/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    setCardNumber(formatted);
  };

  const formatExpiryDate = (text) => {
    const cleaned = text.replace(/\//g, '');
    if (cleaned.length >= 2) {
      setExpiryDate(cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4));
    } else {
      setExpiryDate(cleaned);
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

        {/* Payment Methods */}
        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
          Payment Method
        </Text>

        <View style={styles.paymentMethods}>
          <TouchableOpacity
            style={[
              styles.paymentMethodCard,
              {
                backgroundColor: themeColors.card,
                borderColor: paymentMethod === 'card' ? primaryColor : themeColors.divider,
                borderWidth: paymentMethod === 'card' ? 2 : 1,
              },
            ]}
            onPress={() => setPaymentMethod('card')}
          >
            <Ionicons name="card-outline" size={24} color={primaryColor} />
            <Text style={[styles.paymentMethodText, { color: themeColors.textPrimary }]}>
              Credit/Debit Card
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentMethodCard,
              {
                backgroundColor: themeColors.card,
                borderColor: paymentMethod === 'paypal' ? primaryColor : themeColors.divider,
                borderWidth: paymentMethod === 'paypal' ? 2 : 1,
              },
            ]}
            onPress={() => setPaymentMethod('paypal')}
          >
            <Ionicons name="logo-paypal" size={24} color={primaryColor} />
            <Text style={[styles.paymentMethodText, { color: themeColors.textPrimary }]}>
              PayPal
            </Text>
          </TouchableOpacity>
        </View>

        {/* Card Details Form */}
        {paymentMethod === 'card' && (
          <View style={styles.formContainer}>
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
              Card Details
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>
                Card Number
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: themeColors.background,
                    color: themeColors.textPrimary,
                    borderColor: themeColors.divider,
                  },
                ]}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor={themeColors.textSecondary}
                value={cardNumber}
                onChangeText={formatCardNumber}
                keyboardType="numeric"
                maxLength={19}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>
                  Expiry Date
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: themeColors.background,
                      color: themeColors.textPrimary,
                      borderColor: themeColors.divider,
                    },
                  ]}
                  placeholder="MM/YY"
                  placeholderTextColor={themeColors.textSecondary}
                  value={expiryDate}
                  onChangeText={formatExpiryDate}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>CVV</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: themeColors.background,
                      color: themeColors.textPrimary,
                      borderColor: themeColors.divider,
                    },
                  ]}
                  placeholder="123"
                  placeholderTextColor={themeColors.textSecondary}
                  value={cvv}
                  onChangeText={setCvv}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>
                Cardholder Name
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: themeColors.background,
                    color: themeColors.textPrimary,
                    borderColor: themeColors.divider,
                  },
                ]}
                placeholder="John Doe"
                placeholderTextColor={themeColors.textSecondary}
                value={cardName}
                onChangeText={setCardName}
                autoCapitalize="words"
              />
            </View>
          </View>
        )}

        {/* PayPal Message */}
        {paymentMethod === 'paypal' && (
          <View style={[styles.paypalMessage, { backgroundColor: `${primaryColor}10` }]}>
            <Ionicons name="information-circle" size={20} color={primaryColor} />
            <Text style={[styles.paypalMessageText, { color: primaryColor }]}>
              You'll be redirected to PayPal to complete your purchase securely.
            </Text>
          </View>
        )}

        {/* Subscribe Button */}
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
                Subscribe for R{price.toFixed(2)}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Security Info */}
        <View style={styles.securityInfo}>
          <Ionicons name="shield-checkmark" size={16} color={themeColors.textSecondary} />
          <Text style={[styles.securityText, { color: themeColors.textSecondary }]}>
            Your payment information is encrypted and secure. We never store your card details.
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
  paymentMethods: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  paymentMethodCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '600',
  },
  formContainer: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  paypalMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  paypalMessageText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
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
  },
  securityText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
});
