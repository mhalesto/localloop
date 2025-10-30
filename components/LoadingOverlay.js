import React, { useEffect } from 'react';
import { View, StyleSheet, Modal, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { useSettings } from '../contexts/SettingsContext';

const { width, height } = Dimensions.get('window');

export default function LoadingOverlay({ visible, onComplete }) {
  const { themeColors, isDarkMode } = useSettings();

  useEffect(() => {
    if (visible) {
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        onComplete?.();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [visible, onComplete]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={[styles.container, { backgroundColor: `${themeColors.background}F0` }]}>
        <View style={[styles.animationContainer, { backgroundColor: themeColors.card }]}>
          <LottieView
            source={require('../assets/sandy-loading.json')}
            autoPlay
            loop
            style={styles.animation}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animationContainer: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 15,
  },
  animation: {
    width: '80%',
    height: '80%',
  },
});