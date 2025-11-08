/**
 * Gold Badge Component
 *
 * Displays "GOLD" badge for premium features
 * Usage: <GoldBadge size="small|large" />
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function GoldBadge({ size = 'small', style }) {
  return (
    <View style={[styles.badge, size === 'large' && styles.badgeLarge, style]}>
      <Text style={[styles.text, size === 'large' && styles.textLarge]}>
        GOLD
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#ffd700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  badgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  text: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: 0.5,
  },
  textLarge: {
    fontSize: 12,
  },
});
