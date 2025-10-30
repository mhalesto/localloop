import React from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

export default function PremiumBadge({ size = 24, style }) {
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <LottieView
        source={require('../assets/premium-gold-badge.json')}
        autoPlay
        loop
        style={styles.animation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  animation: {
    width: '100%',
    height: '100%',
  },
});