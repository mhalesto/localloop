import React, { useEffect } from 'react';
import { View, StyleSheet, Modal, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { useSettings } from '../contexts/SettingsContext';

const { width, height } = Dimensions.get('window');

export default function LoadingOverlay({ visible, onComplete, animationSource, duration = 5000 }) {
  const { themeColors, isDarkMode } = useSettings();

  useEffect(() => {
    if (visible) {
      // Auto-dismiss after specified duration
      const timer = setTimeout(() => {
        onComplete?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, onComplete, duration]);

  const source = animationSource || require('../assets/sandy-loading.json');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={[
        styles.container,
        { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)' }
      ]}>
        <View style={[
          styles.animationContainer,
          {
            backgroundColor: themeColors.card,
            shadowOpacity: isDarkMode ? 0.4 : 0.2
          }
        ]}>
          <LottieView
            source={source}
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
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 12 },
    elevation: 20,
  },
  animation: {
    width: '85%',
    height: '85%',
  },
});