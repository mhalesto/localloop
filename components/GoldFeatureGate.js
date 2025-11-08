/**
 * Gold Feature Gate Component
 *
 * Blocks non-Gold users from accessing premium features
 * Shows upgrade prompt instead
 *
 * Usage:
 * <GoldFeatureGate featureName="AI Post Composer">
 *   <SmartComposerModal />
 * </GoldFeatureGate>
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

export default function GoldFeatureGate({
  children,
  featureName = 'this feature',
  showUpgradeButton = true,
  customMessage,
}) {
  const { userProfile } = useAuth();
  const navigation = useNavigation();
  const isGold = userProfile?.subscriptionPlan === 'gold';

  // Gold users see the feature
  if (isGold) {
    return children;
  }

  // Non-Gold users see upgrade gate
  return (
    <View style={styles.gate}>
      <Text style={styles.icon}>🔒</Text>
      <Text style={styles.title}>Gold Feature</Text>
      <Text style={styles.description}>
        {customMessage || `Upgrade to Gold to unlock ${featureName}`}
      </Text>
      {showUpgradeButton && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('GoldFeatures')}
        >
          <Text style={styles.buttonText}>Upgrade to Gold</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  gate: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    margin: 16,
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#ffd700',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
