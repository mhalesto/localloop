import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * TutorialTooltip - Step-by-step onboarding tooltip component
 *
 * Usage:
 * <TutorialTooltip
 *   visible={true}
 *   step={1}
 *   totalSteps={8}
 *   title="Create your first post!"
 *   description="Tap the + button to share your thoughts with the community"
 *   targetPosition={{ x: 100, y: 600 }}
 *   placement="top"
 *   onNext={() => {}}
 *   onSkip={() => {}}
 *   onClose={() => {}}
 * />
 */
export default function TutorialTooltip({
  visible,
  step,
  totalSteps,
  title,
  description,
  targetPosition,
  placement = 'top',
  onNext,
  onSkip,
  onClose,
  accentColor = '#6C4DF4',
  isDarkMode = false,
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Pulse animation for spotlight
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      fadeAnim.setValue(0);
      pulseAnim.setValue(1);
    }
  }, [visible]);

  if (!visible) return null;

  const spotlightRadius = 70;
  const spotlightX = targetPosition?.x || SCREEN_WIDTH / 2;
  const spotlightY = targetPosition?.y || SCREEN_HEIGHT / 2;

  // Calculate tooltip position based on placement
  let tooltipStyle = {};
  const tooltipWidth = SCREEN_WIDTH - 48;
  const tooltipHeight = 180;

  if (placement === 'top') {
    tooltipStyle = {
      top: Math.max(spotlightY - spotlightRadius - tooltipHeight - 20, 60),
      left: 24,
      right: 24,
    };
  } else if (placement === 'bottom') {
    tooltipStyle = {
      top: Math.min(spotlightY + spotlightRadius + 20, SCREEN_HEIGHT - tooltipHeight - 60),
      left: 24,
      right: 24,
    };
  } else if (placement === 'center') {
    tooltipStyle = {
      top: SCREEN_HEIGHT / 2 - tooltipHeight / 2,
      left: 24,
      right: 24,
    };
  }

  const styles = createStyles(isDarkMode, accentColor);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        {/* Dark overlay with hole */}
        <View style={StyleSheet.absoluteFill}>
          {/* Top section */}
          <View
            style={[
              styles.overlaySection,
              {
                height: Math.max(spotlightY - spotlightRadius, 0),
              },
            ]}
          />

          {/* Middle section with spotlight */}
          <View style={{ height: spotlightRadius * 2 }}>
            <View style={{ flexDirection: 'row' }}>
              {/* Left */}
              <View
                style={[
                  styles.overlaySection,
                  {
                    width: Math.max(spotlightX - spotlightRadius, 0),
                    height: spotlightRadius * 2,
                  },
                ]}
              />

              {/* Spotlight circle */}
              <Animated.View
                style={{
                  width: spotlightRadius * 2,
                  height: spotlightRadius * 2,
                  borderRadius: spotlightRadius,
                  borderWidth: 3,
                  borderColor: accentColor,
                  transform: [{ scale: pulseAnim }],
                }}
              />

              {/* Right */}
              <View
                style={[
                  styles.overlaySection,
                  {
                    flex: 1,
                    height: spotlightRadius * 2,
                  },
                ]}
              />
            </View>
          </View>

          {/* Bottom section */}
          <View style={[styles.overlaySection, { flex: 1 }]} />
        </View>

        {/* Tooltip card */}
        <Animated.View
          style={[
            styles.tooltipCard,
            tooltipStyle,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.stepIndicator}>
              STEP {step}/{totalSteps}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color="#999" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip this step</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onNext}
              style={[styles.nextButton, { backgroundColor: accentColor }]}
              activeOpacity={0.8}
            >
              <Text style={styles.nextText}>
                {step === totalSteps ? 'Finish' : 'Next'}
              </Text>
              {step < totalSteps && (
                <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const createStyles = (isDarkMode, accentColor) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
    },
    overlaySection: {
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
    },
    tooltipCard: {
      position: 'absolute',
      backgroundColor: isDarkMode ? '#1E1E1E' : '#ffffff',
      borderRadius: 16,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    stepIndicator: {
      fontSize: 12,
      fontWeight: '700',
      color: accentColor,
      letterSpacing: 0.5,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: isDarkMode ? '#FFFFFF' : '#000000',
      marginBottom: 8,
    },
    description: {
      fontSize: 15,
      color: isDarkMode ? '#CCCCCC' : '#666666',
      lineHeight: 22,
      marginBottom: 20,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    skipButton: {
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    skipText: {
      fontSize: 14,
      color: '#999999',
      fontWeight: '500',
    },
    nextButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 12,
    },
    nextText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#ffffff',
    },
  });
